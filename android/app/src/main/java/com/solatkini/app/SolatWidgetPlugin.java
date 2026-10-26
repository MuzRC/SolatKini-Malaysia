package com.solatkini.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "SolatWidget")
public class SolatWidgetPlugin extends Plugin {
    private static final String TAG = "SolatWidgetPlugin";
    public static final int PERSISTENT_NOTIFICATION_ID = 8801;
    public static final String ACTION_SYNC_PRAYER = "com.solatkini.app.ACTION_SYNC_PRAYER";
    public static final String PREFS_PERSISTENT = "SolatKiniPersistentPrefs";

    @PluginMethod
    public void updateWidget(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, SolatWidgetProvider.class);
            intent.setAction(SolatWidgetProvider.ACTION_UPDATE_PRAYER_TIMES);
            intent.setPackage(context.getPackageName());

            if (call.hasOption("zone")) intent.putExtra("zone", call.getString("zone"));
            if (call.hasOption("next_label")) intent.putExtra("next_label", call.getString("next_label"));
            if (call.hasOption("next_time")) intent.putExtra("next_time", call.getString("next_time"));
            if (call.hasOption("subuh")) intent.putExtra("subuh", call.getString("subuh"));
            if (call.hasOption("zohor")) intent.putExtra("zohor", call.getString("zohor"));
            if (call.hasOption("asar")) intent.putExtra("asar", call.getString("asar"));
            if (call.hasOption("maghrib")) intent.putExtra("maghrib", call.getString("maghrib"));
            if (call.hasOption("isyak")) intent.putExtra("isyak", call.getString("isyak"));

