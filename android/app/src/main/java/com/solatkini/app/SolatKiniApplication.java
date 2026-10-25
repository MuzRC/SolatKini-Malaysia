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

    // 1. Saluran Penggera Azan (Maksima & Tembus Mod Senyap / DND)
    public static final String AZAN_CHANNEL_ID = "solatkini_azan_channel_v3";

    // 2. Saluran Peringatan Sebelum Masuk Waktu Solat
    public static final String REMINDER_CHANNEL_ID = "solatkini_reminder_channel";

    // 3. Saluran Widget Bar Notifikasi 5 Waktu Solat Teratas (Kekal untuk SolatWidgetPlugin)
    public static final String PERSISTENT_CHANNEL_ID = "solatkini_top_widget_channel_v2";
    public static final String PERSISTENT_WIDGET_CHANNEL_ID = PERSISTENT_CHANNEL_ID;

    // 4. Saluran Waktu Solat Berterusan / Boot (Sepadan dengan AzanBootReceiver)
    public static final String BOOT_PERSISTENT_CHANNEL_ID = "solatkini_persistent_channel_v2";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            // Padamkan saluran versi lama untuk mengelakkan konfigurasi lapuk bertindih
            try {
                manager.deleteNotificationChannel("solatkini_azan_channel");
                manager.deleteNotificationChannel("solatkini_azan_channel_v2");
                manager.deleteNotificationChannel("solatkini_persistent_channel");
                manager.deleteNotificationChannel("solatkini_alarm_channel");
            } catch (Exception ignored) {}

            // 1. Saluran Penggera Azan (Audio dikendalikan oleh MediaPlayer pada STREAM_ALARM)
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
            azanChannel.setSound(null, null);

            // 2. Saluran Peringatan Waktu Solat
            NotificationChannel reminderChannel = new NotificationChannel(
                REMINDER_CHANNEL_ID,
                "Peringatan Waktu Solat",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            reminderChannel.setDescription("Pemberitahuan peringatan sebelum dan semasa masuk waktu solat");
            reminderChannel.enableVibration(true);
            reminderChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            // 3. Saluran Widget Bar 5 Waktu Solat Teratas (Digunakan oleh SolatWidgetPlugin)
            NotificationChannel widgetChannel = new NotificationChannel(
                PERSISTENT_CHANNEL_ID,
                "Widget Bar 5 Waktu Solat Teratas",
                NotificationManager.IMPORTANCE_HIGH
            );
            widgetChannel.setDescription("Paparan kekal 5 waktu solat harian pada kedudukan teratas bar notifikasi");
            widgetChannel.setShowBadge(false);
            widgetChannel.enableLights(false);
            widgetChannel.enableVibration(false);
            widgetChannel.setSound(null, null);
            widgetChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            // 4. Saluran Waktu Solat Berterusan / Boot (Digunakan oleh AzanBootReceiver)
            NotificationChannel bootChannel = new NotificationChannel(
                BOOT_PERSISTENT_CHANNEL_ID,
                "Waktu Solat Berterusan",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            bootChannel.setDescription("Paparan waktu solat berterusan pada panel notifikasi selepas telefon dihidupkan");
            bootChannel.setShowBadge(false);
            bootChannel.enableLights(false);
            bootChannel.enableVibration(false);
            bootChannel.setSound(null, null);
            bootChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            // Daftarkan kesemua saluran ke sistem Android
            manager.createNotificationChannel(azanChannel);
            manager.createNotificationChannel(reminderChannel);
            manager.createNotificationChannel(widgetChannel);
            manager.createNotificationChannel(bootChannel);

            Log.i(TAG, "Kesemua 4 saluran notifikasi SolatKini berjaya didaftarkan ke sistem Android.");
        }
    }
}
