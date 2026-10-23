package com.solatkini.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
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
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // Android 13+ / API 33
            notificationsGranted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;
        } else {
            notificationsGranted = NotificationManagerCompat.from(context).areNotificationsEnabled();
        }

        boolean exactAlarmAllowed = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) { // Android 12+ / API 31
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
                Log.w(TAG, "Gagal membuka tetapan exact alarm khusus, mencuba tetapan aplikasi", e);
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
            Log.e(TAG, "Gagal membuka tetapan notifikasi khusus, beralih ke tetapan aplikasi", e);
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
     * Semak sama ada aplikasi telah dikecualikan daripada sekatan bateri (Doze mode)
     */
    @PluginMethod
    public void isBatteryOptimized(PluginCall call) {
        try {
            Context context = getContext();
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            boolean isIgnoring = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
                isIgnoring = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }
            JSObject ret = new JSObject();
            ret.put("isIgnoringBatteryOptimizations", isIgnoring);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal menyemak status bateri: " + e.getMessage());
        }
    }

    /**
     * Membuka dialog sistem untuk meminta pengecualian sekatan bateri secara langsung
     */
    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        try {
            Context context = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                } else {
                    openGeneralBatterySettings(context);
                }
            } else {
                openGeneralBatterySettings(context);
            }
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.w(TAG, "Gagal meminta pengecualian bateri langsung, membuka tetapan umum", e);
            openGeneralBatterySettings(getContext());
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        }
    }

    /**
     * Pintasan Deep Link terus ke menu 'Autostart' atau pengurusan latar belakang mengikut jenama peranti
     */
    @PluginMethod
    public void openAutostartSettings(PluginCall call) {
        Context context = getContext();
        String manufacturer = Build.MANUFACTURER != null ? Build.MANUFACTURER.toLowerCase() : "";
        Log.i(TAG, "Membuka tetapan autostart untuk jenama: " + manufacturer);

        boolean success = false;
        try {
            // 1. Xiaomi / Redmi / POCO (MIUI / HyperOS)
            if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco")) {
                success = tryStartActivity(context, new ComponentName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity"
                ));
                if (!success) {
                    success = tryStartActivity(context, new ComponentName(
                        "com.miui.securitycenter",
                        "com.miui.powercenter.PowerSettings"
                    ));
                }
            }
            // 2. OPPO / Realme / OnePlus (ColorOS / Realme UI / OxygenOS)
            else if (manufacturer.contains("oppo") || manufacturer.contains("realme") || manufacturer.contains("oneplus")) {
                success = tryStartActivity(context, new ComponentName(
                    "com.coloros.safecenter",
                    "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                ));
                if (!success) {
                    success = tryStartActivity(context, new ComponentName(
                        "com.coloros.safecenter",
                        "com.coloros.safecenter.startupapp.StartupAppListActivity"
                    ));
                }
                if (!success) {
                    success = tryStartActivity(context, new ComponentName(
                        "com.oplus.safecenter",
                        "com.oplus.safecenter.startupapp.StartupAppListActivity"
                    ));
                }
                if (!success) {
                    success = tryStartActivity(context, new ComponentName(
                        "com.oppo.safe",
                        "com.oppo.safe.permission.startup.StartupAppListActivity"
                    ));
                }
            }
            // 3. Vivo / iQOO (Funtouch OS / Origin OS)
            else if (manufacturer.contains("vivo") || manufacturer.contains("iqoo")) {
                success = tryStartActivity(context, new ComponentName(
                    "com.vivo.permissionmanager",
                    "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                ));
                if (!success) {
                    success = tryStartActivity(context, new ComponentName(
                        "com.iqoo.secure",
                        "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"
                    ));
                }
            }
            // 4. Huawei / Honor (EMUI / Magic UI)
            else if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
                success = tryStartActivity(context, new ComponentName(
                    "com.huawei.systemmanager",
                    "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                ));
                if (!success) {
                    success = tryStartActivity(context, new ComponentName(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.optimize.process.ProtectActivity"
                    ));
                }
            }
            // 5. Samsung (One UI)
            else if (manufacturer.contains("samsung")) {
                success = tryStartActivity(context, new ComponentName(
                    "com.samsung.android.lool",
                    "com.samsung.android.sm.ui.battery.BatteryActivity"
                ));
                if (!success) {
                    success = tryStartActivity(context, new ComponentName(
                        "com.samsung.android.sm",
                        "com.samsung.android.sm.ui.battery.BatteryActivity"
                    ));
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Ralat melancarkan aktiviti OEM autostart: " + e.getMessage());
        }

        // Sandaran Terulung: Jika jenama lain atau aktiviti OEM tiada, buka terus info aplikasi
        if (!success) {
            openAppDetailsSettings(context);
        }

        JSObject ret = new JSObject();
        ret.put("opened", true);
        call.resolve(ret);
    }

    private void openGeneralBatterySettings(Context context) {
        try {
            Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception ex) {
            openAppDetailsSettings(context);
        }
    }

    private boolean tryStartActivity(Context context, ComponentName componentName) {
        try {
            Intent intent = new Intent();
            intent.setComponent(componentName);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void openAppDetailsSettings(Context context) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Gagal membuka tetapan info aplikasi: " + e.getMessage());
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

                // Simpan setiap rekod bersama jenis suaranya secara tersendiri
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
                    intent.putExtra("scheduled_timestamp", timestamp); // Kunci: Elak azan memekak masa jam dianjak!

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(timestamp, pendingIntent);
                        alarmManager.setAlarmClock(clockInfo, pendingIntent);
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
                    }
                    scheduledCount++;
                    Log.i(TAG, "Penggera solat (" + prayerName + ") suara [" + voice + "] dijadualkan pada: " + timestamp);
                }
            }

            // Simpan keseluruhan jadual ke SharedPreferences untuk penjadualan semula bila telefon di-reboot
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_STORED_ALARMS, jsonList.toString()).apply();

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
            String prayerKey = call.getString("prayerKey", "test");
            String voice = call.getString("voice", "jakim");
            int delaySeconds = call.getInt("delaySeconds", 2);

            long triggerAtMillis = System.currentTimeMillis() + (delaySeconds * 1000L);

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, AzanAlarmReceiver.class);
            intent.setAction(AzanAlarmReceiver.ACTION_TRIGGER_AZAN);
            intent.putExtra("prayer_key", prayerKey);
            intent.putExtra("prayer_name", prayerName);
            intent.putExtra("voice", voice);
            intent.putExtra("scheduled_timestamp", triggerAtMillis);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                9999,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (alarmManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, pendingIntent);
                    alarmManager.setAlarmClock(clockInfo, pendingIntent);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                }
            }

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
        Log.i(TAG, "Nada azan harian aktif dikemaskini dalam SharedPreferences: " + voice);
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

    /**
     * Semak sama ada suis 'Set time automatically' dihidupkan dalam Settings telefon
     */
    @PluginMethod
    public void checkAutoTime(PluginCall call) {
        Context context = getContext();
        boolean autoTime = true;
        boolean autoTimeZone = true;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                autoTime = Settings.Global.getInt(context.getContentResolver(), Settings.Global.AUTO_TIME, 1) == 1;
                autoTimeZone = Settings.Global.getInt(context.getContentResolver(), Settings.Global.AUTO_TIME_ZONE, 1) == 1;
            } else {
                autoTime = Settings.System.getInt(context.getContentResolver(), Settings.System.AUTO_TIME, 1) == 1;
            }
        } catch (Exception e) {
            Log.w(TAG, "Gagal menyemak status masa automatik", e);
        }

        JSObject ret = new JSObject();
        ret.put("isAutoTimeEnabled", autoTime);
        ret.put("isAutoTimeZoneEnabled", autoTimeZone);
        call.resolve(ret);
    }

    /**
     * Buka terus halaman 'Date & time' dalam Tetapan telefon
     */
    @PluginMethod
    public void openDateSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_DATE_SETTINGS);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                fallback.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Tidak dapat membuka tetapan tarikh: " + ex.getMessage());
            }
        }
    }
}
