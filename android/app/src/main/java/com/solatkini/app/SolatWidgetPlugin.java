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
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "SolatWidget")
public class SolatWidgetPlugin extends Plugin {
    private static final String TAG = "SolatWidgetPlugin";
    public static final int PERSISTENT_NOTIFICATION_ID = 8801;
    public static final String ACTION_SYNC_PRAYER = "com.solatkini.app.ACTION_SYNC_PRAYER";
    public static final String WIDGET_PREFS = "SolatKiniWidgetPrefs";

    // Fungsi pembantu untuk membuang label AM/PM supaya paparan jadual padat & tidak melimpah
    private static String stripAmPm(String timeStr) {
        if (timeStr == null || timeStr.isEmpty() || timeStr.equals("--:--")) return "--:--";
        return timeStr.replace(" AM", "")
                      .replace(" PM", "")
                      .replace(" am", "")
                      .replace(" pm", "")
                      .trim();
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, SolatWidgetProvider.class);
            intent.setAction(SolatWidgetProvider.ACTION_UPDATE_PRAYER_TIMES);

            if (call.hasOption("zone")) intent.putExtra("zone", call.getString("zone"));
            if (call.hasOption("next_label")) intent.putExtra("next_label", call.getString("next_label"));
            if (call.hasOption("next_time")) intent.putExtra("next_time", call.getString("next_time"));
            if (call.hasOption("imsak")) intent.putExtra("imsak", call.getString("imsak"));
            if (call.hasOption("subuh")) intent.putExtra("subuh", call.getString("subuh"));
            if (call.hasOption("syuruk")) intent.putExtra("syuruk", call.getString("syuruk"));
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

            String zone = call.getString("zone", "Beaufort");
            String hijri = call.getString("hijri", "");
            String nextLabel = call.getString("next_label", "Waktu Solat");
            String nextTime = call.getString("next_time", "--:--");

            long nextTimestamp = 0L;
            if (call.hasOption("next_timestamp")) {
                try {
                    Long lVal = call.getLong("next_timestamp");
                    if (lVal != null && lVal > 0) nextTimestamp = lVal;
                } catch (Exception ignored) {}
                if (nextTimestamp == 0L) {
                    try {
                        Double dVal = call.getDouble("next_timestamp");
                        if (dVal != null && dVal > 0) nextTimestamp = dVal.longValue();
                    } catch (Exception ignored) {}
                }
            } else if (call.hasOption("target_timestamp")) {
                try {
                    Long lVal = call.getLong("target_timestamp");
                    if (lVal != null && lVal > 0) nextTimestamp = lVal;
                } catch (Exception ignored) {}
                if (nextTimestamp == 0L) {
                    try {
                        Double dVal = call.getDouble("target_timestamp");
                        if (dVal != null && dVal > 0) nextTimestamp = dVal.longValue();
                    } catch (Exception ignored) {}
                }
            }

            String imsak = call.getString("imsak", "--:--");
            String subuh = call.getString("subuh", "--:--");
            String syuruk = call.getString("syuruk", "--:--");
            String zohor = call.getString("zohor", "--:--");
            String asar = call.getString("asar", "--:--");
            String maghrib = call.getString("maghrib", "--:--");
            String isyak = call.getString("isyak", "--:--");

            SharedPreferences prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
            prefs.edit()
                .putBoolean("is_persistent_enabled", true)
                .putString("zone", zone)
                .putString("hijri", hijri)
                .putString("next_label", nextLabel)
                .putString("next_time", nextTime)
                .putLong("next_timestamp", nextTimestamp)
                .putString("imsak", imsak)
                .putString("subuh", subuh)
                .putString("syuruk", syuruk)
                .putString("zohor", zohor)
                .putString("asar", asar)
                .putString("maghrib", maghrib)
                .putString("isyak", isyak)
                .apply();

