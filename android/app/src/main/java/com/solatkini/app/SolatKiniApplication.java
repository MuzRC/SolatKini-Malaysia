package com.solatkini.app;

import android.app.Application;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.util.Log;

public class SolatKiniApplication extends Application {
    private static final String TAG = "SolatKiniApp";
    public static final String AZAN_CHANNEL_ID = "solatkini_azan_channel_v4";
    public static final String REMINDER_CHANNEL_ID = "solatkini_reminder_channel";
    public static final String PERSISTENT_CHANNEL_ID = "solatkini_top_widget_channel_v2";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            // Padamkan saluran versi lama supaya sistem tidak keliru dengan tetapan lapuk
            try {
                manager.deleteNotificationChannel("solatkini_azan_channel");
                manager.deleteNotificationChannel("solatkini_azan_channel_v2");
                manager.deleteNotificationChannel("solatkini_azan_channel_v3");
                manager.deleteNotificationChannel("solatkini_persistent_channel");
                manager.deleteNotificationChannel("solatkini_top_widget_channel");
            } catch (Exception ignored) {}

            // 1. Saluran Penggera Azan (Audio dimainkan secara eksklusif oleh MediaPlayer STREAM_ALARM)
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
            // Senyapkan saluran notifikasi agar sistem tidak mencetuskan audio notifikasi default bertindih
            azanChannel.setSound(null, null);

            // 2. Saluran Peringatan Waktu Solat
            NotificationChannel reminderChannel = new NotificationChannel(
                REMINDER_CHANNEL_ID,
                "Peringatan Waktu Solat",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            reminderChannel.setDescription("Pemberitahuan peringatan waktu solat");
            reminderChannel.enableVibration(true);
            reminderChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            // 3. Saluran Notifikasi Tetap Waktu Solat Teratas (Widget Top Bar & Chronometer Pemasa Undur)
            NotificationChannel persistentChannel = new NotificationChannel(
                PERSISTENT_CHANNEL_ID,
                "Widget Bar 5 Waktu Solat Teratas",
                NotificationManager.IMPORTANCE_HIGH
            );
            persistentChannel.setDescription("Paparan kekal 5 waktu solat harian pada kedudukan teratas bar notifikasi");
            persistentChannel.setShowBadge(false);
            persistentChannel.enableLights(false);
            persistentChannel.enableVibration(false);
            persistentChannel.setVibrationPattern(new long[]{0});
            persistentChannel.setSound(null, null);
            persistentChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            manager.createNotificationChannel(azanChannel);
            manager.createNotificationChannel(reminderChannel);
            manager.createNotificationChannel(persistentChannel);

            Log.i(TAG, "Semua saluran notifikasi Android (" + AZAN_CHANNEL_ID + ", " + PERSISTENT_CHANNEL_ID + ") berjaya didaftarkan.");
        }
    }
}
