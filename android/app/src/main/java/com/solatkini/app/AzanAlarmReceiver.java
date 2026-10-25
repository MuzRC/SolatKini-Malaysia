package com.solatkini.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class AzanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AzanAlarmReceiver";
    public static final String ACTION_TRIGGER_AZAN = "com.solatkini.app.TRIGGER_AZAN";
    
    // Saluran & ID Notifikasi Berterusan (Mesti sepadan dengan widgetService)
    public static final String CHANNEL_ID_PERSISTENT = "solatkini_persistent_channel_v2";
    public static final int NOTIFICATION_ID_PERSISTENT = 1001;

    // Saluran Notifikasi Laungan Azan / Penggera
    public static final String CHANNEL_ID_ALARM = "solatkini_alarm_channel";
    public static final int NOTIFICATION_ID_ALARM = 2001;

    private static final String PREFS_NAME = "SolatKiniAlarms";
    private static final String KEY_STORED_ALARMS = "scheduled_alarms_json";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : "";
        if (!ACTION_TRIGGER_AZAN.equals(action)) {
            return;
        }

        String prayerName = intent.getStringExtra("prayer_name");
        String prayerKey = intent.getStringExtra("prayer_key");
        String voice = intent.getStringExtra("voice");
        long scheduledTime = intent.getLongExtra("scheduled_timestamp", 0);
        long now = System.currentTimeMillis();

        // 1. Keselamatan Jam Dianjak: Abaikan jika penggera lewat lebih 15 minit
        if (scheduledTime > 0 && Math.abs(now - scheduledTime) > (15 * 60 * 1000)) {
            Log.w(TAG, "Penggera solat (" + prayerName + ") tersasar dari masa sebenar. Dibatalkan demi keselamatan.");
            return;
        }

        Log.i(TAG, "Penggera masuk waktu: " + prayerName + " [" + voice + "]");

        // 2. Bunyikan Audio Azan melalui Foreground Service
        try {
            Intent audioServiceIntent = new Intent(context, AzanAudioService.class);
            audioServiceIntent.setAction(AzanAudioService.ACTION_PLAY_AZAN);
            audioServiceIntent.putExtra("prayer_name", prayerName);
            audioServiceIntent.putExtra("prayer_key", prayerKey);
            audioServiceIntent.putExtra("voice", voice);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(audioServiceIntent);
            } else {
                context.startService(audioServiceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Gagal melancarkan AzanAudioService", e);
        }

        // 3. Paparkan Notifikasi Masuk Waktu Solat (Popup alert yang boleh swipe buang)
        showPrayerAlertNotification(context, prayerName);

        // 4. Notifikasi berterusan dimatikan di sini agar tidak bertindih dengan SolatWidgetPlugin
        // updatePersistentNotificationNatively(context);
    }

    private void showPrayerAlertNotification(Context context, String prayerName) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        createNotificationChannels(context, nm);

        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            context,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID_ALARM)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Masuk Waktu Solat " + prayerName)
            .setContentText("Telah masuk waktu solat fardu " + prayerName + " bagi kawasan anda.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(pi);

        nm.notify(NOTIFICATION_ID_ALARM, builder.build());
    }

    /**
     * Dinonaktifkan: Membatalkan sebarang notifikasi silent lama dan menghalang
     * notifikasi bertindih daripada dibina semula.
     */
    public static void updatePersistentNotificationNatively(Context context) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID_PERSISTENT);
            }
        } catch (Exception e) {
            Log.e(TAG, "Ralat membatalkan notifikasi silent", e);
        }
    }

    private static void createNotificationChannels(Context context, NotificationManager nm) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Saluran Notifikasi Berterusan (Senyap, Priority Low)
            if (nm.getNotificationChannel(CHANNEL_ID_PERSISTENT) == null) {
                NotificationChannel pChannel = new NotificationChannel(
                    CHANNEL_ID_PERSISTENT,
                    "Waktu Solat Berterusan",
                    NotificationManager.IMPORTANCE_LOW
                );
                pChannel.setDescription("Memaparkan waktu solat seterusnya pada bar notifikasi");
                pChannel.setShowBadge(false);
                pChannel.enableVibration(false);
                pChannel.setSound(null, null);
                nm.createNotificationChannel(pChannel);
            }

            // Saluran Penggera Azan (High Priority)
            if (nm.getNotificationChannel(CHANNEL_ID_ALARM) == null) {
                NotificationChannel aChannel = new NotificationChannel(
                    CHANNEL_ID_ALARM,
                    "Laungan Azan & Peringatan Solat",
                    NotificationManager.IMPORTANCE_HIGH
                );
                aChannel.setDescription("Notifikasi masuk waktu solat fardu");
                nm.createNotificationChannel(aChannel);
            }
        }
    }
}
