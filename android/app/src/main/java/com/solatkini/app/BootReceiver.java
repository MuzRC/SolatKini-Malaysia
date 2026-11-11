package com.solatkini.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Date;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "SolatKiniBoot";
    public static final String PREFS_NAME = "SolatKiniPrefs";
    public static final String KEY_SCHEDULE = "saved_prayer_schedule";
    public static final String KEY_ACTIVE_VOICE = "active_azan_voice";
    public static final String ACTION_TRIGGER_AZAN = "com.solatkini.app.TRIGGER_AZAN_ALARM";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {

            Log.d(TAG, "Telefon hidup semula (" + action + "). Menjadualkan semula waktu solat...");
            reschedulePrayers(context);
        }
    }

    private void reschedulePrayers(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String scheduleJsonStr = prefs.getString(KEY_SCHEDULE, null);
        String activeVoice = prefs.getString(KEY_ACTIVE_VOICE, "jakim_rasmi");

        if (scheduleJsonStr == null || scheduleJsonStr.trim().isEmpty()) {
            Log.w(TAG, "Tiada rekod jadual solat dijumpai dalam SharedPreferences.");
            return;
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager tidak tersedia pada peranti.");
            return;
        }

        // Semakan kebenaran exact alarm untuk Android 12+ (API 31+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                Log.w(TAG, "Kebenaran SCHEDULE_EXACT_ALARM belum diaktifkan oleh pengguna.");
                return;
            }
        }

        try {
            JSONArray prayersArray = new JSONArray(scheduleJsonStr);
            long currentTime = System.currentTimeMillis();
            int scheduledCount = 0;

            for (int i = 0; i < prayersArray.length(); i++) {
                JSONObject prayer = prayersArray.getJSONObject(i);
                String prayerKey = prayer.getString("key");       // Contoh: "subuh", "zohor", "asar", dsb.
                String prayerName = prayer.getString("name");     // Contoh: "Subuh", "Zohor", dsb.
                long triggerTime = prayer.getLong("timestamp");    // Epoch timestamp dalam millisecond

                // Subuh sentiasa pakai suara khas Subuh, waktu lain ikut tetapan aktif
                String voiceToUse = prayerKey.equalsIgnoreCase("subuh") ? "subuh_special" : activeVoice;

                // Cuma jadualkan waktu solat yang belum lepas
                if (triggerTime > currentTime) {
                    Intent alarmIntent = new Intent(context, AzanAlarmReceiver.class);
                    alarmIntent.setAction(ACTION_TRIGGER_AZAN);
                    alarmIntent.putExtra("PRAYER_KEY", prayerKey);
                    alarmIntent.putExtra("PRAYER_NAME", prayerName);
                    alarmIntent.putExtra("AZAN_VOICE", voiceToUse);

                    int requestCode = getRequestCodeForKey(prayerKey);

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        alarmIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    // Gunakan setAlarmClock supaya kebal Doze Mode & tembus lock screen
                    AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerTime, pendingIntent);
                    alarmManager.setAlarmClock(clockInfo, pendingIntent);

                    scheduledCount++;
                    Log.d(TAG, "Berjaya set penggera: " + prayerName + " pada " + new Date(triggerTime));
                }
            }

            Log.i(TAG, "Selesai! Sebanyak " + scheduledCount + " waktu solat berjaya dijadualkan semula.");

        } catch (Exception e) {
            Log.e(TAG, "Gagal mengurai atau menjadualkan semula waktu solat: " + e.getMessage(), e);
        }
    }

    private int getRequestCodeForKey(String prayerKey) {
        switch (prayerKey.toLowerCase()) {
            case "subuh": return 1001;
            case "syuruk": return 1002;
            case "zohor": return 1003;
            case "asar": return 1004;
            case "maghrib": return 1005;
            case "isyak": return 1006;
            default: return 1000;
        }
    }
}
