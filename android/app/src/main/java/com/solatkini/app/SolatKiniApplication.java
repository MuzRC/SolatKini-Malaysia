package com.solatkini.app;

import android.app.Application;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

public class SolatKiniApplication extends Application {
    private static final String TAG = "SolatKiniApp";
    public static final String AZAN_CHANNEL_ID = "solatkini_azan_channel";
    public static final String REMINDER_CHANNEL_ID = "solatkini_reminder_channel";
    public static final String PERSISTENT_CHANNEL_ID = "solatkini_persistent_channel";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            // 1. Saluran Penggera Azan (Audio Maksima & Skrin Penuh)
            NotificationChannel azanChannel = new NotificationChannel(
                AZAN_CHANNEL_ID,
                "Penggera Azan SolatKini",
                NotificationManager.IMPORTANCE_HIGH
            );
            azanChannel.setDescription("Saluran rasmi penggera azan waktu solat bersuara maksima");
            azanChannel.setBypassDnd(true);
            azanChannel.enableVibration(true);
            azanChannel.setVibrationPattern(new long[]{0, 500, 250, 500, 250, 1000});
            azanChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

            int rawId = getResources().getIdentifier("azan_notification", "raw", getPackageName());
            if (rawId != 0) {
                Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + rawId);
                azanChannel.setSound(soundUri, audioAttributes);
            }

            // 2. Saluran Peringatan Waktu Solat
            NotificationChannel reminderChannel = new NotificationChannel(
                REMINDER_CHANNEL_ID,
                "Peringatan Waktu Solat",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            reminderChannel.setDescription("Pemberitahuan peringatan waktu solat");
            reminderChannel.enableVibration(true);
            reminderChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            // 3. Saluran Notifikasi Tetap Waktu Solat (Ongoing Notification Shade Widget)
            NotificationChannel persistentChannel = new NotificationChannel(
                PERSISTENT_CHANNEL_ID,
                "Widget Bar Waktu Solat Tetap",
                NotificationManager.IMPORTANCE_LOW
            );
            persistentChannel.setDescription("Paparan kekal 5 waktu solat harian pada bar notifikasi");
            persistentChannel.setShowBadge(false);
            persistentChannel.enableLights(false);
            persistentChannel.enableVibration(false);
            persistentChannel.setSound(null, null);
            persistentChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            manager.createNotificationChannel(azanChannel);
            manager.createNotificationChannel(reminderChannel);
            manager.createNotificationChannel(persistentChannel);

            Log.i(TAG, "Semua saluran notifikasi Android termasuk Widget Tetap berjaya didaftarkan ke sistem operasi.");
        }
    }
}
