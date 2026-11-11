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

            String zone = call.getString("zone", "Malaysia");
            String hijri = call.getString("hijri", "");
            String nextLabel = call.getString("next_label", "Waktu Solat");
            String nextTime = call.getString("next_time", "--:--");

            long nextTimestamp = 0L;
            if (call.hasOption("next_timestamp")) {
                Double ts = call.getDouble("next_timestamp");
                if (ts != null) nextTimestamp = ts.longValue();
            } else if (call.hasOption("target_timestamp")) {
                Double ts = call.getDouble("target_timestamp");
                if (ts != null) nextTimestamp = ts.longValue();
            }

            // Ekstrak kesemua 7 waktu dan checkpoint
            String imsak = call.getString("imsak", "--:--");
            String subuh = call.getString("subuh", "--:--");
            String syuruk = call.getString("syuruk", "--:--");
            String zohor = call.getString("zohor", "--:--");
            String asar = call.getString("asar", "--:--");
            String maghrib = call.getString("maghrib", "--:--");
            String isyak = call.getString("isyak", "--:--");

            // Simpan ke SharedPreferences untuk sandaran pemulihan (Reboot & Background Alarm)
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

    /**
     * Membina notifikasi status bar dengan Chronometer CountDown rasmi (Sifar Kiraan Negatif)
     */
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

            // Pintasan Buka Aplikasi
            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent openPending = PendingIntent.getActivity(
                context,
                2001,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Pintasan Segerak Waktu
            Intent syncIntent = new Intent(context, MainActivity.class);
            syncIntent.setAction(ACTION_SYNC_PRAYER);
            syncIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent syncPending = PendingIntent.getActivity(
                context,
                2002,
                syncIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String nextKicker = "Seterusnya: " + nextLabel + " (" + nextTime + ")";

            // Format kemas 2 baris untuk 7 waktu agar tidak terpotong pada skrin kecil telefon
            String formatted7Times = String.format(
                "Imsak %s   •   Subuh %s   •   Syuruk %s\nZohor %s   •   Asar %s   •   Maghrib %s   •   Isyak %s",
                imsak, subuh, syuruk, zohor, asar, maghrib, isyak
            );

            NotificationCompat.BigTextStyle bigStyle = new NotificationCompat.BigTextStyle()
                .setBigContentTitle("SolatKini · Zon " + zone)
                .setSummaryText(hijri == null || hijri.isEmpty() ? "Jadual Waktu Solat" : hijri)
                .bigText(nextKicker + "\n\n" + formatted7Times);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(
                context,
                SolatKiniApplication.PERSISTENT_CHANNEL_ID
            )
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("SolatKini · Zon " + zone)
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

            // SYARAT KETAT: Jam undur hanya aktif jika waktu belum berlalu (Halang nombor negatif)
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
            Log.i(TAG, "Notifikasi tetap berjaya dikemaskini: " + nextLabel + " (" + nextTimestamp + ")");
        } catch (Exception e) {
            Log.w(TAG, "Gagal memaparkan notifikasi tetap", e);
        }
    }

    /**
     * Beralih secara automatik ke waktu seterusnya (termasuk Imsak & Syuruk)
     */
    public static void advanceToNextPrayer(Context context) {
        try {
            SharedPreferences alarmPrefs = context.getSharedPreferences("SolatKiniAlarms", Context.MODE_PRIVATE);
            String alarmsJson = alarmPrefs.getString("scheduled_alarms_json", null);
            if (alarmsJson == null || alarmsJson.isEmpty()) return;

            JSONArray alarmsArray = new JSONArray(alarmsJson);
            long now = System.currentTimeMillis();

            JSONObject nextUpcoming = null;
            long nearestTimestamp = Long.MAX_VALUE;

            for (int i = 0; i < alarmsArray.length(); i++) {
                JSONObject obj = alarmsArray.getJSONObject(i);
                long ts = obj.optLong("timestamp", 0);
                if (ts > now && ts < nearestTimestamp) {
                    nearestTimestamp = ts;
                    nextUpcoming = obj;
                }
            }

            if (nextUpcoming != null) {
                SharedPreferences widgetPrefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
                if (!widgetPrefs.getBoolean("is_persistent_enabled", false)) return;

                String zone = widgetPrefs.getString("zone", "Malaysia");
                String hijri = widgetPrefs.getString("hijri", "");
                String nextLabel = nextUpcoming.optString("prayerName", "Solat");

                SimpleDateFormat timeFmt = new SimpleDateFormat("h:mm a", Locale.getDefault());
                String nextTime = timeFmt.format(new Date(nearestTimestamp));

                String imsak = widgetPrefs.getString("imsak", "--:--");
                String subuh = widgetPrefs.getString("subuh", "--:--");
                String syuruk = widgetPrefs.getString("syuruk", "--:--");
                String zohor = widgetPrefs.getString("zohor", "--:--");
                String asar = widgetPrefs.getString("asar", "--:--");
                String maghrib = widgetPrefs.getString("maghrib", "--:--");
                String isyak = widgetPrefs.getString("isyak", "--:--");

                widgetPrefs.edit()
                    .putString("next_label", nextLabel)
                    .putString("next_time", nextTime)
                    .putLong("next_timestamp", nearestTimestamp)
                    .apply();

                buildAndShowNotification(context, zone, hijri, nextLabel, nextTime, nearestTimestamp, imsak, subuh, syuruk, zohor, asar, maghrib, isyak);
                Log.i(TAG, "Notifikasi automatik dianjakkan ke waktu seterusnya: " + nextLabel);
            }
        } catch (Exception e) {
            Log.w(TAG, "Ralat menganjak waktu solat seterusnya", e);
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