            context.sendBroadcast(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal mengemaskini widget Android: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void updatePersistentNotification(PluginCall call) {
        try {
            Context context = getContext();

            String zone = call.getString("zone", "Malaysia");
            String hijri = call.getString("hijri", "");
            String nextLabel = call.getString("next_label", "Solat");
            String nextTime = call.getString("next_time", "--:--");

            long targetTimestamp = 0L;
            if (call.hasOption("target_timestamp")) {
                try {
                    Long val = call.getLong("target_timestamp");
                    if (val != null) {
                        targetTimestamp = val;
                    }
                } catch (Exception ignored) {}
            }

            if (targetTimestamp <= System.currentTimeMillis()) {
                targetTimestamp = parseTimeToTimestamp(nextTime);
            }

            String subuh = call.getString("subuh", "--:--");
            String zohor = call.getString("zohor", "--:--");
            String asar = call.getString("asar", "--:--");
            String maghrib = call.getString("maghrib", "--:--");
            String isyak = call.getString("isyak", "--:--");

            // Simpan snapshot data lengkap ke SharedPreferences untuk kegunaan servis native
            SharedPreferences prefs = context.getSharedPreferences(PREFS_PERSISTENT, Context.MODE_PRIVATE);
            prefs.edit()
                .putString("zone", zone)
                .putString("hijri", hijri)
                .putString("next_label", nextLabel)
                .putString("next_time", nextTime)
                .putLong("target_timestamp", targetTimestamp)
                .putString("subuh", subuh)
                .putString("zohor", zohor)
                .putString("asar", asar)
                .putString("maghrib", maghrib)
                .putString("isyak", isyak)
                .apply();

            // Bina dan paparkan notifikasi
            postPersistentNotification(
                context, zone, hijri, nextLabel, nextTime,
                targetTimestamp, subuh, zohor, asar, maghrib, isyak
            );

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal mengemaskini notifikasi tetap: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void cancelPersistentNotification(PluginCall call) {
        try {
            Context context = getContext();
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.cancel(PERSISTENT_NOTIFICATION_ID);
            }
            SharedPreferences prefs = context.getSharedPreferences(PREFS_PERSISTENT, Context.MODE_PRIVATE);
            prefs.edit().clear().apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal membatalkan notifikasi tetap: " + e.getMessage(), e);
        }
    }

    /**
     * Kaedah statik native untuk mengemas kini notifikasi di background 
     * tanpa memerlukan WebView/JavaScript aktif.
     */
    public static void refreshPersistentNotification(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_PERSISTENT, Context.MODE_PRIVATE);
            String zone = prefs.getString("zone", "Malaysia");
            String hijri = prefs.getString("hijri", "");
            String subuh = prefs.getString("subuh", "--:--");
            String zohor = prefs.getString("zohor", "--:--");
            String asar = prefs.getString("asar", "--:--");
            String maghrib = prefs.getString("maghrib", "--:--");
            String isyak = prefs.getString("isyak", "--:--");

            long now = System.currentTimeMillis();
            String nextLabel = "Solat";
            String nextTime = "--:--";
            long targetTimestamp = 0L;

            // 1. Semak jadual lengkap dari SharedPreferences penggera azan
            SharedPreferences alarmPrefs = context.getSharedPreferences(AzanAlarmPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String rawAlarms = alarmPrefs.getString(AzanAlarmPlugin.KEY_STORED_ALARMS, null);

            if (rawAlarms != null && !rawAlarms.trim().isEmpty()) {
                try {
                    JSONArray list = new JSONArray(rawAlarms);
                    long minFutureTimestamp = Long.MAX_VALUE;
                    JSONObject bestMatch = null;

                    for (int i = 0; i < list.length(); i++) {
                        JSONObject item = list.getJSONObject(i);
                        long ts = item.optLong("timestamp", 0);
                        if (ts > now && ts < minFutureTimestamp) {
                            minFutureTimestamp = ts;
                            bestMatch = item;
                        }
                    }

                    if (bestMatch != null) {
                        nextLabel = bestMatch.optString("prayerName", "Solat");
                        targetTimestamp = minFutureTimestamp;
                        SimpleDateFormat sdf = new SimpleDateFormat("h:mm a", Locale.ENGLISH);
                        nextTime = sdf.format(new Date(targetTimestamp));
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Ralat parsing jadual penggera natif: " + e.getMessage());
                }
            }

            // 2. Sandaran jika penggera natif belum ada rekod
            if (targetTimestamp <= now) {
                String[][] timesList = new String[][]{
                    {"Subuh", subuh},
                    {"Zohor", zohor},
                    {"Asar", asar},
                    {"Maghrib", maghrib},
                    {"Isyak", isyak}
                };

                long minTs = Long.MAX_VALUE;
                String matchedLabel = "";
                String matchedTime = "";

                for (String[] pair : timesList) {
                    long ts = parseTimeToTimestamp(pair[1]);
                    if (ts > now && ts < minTs) {
                        minTs = ts;
                        matchedLabel = pair[0];
                        matchedTime = pair[1];
                    }
                }

                if (minTs != Long.MAX_VALUE) {
                    nextLabel = matchedLabel;
                    nextTime = matchedTime;
                    targetTimestamp = minTs;
                }
            }

            if (targetTimestamp > 0) {
                // Simpan nilai terkini
                prefs.edit()
                    .putString("next_label", nextLabel)
                    .putString("next_time", nextTime)
                    .putLong("target_timestamp", targetTimestamp)
                    .apply();

                // Paparkan notifikasi baharu
                postPersistentNotification(
                    context, zone, hijri, nextLabel, nextTime,
                    targetTimestamp, subuh, zohor, asar, maghrib, isyak
                );

                // Kemas kini Homescreen Widget serentak
                Intent widgetIntent = new Intent(context, SolatWidgetProvider.class);
                widgetIntent.setAction(SolatWidgetProvider.ACTION_UPDATE_PRAYER_TIMES);
                widgetIntent.setPackage(context.getPackageName());
                widgetIntent.putExtra("zone", zone);
                widgetIntent.putExtra("next_label", nextLabel);
                widgetIntent.putExtra("next_time", nextTime);
                widgetIntent.putExtra("subuh", subuh);
                widgetIntent.putExtra("zohor", zohor);
                widgetIntent.putExtra("asar", asar);
                widgetIntent.putExtra("maghrib", maghrib);
                widgetIntent.putExtra("isyak", isyak);
                context.sendBroadcast(widgetIntent);

                Log.i(TAG, "[Native Background] Notifikasi berjaya dikemas kini kepada: " + nextLabel + " (" + nextTime + ")");
            }
        } catch (Exception e) {
            Log.e(TAG, "Gagal mengemas kini notifikasi secara natif", e);
        }
    }

    /**
     * Membina dan mengeluarkan Notifikasi Tetap di status bar Android.
     */
    public static void postPersistentNotification(
        Context context, String zone, String hijri, String nextLabel,
        String nextTime, long targetTimestamp, String subuh, String zohor,
        String asar, String maghrib, String isyak
    ) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        String nextKicker = "Seterusnya: " + nextLabel + " (" + nextTime + ")";
        String formatted5Times = String.format(
            "Subuh %s   Zohor %s   Asar %s   Maghrib %s   Isyak %s",
            subuh, zohor, asar, maghrib, isyak
        );

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
            context,
            2001,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent syncIntent = new Intent(context, MainActivity.class);
        syncIntent.setAction(ACTION_SYNC_PRAYER);
        syncIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent syncPending = PendingIntent.getActivity(
            context,
            2002,
            syncIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.BigTextStyle bigStyle = new NotificationCompat.BigTextStyle()
            .setBigContentTitle("SolatKini · Zon " + zone)
            .setSummaryText(hijri.isEmpty() ? "Waktu Solat JAKIM" : hijri)
            .bigText(nextKicker + "\n\n" + formatted5Times);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(
            context,
            SolatKiniApplication.PERSISTENT_CHANNEL_ID
        )
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("SolatKini · Zon " + zone)
            .setContentText(nextKicker)
            .setSubText(hijri.isEmpty() ? zone : hijri)
            .setStyle(bigStyle)
            .setContentIntent(openPending)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_menu_today, "Buka SolatKini", openPending)
            .addAction(android.R.drawable.ic_popup_sync, "Segerak Waktu", syncPending);

        // KAWALAN KRONOMETER: Hanya hidup jika waktu sasaran sah di masa hadapan.
        // Jika sudah lepas atau tiada, matikan kronometer terus agar tiada nombor negatif.
        if (targetTimestamp > System.currentTimeMillis()) {
            builder.setWhen(targetTimestamp)
                   .setShowWhen(true)
                   .setUsesChronometer(true)
                   .setChronometerCountDown(true);
        } else {
            builder.setShowWhen(false)
                   .setUsesChronometer(false);
        }

        manager.notify(PERSISTENT_NOTIFICATION_ID, builder.build());
    }

    /**
     * Menukar string masa (cth: "12:04 PM", "4:53 AM", atau "16:30") 
     * kepada epoch timestamp milisaat pada hari ini atau esok.
     */
    public static long parseTimeToTimestamp(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty() || timeStr.contains("--:--")) {
            return 0L;
        }
        try {
            String clean = timeStr.trim().toUpperCase();
            boolean isPm = clean.contains("PM");
            boolean isAm = clean.contains("AM");

            String timePart = clean.replaceAll("[^0-9:]", "");
            String[] parts = timePart.split(":");
            if (parts.length < 2) return 0L;

            int hours = Integer.parseInt(parts[0]);
            int minutes = Integer.parseInt(parts[1]);

            if (isPm && hours < 12) {
                hours += 12;
            } else if (isAm && hours == 12) {
                hours = 0;
            }

            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.HOUR_OF_DAY, hours);
            cal.set(Calendar.MINUTE, minutes);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);

            if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
                cal.add(Calendar.DAY_OF_YEAR, 1);
            }

            return cal.getTimeInMillis();
        } catch (Exception e) {
            return 0L;
        }
    }
}
