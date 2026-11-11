package com.solatkini.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class AzanAudioService extends Service {
    private static final String TAG = "AzanAudioService";
    public static final String ACTION_PLAY_AZAN = "com.solatkini.app.ACTION_PLAY_AZAN";
    public static final String ACTION_STOP_AZAN = "com.solatkini.app.ACTION_STOP_AZAN";
    public static final String CHANNEL_ID = "solatkini_azan_channel_v4";
    private static final int NOTIFICATION_ID = 9901;

    private MediaPlayer mediaPlayer;
    private PowerManager.WakeLock wakeLock;
    private AssetFileDescriptor currentAfd;
    private AudioFocusRequest audioFocusRequest;
    private AudioManager audioManager;

    private final Handler autoStopHandler = new Handler(Looper.getMainLooper());
    private Runnable autoStopRunnable = null;

    private static long sLastAzanTimestamp = 0;
    private static String sLastPrayerKey = "";

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP_AZAN.equals(action)) {
            stopAzan();
            stopSelf();
            return START_NOT_STICKY;
        }

        String prayerName = intent.getStringExtra("prayer_name");
        String prayerKey = intent.getStringExtra("prayer_key");
        String voice = intent.getStringExtra("voice");
        boolean isTest = intent.getBooleanExtra("is_test", false);
        int autoStopSeconds = intent.getIntExtra("auto_stop_seconds", 0);
        if (isTest && autoStopSeconds <= 0) {
            autoStopSeconds = 20; // 20 saat henti automatik untuk ujian audio azan
        }

        long now = System.currentTimeMillis();
        if (!isTest && prayerKey != null && prayerKey.equals(sLastPrayerKey) && (now - sLastAzanTimestamp < 90_000L)) {
            Log.w(TAG, "Penggera solat " + prayerKey + " baru sahaja dilaungkan kurang 90 saat yang lalu.");
            return START_NOT_STICKY;
        }

        if (!isTest) {
            sLastAzanTimestamp = now;
            sLastPrayerKey = prayerKey != null ? prayerKey : "";
        }

        if (voice == null || voice.isEmpty()) {
            SharedPreferences prefs = getSharedPreferences("SolatKiniAlarms", Context.MODE_PRIVATE);
            voice = prefs.getString("selected_azan_voice", "jakim");
        }

        if (prayerName == null || prayerName.isEmpty()) prayerName = isTest ? "Ujian Azan" : "Solat";
        if (voice == null || voice.isEmpty()) voice = "jakim";

        Log.i(TAG, "Menerima permintaan azan untuk: " + prayerName + " (Suara: " + voice + ", Ujian: " + isTest + ", AutoStop: " + autoStopSeconds + "s)");

        // Batalkan pemasa lama jika wujud
        if (autoStopRunnable != null) {
            autoStopHandler.removeCallbacks(autoStopRunnable);
            autoStopRunnable = null;
        }

        // Tetapkan pemasa henti automatik
        if (autoStopSeconds > 0) {
            final int sec = autoStopSeconds;
            autoStopRunnable = () -> {
                Log.i(TAG, "Pemasa henti automatik tamat (" + sec + " saat). Menghentikan audio.");
                stopAzan();
                stopSelf();
            };
            autoStopHandler.postDelayed(autoStopRunnable, autoStopSeconds * 1000L);
        }

        acquireWakeLock();

        // Mulakan notifikasi foreground berformat rasmi
        Notification notification = buildForegroundNotification(prayerName, prayerKey, voice);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        playAzanAudio(prayerName, prayerKey, voice);

        return START_NOT_STICKY;
    }

    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null && (wakeLock == null || !wakeLock.isHeld())) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "SolatKini::AzanAudioServiceWakeLock"
                );
                wakeLock.acquire(7 * 60 * 1000L);
            }
        } catch (Exception e) {
            Log.e(TAG, "Gagal mengaktifkan WakeLock", e);
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Ralat melepaskan WakeLock", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Penggera Azan SolatKini",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Saluran penggera azan waktu solat");
                channel.setBypassDnd(true);
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 500, 250, 500, 250, 1000});
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                channel.setSound(null, null);
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification(String prayerName, String prayerKey, String voice) {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openAppIntent.putExtra("azan_trigger", true);
        openAppIntent.putExtra("prayer_name", prayerName);
        openAppIntent.putExtra("prayer_key", prayerKey);
        openAppIntent.putExtra("voice", voice);

        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this,
            101,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, AzanAudioService.class);
        stopIntent.setAction(ACTION_STOP_AZAN);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            102,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Masuk Waktu Solat " + prayerName)
            .setContentText("Laungan azan berkumandang (" + voice.toUpperCase() + "). Tekan untuk buka aplikasi.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setSilent(true)
            .setContentIntent(openPendingIntent)
            .setFullScreenIntent(openPendingIntent, true)
            .addAction(android.R.drawable.ic_media_pause, "Hentikan Azan", stopPendingIntent)
            .build();
    }

    private void playAzanAudio(String prayerName, String prayerKey, String voice) {
        stopAzanPlayerOnly();

        try {
            mediaPlayer = new MediaPlayer();

            // Tetapkan AudioAttributes rasmi bagi saluran STREAM_ALARM
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                .build();
            mediaPlayer.setAudioAttributes(audioAttributes);

            // Semak dan pastikan kelantangan STREAM_ALARM sekurang-kurangnya 80%
            if (audioManager != null) {
                try {
                    int currentVol = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
                    int maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                    int targetVol = (int) Math.round(maxVol * 0.80);
                    if (currentVol < targetVol) {
                        audioManager.setStreamVolume(AudioManager.STREAM_ALARM, targetVol, 0);
                        Log.i(TAG, "Kelantangan penggera STREAM_ALARM dinaikkan ke: " + targetVol + "/" + maxVol);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Gagal melaraskan kelantangan STREAM_ALARM", e);
                }

                // Tuntut audio focus eksklusif penggera
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                        .setAudioAttributes(audioAttributes)
                        .build();
                    audioManager.requestAudioFocus(audioFocusRequest);
                } else {
                    audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE);
                }
            }

            String mappedVoice = voice;
            if (voice == null || voice.isEmpty()) {
                mappedVoice = "jakim";
            } else if ("subuh_special".equalsIgnoreCase(voice)) {
                mappedVoice = "subuh";
            } else if ("takbir_raya".equalsIgnoreCase(voice)) {
                mappedVoice = "takbir";
            }

            boolean loaded = false;

            // 1. Semak fail muat turun tempatan / tersuai dalam getFilesDir()
            File[] localFiles = new File[]{
                new File(getFilesDir(), "custom_azan.mp3"),
                new File(getFilesDir(), voice + ".mp3"),
                new File(getFilesDir(), mappedVoice + ".mp3"),
                new File(getFilesDir(), "azan_" + voice + ".mp3"),
                new File(getFilesDir(), "azan_" + mappedVoice + ".mp3")
            };

            for (File file : localFiles) {
                if (file.exists() && file.length() > 0) {
                    try {
                        mediaPlayer.setDataSource(file.getAbsolutePath());
                        loaded = true;
                        Log.i(TAG, "Audio azan dimuatkan dari storan fail peranti: " + file.getName());
                        break;
                    } catch (Exception e) {
                        Log.w(TAG, "Gagal buka fail tempatan: " + file.getAbsolutePath(), e);
                    }
                }
            }

            // 2. Semak fail dari folder assets jika belum dimuatkan
            if (!loaded) {
                String[] candidatePaths = new String[]{
                    "public/audio/azan/" + mappedVoice + ".mp3",
                    "audio/azan/" + mappedVoice + ".mp3",
                    "public/audio/azan/" + voice + ".mp3",
                    "audio/azan/" + voice + ".mp3",
                    "public/audio/azan/jakim.mp3",
                    "audio/azan/jakim.mp3"
                };

                for (String path : candidatePaths) {
                    if (loadAudioFromAssets(path)) {
                        loaded = true;
                        Log.i(TAG, "Audio azan dimuatkan dari assets: " + path);
                        break;
                    }
                }
            }

            // 3. Sandaran akhir ke folder res/raw
            if (!loaded) {
                int rawId = getResources().getIdentifier("azan_notification", "raw", getPackageName());
                if (rawId != 0) {
                    AssetFileDescriptor rawFd = getResources().openRawResourceFd(rawId);
                    if (rawFd != null) {
                        mediaPlayer.setDataSource(rawFd.getFileDescriptor(), rawFd.getStartOffset(), rawFd.getLength());
                        rawFd.close();
                        loaded = true;
                    }
                }
            }

            if (!loaded) {
                Log.e(TAG, "Tiada fail audio azan ditemui untuk dimainkan!");
                AzanHistoryLogger.record(
                    this,
                    prayerName,
                    prayerKey,
                    AzanHistoryLogger.STATUS_FAILED,
                    "Gagal: Fail audio (" + voice + ") tidak ditemui di storan peranti atau assets."
                );
                stopAzan();
                stopSelf();
                return;
            }

            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.setLooping(false);

            mediaPlayer.setOnCompletionListener(mp -> {
                Log.i(TAG, "Audio azan selesai berkumandang.");
                stopAzan();
                stopSelf();
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer ralat: what=" + what + ", extra=" + extra);
                AzanHistoryLogger.record(
                    this,
                    prayerName,
                    prayerKey,
                    AzanHistoryLogger.STATUS_FAILED,
                    "MediaPlayer error: what=" + what + ", extra=" + extra
                );
                stopAzan();
                stopSelf();
                return true;
            });

            mediaPlayer.prepare();

            // Tutup AssetFileDescriptor dengan selamat SELEPAS prepare selesai
            closeCurrentAfd();

            mediaPlayer.start();
            Log.i(TAG, "MediaPlayer azan kini aktif pada aras penggera.");

            // Catat kejayaan ke dalam sejarah diagnostik
            AzanHistoryLogger.record(
                this,
                prayerName,
                prayerKey,
                AzanHistoryLogger.STATUS_SUCCESS,
                "Laungan azan (" + voice.toUpperCase() + ") berjaya berkumandang pada aras STREAM_ALARM."
            );

        } catch (Exception e) {
            Log.e(TAG, "Ralat memainkan audio azan", e);
            AzanHistoryLogger.record(
                this,
                prayerName,
                prayerKey,
                AzanHistoryLogger.STATUS_FAILED,
                "Ralat pengecualian: " + e.getMessage()
            );
            closeCurrentAfd();
            stopAzan();
            stopSelf();
        }
    }

    private boolean loadAudioFromAssets(String assetRelativePath) {
        closeCurrentAfd();

        try {
            currentAfd = getAssets().openFd(assetRelativePath);
            mediaPlayer.setDataSource(currentAfd.getFileDescriptor(), currentAfd.getStartOffset(), currentAfd.getLength());
            return true;
        } catch (Exception ignored) {
            closeCurrentAfd();
        }

        try (InputStream is = getAssets().open(assetRelativePath)) {
            File cacheFile = new File(getCacheDir(), "active_azan_playback.mp3");
            try (FileOutputStream fos = new FileOutputStream(cacheFile)) {
                byte[] buffer = new byte[16384];
                int read;
                while ((read = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, read);
                }
                fos.flush();
            }
            if (cacheFile.exists() && cacheFile.length() > 0) {
                mediaPlayer.setDataSource(cacheFile.getAbsolutePath());
                return true;
            }
        } catch (Exception ignored) {}

        return false;
    }

    private void closeCurrentAfd() {
        if (currentAfd != null) {
            try {
                currentAfd.close();
            } catch (Exception ignored) {}
            currentAfd = null;
        }
    }

    private void stopAzanPlayerOnly() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.reset();
                mediaPlayer.release();
            } catch (Exception e) {
                Log.w(TAG, "Ralat menutup MediaPlayer", e);
            }
            mediaPlayer = null;
        }
        closeCurrentAfd();
    }

    private void stopAzan() {
        if (autoStopRunnable != null) {
            autoStopHandler.removeCallbacks(autoStopRunnable);
            autoStopRunnable = null;
        }

        stopAzanPlayerOnly();

        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
                audioFocusRequest = null;
            } else {
                audioManager.abandonAudioFocus(null);
            }
        }

        releaseWakeLock();

        // Padam notifikasi foreground dari notification bar bila audio berhenti
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
    }

    @Override
    public void onDestroy() {
        stopAzan();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
