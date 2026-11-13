package com.solatkini.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class SolatWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "SolatWidgetProvider";

    // Diselaraskan tepat dengan deklarasi di AndroidManifest.xml
    public static final String ACTION_UPDATE_PRAYER_TIMES = "com.solatkini.app.ACTION_UPDATE_PRAYER_TIMES";
    public static final String ACTION_WIDGET_TICK = "com.solatkini.app.ACTION_WIDGET_TICK";
    private static final String PREFS_NAME = "SolatKiniWidgetPrefs";
    private static final int WIDGET_TICK_REQUEST_CODE = 7701;

    private static class NextPrayerComputed {
        final String label;
        final String displayTime;
        final long targetTimestamp;

        NextPrayerComputed(String label, String displayTime, long targetTimestamp) {
            this.label = label;
            this.displayTime = displayTime;
            this.targetTimestamp = targetTimestamp;
        }
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        refreshAndScheduleAllWidgets(context);
    }

    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
        cancelWidgetTick(context);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        refreshAndScheduleAllWidgets(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        if (ACTION_UPDATE_PRAYER_TIMES.equals(action)) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            if (intent.hasExtra("zone")) editor.putString("zone", intent.getStringExtra("zone"));
            if (intent.hasExtra("hijri")) editor.putString("hijri", intent.getStringExtra("hijri"));
            if (intent.hasExtra("date")) editor.putString("date", intent.getStringExtra("date"));
            if (intent.hasExtra("next_label")) editor.putString("next_label", intent.getStringExtra("next_label"));
            if (intent.hasExtra("next_time")) editor.putString("next_time", intent.getStringExtra("next_time"));
            if (intent.hasExtra("imsak")) editor.putString("imsak", intent.getStringExtra("imsak"));
            if (intent.hasExtra("subuh")) editor.putString("subuh", intent.getStringExtra("subuh"));
            if (intent.hasExtra("syuruk")) editor.putString("syuruk", intent.getStringExtra("syuruk"));
            if (intent.hasExtra("zohor")) editor.putString("zohor", intent.getStringExtra("zohor"));
            if (intent.hasExtra("asar")) editor.putString("asar", intent.getStringExtra("asar"));
            if (intent.hasExtra("maghrib")) editor.putString("maghrib", intent.getStringExtra("maghrib"));
            if (intent.hasExtra("isyak")) editor.putString("isyak", intent.getStringExtra("isyak"));
            if (intent.hasExtra("upcoming_days_json")) {
                editor.putString("upcoming_days_json", intent.getStringExtra("upcoming_days_json"));
            }
            editor.commit();

            refreshAndScheduleAllWidgets(context);
        } else if (
            ACTION_WIDGET_TICK.equals(action)
            || Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
            || Intent.ACTION_DATE_CHANGED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
        ) {
            refreshAndScheduleAllWidgets(context);
            // Selaraskan juga notifikasi tetap sekiranya diaktifkan
            try {
                SolatWidgetPlugin.advanceToNextPrayer(context);
            } catch (Throwable ignored) {}
        }
    }

    /**
     * Kemas kini semua widget secara autonomi:
     * 1. Semak jika tarikh sudah bertukar hari dan muatkan jadual hari baharu dari cache berbilang hari.
     * 2. Kira waktu solat seterusnya secara masa nyata berdasarkan jam peranti.
     * 3. Jadualkan penggera tepat (AlarmManager) untuk pertukaran waktu seterusnya & tengah malam.
     */
    public static void refreshAndScheduleAllWidgets(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            rollOverToTodayScheduleIfAvailable(prefs);

            String zone = prefs.getString("zone", "WLY01");
            String subuh = prefs.getString("subuh", "05:50");
            String syuruk = prefs.getString("syuruk", "07:05");
            String zohor = prefs.getString("zohor", "13:10");
            String asar = prefs.getString("asar", "16:20");
            String maghrib = prefs.getString("maghrib", "19:15");
            String isyak = prefs.getString("isyak", "20:25");

            NextPrayerComputed computed = computeNextPrayerNow(prefs);

            prefs.edit()
                .putString("next_label", computed.label)
                .putString("next_time", computed.displayTime)
                .putLong("next_timestamp", computed.targetTimestamp)
                .apply();

            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, SolatWidgetProvider.class);
            int[] appWidgetIds = manager.getAppWidgetIds(thisWidget);

            if (appWidgetIds != null && appWidgetIds.length > 0) {
                for (int appWidgetId : appWidgetIds) {
                    renderWidgetViews(
                        context,
                        manager,
                        appWidgetId,
                        zone,
                        computed.label,
                        computed.displayTime,
                        subuh,
                        zohor,
                        asar,
                        maghrib,
                        isyak
                    );
                }
                scheduleNextWidgetTick(context, computed.targetTimestamp);
            } else {
                cancelWidgetTick(context);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Gagal menyegarkan widget skrin utama: " + t.getMessage());
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        rollOverToTodayScheduleIfAvailable(prefs);

        String zone = prefs.getString("zone", "WLY01");
        String subuh = prefs.getString("subuh", "05:50");
        String zohor = prefs.getString("zohor", "13:10");
        String asar = prefs.getString("asar", "16:20");
        String maghrib = prefs.getString("maghrib", "19:15");
        String isyak = prefs.getString("isyak", "20:25");

        NextPrayerComputed computed = computeNextPrayerNow(prefs);
        renderWidgetViews(
            context,
            appWidgetManager,
            appWidgetId,
            zone,
            computed.label,
            computed.displayTime,
            subuh,
            zohor,
            asar,
            maghrib,
            isyak
        );
    }

    private static void renderWidgetViews(
        Context context,
        AppWidgetManager appWidgetManager,
        int appWidgetId,
        String zone,
        String nextLabel,
        String nextTime,
        String subuh,
        String zohor,
        String asar,
        String maghrib,
        String isyak
    ) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_solat);

        views.setTextViewText(R.id.widget_zone, zone);
        views.setTextViewText(R.id.widget_next_label, nextLabel);
        views.setTextViewText(R.id.widget_next_time, nextTime);
        views.setTextViewText(R.id.widget_subuh, subuh);
        views.setTextViewText(R.id.widget_zohor, zohor);
        views.setTextViewText(R.id.widget_asar, asar);
        views.setTextViewText(R.id.widget_maghrib, maghrib);
        views.setTextViewText(R.id.widget_isyak, isyak);

        // Tekan mana-mana bahagian widget untuk buka aplikasi SolatKini & segerak masa nyata
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    /**
     * Kaedah statik untuk kemas kini kesemua widget aktif sekali gus
     * (Dipanggil oleh BootReceiver, AzanAlarmReceiver, atau servis latar belakang)
     */
    public static void updateAllWidgets(Context context) {
        refreshAndScheduleAllWidgets(context);
    }

    /**
     * Jika jadual berbilang hari (upcoming_days_json) tersimpan dan tarikh sudah beralih ke hari baharu,
     * muatkan jadual hari ini secara automatik tanpa perlu membuka aplikasi.
     */
    private static void rollOverToTodayScheduleIfAvailable(SharedPreferences prefs) {
        try {
            String todayStr = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
            String storedDate = prefs.getString("date", "");
            if (todayStr.equals(storedDate)) return;

            String upcomingJson = prefs.getString("upcoming_days_json", null);
            if (upcomingJson == null || upcomingJson.isEmpty()) return;

            JSONArray arr = new JSONArray(upcomingJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item != null && todayStr.equals(item.optString("date", ""))) {
                    SharedPreferences.Editor ed = prefs.edit();
                    ed.putString("date", todayStr);
                    if (item.has("hijri") && !item.optString("hijri").isEmpty()) {
                        ed.putString("hijri", item.optString("hijri"));
                    }
                    if (item.has("imsak")) ed.putString("imsak", item.optString("imsak"));
                    if (item.has("subuh")) ed.putString("subuh", item.optString("subuh"));
                    if (item.has("syuruk")) ed.putString("syuruk", item.optString("syuruk"));
                    if (item.has("zohor")) ed.putString("zohor", item.optString("zohor"));
                    if (item.has("asar")) ed.putString("asar", item.optString("asar"));
                    if (item.has("maghrib")) ed.putString("maghrib", item.optString("maghrib"));
                    if (item.has("isyak")) ed.putString("isyak", item.optString("isyak"));
                    ed.apply();
                    Log.i(TAG, "Jadual widget berjaya bertukar secara automatik untuk tarikh: " + todayStr);
                    return;
                }
            }
        } catch (Throwable ignored) {}
    }

    private static NextPrayerComputed computeNextPrayerNow(SharedPreferences prefs) {
        long now = System.currentTimeMillis();

        String[] keys = new String[]{"subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"};
        String[] labels = new String[]{"Subuh", "Syuruk", "Zohor", "Asar", "Maghrib", "Isyak"};

        for (int i = 0; i < keys.length; i++) {
            String rawTime = prefs.getString(keys[i], "");
            long ts = parseTimeTodayMillis(rawTime, 0);
            if (ts > now) {
                return new NextPrayerComputed(labels[i], formatCleanDisplayTime(rawTime), ts);
            }
        }

        // Selepas Isyak: waktu seterusnya ialah Subuh hari esok
        String tomorrowSubuhRaw = getTomorrowSubuhFromCache(prefs);
        if (tomorrowSubuhRaw == null || tomorrowSubuhRaw.isEmpty()) {
            tomorrowSubuhRaw = prefs.getString("subuh", "05:50");
        }
        long tomorrowSubuhTs = parseTimeTodayMillis(tomorrowSubuhRaw, 1);
        return new NextPrayerComputed("Subuh", formatCleanDisplayTime(tomorrowSubuhRaw), tomorrowSubuhTs);
    }

    private static String getTomorrowSubuhFromCache(SharedPreferences prefs) {
        try {
            String upcomingJson = prefs.getString("upcoming_days_json", null);
            if (upcomingJson == null || upcomingJson.isEmpty()) return null;

            Calendar cal = Calendar.getInstance();
            cal.add(Calendar.DAY_OF_YEAR, 1);
            String tomorrowStr = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.getTime());

            JSONArray arr = new JSONArray(upcomingJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item != null && tomorrowStr.equals(item.optString("date", ""))) {
                    return item.optString("subuh", null);
                }
            }
        } catch (Throwable ignored) {}
        return null;
    }

    private static long parseTimeTodayMillis(String timeStr, int addDays) {
        if (timeStr == null || timeStr.trim().isEmpty() || "--:--".equals(timeStr.trim())) {
            return 0L;
        }
        try {
            String cleaned = timeStr.trim().toUpperCase(Locale.ROOT);
            boolean isPM = cleaned.contains("PM");
            boolean isAM = cleaned.contains("AM");
            String numericPart = cleaned.replaceAll("[^0-9:]", "");
            String[] parts = numericPart.split(":");
            if (parts.length < 2) return 0L;

            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);

            if (isPM && hour < 12) hour += 12;
            else if (isAM && hour == 12) hour = 0;

            Calendar cal = Calendar.getInstance();
            if (addDays != 0) {
                cal.add(Calendar.DAY_OF_YEAR, addDays);
            }
            cal.set(Calendar.HOUR_OF_DAY, hour);
            cal.set(Calendar.MINUTE, minute);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            return cal.getTimeInMillis();
        } catch (Throwable ignored) {
            return 0L;
        }
    }

    private static String formatCleanDisplayTime(String rawTime) {
        if (rawTime == null || rawTime.trim().isEmpty() || "--:--".equals(rawTime.trim())) {
            return "--:--";
        }
        String upper = rawTime.trim().toUpperCase(Locale.ROOT);
        if (upper.contains("AM") || upper.contains("PM")) {
            return rawTime.trim();
        }
        long ts = parseTimeTodayMillis(rawTime, 0);
        if (ts > 0) {
            return new SimpleDateFormat("h:mm a", Locale.US).format(new Date(ts));
        }
        return rawTime.trim();
    }

    private static void scheduleNextWidgetTick(Context context, long nextPrayerTimestamp) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            long now = System.currentTimeMillis();

            // Kira tengah malam seterusnya (00:00:05) supaya tarikh & jadual hari baharu bertukar tepat
            Calendar midnight = Calendar.getInstance();
            midnight.add(Calendar.DAY_OF_YEAR, 1);
            midnight.set(Calendar.HOUR_OF_DAY, 0);
            midnight.set(Calendar.MINUTE, 0);
            midnight.set(Calendar.SECOND, 5);
            midnight.set(Calendar.MILLISECOND, 0);
            long nextMidnightMillis = midnight.getTimeInMillis();

            long targetTrigger = nextMidnightMillis;
            if (nextPrayerTimestamp > now && nextPrayerTimestamp < nextMidnightMillis) {
                targetTrigger = nextPrayerTimestamp + 1500L; // +1.5 saat selepas waktu solat masuk
            }

            Intent tickIntent = new Intent(context, SolatWidgetProvider.class);
            tickIntent.setAction(ACTION_WIDGET_TICK);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                WIDGET_TICK_REQUEST_CODE,
                tickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            boolean canExact = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                canExact = alarmManager.canScheduleExactAlarms();
            }

            if (canExact) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, targetTrigger, pendingIntent);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, targetTrigger, pendingIntent);
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, targetTrigger, pendingIntent);
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, targetTrigger, pendingIntent);
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "Gagal menjadualkan penggera kemaskini widget: " + t.getMessage());
        }
    }

    private static void cancelWidgetTick(Context context) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent tickIntent = new Intent(context, SolatWidgetProvider.class);
            tickIntent.setAction(ACTION_WIDGET_TICK);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                WIDGET_TICK_REQUEST_CODE,
                tickIntent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
            }
        } catch (Throwable ignored) {}
    }
}
