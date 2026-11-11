package com.solatkini.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.content.ContextCompat;

public class AzanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AzanAlarmReceiver";
    public static final String ACTION_TRIGGER_AZAN = "com.solatkini.app.TRIGGER_AZAN_ALARM";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.i(TAG, "Penggera azan diterima! Tindakan: " + (intent != null ? intent.getAction() : "null"));

        String prayerName = intent != null ? intent.getStringExtra("prayer_name") : "Solat";
        String prayerKey = intent != null ? intent.getStringExtra("prayer_key") : "solat";
        String voice = intent != null ? intent.getStringExtra("voice") : "jakim";

        if (prayerName == null || prayerName.isEmpty()) prayerName = "Solat";
        if (prayerKey == null || prayerKey.isEmpty()) prayerKey = "solat";
        if (voice == null || voice.isEmpty()) voice = "jakim";

        boolean isTest = intent != null && intent.getBooleanExtra("is_test", false);
        int autoStopSeconds = intent != null ? intent.getIntExtra("auto_stop_seconds", 0) : 0;

        if (!isTest) {
            // 1. Catat penggera dicetuskan ke dalam sejarah diagnostik
            AzanHistoryLogger.record(
                context,
                prayerName,
                prayerKey,
                AzanHistoryLogger.STATUS_TRIGGERED,
                "AlarmManager mencetuskan azan tepat pada waktunya (Suara: " + voice.toUpperCase() + ")"
            );

            // 2. Anjakkan pemasa notifikasi ke waktu solat seterusnya serta-merta (Elak kiraan negatif)
            SolatWidgetPlugin.advanceToNextPrayer(context);
        }

        // Tahan CPU selama 15 saat supaya telefon tidak sempat tidur sebelum servis bermula
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            try {
                PowerManager.WakeLock wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "SolatKini::AlarmReceiverWakeLock"
                );
                wakeLock.acquire(15 * 1000L);
            } catch (Exception e) {
                Log.w(TAG, "Gagal mengaktifkan WakeLock sementara", e);
            }
        }

        try {
            // Hidupkan servis audio azan latar depan
            Intent serviceIntent = new Intent(context, AzanAudioService.class);
            serviceIntent.setAction(AzanAudioService.ACTION_PLAY_AZAN);
            serviceIntent.putExtra("prayer_name", prayerName);
            serviceIntent.putExtra("prayer_key", prayerKey);
            serviceIntent.putExtra("voice", voice);
            serviceIntent.putExtra("is_test", isTest);
            serviceIntent.putExtra("auto_stop_seconds", autoStopSeconds);

            ContextCompat.startForegroundService(context, serviceIntent);
            Log.i(TAG, "Servis AzanAudioService berjaya diarahkan mula.");
        } catch (Exception e) {
            Log.e(TAG, "Ralat menghidupkan servis audio azan", e);
            AzanHistoryLogger.record(
                context,
                prayerName,
                prayerKey,
                AzanHistoryLogger.STATUS_FAILED,
                "Gagal memulakan servis audio: " + e.getMessage()
            );
        }
    }
}
