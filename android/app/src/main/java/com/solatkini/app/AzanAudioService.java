package com.solatkini.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
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
    public static final String CHANNEL_ID = "solatkini_azan_channel";
    private static final int NOTIFICATION_ID = 9901;

    private MediaPlayer mediaPlayer;
    private PowerManager.WakeLock wakeLock;

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

        if (voice == null || voice.isEmpty()) {
            SharedPreferences prefs = getSharedPreferences("SolatKiniAlarms", Context.MODE_PRIVATE);
            voice = prefs.getString("selected_azan_voice", "jakim");
        }

        if (prayerName == null) prayerName = "Solat";
        if (voice == null || voice.isEmpty()) voice = "jakim";

        Log.i(TAG, "Menerima permintaan azan untuk solat: " + prayerName + " dengan nada: " + voice);

        acquireWakeLock();
        startForeground(NOTIFICATION_ID, buildForegroundNotification(prayerName, prayerKey, voice));
        playAzanAudio(voice);

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
                wakeLock.acquire(7 * 60 * 1000L); // 7 minutes max
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
            .setContentText("Laungan azan berkumandang (" + voice.toUpperCase() + "). Klik untuk buka skrin.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(openPendingIntent)
            .setFullScreenIntent(openPendingIntent, true)
            .addAction(android.R.drawable.ic_media_pause, "Hentikan Azan", stopPendingIntent)
            .build();
    }

    private void playAzanAudio(String voice) {
        stopAzan();

        try {
            mediaPlayer = new MediaPlayer();

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
            mediaPlayer.setAudioAttributes(audioAttributes);
            mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);

            // 1. Petakan ID suara azan kepada nama fail sebenar
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

            // 2. Semak jika pengguna menggunakan fail tersuai (custom upload)
            File customFile = new File(getFilesDir(), "custom_azan.mp3");
            if (("custom".equalsIgnoreCase(voice) || "custom".equalsIgnoreCase(mappedVoice)) && customFile.exists() && customFile.length() > 0) {
                try {
                    mediaPlayer.setDataSource(customFile.getAbsolutePath());
                    loaded = true;
                    Log.i(TAG, "Berjaya memuatkan fail azan tersuai pengguna: " + customFile.getAbsolutePath());
                } catch (Exception e) {
                    Log.w(TAG, "Gagal menetapkan fail azan tersuai", e);
                }
            }

            // 3. Muatkan fail audio azan pilihan daripada aset APK (public/audio/azan/<suara>.mp3)
            if (!loaded) {
                String[] candidatePaths = new String[]{
                    "public/audio/azan/" + mappedVoice + ".mp3",
                    "audio/azan/" + mappedVoice + ".mp3",
                    "public/audio/azan/" + voice + ".mp3",
                    "audio/azan/" + voice + ".mp3",
                    "public/audio/azan/jakim.mp3"
                };

                for (String path : candidatePaths) {
                    if (loadAudioFromAssets(path)) {
                        loaded = true;
                        Log.i(TAG, "Berjaya memuatkan fail azan pilihan dari assets: " + path);
                        break;
                    }
                }
            }

            // 4. Sandaran terakhir: jika tiada fail assets yang boleh dimuatkan, guna res/raw/azan_notification
            if (!loaded) {
                Log.w(TAG, "Fail azan pilihan gagal dimuatkan, beralih ke res/raw/azan_notification sebagai sandaran.");
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

            mediaPlayer.prepare();
            mediaPlayer.start();
            Log.i(TAG, "MediaPlayer azan berjaya berkumandang pada aras STREAM_ALARM (" + mappedVoice + ").");
        } catch (Exception e) {
            Log.e(TAG, "Gagal memainkan audio azan pada aras penggera", e);
            stopAzan();
            stopSelf();
        }
    }

    private boolean loadAudioFromAssets(String assetRelativePath) {
        // Cuba buka secara terus menggunakan AssetFileDescriptor (cepat jika fail uncompressed)
        try {
            AssetFileDescriptor afd = getAssets().openFd(assetRelativePath);
            mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            return true;
        } catch (Exception e) {
            Log.d(TAG, "openFd gagal untuk " + assetRelativePath + " (mungkin fail dimampatkan): " + e.getMessage());
        }

        // Salin fail melalui InputStream ke fail cache dalaman aplikasi (dijamin 100% berjaya walaupun fail dimampatkan)
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
        } catch (Exception ex) {
            Log.d(TAG, "Gagal membaca InputStream untuk " + assetRelativePath + ": " + ex.getMessage());
        }
        return false;
    }

    private void stopAzan() {
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
        releaseWakeLock();
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
