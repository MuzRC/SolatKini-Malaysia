package com.solatkini.app;

import android.Manifest;
import android.app.KeyguardManager;
import android.app.NotificationManager;
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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SolatWidgetPlugin.class);
        registerPlugin(AzanAlarmPlugin.class);

        configureWakeAndLockScreen();
        super.onCreate(savedInstanceState);

        clearInitialBootNotification();

        final Intent launchIntent = getIntent();
        if (launchIntent != null) {
            dispatchAzanIntentWithRetry(launchIntent, 0);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        clearInitialBootNotification();
    }

    private void clearInitialBootNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(1001);
                Log.d(TAG, "Notifikasi boot sementara (ID 1001) berjaya dipadam.");
            }
        } catch (Exception e) {
            Log.w(TAG, "Gagal memadam notifikasi sementara: " + e.getMessage());
        }
    }

    public void requestNotificationPermissionImmediate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "Mencetuskan dialog kebenaran POST_NOTIFICATIONS...");
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
        clearInitialBootNotification();
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

    private void dispatchAzanIntentWithRetry(final Intent intent, final int attempt) {
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    handleAzanIntent(intent);
                } else if (attempt < 4) {
                    Log.d(TAG, "Capacitor Bridge belum bersedia, mencuba semula (percubaan " + (attempt + 1) + ")...");
                    dispatchAzanIntentWithRetry(intent, attempt + 1);
                } else {
                    handleAzanIntent(intent);
                }
            }
        }, attempt == 0 ? 1000 : 800);
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
            intent.removeExtra("azan_trigger");

            String prayerName = intent.getStringExtra("prayer_name");
            String prayerKey = intent.getStringExtra("prayer_key");
            String voice = intent.getStringExtra("voice");

            if (prayerName == null || prayerName.isEmpty()) prayerName = "Solat";
            if (prayerKey == null || prayerKey.isEmpty()) prayerKey = "solat";

            if ("subuh".equalsIgnoreCase(prayerKey)) {
                voice = "subuh_special";
            } else if (voice == null || voice.isEmpty()) {
                voice = "jakim";
            }

            Log.i(TAG, "Meneruskan acara azan ke antaramuka React untuk: " + prayerName + " [" + voice + "]");

            if (getBridge() != null) {
                JSObject data = new JSObject();
                data.put("prayerName", prayerName);
                data.put("prayerKey", prayerKey);
                data.put("voice", voice);
                getBridge().triggerWindowJSEvent("azanAlarmTriggered", data.toString());
            } else {
                Log.w(TAG, "Capacitor Bridge belum bersedia semasa cubaan menghantar azanAlarmTriggered.");
            }
        }
    }
}
