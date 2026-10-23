package com.solatkini.app;

import android.app.AlarmManager;
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
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class AzanBootReceiver extends BroadcastReceiver {
    private static final String TAG = "AzanBootReceiver";
    private static final String PREFS_NAME = "SolatKiniAlarms";
    private static final String KEY_STORED_ALARMS = "scheduled_alarms_json";

    // Gunakan ID channel baru agar Android mereset prioritas dari Silent ke Atas
    public static final String CHANNEL_ID_PERSISTENT = "solatkini_persistent_channel_v2";
    public static final int NOTIFICATION_ID_PERSISTENT = 1001;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : "";
        Log.i(TAG, "Menerima siaran sistem boot: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {

            // Gunakan Device Protected Storage jika perangkat masih dalam status kunci Direct Boot
            Context safeContext = context;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                safeContext = context.isDeviceProtectedStorage() ? context : context.createDeviceProtectedStorageContext();
            }

            // 1. Periksa pengaturan auto-start pengguna (Default: TRUE)
            boolean isAutoStartEnabled = true;
            try {
                SharedPreferences appPrefs = safeContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences capPrefs = safeContext.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);

                if (appPrefs.contains("solatkini_autostart_boot")) {
                    isAutoStartEnabled = appPrefs.getBoolean("solatkini_autostart_boot", true);
                } else if (capPrefs.contains("solatkini_autostart_boot")) {
                    String val = capPrefs.getString("solatkini_autostart_boot", "true");
                    isAutoStartEnabled = "true".equalsIgnoreCase(val);
                }
            } catch (Exception e) {
                Log.w(TAG, "Gagal membaca pengaturan auto-start: " + e.getMessage());
            }

            if (!isAutoStartEnabled) {
                Log.d(TAG, "Pengguna telah mematikan fungsi auto-start SolatKini.");
                return;
            }

            // 2. Jadwalkan ulang alarm azan secara senyap tanpa audio
            Log.i(TAG, "Auto-start AKTIF. Menjadwalkan ulang alarm waktu salat...");
            rescheduleStoredAlarms(safeContext);

            // 3. Perbarui widget layar utama
            try {
                Intent widgetIntent = new Intent(safeContext, SolatWidgetProvider.class);
                widgetIntent.setAction("com.solatkini.app.UPDATE_PRAYER_TIMES");
                safeContext.sendBroadcast(widgetIntent);
            } catch (Exception e) {
                Log.w(TAG, "Gagal memperbarui widget: " + e.getMessage());
            }

            // 4. Tampilkan notifikasi tetap di panel atas (di luar Silent Notifications)
            try {
                showPersistentNotification(safeContext);
                Log.i(TAG, "Notifikasi tetap berhasil dimunculkan di bar atas.");
            } catch (Exception e) {
                Log.e(TAG, "Gagal menampilkan notifikasi tetap: " + e.getMessage());
            }
        }
    }

    /**
     * Menampilkan notifikasi persisten di bagian atas (bukan Silent Notifications)
     */
    public static void showPersistentNotification(Context context) {
        try {
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) return;

            // Gunakan IMPORTANCE_DEFAULT agar posisinya berada di atas (setara MacroDroid),
            // tetapi suaranya dimatikan (setSound null) agar tidak berisik saat HP menyala.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID_PERSISTENT,
                    "Waktu Solat Berterusan",
                    NotificationManager.IMPORTANCE_DEFAULT
                );
                channel.setDescription("Paparan waktu solat berterusan pada panel notifikasi");
                channel.setShowBadge(false);
                channel.enableLights(false);
                channel.enableVibration(false);
                channel.setSound(null, null);
                notificationManager.createNotificationChannel(channel);
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String alarmsJson = prefs.getString(KEY_STORED_ALARMS, null);

            String nextPrayerTitle = "SolatKini Malaysia";
            String nextPrayerDetails = "Jadual waktu solat aktif";
            SimpleDateFormat timeFormat = new SimpleDateFormat("h:mm a", Locale.getDefault());

            if (alarmsJson != null && !alarmsJson.isEmpty()) {
                JSONArray array = new JSONArray(alarmsJson);
                long now = System.currentTimeMillis();
                long closestTime = Long.MAX_VALUE;
                String closestPrayerName = null;

                for (int i = 0; i < array.length(); i++) {
                    JSONObject obj = array.getJSONObject(i);
                    long ts = obj.optLong("timestamp", 0);
                    String name = obj.optString("prayerName", "");
                    if (ts > now && ts < closestTime) {
                        closestTime = ts;
                        closestPrayerName = name;
                    }
                }

                if (closestPrayerName != null && closestTime != Long.MAX_VALUE) {
                    String timeStr = timeFormat.format(new Date(closestTime));
                    nextPrayerTitle = "Solat Seterusnya: " + closestPrayerName + " (" + timeStr + ")";
                    nextPrayerDetails = "Penggera azan aktif · Sentuh untuk buka SolatKini";
                }
            }

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent contentPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID_PERSISTENT)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(nextPrayerTitle)
                .setContentText(nextPrayerDetails)
                .setOngoing(true) // Menempel terus di bar notifikasi
                .setAutoCancel(false)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT) // Prioritas standar agar posisinya di atas
                .setContentIntent(contentPendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            notificationManager.notify(NOTIFICATION_ID_PERSISTENT, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Ralat membina notifikasi berterusan", e);
        }
    }

    public static void rescheduleStoredAlarms(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String alarmsJson = prefs.getString(KEY_STORED_ALARMS, null);

            if ((alarmsJson == null || alarmsJson.isEmpty()) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && context.isDeviceProtectedStorage()) {
                Context credContext = context.getApplicationContext();
                if (credContext != null) {
                    try {
                        SharedPreferences credPrefs = credContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                        alarmsJson = credPrefs.getString(KEY_STORED_ALARMS, null);
                    } catch (Exception ignored) {}
                }
            }

            if (alarmsJson == null || alarmsJson.isEmpty()) {
                Log.d(TAG, "Tiada data penggera tersimpan untuk dijadualkan semula.");
                return;
            }

            JSONArray array = new JSONArray(alarmsJson);
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            long now = System.currentTimeMillis();
            int rescheduledCount = 0;
            boolean hasUpdates = false;

            for (int i = 0; i < array.length(); i++) {
                try {
                    JSONObject obj = array.getJSONObject(i);
                    String prayerKey = obj.optString("prayerKey", "solat");
                    String prayerName = obj.optString("prayerName", "Solat");
                    String voice = obj.optString("voice", "jakim");
                    long timestamp = obj.optLong("timestamp", 0);
                    int requestCode = obj.optInt("requestCode", 2000 + i);

                    if (timestamp <= 0) continue;

                    if ("subuh".equalsIgnoreCase(prayerKey)) {
                        voice = "subuh_special";
                    }

                    Calendar storedCal = Calendar.getInstance();
                    storedCal.setTimeInMillis(timestamp);

                    Calendar targetCal = Calendar.getInstance();
                    targetCal.set(Calendar.HOUR_OF_DAY, storedCal.get(Calendar.HOUR_OF_DAY));
                    targetCal.set(Calendar.MINUTE, storedCal.get(Calendar.MINUTE));
                    targetCal.set(Calendar.SECOND, 0);
                    targetCal.set(Calendar.MILLISECOND, 0);

                    if (targetCal.getTimeInMillis() <= now) {
                        targetCal.add(Calendar.DAY_OF_YEAR, 1);
                    }

                    long triggerTimestamp = targetCal.getTimeInMillis();

                    if (triggerTimestamp != timestamp) {
                        obj.put("timestamp", triggerTimestamp);
                        obj.put("voice", voice);
                        hasUpdates = true;
                    }

                    Intent alarmIntent = new Intent(context, AzanAlarmReceiver.class);
                    alarmIntent.setAction("com.solatkini.app.TRIGGER_AZAN_ALARM");
                    alarmIntent.putExtra("prayer_key", prayerKey);
                    alarmIntent.putExtra("prayer_name", prayerName);
                    alarmIntent.putExtra("voice", voice);

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        alarmIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerTimestamp, pendingIntent);
                        alarmManager.setAlarmClock(clockInfo, pendingIntent);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTimestamp, pendingIntent);
                    }

                    rescheduledCount++;
                    Log.i(TAG, "Penggera solat " + prayerName + " [" + voice + "] didaftarkan untuk: " + targetCal.getTime().toString());
                } catch (Exception individualEx) {
                    Log.w(TAG, "Gagal menjadualkan slot solat pada indeks " + i, individualEx);
                }
            }

            if (hasUpdates) {
                prefs.edit().putString(KEY_STORED_ALARMS, array.toString()).apply();
            }

            Log.i(TAG, "Berjaya menjadualkan semula " + rescheduledCount + " waktu solat dengan selamat.");
        } catch (Exception e) {
            Log.e(TAG, "Ralat menjadualkan semula penggera dari AzanBootReceiver", e);
        }
    }
}
