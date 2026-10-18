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
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {

            Log.i(TAG, "Peranti dihidupkan semula (Boot Completed). Menjadualkan semula penggera solat...");
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

            long now = System.currentTimeMillis();

            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                String prayerKey = obj.optString("prayerKey", "solat");
                String prayerName = obj.optString("prayerName", "Solat");
                String voice = obj.optString("voice", "jakim");
                long timestamp = obj.optLong("timestamp", 0);
                int requestCode = obj.optInt("requestCode", 1000 + i);

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

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
                    }
                    Log.i(TAG, "Penggera solat " + prayerName + " berjaya dijadualkan semula pada timestamp: " + timestamp);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Ralat menjadualkan semula penggera dari BootReceiver", e);
        }
    }
}
