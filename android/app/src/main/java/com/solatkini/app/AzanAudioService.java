package com.solatkini.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
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
        if (prayerName == null) prayerName = "Solat";
        if (voice == null || voice.isEmpty()) voice = "jakim";

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
            .setContentText("Laungan azan berkumandang. Klik untuk membuka skrin azan.")
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

            // Attempt to load from bundled assets: public/audio/azan/<voice>.mp3
            String assetPath = "public/audio/azan/" + voice + ".mp3";
            AssetFileDescriptor afd = null;
            try {
                afd = getAssets().openFd(assetPath);
            } catch (Exception e) {
                Log.w(TAG, "Fail asset azan " + assetPath + " tidak ditemui, mencuba jakim.mp3", e);
                try {
                    afd = getAssets().openFd("public/audio/azan/jakim.mp3");
                } catch (Exception e2) {
                    Log.w(TAG, "Fail azan jakim.mp3 juga tidak ditemui dalam assets", e2);
                }
            }

            if (afd != null) {
                mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                afd.close();
            } else {
                // Fallback to res/raw/azan_notification if available
                int rawId = getResources().getIdentifier("azan_notification", "raw", getPackageName());
                if (rawId != 0) {
                    AssetFileDescriptor rawFd = getResources().openRawResourceFd(rawId);
                    if (rawFd != null) {
                        mediaPlayer.setDataSource(rawFd.getFileDescriptor(), rawFd.getStartOffset(), rawFd.getLength());
                        rawFd.close();
                    }
                }
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
            Log.i(TAG, "MediaPlayer azan berjaya dimulakan (STREAM_ALARM).");
        } catch (Exception e) {
            Log.e(TAG, "Gagal memainkan audio azan pada aras penggera", e);
            stopAzan();
            stopSelf();
        }
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
