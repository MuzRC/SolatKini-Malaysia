package com.solatkini.app;

import android.Manifest;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.WindowManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    public static final int NOTIFICATION_PERMISSION_CODE = 101;
    private boolean permissionRequested = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SolatWidgetPlugin.class);
        registerPlugin(AzanAlarmPlugin.class);

        configureWakeAndLockScreen();
        super.onCreate(savedInstanceState);

        handleAzanIntent(getIntent());
    }

    @Override
    public void onResume() {
        super.onResume();
        if (!permissionRequested) {
            permissionRequested = true;
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    requestNotificationPermissionImmediate();
                }
            }, 700);
        }
    }

    public void requestNotificationPermissionImmediate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "Mencetuskan dialog kebenaran POST_NOTIFICATIONS pada onResume...");
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATION_PERMISSION_CODE
                );
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        configureWakeAndLockScreen();
        handleAzanIntent(intent);
    }

    private void configureWakeAndLockScreen() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
                KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                if (keyguardManager != null) {
                    keyguardManager.requestDismissKeyguard(this, null);
                }
            } else {
                getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                );
            }
        } catch (Exception e) {
            Log.w(TAG, "Gagal mengkonfigurasi bendera bangunkan skrin", e);
        }
    }

    private void handleAzanIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (SolatWidgetPlugin.ACTION_SYNC_PRAYER.equals(action)) {
            Log.i(TAG, "Menerima Intent Segerak Waktu Solat daripada widget notifikasi.");
            if (getBridge() != null) {
                getBridge().triggerWindowJSEvent("solatSyncRequested", "{}");
            }
        }

        boolean isAzanTrigger = intent.getBooleanExtra("azan_trigger", false);
        if (isAzanTrigger) {
            String prayerName = intent.getStringExtra("prayer_name");
            String prayerKey = intent.getStringExtra("prayer_key");
            String voice = intent.getStringExtra("voice");

            Log.i(TAG, "Menerima Intent Azan untuk solat: " + prayerName);

            if (getBridge() != null) {
                JSObject data = new JSObject();
                data.put("prayerName", prayerName != null ? prayerName : "Solat");
                data.put("prayerKey", prayerKey != null ? prayerKey : "solat");
                data.put("voice", voice != null ? voice : "jakim");
                getBridge().triggerWindowJSEvent("azanAlarmTriggered", data.toString());
            }
        }
    }
}
