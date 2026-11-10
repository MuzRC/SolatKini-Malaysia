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
        Log.i(TAG, "Penggera azan diterima! Tindakan: " + intent.getAction());

        String prayerName = intent.getStringExtra("prayer_name");
        String prayerKey = intent.getStringExtra("prayer_key");
        String voice = intent.getStringExtra("voice");
        if (prayerName == null) prayerName = "Solat";
        if (prayerKey == null) prayerKey = "solat";
        if (voice == null) voice = "jakim";

        // 1. Dapatkan WakeLock untuk membangunkan perkakasan CPU telefon
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "SolatKini::AlarmReceiverWakeLock"
            );
            wakeLock.acquire(3 * 60 * 1000L); // 3 minutes
        }

        try {
            // 2. Mulakan perkhidmatan audio latar depan (AzanAudioService) pada saluran penggera
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

            // 3. Bangunkan dan lancarkan MainActivity untuk memaparkan skrin visual azan penuh automatik
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
            Log.e(TAG, "Ralat mengaktifkan servis azan / aktiviti skrin penuh", e);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception ignored) {}
            }
        }
    }
}
