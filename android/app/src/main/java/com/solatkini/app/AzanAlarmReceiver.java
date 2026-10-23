package com.solatkini.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import java.util.Calendar;

public class AzanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AzanAlarmReceiver";
    public static final String ACTION_TRIGGER_AZAN = "com.solatkini.app.TRIGGER_AZAN_ALARM";
    public static final String ACTION_TRIGGER_AZAN_ALT = "com.solatkini.app.TRIGGER_AZAN";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) {
            Log.w(TAG, "Intent azan bernilai null diterima. Mengabaikan cetusan.");
            return;
        }

        String action = intent.getAction();
        Log.i(TAG, "Penggera azan diterima! Tindakan: " + action);

        String prayerName = intent.getStringExtra("prayer_name");
        String prayerKey = intent.getStringExtra("prayer_key");
        String voice = intent.getStringExtra("voice");
        long scheduledTimestamp = intent.getLongExtra("scheduled_timestamp", 0);

        if (prayerName == null || prayerName.isEmpty()) prayerName = "Solat";
        if (prayerKey == null || prayerKey.isEmpty()) prayerKey = "solat";

        // =========================================================================
        // KAWALAN 1: PENAPIS PENGGERA BASI / ANJAKAN JAM SISTEM (STALE ALARM GUARD)
        // =========================================================================
        long now = System.currentTimeMillis();
        if (scheduledTimestamp > 0 && !"test".equalsIgnoreCase(prayerKey)) {
            long diff = Math.abs(now - scheduledTimestamp);
            // Had toleransi 10 minit (600,000 ms). Jika jam telefon dianjak secara manual
            // atau penggera terlewat basi lebih 10 minit, batalkan segera!
            if (diff > 10 * 60 * 1000L) {
                Log.w(TAG, "Membatalkan azan basi untuk " + prayerName + " [" + prayerKey + "]. " +
                           "Beza masa dikesan: " + (diff / 1000) + "s (Kemungkinan jam telefon dianjak).");
                return;
            }
        }

        // =========================================================================
        // KAWALAN 2: SEMAKAN WAKTU MUNASABAH SOLAT (PLAUSIBLE HOUR GUARD)
        // Menjamin solat Maghrib/Isyak tidak berbunyi pada jam 3 pagi, atau Subuh pada petang!
        // =========================================================================
        if (!"test".equalsIgnoreCase(prayerKey)) {
            Calendar cal = Calendar.getInstance();
            int currentHour = cal.get(Calendar.HOUR_OF_DAY);

            boolean isValidTime = true;
            if ("subuh".equalsIgnoreCase(prayerKey)) {
                // Subuh Malaysia antara 04:15 - 06:45 pagi
                isValidTime = (currentHour >= 4 && currentHour <= 6);
            } else if ("zohor".equalsIgnoreCase(prayerKey)) {
                // Zohor Malaysia antara 11:45 pagi - 02:30 petang
                isValidTime = (currentHour >= 11 && currentHour <= 14);
            } else if ("asar".equalsIgnoreCase(prayerKey)) {
                // Asar Malaysia antara 03:15 petang - 05:45 petang
                isValidTime = (currentHour >= 14 && currentHour <= 18);
            } else if ("maghrib".equalsIgnoreCase(prayerKey)) {
                // Maghrib Malaysia antara 05:50 petang - 07:45 malam
                isValidTime = (currentHour >= 17 && currentHour <= 20);
            } else if ("isyak".equalsIgnoreCase(prayerKey)) {
                // Isyak Malaysia antara 07:00 malam - 11:00 malam
                isValidTime = (currentHour >= 18 && currentHour <= 23);
            }

            if (!isValidTime) {
                Log.w(TAG, "Membatalkan azan di luar waktu munasabah untuk " + prayerName +
                           " pada jam " + currentHour + ":00. Mengelakkan azan tersalah waktu akibat anjakan sistem.");
                return;
            }
        }

        // Kunci Azan Subuh Khas sebagai perlindungan tambahan
        if ("subuh".equalsIgnoreCase(prayerKey)) {
            voice = "subuh_special";
        } else if (voice == null || voice.isEmpty()) {
            voice = "jakim";
        }

        // 1. Dapatkan WakeLock selamat dengan auto-timeout 15 saat
        // Ini memastikan CPU kekal bangun sehingga AzanAudioService mengambil alih
        try {
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                PowerManager.WakeLock wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "SolatKini::AlarmReceiverWakeLock"
                );
                wakeLock.acquire(15 * 1000L); // 15 saat auto-release, elak CPU tidur sebelum servis hidup
            }
        } catch (Exception e) {
            Log.w(TAG, "Gagal mendapatkan WakeLock sementara", e);
        }

        try {
            // 2. Mulakan perkhidmatan audio latar depan (AzanAudioService) pada aras STREAM_ALARM
            Intent serviceIntent = new Intent(context, AzanAudioService.class);
            serviceIntent.setAction(AzanAudioService.ACTION_PLAY_AZAN);
            serviceIntent.putExtra("prayer_name", prayerName);
            serviceIntent.putExtra("prayer_key", prayerKey);
            serviceIntent.putExtra("voice", voice);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.i(TAG, "Servis audio azan berjaya dihantar ke AzanAudioService (" + prayerName + " - " + voice + ").");

            // 3. Lancarkan paparan visual jika skrin/peranti membenarkan (sandaran kepada FullScreenIntent)
            Intent activityIntent = new Intent(context, MainActivity.class);
            activityIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            );
            activityIntent.putExtra("azan_trigger", true);
            activityIntent.putExtra("prayer_name", prayerName);
            activityIntent.putExtra("prayer_key", prayerKey);
            activityIntent.putExtra("voice", voice);
            context.startActivity(activityIntent);

        } catch (Exception e) {
            Log.e(TAG, "Ralat semasa mengaktifkan servis azan / aktiviti skrin", e);
        }
    }
}
