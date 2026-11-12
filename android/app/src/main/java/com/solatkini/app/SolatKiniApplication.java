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
        installCrashLogger();
        createNotificationChannels();
    }

    private void installCrashLogger() {
        final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            try {
                StringBuilder sb = new StringBuilder();
                sb.append(throwable.getClass().getSimpleName())
                  .append(": ")
                  .append(throwable.getMessage() != null ? throwable.getMessage() : "Tiada mesej");

                StackTraceElement[] traces = throwable.getStackTrace();
                int count = 0;
                for (StackTraceElement el : traces) {
                    if (count >= 4) break;
                    sb.append(" | ")
                      .append(el.getFileName())
                      .append(":")
                      .append(el.getLineNumber())
                      .append(" (")
                      .append(el.getMethodName())
                      .append(")");
                    count++;
                }

                AzanHistoryLogger.recordSync(
                    getApplicationContext(),
                    "CRASH APLIKASI",
                    "crash",
                    AzanHistoryLogger.STATUS_FAILED,
                    sb.toString()
                );
            } catch (Throwable ignored) {}

            if (defaultHandler != null) {
                defaultHandler.uncaughtException(thread, throwable);
            }
        });
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            try {
                manager.deleteNotificationChannel("solatkini_azan_channel");
                manager.deleteNotificationChannel("solatkini_azan_channel_v2");
                manager.deleteNotificationChannel("solatkini_azan_channel_v3");
                manager.deleteNotificationChannel("solatkini_persistent_channel");
                manager.deleteNotificationChannel("solatkini_top_widget_channel");
            } catch (Throwable ignored) {}

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

            NotificationChannel reminderChannel = new NotificationChannel(
                REMINDER_CHANNEL_ID,
                "Peringatan Waktu Solat",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            reminderChannel.setDescription("Pemberitahuan peringatan waktu solat");
            reminderChannel.enableVibration(true);
            reminderChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

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
