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
        Log.i(TAG, "Penggera azan diterima! Tindakan: " + (intent != null ? intent.getAction() : "null"));

        String prayerName = intent != null ? intent.getStringExtra("prayer_name") : "Solat";
        String prayerKey = intent != null ? intent.getStringExtra("prayer_key") : "solat";
        String voice = intent != null ? intent.getStringExtra("voice") : "jakim";

        if (prayerName == null) prayerName = "Solat";
        if (prayerKey == null) prayerKey = "solat";
        if (voice == null) voice = "jakim";

        // Tahan CPU selama 15 saat sahaja untuk memberi laluan servis bermula
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "SolatKini::AlarmReceiverWakeLock"
            );
            wakeLock.acquire(15 * 1000L);
        }

        try {
            // Mulakan servis audio azan latar depan
            Intent serviceIntent = new Intent(context, AzanAudioService.class);
            serviceIntent.setAction(AzanAudioService.ACTION_PLAY_AZAN);
            serviceIntent.putExtra("prayer_name", prayerName);
            serviceIntent.putExtra("prayer_key", prayerKey);
            serviceIntent.putExtra("voice", voice);
            if (intent != null) {
                serviceIntent.putExtra("is_test", intent.getBooleanExtra("is_test", false));
                serviceIntent.putExtra("auto_stop_seconds", intent.getIntExtra("auto_stop_seconds", 0));
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Ralat menghidupkan servis audio azan", e);
        }
    }
}
