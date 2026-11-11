package com.solatkini.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SolatWidget")
public class SolatWidgetPlugin extends Plugin {
    public static final int PERSISTENT_NOTIFICATION_ID = 8801;
    public static final String ACTION_SYNC_PRAYER = "com.solatkini.app.ACTION_SYNC_PRAYER";
    private static final String WIDGET_PREFS = "SolatKiniWidgetPrefs";

    @PluginMethod
    public void updateWidget(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, SolatWidgetProvider.class);
            intent.setAction(SolatWidgetProvider.ACTION_UPDATE_PRAYER_TIMES);

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
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) {
                call.reject("NotificationManager tidak tersedia");
                return;
            }

            String zone = call.getString("zone", "Malaysia");
            String hijri = call.getString("hijri", "");
            String nextLabel = call.getString("next_label", "Solat");
            String nextTime = call.getString("next_time", "--:--");
            long nextTimestamp = 0L;
            if (call.hasOption("next_timestamp")) {
                Double ts = call.getDouble("next_timestamp");
                if (ts != null) nextTimestamp = ts.longValue();
            }

            String subuh = call.getString("subuh", "--:--");
            String zohor = call.getString("zohor", "--:--");
            String asar = call.getString("asar", "--:--");
            String maghrib = call.getString("maghrib", "--:--");
            String isyak = call.getString("isyak", "--:--");

            // Simpan ke SharedPreferences supaya boleh dinaikkan semula jika telefon reboot
            SharedPreferences prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
            prefs.edit()
                .putBoolean("is_persistent_enabled", true)
                .putString("zone", zone)
                .putString("hijri", hijri)
                .putString("next_label", nextLabel)
                .putString("next_time", nextTime)
                .putLong("next_timestamp", nextTimestamp)
                .putString("subuh", subuh)
                .putString("zohor", zohor)
                .putString("asar", asar)
                .putString("maghrib", maghrib)
                .putString("isyak", isyak)
                .apply();

            String nextKicker = "Seterusnya: " + nextLabel + " (" + nextTime + ")";
            String formatted5Times = String.format(
                "Subuh %s   |   Zohor %s   |   Asar %s   |   Maghrib %s   |   Isyak %s",
                subuh, zohor, asar, maghrib, isyak
            );

            // Pintasan 1: Buka Aplikasi
            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent openPending = PendingIntent.getActivity(
                context,
                2001,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Pintasan 2: Segerak Waktu Solat
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
                .setSummaryText(hijri.isEmpty() ? "Waktu Solat Hari Ini" : hijri)
                .bigText(nextKicker + "\n\n" + formatted5Times);

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
                .addAction(android.R.drawable.ic_menu_today, "Buka SolatKini", openPending)
                .addAction(android.R.drawable.ic_popup_sync, "Segerak Waktu", syncPending);

            // Sokongan undur masa asli Android jika timestamp masa hadapan dibekalkan
            if (nextTimestamp > System.currentTimeMillis()) {
                builder.setWhen(nextTimestamp);
                builder.setUsesChronometer(true);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    builder.setChronometerCountDown(true);
                }
            } else {
                builder.setShowWhen(false);
            }

            manager.notify(PERSISTENT_NOTIFICATION_ID, builder.build());

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
