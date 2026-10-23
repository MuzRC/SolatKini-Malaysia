package com.solatkini.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

public class AzanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AzanAlarmReceiver";
    public static final String ACTION_TRIGGER_AZAN = "com.solatkini.app.TRIGGER_AZAN_ALARM";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) {
            Log.w(TAG, "Intent azan bernilai null diterima. Mengabaikan cetusan.");
            return;
        }

        String action = intent.getAction();
        Log.i(TAG, "Penggera azan diterima! Tindakan: " + action);

        String prayerName = intent.getStringExtra("prayer_name");
        String prayerKey = intent.getStringExtra("prayer_key");
        String voice = intent.getStringExtra("voice");

        if (prayerName == null || prayerName.isEmpty()) prayerName = "Solat";
        if (prayerKey == null || prayerKey.isEmpty()) prayerKey = "solat";

        // Kunci Azan Subuh Khas sebagai perlindungan tambahan
        if ("subuh".equalsIgnoreCase(prayerKey)) {
            voice = "subuh_special";
        } else if (voice == null || voice.isEmpty()) {
            voice = "jakim";
        }

        // 1. Dapatkan WakeLock selamat dengan auto-timeout 15 saat
        // Ini memastikan CPU kekal bangun sehingga AzanAudioService mengambil alih
        try {
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                PowerManager.WakeLock wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "SolatKini::AlarmReceiverWakeLock"
                );
                wakeLock.acquire(15 * 1000L); // 15 saat auto-release, elak CPU tidur sebelum servis hidup
            }
        } catch (Exception e) {
            Log.w(TAG, "Gagal mendapatkan WakeLock sementara", e);
        }

        try {
            // 2. Mulakan perkhidmatan audio latar depan (AzanAudioService) pada aras STREAM_ALARM
            Intent serviceIntent = new Intent(context, AzanAudioService.class);
            serviceIntent.setAction(AzanAudioService.ACTION_PLAY_AZAN);
            serviceIntent.putExtra("prayer_name", prayerName);
            serviceIntent.putExtra("prayer_key", prayerKey);
            serviceIntent.putExtra("voice", voice);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.i(TAG, "Servis audio azan berjaya dihantar ke AzanAudioService (" + prayerName + " - " + voice + ").");

            // 3. Lancarkan paparan visual jika skrin/peranti membenarkan (sandaran kepada FullScreenIntent)
            Intent activityIntent = new Intent(context, MainActivity.class);
            activityIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            );
            activityIntent.putExtra("azan_trigger", true);
            activityIntent.putExtra("prayer_name", prayerName);
            activityIntent.putExtra("prayer_key", prayerKey);
            activityIntent.putExtra("voice", voice);
            context.startActivity(activityIntent);

        } catch (Exception e) {
            Log.e(TAG, "Ralat semasa mengaktifkan servis azan / aktiviti skrin", e);
        }
    }
}
