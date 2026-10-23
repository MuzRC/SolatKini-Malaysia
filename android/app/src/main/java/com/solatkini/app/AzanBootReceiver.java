package com.solatkini.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import java.util.Calendar;
import org.json.JSONArray;
import org.json.JSONObject;

public class AzanBootReceiver extends BroadcastReceiver {
    private static final String TAG = "AzanBootReceiver";
    private static final String PREFS_NAME = "SolatKiniAlarms";
    private static final String KEY_STORED_ALARMS = "scheduled_alarms_json";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : "";
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {

            Log.i(TAG, "Peranti dihidupkan semula (Boot Action: " + action + ").");

            // 1. Semak tetapan auto-start (Lalai: TRUE)
            SharedPreferences appPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            
            boolean isAutoStartEnabled = true;
            if (appPrefs.contains("solatkini_autostart_boot")) {
                isAutoStartEnabled = appPrefs.getBoolean("solatkini_autostart_boot", true);
            } else if (capPrefs.contains("solatkini_autostart_boot")) {
                String val = capPrefs.getString("solatkini_autostart_boot", "true");
                isAutoStartEnabled = "true".equalsIgnoreCase(val);
            }

            if (!isAutoStartEnabled) {
                Log.d(TAG, "Pengguna telah mematikan fungsi auto-start SolatKini.");
                return;
            }

            // 2. Jadualkan semula semua penggera azan tepat di latar belakang
            Log.i(TAG, "Auto-start AKTIF. Menjadualkan semula penggera waktu solat...");
            rescheduleStoredAlarms(context);

            // 3. Percubaan melancarkan MainActivity secara selamat
            // Pada Android 10+, sistem biasanya menyekat background activity launch melainkan diberi izin khas
            try {
                Intent launchIntent = new Intent(context, MainActivity.class);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(launchIntent);
                Log.i(TAG, "Aplikasi SolatKini dilancarkan ke latar depan.");
            } catch (Exception e) {
                Log.d(TAG, "Pelancaran skrin depan dihadkan oleh OS Android (Normal untuk background boot): " + e.getMessage());
            }
        }
    }

    public static void rescheduleStoredAlarms(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String alarmsJson = prefs.getString(KEY_STORED_ALARMS, null);
            if (alarmsJson == null || alarmsJson.isEmpty()) {
                Log.d(TAG, "Tiada data penggera tersimpan untuk dijadualkan semula.");
                return;
            }

            JSONArray array = new JSONArray(alarmsJson);
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            long now = System.currentTimeMillis();
            int rescheduledCount = 0;
            boolean hasUpdates = false;

            for (int i = 0; i < array.length(); i++) {
                try {
                    JSONObject obj = array.getJSONObject(i);
                    String prayerKey = obj.optString("prayerKey", "solat");
                    String prayerName = obj.optString("prayerName", "Solat");
                    String voice = obj.optString("voice", "jakim");
                    long timestamp = obj.optLong("timestamp", 0);
                    int requestCode = obj.optInt("requestCode", 2000 + i);

                    if (timestamp <= 0) continue;

                    // Kunci kebal Subuh Khas
                    if ("subuh".equalsIgnoreCase(prayerKey)) {
                        voice = "subuh_special";
                    }

                    // Ambil jam & minit solat daripada cap masa tersimpan
                    Calendar storedCal = Calendar.getInstance();
                    storedCal.setTimeInMillis(timestamp);

                    Calendar targetCal = Calendar.getInstance();
                    targetCal.set(Calendar.HOUR_OF_DAY, storedCal.get(Calendar.HOUR_OF_DAY));
                    targetCal.set(Calendar.MINUTE, storedCal.get(Calendar.MINUTE));
                    targetCal.set(Calendar.SECOND, 0);
                    targetCal.set(Calendar.MILLISECOND, 0);

                    // Jika waktu solat berkenaan sudah berlalu hari ini, anjakkan terus ke hari esok
                    if (targetCal.getTimeInMillis() <= now) {
                        targetCal.add(Calendar.DAY_OF_YEAR, 1);
                    }

                    long triggerTimestamp = targetCal.getTimeInMillis();

                    // Kemas kini timestamp terkini dalam array jika ada perubahan
                    if (triggerTimestamp != timestamp) {
                        obj.put("timestamp", triggerTimestamp);
                        obj.put("voice", voice);
                        hasUpdates = true;
                    }

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

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerTimestamp, pendingIntent);
                        alarmManager.setAlarmClock(clockInfo, pendingIntent);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTimestamp, pendingIntent);
                    }

                    rescheduledCount++;
                    Log.i(TAG, "Penggera solat " + prayerName + " [" + voice + "] berjaya dijadualkan pada: " + triggerTimestamp);
                } catch (Exception individualEx) {
                    Log.w(TAG, "Gagal menjadualkan satu slot solat pada indeks " + i, individualEx);
                }
            }

            // Simpan semula senarai penggera yang sudah dikemas kini tarikhnya
            if (hasUpdates) {
                prefs.edit().putString(KEY_STORED_ALARMS, array.toString()).apply();
            }

            Log.i(TAG, "Selesai menjadualkan semula " + rescheduledCount + " waktu solat selepas reboot.");
        } catch (Exception e) {
            Log.e(TAG, "Ralat menjadualkan semula penggera dari AzanBootReceiver", e);
        }
    }
}
