package com.solatkini.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(
    name = "AzanAlarm",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class AzanAlarmPlugin extends Plugin {
    private static final String TAG = "AzanAlarmPlugin";
    private static final String PREFS_NAME = "SolatKiniAlarms";
    private static final String KEY_STORED_ALARMS = "scheduled_alarms_json";

    @PluginMethod
    public void checkNotificationPermission(PluginCall call) {
        Context context = getContext();
        boolean notificationsGranted = false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationsGranted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;
        } else {
            notificationsGranted = NotificationManagerCompat.from(context).areNotificationsEnabled();
        }

        boolean exactAlarmAllowed = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                exactAlarmAllowed = alarmManager.canScheduleExactAlarms();
            }
        }

        JSObject ret = new JSObject();
        ret.put("notificationsGranted", notificationsGranted);
        ret.put("exactAlarmAllowed", exactAlarmAllowed);
        ret.put("sdkInt", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            ActivityCompat.requestPermissions(
                                getActivity(),
                                new String[]{Manifest.permission.POST_NOTIFICATIONS},
                                MainActivity.NOTIFICATION_PERMISSION_CODE
                            );
                        }
                    });
                }
                JSObject ret = new JSObject();
                ret.put("granted", false);
                ret.put("status", "requested");
                call.resolve(ret);
                return;
            }
        }

        JSObject ret = new JSObject();
        ret.put("granted", true);
        ret.put("status", "granted");
        call.resolve(ret);
    }

    @PermissionCallback
    public void notificationCallback(PluginCall call) {
        boolean granted = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            granted = ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;
        } else {
            granted = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("status", granted ? "granted" : "denied");
        call.resolve(ret);
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
                return;
            } catch (Exception e) {
                Log.w(TAG, "Gagal membuka tetapan exact alarm khusus", e);
            }
        }

        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Tidak dapat membuka tetapan aplikasi: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
            } else {
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
            }
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Gagal membuka tetapan notifikasi", e);
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallback.setData(Uri.parse("package:" + context.getPackageName()));
                fallback.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
            } catch (Exception err) {
                call.reject("Tidak dapat membuka tetapan sistem: " + err.getMessage());
            }
        }
    }

    @PluginMethod
    public void schedulePrayerAlarms(PluginCall call) {
        try {
            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                call.reject("AlarmManager peranti tidak tersedia");
                return;
            }

            JSArray alarmsArray = call.getArray("alarms");
            if (alarmsArray == null) {
                call.reject("Parameter 'alarms' diperlukan");
                return;
            }

            long now = System.currentTimeMillis();
            JSONArray jsonList = new JSONArray();
            int scheduledCount = 0;

            for (int i = 0; i < alarmsArray.length(); i++) {
                JSONObject obj = alarmsArray.getJSONObject(i);
                String prayerKey = obj.optString("prayerKey", "solat");
                String prayerName = obj.optString("prayerName", "Solat");
                String voice = obj.optString("voice", "jakim");
                long timestamp = obj.optLong("timestamp", 0);
                int requestCode = 2000 + i;

                JSONObject storedObj = new JSONObject();
                storedObj.put("prayerKey", prayerKey);
                storedObj.put("prayerName", prayerName);
                storedObj.put("voice", voice);
                storedObj.put("timestamp", timestamp);
                storedObj.put("requestCode", requestCode);
                jsonList.put(storedObj);

                if (timestamp > now) {
                    // PendingIntent ke AzanAlarmReceiver
                    Intent intent = new Intent(context, AzanAlarmReceiver.class);
                    intent.setAction(AzanAlarmReceiver.ACTION_TRIGGER_AZAN);
                    intent.putExtra("prayer_key", prayerKey);
                    intent.putExtra("prayer_name", prayerName);
                    intent.putExtra("voice", voice);

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    // PendingIntent paparan aktiviti ke MainActivity
                    Intent showIntent = new Intent(context, MainActivity.class);
                    showIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    PendingIntent showPendingIntent = PendingIntent.getActivity(
                        context,
                        requestCode + 10000,
                        showIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(timestamp, showPendingIntent);
                        alarmManager.setAlarmClock(clockInfo, pendingIntent);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
                    }
                    scheduledCount++;
                    Log.i(TAG, "Penggera solat (" + prayerName + ") berjaya dijadualkan melalui setAlarmClock pada: " + timestamp);
                }
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_STORED_ALARMS, jsonList.toString()).apply();
            if (alarmsArray.length() > 0) {
                JSONObject firstObj = alarmsArray.getJSONObject(0);
                String activeVoice = firstObj.optString("voice", "jakim");
                prefs.edit().putString("selected_azan_voice", activeVoice).apply();
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("scheduledCount", scheduledCount);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Ralat menjadualkan penggera solat asli", e);
            call.reject("Gagal menjadualkan penggera azan: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        try {
            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            if (alarmManager != null) {
                for (int i = 0; i < 20; i++) {
                    Intent intent = new Intent(context, AzanAlarmReceiver.class);
                    intent.setAction(AzanAlarmReceiver.ACTION_TRIGGER_AZAN);
                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        2000 + i,
                        intent,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
                    );
                    if (pendingIntent != null) {
                        alarmManager.cancel(pendingIntent);
                        pendingIntent.cancel();
                    }
                }
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().remove(KEY_STORED_ALARMS).apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal membatalkan penggera azan: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void testAlarmNow(PluginCall call) {
        try {
            Context context = getContext();
            String prayerName = call.getString("prayerName", "Ujian Azan");
            String prayerKey = call.getString("prayerKey", "subuh");
            String voice = call.getString("voice", "jakim");
            int delaySeconds = call.getInt("delaySeconds", 2);

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, AzanAlarmReceiver.class);
            intent.setAction(AzanAlarmReceiver.ACTION_TRIGGER_AZAN);
            intent.putExtra("prayer_key", prayerKey);
            intent.putExtra("prayer_name", prayerName);
            intent.putExtra("voice", voice);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                9999,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent showIntent = new Intent(context, MainActivity.class);
            showIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent showPendingIntent = PendingIntent.getActivity(
                context,
                19999,
                showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            long triggerAtMillis = System.currentTimeMillis() + (delaySeconds * 1000L);
            if (alarmManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, showPendingIntent);
                    alarmManager.setAlarmClock(clockInfo, pendingIntent);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                }
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString("selected_azan_voice", voice).apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("delaySeconds", delaySeconds);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal menguji penggera azan: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void setActiveAzanVoice(PluginCall call) {
        String voice = call.getString("voice", "jakim");
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString("selected_azan_voice", voice).apply();
        Log.i(TAG, "Nada azan dikemaskini dalam SharedPreferences: " + voice);
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("voice", voice);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopAzanAudio(PluginCall call) {
        try {
            Context context = getContext();
            Intent stopIntent = new Intent(context, AzanAudioService.class);
            stopIntent.setAction(AzanAudioService.ACTION_STOP_AZAN);
            context.startService(stopIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal menghentikan audio azan: " + e.getMessage(), e);
        }
    }
}
