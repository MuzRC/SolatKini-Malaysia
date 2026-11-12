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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

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
        try {
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        } catch (Throwable t) {
            Log.w(TAG, "Gagal mendapatkan AudioManager: " + t.getMessage());
        }
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopAzan();
            stopSelfSafely();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP_AZAN.equals(action)) {
            stopAzan();
            stopSelfSafely();
            return START_NOT_STICKY;
        }

        String prayerName = intent.getStringExtra("prayer_name");
        String prayerKey = intent.getStringExtra("prayer_key");
        String voice = intent.getStringExtra("voice");
        boolean isTest = intent.getBooleanExtra("is_test", false);
        int autoStopSeconds = intent.getIntExtra("auto_stop_seconds", 0);

        if (voice == null || voice.trim().isEmpty()) {
            try {
                SharedPreferences prefs = getSharedPreferences("SolatKiniAlarms", Context.MODE_PRIVATE);
                voice = prefs.getString("selected_azan_voice", "jakim");
            } catch (Throwable ignored) {
                voice = "jakim";
            }
        }

        if (prayerName == null || prayerName.trim().isEmpty()) {
            prayerName = isTest ? "Ujian Azan" : "Solat";
        }
        if (prayerKey == null || prayerKey.trim().isEmpty()) {
            prayerKey = "solat";
        }
        if (voice == null || voice.trim().isEmpty()) {
            voice = "jakim";
        }

        // 1. Wajib panggil startForeground() dahulu bagi memenuhi kontrak startForegroundService() Android 8+
        Notification notification = buildForegroundNotification(prayerName, prayerKey, voice, isTest);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Throwable t) {
            Log.e(TAG, "startForeground gagal: " + t.getMessage(), t);
            safeRecordHistory(
                prayerName,
                prayerKey,
                AzanHistoryLogger.STATUS_FAILED,
                "startForeground gagal: " + t.getMessage()
            );
            stopSelfSafely();
            return START_NOT_STICKY;
        }

        // 2. Semakan Debounce 90 saat selepas startForeground() dipanggil
        long now = System.currentTimeMillis();
        if (!isTest && prayerKey.equals(sLastPrayerKey) && (now - sLastAzanTimestamp < 90_000L)) {
            Log.w(TAG, "Penggera solat " + prayerKey + " baru sahaja dilaungkan kurang 90 saat yang lalu.");
            if (mediaPlayer == null || !isMediaPlayerPlayingSafely()) {
                stopAzan();
                stopSelfSafely();
            }
            return START_NOT_STICKY;
        }

        if (!isTest) {
            sLastAzanTimestamp = now;
            sLastPrayerKey = prayerKey;
        }

        Log.i(TAG, "Menerima permintaan azan untuk: " + prayerName + " (Suara: " + voice + ", Ujian: " + isTest + ", AutoStop: " + autoStopSeconds + "s)");

        // Batalkan pemasa lama jika wujud
        if (autoStopRunnable != null) {
            autoStopHandler.removeCallbacks(autoStopRunnable);
            autoStopRunnable = null;
        }

        // Tetapkan pemasa henti automatik HANYA jika nilainya lebih daripada 0
        if (autoStopSeconds > 0) {
            final int sec = autoStopSeconds;
            autoStopRunnable = () -> {
                Log.i(TAG, "Pemasa henti automatik tamat (" + sec + " saat). Menghentikan audio.");
                stopAzan();
                stopSelfSafely();
            };
            autoStopHandler.postDelayed(autoStopRunnable, autoStopSeconds * 1000L);
        }

        acquireWakeLock();
        playAzanAudio(prayerName, prayerKey, voice);

        return START_NOT_STICKY;
    }

    private boolean isMediaPlayerPlayingSafely() {
        try {
            return mediaPlayer != null && mediaPlayer.isPlaying();
        } catch (Throwable ignored) {
            return false;
        }
    }

    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                if (wakeLock == null) {
                    wakeLock = powerManager.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK,
                        "SolatKini::AzanAudioServiceWakeLock"
                    );
                    wakeLock.setReferenceCounted(false);
                }
                if (!wakeLock.isHeld()) {
                    wakeLock.acquire(10 * 60 * 1000L);
                }
            }
        } catch (Throwable t) {
            Log.e(TAG, "Gagal mengaktifkan WakeLock", t);
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }
        } catch (Throwable t) {
            Log.e(TAG, "Ralat melepaskan WakeLock", t);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
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
            } catch (Throwable t) {
                Log.w(TAG, "Gagal mencipta NotificationChannel: " + t.getMessage());
            }
        }
    }

    private Notification buildForegroundNotification(String prayerName, String prayerKey, String voice, boolean isTest) {
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

        String displayVoice = (voice != null && !voice.isEmpty())
            ? voice.toUpperCase(Locale.ROOT)
            : "JAKIM";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(isTest ? "Ujian Audio Azan (" + prayerName + ")" : "Masuk Waktu Solat " + prayerName)
            .setContentText("Laungan azan berkumandang (" + displayVoice + "). Tekan untuk buka aplikasi.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setSilent(true)
            .setContentIntent(openPendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "Hentikan Azan", stopPendingIntent);

        if (!isTest) {
            builder.setFullScreenIntent(openPendingIntent, true);
        }

        return builder.build();
    }

    private void playAzanAudio(String prayerName, String prayerKey, String voice) {
        stopAzanPlayerOnly();

        try {
            mediaPlayer = new MediaPlayer();

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
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
                } catch (Throwable t) {
                    Log.w(TAG, "Gagal melaraskan kelantangan STREAM_ALARM: " + t.getMessage());
                }

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                            .setAudioAttributes(audioAttributes)
                            .build();
                        audioManager.requestAudioFocus(audioFocusRequest);
                    } else {
                        audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE);
                    }
                } catch (Throwable tFocus) {
                    Log.w(TAG, "requestAudioFocus warning: " + tFocus.getMessage());
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
            List<File> localFiles = new ArrayList<>();
            if ("custom".equalsIgnoreCase(voice) || "custom_azan".equalsIgnoreCase(voice)) {
                localFiles.add(new File(getFilesDir(), "custom_azan.mp3"));
            }
            localFiles.add(new File(getFilesDir(), voice + ".mp3"));
            localFiles.add(new File(getFilesDir(), mappedVoice + ".mp3"));
            localFiles.add(new File(getFilesDir(), "azan_" + voice + ".mp3"));
            localFiles.add(new File(getFilesDir(), "azan_" + mappedVoice + ".mp3"));
            localFiles.add(new File(getFilesDir(), "custom_azan.mp3"));

            for (File file : localFiles) {
                if (file.exists() && file.length() > 5000) {
                    try {
                        mediaPlayer.setDataSource(file.getAbsolutePath());
                        loaded = true;
                        Log.i(TAG, "Audio azan dimuatkan dari storan fail peranti: " + file.getName());
                        break;
                    } catch (Throwable t) {
                        Log.w(TAG, "Gagal buka fail tempatan: " + file.getAbsolutePath(), t);
                        resetMediaPlayerForNextSource(audioAttributes);
                    }
                }
            }

            // 2. Muat daripada folder assets (public/audio/azan/*.mp3) sahaja tanpa res/raw
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
                    if (loadAudioFromAssets(path, audioAttributes)) {
                        loaded = true;
                        Log.i(TAG, "Audio azan dimuatkan dari assets: " + path);
                        break;
                    }
                }
            }

            if (!loaded) {
                Log.e(TAG, "Tiada fail audio azan ditemui untuk dimainkan!");
                safeRecordHistory(
                    prayerName,
                    prayerKey,
                    AzanHistoryLogger.STATUS_FAILED,
                    "Gagal: Fail audio (" + voice + ") tidak ditemui di public/audio/azan/."
                );
                stopAzan();
                stopSelfSafely();
                return;
            }

            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.setLooping(false);

            mediaPlayer.setOnCompletionListener(mp -> {
                Log.i(TAG, "Audio azan selesai berkumandang sepenuhnya.");
                stopAzan();
                stopSelfSafely();
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer ralat: what=" + what + ", extra=" + extra);
                safeRecordHistory(
                    prayerName,
                    prayerKey,
                    AzanHistoryLogger.STATUS_FAILED,
                    "MediaPlayer error: what=" + what + ", extra=" + extra
                );
                stopAzan();
                stopSelfSafely();
                return true;
            });

            mediaPlayer.prepare();
            mediaPlayer.start();
            Log.i(TAG, "MediaPlayer azan kini aktif berkumandang pada aras STREAM_ALARM.");

            String displayVoice = (voice != null && !voice.isEmpty())
                ? voice.toUpperCase(Locale.ROOT)
                : "JAKIM";

            safeRecordHistory(
                prayerName,
                prayerKey,
                AzanHistoryLogger.STATUS_SUCCESS,
                "Laungan azan (" + displayVoice + ") berjaya berkumandang pada aras STREAM_ALARM."
            );

        } catch (Throwable t) {
            Log.e(TAG, "Ralat memainkan audio azan", t);
            safeRecordHistory(
                prayerName,
                prayerKey,
                AzanHistoryLogger.STATUS_FAILED,
                "Ralat pengecualian: " + t.getMessage()
            );
            closeCurrentAfd();
            stopAzan();
            stopSelfSafely();
        }
    }

    private void resetMediaPlayerForNextSource(AudioAttributes audioAttributes) {
        try {
            if (mediaPlayer != null) {
                mediaPlayer.reset();
                mediaPlayer.setAudioAttributes(audioAttributes);
            }
        } catch (Throwable ignored) {
            try {
                if (mediaPlayer != null) {
                    mediaPlayer.release();
                }
            } catch (Throwable ignored2) {}
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(audioAttributes);
        }
    }

    private boolean loadAudioFromAssets(String assetRelativePath, AudioAttributes audioAttributes) {
        // 1. Cuba openFd secara terus dahulu (pantas & jimat storan kerana noCompress 'mp3' aktif dalam build.gradle)
        try {
            closeCurrentAfd();
            currentAfd = getAssets().openFd(assetRelativePath);
            if (currentAfd != null) {
                mediaPlayer.setDataSource(currentAfd.getFileDescriptor(), currentAfd.getStartOffset(), currentAfd.getLength());
                return true;
            }
        } catch (Throwable ignored) {
            closeCurrentAfd();
            resetMediaPlayerForNextSource(audioAttributes);
        }

        // 2. Sandaran: Salin dari assets ke fail cache unik jika openFd tidak disokong
        try {
            String fileNameOnly = new File(assetRelativePath).getName().replaceAll("[^a-zA-Z0-9._-]", "_");
            File cacheDir = getCacheDir();
            if (cacheDir != null) {
                File cachedFile = new File(cacheDir, "azan_extracted_" + fileNameOnly);
                if (cachedFile.exists() && cachedFile.length() > 5000) {
                    mediaPlayer.setDataSource(cachedFile.getAbsolutePath());
                    return true;
                }

                try (InputStream is = getAssets().open(assetRelativePath)) {
                    File tempFile = new File(cacheDir, "azan_temp_" + fileNameOnly + ".tmp");
                    try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                        byte[] buffer = new byte[32768];
                        int read;
                        while ((read = is.read(buffer)) != -1) {
                            fos.write(buffer, 0, read);
                        }
                        fos.flush();
                    }
                    if (tempFile.exists() && tempFile.length() > 5000) {
                        if (cachedFile.exists()) {
                            cachedFile.delete();
                        }
                        if (tempFile.renameTo(cachedFile)) {
                            mediaPlayer.setDataSource(cachedFile.getAbsolutePath());
                            return true;
                        } else {
                            mediaPlayer.setDataSource(tempFile.getAbsolutePath());
                            return true;
                        }
                    }
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "Tidak dapat memuatkan dari assets (" + assetRelativePath + "): " + t.getMessage());
            resetMediaPlayerForNextSource(audioAttributes);
        }

        return false;
    }

    private void closeCurrentAfd() {
        if (currentAfd != null) {
            try {
                currentAfd.close();
            } catch (Throwable ignored) {}
            currentAfd = null;
        }
    }

    private void stopAzanPlayerOnly() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (Throwable ignored) {}
            try {
                mediaPlayer.reset();
            } catch (Throwable ignored) {}
            try {
                mediaPlayer.release();
            } catch (Throwable t) {
                Log.w(TAG, "Ralat menutup MediaPlayer", t);
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
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                    audioFocusRequest = null;
                } else {
                    audioManager.abandonAudioFocus(null);
                }
            } catch (Throwable ignored) {}
        }

        releaseWakeLock();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
        } catch (Throwable ignored) {}
    }

    private void stopSelfSafely() {
        try {
            stopSelf();
        } catch (Throwable ignored) {}
    }

    private void safeRecordHistory(String prayerName, String prayerKey, String status, String message) {
        try {
            AzanHistoryLogger.record(this, prayerName, prayerKey, status, message);
        } catch (Throwable t) {
            Log.w(TAG, "Gagal merekod sejarah azan: " + t.getMessage());
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
