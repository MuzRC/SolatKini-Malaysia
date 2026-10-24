package com.solatkini.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Calendar;

@CapacitorPlugin(name = "SolatWidget")
public class SolatWidgetPlugin extends Plugin {
    public static final int PERSISTENT_NOTIFICATION_ID = 8801;
    public static final String ACTION_SYNC_PRAYER = "com.solatkini.app.ACTION_SYNC_PRAYER";

    @PluginMethod
    public void updateWidget(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, SolatWidgetProvider.class);
            intent.setAction(SolatWidgetProvider.ACTION_UPDATE_PRAYER_TIMES);
            intent.setPackage(context.getPackageName());

            if (call.hasOption("zone")) {
                intent.putExtra("zone", call.getString("zone"));
            }
            if (call.hasOption("next_label")) {
                intent.putExtra("next_label", call.getString("next_label"));
            }
            if (call.hasOption("next_time")) {
                intent.putExtra("next_time", call.getString("next_time"));
            }
            if (call.hasOption("subuh")) {
                intent.putExtra("subuh", call.getString("subuh"));
            }
            if (call.hasOption("zohor")) {
                intent.putExtra("zohor", call.getString("zohor"));
            }
            if (call.hasOption("asar")) {
                intent.putExtra("asar", call.getString("asar"));
            }
            if (call.hasOption("maghrib")) {
                intent.putExtra("maghrib", call.getString("maghrib"));
            }
            if (call.hasOption("isyak")) {
                intent.putExtra("isyak", call.getString("isyak"));
            }

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

            // Dapatkan target timestamp jika dihantar oleh TypeScript
            long targetTimestamp = 0L;
            if (call.hasOption("target_timestamp")) {
                try {
                    Long val = call.getLong("target_timestamp");
                    if (val != null) {
                        targetTimestamp = val;
                    }
                } catch (Exception ignored) {}
            }

            // Sandaran Pintar: Jika tiada atau tamat, kira sendiri terus daripada teks nextTime (cth: "4:53 AM")
            if (targetTimestamp <= System.currentTimeMillis()) {
                targetTimestamp = parseNextTimeToTimestamp(nextTime);
            }

            String subuh = call.getString("subuh", "--:--");
            String zohor = call.getString("zohor", "--:--");
            String asar = call.getString("asar", "--:--");
            String maghrib = call.getString("maghrib", "--:--");
            String isyak = call.getString("isyak", "--:--");

            String nextKicker = "Seterusnya: " + nextLabel + " (" + nextTime + ")";

            String formatted5Times = String.format(
                "Subuh %s   Zohor %s   Asar %s   Maghrib %s   Isyak %s",
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

            // Pintasan 2: Segerak Waktu
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

            // Pengaktifan Jam Undur Natif (Chronometer)
            if (targetTimestamp > System.currentTimeMillis()) {
                builder.setWhen(targetTimestamp)
                       .setShowWhen(true)              // Wajib untuk Realme UI / ColorOS
                       .setUsesChronometer(true)       // Gunakan mod kronometer
                       .setChronometerCountDown(true); // Kiraan menurun ke masa sasaran
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
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal membatalkan notifikasi tetap: " + e.getMessage(), e);
        }
    }

    /**
     * Menukar string masa seperti "4:53 AM", "12:04 PM", atau "16:30" 
     * kepada epoch timestamp milisaat pada hari ini atau keesokan harinya.
     */
    private long parseNextTimeToTimestamp(String timeStr) {
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

            // Jika masa solat sudah berlalu hari ini, sasaran adalah hari esok
            if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
                cal.add(Calendar.DAY_OF_YEAR, 1);
            }

            return cal.getTimeInMillis();
        } catch (Exception e) {
            return 0L;
        }
    }
}
