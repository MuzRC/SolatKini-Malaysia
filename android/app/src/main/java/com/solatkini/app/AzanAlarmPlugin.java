package com.solatkini.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
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
import java.util.Locale;
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
                // Gunakan aliran kebenaran rasmi Capacitor supaya notificationCallback dipanggil selepas pengguna memilih
                requestPermissionForAlias("notifications", call, "notificationCallback");
                return;
            }
        }

        boolean granted = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("status", granted ? "granted" : "denied");
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

    /**
     * Kaedah pembantu untuk membatalkan semua penggera sedia ada berdasarkan rekod SharedPreferences
     * serta julat keselamatan lalai.
     */
    private void cancelStoredAlarms(Context context, AlarmManager alarmManager, SharedPreferences prefs) {
        if (alarmManager == null) return;

        int maxIndexToCancel = 20;
        String storedJson = prefs.getString(KEY_STORED_ALARMS, null);
        if (storedJson != null && !storedJson.isEmpty()) {
            try {
                JSONArray storedArray = new JSONArray(storedJson);
                for (int i = 0; i < storedArray.length(); i++) {
                    JSONObject obj = storedArray.optJSONObject(i);
                    if (obj != null) {
                        int reqCode = obj.optInt("requestCode", 2000 + i);
                        cancelSingleAlarm(context, alarmManager, reqCode);
                    }
                }
                if (storedArray.length() > maxIndexToCancel) {
                    maxIndexToCancel = storedArray.length();
                }
            } catch (Exception e) {
                Log.w(TAG, "Gagal membaca senarai penggera lama untuk dibatalkan", e);
            }
        }

        // Sandaran: batalkan mengikut indeks sekiranya ada penggera yang tidak direkodkan
        for (int i = 0; i < maxIndexToCancel; i++) {
            cancelSingleAlarm(context, alarmManager, 2000 + i);
        }
    }

    private void cancelSingleAlarm(Context context, AlarmManager alarmManager, int requestCode) {
        Intent intent = new Intent(context, AzanAlarmReceiver.class);
        intent.setAction(AzanAlarmReceiver.ACTION_TRIGGER_AZAN);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        }
    }

    private void scheduleExactOrFallback(AlarmManager alarmManager, long triggerAtMillis, PendingIntent showPendingIntent, PendingIntent operation) {
        boolean canExact = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            canExact = alarmManager.canScheduleExactAlarms();
        }

        if (canExact) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, showPendingIntent);
                alarmManager.setAlarmClock(clockInfo, operation);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
            }
        } else {
            Log.w(TAG, "Kebenaran Exact Alarm tiada. Menggunakan setAndAllowWhileIdle sebagai sandaran.");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
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

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            // Bersihkan penggera lama sebelum menjadualkan senarai baharu
            cancelStoredAlarms(context, alarmManager, prefs);

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

                    Intent showIntent = new Intent(context, MainActivity.class);
                    showIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    PendingIntent showPendingIntent = PendingIntent.getActivity(
                        context,
                        requestCode + 10000,
                        showIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    scheduleExactOrFallback(alarmManager, timestamp, showPendingIntent, pendingIntent);
                    scheduledCount++;
                    Log.i(TAG, "Penggera solat (" + prayerName + ") berjaya dijadualkan pada: " + timestamp);
                }
            }

            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(KEY_STORED_ALARMS, jsonList.toString());
            if (alarmsArray.length() > 0) {
                JSONObject firstObj = alarmsArray.getJSONObject(0);
                String activeVoice = firstObj.optString("voice", "jakim");
                editor.putString("selected_azan_voice", activeVoice);
            }
            editor.apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("scheduledCount", scheduledCount);
            call.resolve(ret);
        } catch (Throwable e) {
            Log.e(TAG, "Ralat menjadualkan penggera solat asli", e);
            call.reject("Gagal menjadualkan penggera azan: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        try {
            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            cancelStoredAlarms(context, alarmManager, prefs);
            prefs.edit().remove(KEY_STORED_ALARMS).apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable e) {
            call.reject("Gagal membatalkan penggera azan: " + e.getMessage());
        }
    }

    @PluginMethod
    public void testAlarmNow(PluginCall call) {
        try {
            Context context = getContext();
            String prayerName = call.getString("prayerName", "Ujian Azan");
            String prayerKey = call.getString("prayerKey", "subuh");
            String voice = call.getString("voice", "jakim");
            Integer delayObj = call.getInt("delaySeconds", 0);
            Integer autoStopObj = call.getInt("autoStopSeconds", 0);
            int delaySeconds = delayObj != null ? delayObj : 0;
            int autoStopSeconds = autoStopObj != null ? autoStopObj : 0;

            if (delaySeconds <= 0) {
                Intent serviceIntent = new Intent(context, AzanAudioService.class);
                serviceIntent.setAction(AzanAudioService.ACTION_PLAY_AZAN);
                serviceIntent.putExtra("prayer_key", prayerKey);
                serviceIntent.putExtra("prayer_name", prayerName);
                serviceIntent.putExtra("voice", voice);
                serviceIntent.putExtra("is_test", true);
                serviceIntent.putExtra("auto_stop_seconds", autoStopSeconds);

                try {
                    // Guna startService biasa masa app sedang terbuka di skrin (elak ForegroundServiceDidNotStartInTimeException)
                    context.startService(serviceIntent);
                } catch (Throwable e) {
                    Log.w(TAG, "startService gagal, mencuba startForegroundService: " + e.getMessage());
                    try {
                        ContextCompat.startForegroundService(context, serviceIntent);
                    } catch (Throwable ex) {
                        Log.e(TAG, "Gagal memulakan service audio: " + ex.getMessage(), ex);
                        AzanHistoryLogger.record(
                            context,
                            prayerName,
                            prayerKey,
                            AzanHistoryLogger.STATUS_FAILED,
                            "Gagal memulakan service audio: " + ex.getMessage()
                        );
                    }
                }
            } else {
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                Intent intent = new Intent(context, AzanAlarmReceiver.class);
                intent.setAction(AzanAlarmReceiver.ACTION_TRIGGER_AZAN);
                intent.putExtra("prayer_key", prayerKey);
                intent.putExtra("prayer_name", prayerName);
                intent.putExtra("voice", voice);
                intent.putExtra("is_test", true);
                intent.putExtra("auto_stop_seconds", autoStopSeconds);

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
                    scheduleExactOrFallback(alarmManager, triggerAtMillis, showPendingIntent, pendingIntent);
                }
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString("selected_azan_voice", voice).apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("delaySeconds", delaySeconds);
            ret.put("autoStopSeconds", autoStopSeconds);
            call.resolve(ret);
        } catch (Throwable e) {
            Log.e(TAG, "Gagal menguji penggera azan", e);
            call.reject("Gagal menguji penggera azan: " + e.getMessage());
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
            // Terus guna stopService() tanpa beratur ACTION_STOP_AZAN melalui startService()
            // supaya tidak mematikan audio baharu yang dimainkan serta-merta selepasnya.
            context.stopService(new Intent(context, AzanAudioService.class));

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable e) {
            call.reject("Gagal menghentikan audio azan: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isBatteryOptimized(PluginCall call) {
        Context context = getContext();
        boolean isIgnoring = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                isIgnoring = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }
        }
        JSObject ret = new JSObject();
        ret.put("isIgnoringBatteryOptimizations", isIgnoring);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
                return;
            } catch (Exception e) {
                Log.w(TAG, "Gagal membuka dialog pengecualian bateri khusus", e);
            }
        }

        try {
            Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal membuka tetapan bateri: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAutostartSettings(PluginCall call) {
        Context context = getContext();
        String brand = Build.MANUFACTURER.toLowerCase(Locale.ROOT);
        Intent intent = new Intent();
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            if (brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco")) {
                intent.setComponent(new ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"));
            } else if (brand.contains("oppo") || brand.contains("realme")) {
                intent.setComponent(new ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"));
            } else if (brand.contains("vivo")) {
                intent.setComponent(new ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"));
            } else if (brand.contains("huawei") || brand.contains("honor")) {
                intent.setComponent(new ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity"));
            } else {
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
            }
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallback.setData(Uri.parse("package:" + context.getPackageName()));
                fallback.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
            } catch (Exception err) {
                call.reject("Tidak dapat membuka tetapan permulaan automatik: " + err.getMessage());
            }
        }
    }

    @PluginMethod
    public void checkAutoTime(PluginCall call) {
        Context context = getContext();
        boolean autoTime = true;
        boolean autoTimeZone = true;

        try {
            autoTime = Settings.Global.getInt(context.getContentResolver(), Settings.Global.AUTO_TIME, 1) == 1;
            autoTimeZone = Settings.Global.getInt(context.getContentResolver(), Settings.Global.AUTO_TIME_ZONE, 1) == 1;
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("isAutoTimeEnabled", autoTime);
        ret.put("isAutoTimeZoneEnabled", autoTimeZone);
        call.resolve(ret);
    }

    @PluginMethod
    public void openDateSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_DATE_SETTINGS);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal membuka tetapan tarikh & masa: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAzanDiagnosticLogs(PluginCall call) {
        try {
            String logsJson = AzanHistoryLogger.getLogsJson(getContext());
            JSObject ret = new JSObject();
            ret.put("logsJson", logsJson);
            call.resolve(ret);
        } catch (Throwable e) {
            call.reject("Gagal mengambil log diagnostik azan: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearAzanDiagnosticLogs(PluginCall call) {
        try {
            AzanHistoryLogger.clearLogs(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable e) {
            call.reject("Gagal mengosongkan log diagnostik: " + e.getMessage());
        }
    }
}
