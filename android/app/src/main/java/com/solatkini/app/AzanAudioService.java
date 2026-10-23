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
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.solatkini.app.R;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class AzanAudioService extends Service {
    private static final String TAG = "AzanAudioService";
    public static final String ACTION_PLAY_AZAN = "com.solatkini.app.ACTION_PLAY_AZAN";
    public static final String ACTION_STOP_AZAN = "com.solatkini.app.ACTION_STOP_AZAN";
    public static final String CHANNEL_ID = "solatkini_azan_channel_v3";
    private static final int NOTIFICATION_ID = 9901;

    private MediaPlayer mediaPlayer;
    private PowerManager.WakeLock wakeLock;
    private AudioFocusRequest audioFocusRequest;

    // Kunci anti-pertindihan azan (Anti-overlap lock)
    private static long sLastAzanTimestamp = 0;
    private static String sLastPrayerKey = "";

    @Override
    public void onCreate() {
        super.onCreate();
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

        if (prayerName == null || prayerName.isEmpty()) prayerName = "Solat";
        if (prayerKey == null || prayerKey.isEmpty()) prayerKey = "solat";

        // Kunci kebal Subuh Khas
        if ("subuh".equalsIgnoreCase(prayerKey)) {
            voice = "subuh_special";
        } else if (voice == null || voice.isEmpty()) {
            SharedPreferences prefs = getSharedPreferences("SolatKiniAlarms", Context.MODE_PRIVATE);
            voice = prefs.getString("selected_azan_voice", "jakim");
        }
        if (voice == null || voice.isEmpty()) {
            voice = "jakim";
        }

        // 1. Wajib mulakan Foreground Service serta-merta untuk mematuhi kontrak Android 8.0+ / 14+
        acquireWakeLock();
        startForegroundServiceInternal(prayerName, prayerKey, voice);

        long now = System.currentTimeMillis();
        boolean isTest = "test".equalsIgnoreCase(prayerKey);

        // 2. Halang pencetusan azan bertindih dalam tempoh 15 saat bagi solat sebenar
        if (!isTest && prayerKey.equals(sLastPrayerKey) && (now - sLastAzanTimestamp < 15_000L)) {
            Log.w(TAG, "Penggera solat " + prayerKey + " baru sahaja dilaungkan kurang 15 saat yang lalu. Mengekalkan audio semasa.");
            if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                return START_NOT_STICKY;
            }
            stopAzan();
            stopSelf();
            return START_NOT_STICKY;
        }

        sLastAzanTimestamp = now;
        sLastPrayerKey = prayerKey;

        Log.i(TAG, "Memulakan audio azan untuk: " + prayerName + " (Kunci: " + prayerKey + ", Suara: " + voice + ")");
        playAzanAudio(voice);

        return START_NOT_STICKY;
    }

    private void startForegroundServiceInternal(String prayerName, String prayerKey, String voice) {
        Notification notification = buildForegroundNotification(prayerName, prayerKey, voice);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Ralat mengaktifkan startForeground", e);
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null && (wakeLock == null || !wakeLock.isHeld())) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "SolatKini::AzanAudioServiceWakeLock"
                );
                wakeLock.acquire(7 * 60 * 1000L); // Had maksimum 7 minit
            }
        } catch (Exception e) {
            Log.e(TAG, "Gagal mendapatkan WakeLock", e);
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
                channel.setDescription("Saluran rasmi penggera azan waktu solat bersuara maksima");
                channel.setBypassDnd(true);
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 500, 250, 500, 250, 1000});
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                channel.setSound(null, null); // Senyapkan audio sistem kerana dikendalikan oleh MediaPlayer
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

        String displayVoice = "subuh_special".equalsIgnoreCase(voice) ? "SUBUH KHAS" : voice.toUpperCase();

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Masuk Waktu Solat " + prayerName)
            .setContentText("Laungan azan berkumandang (" + displayVoice + "). Klik untuk buka paparan.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setSilent(true)
            .setSound(null)
            .setContentIntent(openPendingIntent)
            .setFullScreenIntent(openPendingIntent, true)
            .addAction(android.R.drawable.ic_media_pause, "Hentikan Azan", stopPendingIntent)
            .build();
    }

    private void requestAudioDeviceFocus(AudioAttributes audioAttributes) {
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                        .setAudioAttributes(audioAttributes)
                        .setOnAudioFocusChangeListener(focusChange -> {
                            // Kekalkan audio azan tanpa diganggu cetusan notifikasi kecil
                        })
                        .build();
                    audioManager.requestAudioFocus(audioFocusRequest);
                } else {
                    audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Gagal meminta fokus audio", e);
        }
    }

    private void abandonAudioDeviceFocus() {
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                    audioFocusRequest = null;
                } else {
                    audioManager.abandonAudioFocus(null);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Gagal melepaskan fokus audio", e);
        }
    }

    private void playAzanAudio(String voice) {
        stopAzanPlaybackOnly();

        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
            mediaPlayer.setAudioAttributes(audioAttributes);

            // Jeda sementara lagu luar (Spotify/YouTube/Radio)
            requestAudioDeviceFocus(audioAttributes);

            // 1. Petakan ID suara azan kepada nama fail fizikal
            String mappedVoice = voice;
            if (voice == null || voice.isEmpty()) {
                mappedVoice = "jakim";
            } else if ("subuh_special".equalsIgnoreCase(voice)) {
                mappedVoice = "subuh";
            } else if ("takbir_raya".equalsIgnoreCase(voice)) {
                mappedVoice = "takbir";
            }

            Log.i(TAG, "Mencuba memainkan fail azan: " + mappedVoice + " (kod asal: " + voice + ")");

            boolean loaded = false;

            // 2. Semak fail tersuai pengguna jika ada
            File customFile = new File(getFilesDir(), "custom_azan.mp3");
            if (("custom".equalsIgnoreCase(voice) || "custom".equalsIgnoreCase(mappedVoice)) && customFile.exists() && customFile.length() > 0) {
                try {
                    mediaPlayer.reset();
                    mediaPlayer.setAudioAttributes(audioAttributes);
                    mediaPlayer.setDataSource(customFile.getAbsolutePath());
                    mediaPlayer.prepare();
                    loaded = true;
                    Log.i(TAG, "Berjaya memuatkan fail azan tersuai: " + customFile.getAbsolutePath());
                } catch (Exception e) {
                    Log.w(TAG, "Gagal menetapkan fail azan tersuai", e);
                }
            }

            // 3. Muatkan fail audio azan daripada aset APK
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
                        Log.i(TAG, "Berjaya memuatkan dan menyediakan fail azan: " + path);
                        break;
                    }
                }
            }

            // 4. Sandaran terakhir res/raw
            if (!loaded) {
                int rawId = getResources().getIdentifier("azan_notification", "raw", getPackageName());
                if (rawId != 0) {
                    try {
                        AssetFileDescriptor rawFd = getResources().openRawResourceFd(rawId);
                        if (rawFd != null) {
                            mediaPlayer.reset();
                            mediaPlayer.setAudioAttributes(audioAttributes);
                            mediaPlayer.setDataSource(rawFd.getFileDescriptor(), rawFd.getStartOffset(), rawFd.getLength());
                            rawFd.close();
                            mediaPlayer.prepare();
                            loaded = true;
                        }
                    } catch (Exception err) {
                        Log.w(TAG, "Gagal memuatkan fail raw sandaran", err);
                    }
                }
            }

            if (!loaded) {
                Log.e(TAG, "Gagal memuatkan sebarang fail audio azan!");
                stopAzan();
                stopSelf();
                return;
            }

            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.setLooping(false);

            mediaPlayer.setOnCompletionListener(mp -> {
                Log.i(TAG, "Audio azan selesai dimainkan.");
                stopAzan();
                stopSelf();
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer ralat: what=" + what + ", extra=" + extra);
                stopAzan();
                stopSelf();
                return true;
            });

            mediaPlayer.start();
            Log.i(TAG, "MediaPlayer azan berkumandang pada aras STREAM_ALARM (" + mappedVoice + ").");
        } catch (Exception e) {
            Log.e(TAG, "Gagal memainkan audio azan pada aras penggera", e);
            stopAzan();
            stopSelf();
        }
    }

    private boolean loadAudioFromAssets(String assetRelativePath, AudioAttributes attributes) {
        // Percubaan 1: Buka terus AssetFileDescriptor
        try {
            mediaPlayer.reset();
            mediaPlayer.setAudioAttributes(attributes);
            AssetFileDescriptor afd = getAssets().openFd(assetRelativePath);
            mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            mediaPlayer.prepare();
            return true;
        } catch (Exception e) {
            Log.d(TAG, "openFd gagal untuk " + assetRelativePath + ": " + e.getMessage());
        }

        // Percubaan 2: Salin melalui InputStream ke memori cache (kalis mampatan APK)
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
                mediaPlayer.reset();
                mediaPlayer.setAudioAttributes(attributes);
                mediaPlayer.setDataSource(cacheFile.getAbsolutePath());
                mediaPlayer.prepare();
                return true;
            }
        } catch (Exception ex) {
            Log.d(TAG, "Gagal membaca InputStream untuk " + assetRelativePath + ": " + ex.getMessage());
        }
        return false;
    }

    private void stopAzanPlaybackOnly() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.reset();
                mediaPlayer.release();
            } catch (Exception e) {
                Log.w(TAG, "Ralat menghentikan MediaPlayer", e);
            }
            mediaPlayer = null;
        }
        abandonAudioDeviceFocus();
    }

    private void stopAzan() {
        stopAzanPlaybackOnly();
        releaseWakeLock();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.cancel(NOTIFICATION_ID);
            }
        } catch (Exception e) {
            Log.w(TAG, "Ralat mematikan notifikasi perkhidmatan", e);
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
