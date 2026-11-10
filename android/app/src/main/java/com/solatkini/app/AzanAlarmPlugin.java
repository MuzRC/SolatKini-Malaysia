package com.solatkini.app;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

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

    // --- 1. NOTIFIKASI ---
    @PluginMethod
    public void checkNotificationPermission(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            boolean isGranted = getPermissionState("notifications") == PermissionState.GRANTED;
            ret.put("notificationsGranted", isGranted);
        } else {
            ret.put("notificationsGranted", true);
        }
        ret.put("exactAlarmAllowed", true);
        ret.put("sdkInt", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getPermissionState("notifications") != PermissionState.GRANTED) {
                requestPermissionForAlias("notifications", call, "notificationPermCallback");
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        ret.put("status", "granted");
        call.resolve(ret);
    }

    @PermissionCallback
    private void notificationPermCallback(PluginCall call) {
        JSObject ret = new JSObject();
        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            ret.put("granted", true);
            ret.put("status", "granted");
        } else {
            ret.put("granted", false);
            ret.put("status", "denied");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            } else {
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal buka tetapan notifikasi: " + e.getMessage());
        }
    }

    // --- 2. BATERI & OPTIMASI SISTEM ---
    @PluginMethod
    public void isBatteryOptimized(PluginCall call) {
        JSObject ret = new JSObject();
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean isIgnoring = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
            isIgnoring = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        ret.put("isIgnoringBatteryOptimizations", isIgnoring);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal buka pengecualian bateri: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAutostartSettings(PluginCall call) {
        openNotificationSettings(call);
    }

    // --- 3. PENGGERA TEPAT & MASA AUTOMATIK ---
    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal buka tetapan exact alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkAutoTime(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            int autoTime = Settings.Global.getInt(getContext().getContentResolver(), Settings.Global.AUTO_TIME, 1);
            int autoTimeZone = Settings.Global.getInt(getContext().getContentResolver(), Settings.Global.AUTO_TIME_ZONE, 1);
            ret.put("isAutoTimeEnabled", autoTime == 1);
            ret.put("isAutoTimeZoneEnabled", autoTimeZone == 1);
        } catch (Exception e) {
            ret.put("isAutoTimeEnabled", true);
            ret.put("isAutoTimeZoneEnabled", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openDateSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_DATE_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal buka tetapan tarikh: " + e.getMessage());
        }
    }

    // --- 4. ALARM & SUARA AZAN (STUB HANDLER) ---
    @PluginMethod
    public void setActiveAzanVoice(PluginCall call) {
        String voice = call.getString("voice", "jakim");
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("voice", voice);
        call.resolve(ret);
    }

    @PluginMethod
    public void schedulePrayerAlarms(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("scheduledCount", 5);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void testAlarmNow(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopAzanAudio(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
