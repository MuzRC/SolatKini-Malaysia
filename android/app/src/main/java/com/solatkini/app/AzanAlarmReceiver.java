package com.solatkini.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import java.util.Calendar;
import org.json.JSONArray;
import org.json.JSONObject;

public class AzanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AzanAlarmReceiver";
    public static final String ACTION_TRIGGER_AZAN = "com.solatkini.app.TRIGGER_AZAN";

    private static PowerManager.WakeLock sReceiverWakeLock;

    /**
     * Memegang WakeLock serta-merta semasa broadcast masuk agar CPU Snapdragon / MediaTek
     * tidak sempat tidur semula sebelum servis latar depan dimulakan.
     */
    public static synchronized void acquireReceiverWakeLock(Context context) {
        try {
            if (sReceiverWakeLock == null) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    sReceiverWakeLock = pm.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK,
                        "SolatKini::ReceiverWakeLock"
                    );
                    sReceiverWakeLock.setReferenceCounted(false);
                }
            }
            if (sReceiverWakeLock != null && !sReceiverWakeLock.isHeld()) {
                sReceiverWakeLock.acquire(45 * 1000L); // Tahan selama 45 saat untuk serahan ke servis
                Log.d(TAG, "Receiver WakeLock berjaya dipegang.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Gagal memegang Receiver WakeLock", e);
        }
    }

    /**
     * Dilepaskan oleh AzanAudioService sebaik sahaja servis berjaya memegang wakelock sendiri.
     */
    public static synchronized void releaseReceiverWakeLock() {
        try {
            if (sReceiverWakeLock != null && sReceiverWakeLock.isHeld()) {
                sReceiverWakeLock.release();
                Log.d(TAG, "Receiver WakeLock berjaya dilepaskan oleh audio service.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Ralat melepaskan Receiver WakeLock", e);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : "";
        if (!ACTION_TRIGGER_AZAN.equals(action)) {
            return;
        }

        // 1. Kunci CPU serta-merta tanpa berlengah (Penting untuk MediaTek CorePilot & Snapdragon)
        acquireReceiverWakeLock(context);

        String prayerName = intent.getStringExtra("prayer_name");
        String prayerKey = intent.getStringExtra("prayer_key");
        String voice = intent.getStringExtra("voice");
        long scheduledTime = intent.getLongExtra("scheduled_timestamp", 0);
        long now = System.currentTimeMillis();

        boolean isTest = "test".equalsIgnoreCase(prayerKey);

        // 2. Semakan Keselamatan Masa: Hanya abaikan jika tersasar > 15 minit bagi waktu solat sebenar
        if (!isTest && scheduledTime > 0 && Math.abs(now - scheduledTime) > (15 * 60 * 1000L)) {
            Log.w(TAG, "Penggera solat (" + prayerName + ") tersasar dari masa sebenar. Dibatalkan demi keselamatan.");
            releaseReceiverWakeLock();
            return;
        }

        Log.i(TAG, "Penggera masuk waktu: " + prayerName + " [" + voice + "]");

        // 3. Lancarkan AzanAudioService (Audio Foreground Service rasmi yang membawa Heads-Up Notification)
        try {
            Intent audioServiceIntent = new Intent(context, AzanAudioService.class);
            audioServiceIntent.setAction(AzanAudioService.ACTION_PLAY_AZAN);
            audioServiceIntent.putExtra("prayer_name", prayerName);
            audioServiceIntent.putExtra("prayer_key", prayerKey);
            audioServiceIntent.putExtra("voice", voice);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(audioServiceIntent);
            } else {
                context.startService(audioServiceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Gagal melancarkan AzanAudioService dari receiver", e);
            releaseReceiverWakeLock();
        }

        // 4. Jadualkan semula waktu solat ini untuk hari esok (+24 jam) supaya penggera tidak putus
        if (!isTest && scheduledTime > 0 && prayerKey != null) {
            rescheduleForTomorrow(context, prayerKey, prayerName, voice, scheduledTime);
        }

        // 5. PENYELAMAT NOTIFIKASI: Kemas kini notifikasi kekal dan widget ke waktu solat seterusnya secara berdikari
        if (!isTest) {
            try {
                SolatWidgetPlugin.refreshPersistentNotification(context);
                Log.i(TAG, "[Native Background] Notifikasi tetap & widget berjaya dikemas kini selepas waktu " + prayerName);
            } catch (Exception e) {
                Log.e(TAG, "Ralat mengemas kini notifikasi SolatWidget dari receiver: " + e.getMessage());
            }
        }
    }

    private void rescheduleForTomorrow(Context context, String prayerKey, String prayerName, String voice, long previousTimestamp) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(previousTimestamp);
            cal.add(Calendar.DAY_OF_YEAR, 1);
            long nextTimestamp = cal.getTimeInMillis();

            int requestCode = AzanAlarmPlugin.getRequestCodeForPrayer(prayerKey, 0);

            Intent nextIntent = new Intent(context, AzanAlarmReceiver.class);
            nextIntent.setAction(ACTION_TRIGGER_AZAN);
            nextIntent.putExtra("prayer_key", prayerKey);
            nextIntent.putExtra("prayer_name", prayerName);
            nextIntent.putExtra("voice", voice);
            nextIntent.putExtra("scheduled_timestamp", nextTimestamp);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent showAppIntent = new Intent(context, MainActivity.class);
            showAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent showPendingIntent = PendingIntent.getActivity(
                context,
                requestCode + 10000,
                showAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(nextTimestamp, showPendingIntent);
                    alarmManager.setAlarmClock(clockInfo, pendingIntent);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTimestamp, pendingIntent);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextTimestamp, pendingIntent);
                }
                Log.i(TAG, "Penggera solat (" + prayerName + ") berjaya dijadualkan semula untuk esok pada: " + nextTimestamp);
            } catch (SecurityException se) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTimestamp, pendingIntent);
                }
            }

            // Kemas kini rekod dalam SharedPreferences secara serta-merta (guna commit agar data sedia dibaca)
            updateStoredAlarmJson(context, prayerKey, nextTimestamp);
        } catch (Exception ex) {
            Log.e(TAG, "Ralat semasa menjadualkan semula waktu solat esok: " + ex.getMessage());
        }
    }

    private void updateStoredAlarmJson(Context context, String prayerKey, long newTimestamp) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(AzanAlarmPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(AzanAlarmPlugin.KEY_STORED_ALARMS, null);
            if (rawJson == null) return;

            JSONArray list = new JSONArray(rawJson);
            for (int i = 0; i < list.length(); i++) {
                JSONObject item = list.getJSONObject(i);
                if (prayerKey.equalsIgnoreCase(item.optString("prayerKey"))) {
                    item.put("timestamp", newTimestamp);
                    break;
                }
            }
            prefs.edit().putString(AzanAlarmPlugin.KEY_STORED_ALARMS, list.toString()).commit();
        } catch (Exception e) {
            Log.w(TAG, "Gagal mengemas kini SharedPreferences JSON: " + e.getMessage());
        }
    }
}
