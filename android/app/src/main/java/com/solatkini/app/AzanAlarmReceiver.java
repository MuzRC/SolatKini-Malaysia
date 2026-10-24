package com.solatkini.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;

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

        // 1. Keselamatan Jam Dianjak: Abaikan jika penggera lewat lebih 15 minit (contohnya jam telefon diusik)
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

        // 3. Paparkan Notifikasi Masuk Waktu Solat
        showPrayerAlertNotification(context, prayerName);

        // 4. KUNCI UTAMA: Kemas kini Notifikasi Berterusan ke Waktu Solat Seterusnya SECARA NATIVE!
        updatePersistentNotificationNatively(context);
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
     * Mengemas kini notifikasi kekal terus dari Java tanpa perlu kejutkan enjin JavaScript/React
     */
    public static void updatePersistentNotificationNatively(Context context) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            createNotificationChannels(context, nm);

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String storedAlarmsJson = prefs.getString(KEY_STORED_ALARMS, null);
            if (storedAlarmsJson == null || storedAlarmsJson.isEmpty()) {
                return;
            }

            JSONArray alarms = new JSONArray(storedAlarmsJson);
            long now = System.currentTimeMillis();
            JSONObject nextPrayer = null;

            // Cari solat seterusnya yang mempunyai timestamp masa depan terdekat
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject item = alarms.getJSONObject(i);
                long t = item.optLong("timestamp", 0);
                if (t > now) {
                    if (nextPrayer == null || t < nextPrayer.optLong("timestamp", Long.MAX_VALUE)) {
                        nextPrayer = item;
                    }
                }
            }

            if (nextPrayer == null && alarms.length() > 0) {
                // Jika semua solat hari ini sudah lepas, ambil solat pertama (Subuh esok)
                nextPrayer = alarms.getJSONObject(0);
            }

            if (nextPrayer != null) {
                String nextName = nextPrayer.optString("prayerName", "Solat");
                long nextTimestamp = nextPrayer.optLong("timestamp", 0);

                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault());
                String formattedTime = nextTimestamp > 0 ? sdf.format(new java.util.Date(nextTimestamp)) : "";

                Intent appIntent = new Intent(context, MainActivity.class);
                appIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                PendingIntent contentIntent = PendingIntent.getActivity(
                    context,
                    100,
                    appIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                NotificationCompat.Builder persistentBuilder = new NotificationCompat.Builder(context, CHANNEL_ID_PERSISTENT)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("Solat Seterusnya: " + nextName + " (" + formattedTime + ")")
                    .setContentText("SolatKini • Waktu solat sentiasa dikemas kini automatik")
                    .setOngoing(true)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setContentIntent(contentIntent);

                nm.notify(NOTIFICATION_ID_PERSISTENT, persistentBuilder.build());
                Log.i(TAG, "Notifikasi berterusan berjaya disegarkan secara native: " + nextName + " (" + formattedTime + ")");
            }
        } catch (Exception e) {
            Log.e(TAG, "Ralat mengemas kini notifikasi berterusan native", e);
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
