package com.solatkini.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SolatWidget")
public class SolatWidgetPlugin extends Plugin {
    private static final String TAG = "SolatWidgetPlugin";
    public static final int PERSISTENT_NOTIFICATION_ID = 8801;
    public static final String ACTION_SYNC_PRAYER = "com.solatkini.app.ACTION_SYNC_PRAYER";
    public static final String ACTION_RESTORE_PERSISTENT_NOTIF = "com.solatkini.app.ACTION_RESTORE_PERSISTENT_NOTIF";
    public static final String WIDGET_PREFS = "SolatKiniWidgetPrefs";

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
            SharedPreferences prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            if (call.hasOption("zone")) editor.putString("zone", call.getString("zone"));
            if (call.hasOption("hijri")) editor.putString("hijri", call.getString("hijri"));
            if (call.hasOption("date")) editor.putString("date", call.getString("date"));
            if (call.hasOption("next_label")) editor.putString("next_label", call.getString("next_label"));
            if (call.hasOption("next_time")) editor.putString("next_time", call.getString("next_time"));
            if (call.hasOption("imsak")) editor.putString("imsak", call.getString("imsak"));
            if (call.hasOption("subuh")) editor.putString("subuh", call.getString("subuh"));
            if (call.hasOption("syuruk")) editor.putString("syuruk", call.getString("syuruk"));
            if (call.hasOption("zohor")) editor.putString("zohor", call.getString("zohor"));
            if (call.hasOption("asar")) editor.putString("asar", call.getString("asar"));
            if (call.hasOption("maghrib")) editor.putString("maghrib", call.getString("maghrib"));
            if (call.hasOption("isyak")) editor.putString("isyak", call.getString("isyak"));
            if (call.hasOption("upcoming_days_json")) {
                editor.putString("upcoming_days_json", call.getString("upcoming_days_json"));
            }
            editor.commit();

            SolatWidgetProvider.refreshAndScheduleAllWidgets(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable e) {
            call.reject("Gagal mengemaskini widget Android: " + e.getMessage());
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
            SharedPreferences.Editor editor = prefs.edit()
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
                .putString("isyak", isyak);

            if (call.hasOption("date")) {
                editor.putString("date", call.getString("date"));
            }
            if (call.hasOption("upcoming_days_json")) {
                editor.putString("upcoming_days_json", call.getString("upcoming_days_json"));
            }
            editor.commit();

            buildAndShowNotification(context, zone, hijri, nextLabel, nextTime, nextTimestamp, imsak, subuh, syuruk, zohor, asar, maghrib, isyak);
            SolatWidgetProvider.refreshAndScheduleAllWidgets(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable e) {
            call.reject("Gagal mengemaskini notifikasi tetap: " + e.getMessage());
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

            Intent restoreIntent = new Intent(context, SolatWidgetProvider.class);
            restoreIntent.setAction(ACTION_RESTORE_PERSISTENT_NOTIF);
            PendingIntent restorePending = PendingIntent.getBroadcast(
                context,
                2003,
                restoreIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String cleanZone = zone != null ? zone.replace("SolatKini · ", "").trim() : "Beaufort";
            String titleText = (hijri != null && !hijri.isEmpty())
                ? cleanZone + " • " + hijri
                : cleanZone;

            String nextKicker = "⏳ Seterusnya: " + nextLabel + " (" + nextTime + ")";

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
                .setDeleteIntent(restorePending)
                .setOngoing(true)
                .setAutoCancel(false)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .addAction(android.R.drawable.ic_menu_today, "Buka", openPending)
                .addAction(android.R.drawable.ic_popup_sync, "Segerak", syncPending);

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
        } catch (Throwable e) {
            Log.w(TAG, "Gagal memaparkan notifikasi", e);
        }
    }

    public static void ensurePersistentNotificationActive(Context context) {
        try {
            SharedPreferences widgetPrefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
            if (!widgetPrefs.getBoolean("is_persistent_enabled", false)) {
                return;
            }

            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                StatusBarNotification[] active = manager.getActiveNotifications();
                if (active != null) {
                    for (StatusBarNotification sbn : active) {
                        if (sbn != null && sbn.getId() == PERSISTENT_NOTIFICATION_ID) {
                            return;
                        }
                    }
                }
            }

            advanceToNextPrayer(context);
        } catch (Throwable t) {
            Log.w(TAG, "Gagal menyemak status notifikasi tetap: " + t.getMessage());
        }
    }

    public static void advanceToNextPrayer(Context context) {
        try {
            SolatWidgetProvider.refreshAndScheduleAllWidgets(context);

            SharedPreferences widgetPrefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
            if (!widgetPrefs.getBoolean("is_persistent_enabled", false)) {
                return;
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
            String nextLabel = widgetPrefs.getString("next_label", "Subuh");
            String nextTime = widgetPrefs.getString("next_time", subuh);
            long targetTimestamp = widgetPrefs.getLong("next_timestamp", 0L);

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
        } catch (Throwable e) {
            Log.w(TAG, "Ralat menganjak waktu solat", e);
        }
    }

    @PluginMethod
    public void cancelPersistentNotification(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
            prefs.edit().putBoolean("is_persistent_enabled", false).commit();

            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.cancel(PERSISTENT_NOTIFICATION_ID);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable e) {
            call.reject("Gagal membatalkan notifikasi tetap: " + e.getMessage());
        }
    }
}
