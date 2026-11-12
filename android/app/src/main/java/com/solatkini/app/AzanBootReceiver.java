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

public class AzanBootReceiver extends BroadcastReceiver {
    private static final String TAG = "AzanBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : "";
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {

            Log.i(TAG, "Peranti dihidupkan semula (" + action + "). Menjadualkan semula penggera solat...");
            rescheduleStoredAlarms(context);
        }
    }

    public static void rescheduleStoredAlarms(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("SolatKiniAlarms", Context.MODE_PRIVATE);
            String alarmsJson = prefs.getString("scheduled_alarms_json", null);
            if (alarmsJson == null || alarmsJson.isEmpty()) {
                Log.d(TAG, "Tiada data penggera tersimpan untuk dijadualkan semula.");
                return;
            }

            JSONArray array = new JSONArray(alarmsJson);
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            boolean canExact = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                canExact = alarmManager.canScheduleExactAlarms();
            }

            long now = System.currentTimeMillis();
            int scheduledCount = 0;

            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                String prayerKey = obj.optString("prayerKey", "solat");
                String prayerName = obj.optString("prayerName", "Solat");
                String voice = obj.optString("voice", "jakim");
                long timestamp = obj.optLong("timestamp", 0);
                int requestCode = obj.optInt("requestCode", 2000 + i);

                // Hanya jadualkan waktu solat yang masih belum lepas
                if (timestamp > now) {
                    Intent alarmIntent = new Intent(context, AzanAlarmReceiver.class);
                    alarmIntent.setAction(AzanAlarmReceiver.ACTION_TRIGGER_AZAN);
                    alarmIntent.putExtra("prayer_key", prayerKey);
                    alarmIntent.putExtra("prayer_name", prayerName);
                    alarmIntent.putExtra("voice", voice);

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        alarmIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    // PendingIntent paparan bila user tekan jam di lock screen
                    Intent showIntent = new Intent(context, MainActivity.class);
                    showIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    PendingIntent showPendingIntent = PendingIntent.getActivity(
                        context,
                        requestCode + 10000,
                        showIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    if (canExact) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(timestamp, showPendingIntent);
                            alarmManager.setAlarmClock(clockInfo, pendingIntent);
                        } else {
                            alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
                        }
                    } else {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
                        } else {
                            alarmManager.set(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
                        }
                    }

                    scheduledCount++;
                    Log.i(TAG, "Penggera solat " + prayerName + " berjaya dijadualkan semula pada: " + timestamp);
                }
            }

            // 1. Catat ke log diagnostik telefon
            AzanHistoryLogger.record(
                context,
                "Sistem Reboot",
                "boot",
                AzanHistoryLogger.STATUS_SUCCESS,
                "Peranti hidup semula. Sebanyak " + scheduledCount + " waktu solat berjaya dijadualkan semula ke AlarmManager."
            );

            // 2. Hidupkan semula notifikasi tetap bersama pemasa undur (Chronometer) & segerakkan widget skrin utama
            SolatWidgetPlugin.advanceToNextPrayer(context);
            SolatWidgetProvider.updateAllWidgets(context);

            Log.i(TAG, "Selesai! Penggera (" + scheduledCount + "), widget skrin, dan notifikasi pemasa undur berjaya disegarkan selepas reboot.");

        } catch (Exception e) {
            Log.e(TAG, "Ralat menjadualkan semula penggera dari BootReceiver", e);
            AzanHistoryLogger.record(
                context,
                "Sistem Reboot",
                "boot",
                AzanHistoryLogger.STATUS_FAILED,
                "Ralat penjadualan semula: " + e.getMessage()
            );
        }
    }
}