            buildAndShowNotification(context, zone, hijri, nextLabel, nextTime, nextTimestamp, imsak, subuh, syuruk, zohor, asar, maghrib, isyak);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal mengemaskini notifikasi tetap: " + e.getMessage(), e);
        }
    }

    public static void buildAndShowNotification(
        Context context,
        String zone,
        String hijri,
        String nextLabel,
        String nextTime,
        long nextTimestamp,
        String imsak,
        String subuh,
        String syuruk,
        String zohor,
        String asar,
        String maghrib,
        String isyak
    ) {
        try {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            long now = System.currentTimeMillis();

            // Pintasan Buka App
            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent openPending = PendingIntent.getActivity(
                context,
                2001,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Pintasan Segerak
            Intent syncIntent = new Intent(context, MainActivity.class);
            syncIntent.setAction(ACTION_SYNC_PRAYER);
            syncIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent syncPending = PendingIntent.getActivity(
                context,
                2002,
                syncIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // 1. Tajuk Padat: Buang pengulangan nama app supaya tarikh Hijri muat penuh tanpa terpotong (...)
            String cleanZone = zone != null ? zone.replace("SolatKini · ", "").trim() : "Beaufort";
            String titleText = (hijri != null && !hijri.isEmpty())
                ? cleanZone + " • " + hijri
                : cleanZone;

            // 2. Baris Fokus Waktu Seterusnya
            String nextKicker = "⏳ Seterusnya: " + nextLabel + " (" + nextTime + ")";

            // 3. Susunan Jadual 7 Waktu: Nilai jam dibersihkan daripada AM/PM supaya muat tepat 2 baris seimbang
            String line1 = String.format("Imsak %s  •  Subuh %s  •  Syuruk %s",
                stripAmPm(imsak), stripAmPm(subuh), stripAmPm(syuruk));

            String line2 = String.format("Zohor %s  •  Asar %s  •  Maghrib %s  •  Isyak %s",
                stripAmPm(zohor), stripAmPm(asar), stripAmPm(maghrib), stripAmPm(isyak));

            String formattedContent = nextKicker + "\n\n" + line1 + "\n" + line2;

            NotificationCompat.BigTextStyle bigStyle = new NotificationCompat.BigTextStyle()
                .setBigContentTitle(titleText)
                .bigText(formattedContent);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(
                context,
                SolatKiniApplication.PERSISTENT_CHANNEL_ID
            )
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(titleText)
                .setContentText(nextKicker)
                .setStyle(bigStyle)
                .setContentIntent(openPending)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .addAction(android.R.drawable.ic_menu_today, "Buka", openPending)
                .addAction(android.R.drawable.ic_popup_sync, "Segerak", syncPending);

            // Kawalan Pemasa Undur (Chronometer Countdown)
            if (nextTimestamp > now) {
                builder.setWhen(nextTimestamp);
                builder.setShowWhen(true);
                builder.setUsesChronometer(true);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    builder.setChronometerCountDown(true);
                }
            } else {
                builder.setUsesChronometer(false);
                builder.setShowWhen(false);
            }

            manager.notify(PERSISTENT_NOTIFICATION_ID, builder.build());
        } catch (Exception e) {
            Log.w(TAG, "Gagal memaparkan notifikasi", e);
        }
    }

    public static void advanceToNextPrayer(Context context) {
        try {
            SharedPreferences widgetPrefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
            SharedPreferences alarmPrefs = context.getSharedPreferences("SolatKiniAlarms", Context.MODE_PRIVATE);
            String alarmsJson = alarmPrefs.getString("scheduled_alarms_json", null);

            long now = System.currentTimeMillis();
            JSONObject nextUpcoming = null;
            long nearestTimestamp = Long.MAX_VALUE;

            if (alarmsJson != null && !alarmsJson.isEmpty()) {
                JSONArray alarmsArray = new JSONArray(alarmsJson);
                for (int i = 0; i < alarmsArray.length(); i++) {
                    JSONObject obj = alarmsArray.getJSONObject(i);
                    long ts = obj.optLong("timestamp", 0);
                    if (ts > now && ts < nearestTimestamp) {
                        nearestTimestamp = ts;
                        nextUpcoming = obj;
                    }
                }
            }

            String zone = widgetPrefs.getString("zone", "Beaufort");
            String hijri = widgetPrefs.getString("hijri", "");
            String imsak = widgetPrefs.getString("imsak", "--:--");
            String subuh = widgetPrefs.getString("subuh", "--:--");
            String syuruk = widgetPrefs.getString("syuruk", "--:--");
            String zohor = widgetPrefs.getString("zohor", "--:--");
            String asar = widgetPrefs.getString("asar", "--:--");
            String maghrib = widgetPrefs.getString("maghrib", "--:--");
            String isyak = widgetPrefs.getString("isyak", "--:--");

            String nextLabel;
            String nextTime;
            long targetTimestamp;

            if (nextUpcoming != null) {
                nextLabel = nextUpcoming.optString("prayerName", "Solat");
                SimpleDateFormat timeFmt = new SimpleDateFormat("h:mm a", Locale.getDefault());
                nextTime = timeFmt.format(new Date(nearestTimestamp));
                targetTimestamp = nearestTimestamp;
            } else {
                // Sandaran selepas Isyak jika jadual esok belum disegerakkan
                nextLabel = "Subuh";
                nextTime = subuh;
                targetTimestamp = 0L;
            }

            widgetPrefs.edit()
                .putString("next_label", nextLabel)
                .putString("next_time", nextTime)
                .putLong("next_timestamp", targetTimestamp)
                .apply();

            // Segerakkan juga paparan widget skrin utama
            SolatWidgetProvider.updateAllWidgets(context);

            // Kemas kini notifikasi kekal jika diaktifkan
            if (widgetPrefs.getBoolean("is_persistent_enabled", false)) {
                buildAndShowNotification(
                    context,
                    zone,
                    hijri,
                    nextLabel,
                    nextTime,
                    targetTimestamp,
                    imsak,
                    subuh,
                    syuruk,
                    zohor,
                    asar,
                    maghrib,
                    isyak
                );
            }
        } catch (Exception e) {
            Log.w(TAG, "Ralat menganjak waktu solat", e);
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

            SharedPreferences prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
            prefs.edit().putBoolean("is_persistent_enabled", false).apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal membatalkan notifikasi tetap: " + e.getMessage(), e);
        }
    }
}
