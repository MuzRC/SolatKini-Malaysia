package com.solatkini.app.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.ToneGenerator
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.solatkini.app.model.AzanAudioOption
import com.solatkini.app.model.AzanLogStatus
import com.solatkini.app.model.AzanVoice
import com.solatkini.app.model.PrayerKey
import com.solatkini.app.model.PrayerTimeItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class AzanPlaybackState(
    val isPlaying: Boolean = false,
    val activeVoice: AzanVoice = AzanVoice.JAKIM,
    val prayerName: String = "",
    val currentPositionMs: Int = 0,
    val durationMs: Int = 0
)

class AzanAudioManager : Service() {
    private var mediaPlayer: MediaPlayer? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var autoStopRunnable: Runnable? = null
    private var progressRunnable: Runnable? = null
    private var currentVoice: AzanVoice = AzanVoice.JAKIM
    private var currentPrayerName: String = "Solat"

    private val stopReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            if (intent?.action == ACTION_STOP_AZAN) {
                stopPlaybackAndService()
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        ensureAzanChannel()
        val filter = IntentFilter(ACTION_STOP_AZAN)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(stopReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(stopReceiver, filter)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_AZAN) {
            stopPlaybackAndService()
            return START_NOT_STICKY
        }

        val prayerKey = PrayerKey.fromRaw(intent?.getStringExtra(AzanAlarmScheduler.EXTRA_PRAYER_KEY))
        val prayerName = intent?.getStringExtra(AzanAlarmScheduler.EXTRA_PRAYER_NAME).orEmpty().ifBlank { "Solat" }
        val requestedVoice = AzanVoice.fromId(intent?.getStringExtra(AzanAlarmScheduler.EXTRA_AZAN_VOICE))
        val autoStopSec = intent?.getIntExtra(AzanAlarmScheduler.EXTRA_AUTO_STOP_SEC, 0) ?: 0

        val resolvedVoice = if (prayerKey == PrayerKey.SUBUH && requestedVoice == AzanVoice.JAKIM) {
            AzanVoice.SUBUH_SPECIAL
        } else {
            requestedVoice
        }

        currentPrayerName = prayerName
        currentVoice = resolvedVoice

        startForeground(NOTIFICATION_ID, buildForegroundNotification(prayerName, resolvedVoice))

        if (resolvedVoice == AzanVoice.NONE) {
            stopPlaybackAndService()
            return START_NOT_STICKY
        }

        triggerVibrationIfNeeded()
        val started = playVoiceAudio(resolvedVoice, prayerName)

        val scheduler = AzanAlarmScheduler(applicationContext)
        if (started) {
            scheduler.appendDiagnosticLog(
                prayerName = prayerName,
                prayerKey = prayerKey.rawKey,
                status = AzanLogStatus.BERJAYA,
                details = "Audio azan dimainkan pada STREAM_ALARM (${resolvedVoice.id})"
            )
        } else {
            scheduler.appendDiagnosticLog(
                prayerName = prayerName,
                prayerKey = prayerKey.rawKey,
                status = AzanLogStatus.GAGAL,
                details = "Gagal memainkan audio azan (${resolvedVoice.id}); sandaran nada aktif"
            )
            playFallbackTone()
        }

        scheduleAutoStop(autoStopSec)
        return START_NOT_STICKY
    }

    private fun playVoiceAudio(voice: AzanVoice, prayerName: String): Boolean {
        releasePlayer()
        val option = AZAN_OPTIONS.find { it.id == voice }

        try {
            val mp = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
            }

            val cachedFile = File(filesDir, "azan_cache/${voice.id}.mp3")
            if (cachedFile.exists() && cachedFile.length() > 100_000L) {
                mp.setDataSource(cachedFile.absolutePath)
            } else {
                val rawName = option?.rawResName ?: "azan_jakim"
                val resId = resources.getIdentifier(rawName, "raw", packageName)
                if (resId != 0) {
                    val afd = resources.openRawResourceFd(resId)
                    mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                    afd.close()
                } else {
                    val assetPath = option?.assetPath ?: "audio/azan/jakim.mp3"
                    val afd = assets.openFd(assetPath)
                    mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                    afd.close()
                }
            }

            requestAlarmAudioFocus()

            mp.setOnPreparedListener { player ->
                player.start()
                _playbackState.value = AzanPlaybackState(
                    isPlaying = true,
                    activeVoice = voice,
                    prayerName = prayerName,
                    currentPositionMs = 0,
                    durationMs = player.duration.coerceAtLeast(0)
                )
                startProgressLoop()
            }

            mp.setOnCompletionListener {
                stopPlaybackAndService()
            }

            mp.setOnErrorListener { _, _, _ ->
                playFallbackTone()
                true
            }

            mediaPlayer = mp
            mp.prepareAsync()
            return true
        } catch (_: Exception) {
            releasePlayer()
            return false
        }
    }

    private fun playFallbackTone() {
        try {
            val toneGen = ToneGenerator(AudioManager.STREAM_ALARM, 90)
            toneGen.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 1200)
            mainHandler.postDelayed({
                try {
                    toneGen.release()
                } catch (_: Exception) {
                }
            }, 1400L)
        } catch (_: Exception) {
            // Abaikan
        }
    }

    private fun triggerVibrationIfNeeded() {
        try {
            val pattern = longArrayOf(0L, 600L, 300L, 600L, 300L, 1000L)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator?.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                val vib = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vib?.vibrate(VibrationEffect.createWaveform(pattern, -1))
                } else {
                    @Suppress("DEPRECATION")
                    vib?.vibrate(pattern, -1)
                }
            }
        } catch (_: Exception) {
            // Abaikan
        }
    }

    private fun requestAlarmAudioFocus() {
        val am = getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                .build()
            audioFocusRequest = req
            am.requestAudioFocus(req)
        } else {
            @Suppress("DEPRECATION")
            am.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        }
    }

    private fun abandonAlarmAudioFocus() {
        val am = getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { am.abandonAudioFocusRequest(it) }
            audioFocusRequest = null
        } else {
            @Suppress("DEPRECATION")
            am.abandonAudioFocus(null)
        }
    }

    private fun startProgressLoop() {
        stopProgressLoop()
        progressRunnable = object : Runnable {
            override fun run() {
                val mp = mediaPlayer
                if (mp != null && mp.isPlaying) {
                    _playbackState.value = _playbackState.value.copy(
                        isPlaying = true,
                        currentPositionMs = mp.currentPosition,
                        durationMs = mp.duration.coerceAtLeast(0)
                    )
                    mainHandler.postDelayed(this, 500L)
                }
            }
        }
        mainHandler.post(progressRunnable!!)
    }

    private fun stopProgressLoop() {
        progressRunnable?.let { mainHandler.removeCallbacks(it) }
        progressRunnable = null
    }

    private fun scheduleAutoStop(autoStopSec: Int) {
        autoStopRunnable?.let { mainHandler.removeCallbacks(it) }
        val effectiveSec = if (autoStopSec > 0) autoStopSec else DEFAULT_MAX_AZAN_SEC
        autoStopRunnable = Runnable {
            stopPlaybackAndService()
        }
        mainHandler.postDelayed(autoStopRunnable!!, effectiveSec * 1000L)
    }

    private fun releasePlayer() {
        stopProgressLoop()
        autoStopRunnable?.let { mainHandler.removeCallbacks(it) }
        autoStopRunnable = null
        try {
            mediaPlayer?.stop()
        } catch (_: Exception) {
        }
        try {
            mediaPlayer?.release()
        } catch (_: Exception) {
        }
        mediaPlayer = null
        abandonAlarmAudioFocus()
    }

    fun stopPlaybackAndService() {
        releasePlayer()
        _playbackState.value = AzanPlaybackState(isPlaying = false, activeVoice = currentVoice)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    private fun ensureAzanChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            val channel = NotificationChannel(
                CHANNEL_ID_AZAN_ALARM,
                "Penggera Azan SolatKini",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Saluran penggera laungan azan waktu solat"
                setSound(
                    null,
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                enableVibration(true)
            }
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(prayerName: String, voice: AzanVoice): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val contentPi = launchIntent?.let {
            PendingIntent.getActivity(
                this,
                3001,
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        val stopIntent = Intent(ACTION_STOP_AZAN).apply { setPackage(packageName) }
        val stopPi = PendingIntent.getBroadcast(
            this,
            3002,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val voiceTitle = AZAN_OPTIONS.find { it.id == voice }?.title ?: "Azan Rasmi JAKIM"

        return NotificationCompat.Builder(this, CHANNEL_ID_AZAN_ALARM)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Masuk Waktu $prayerName")
            .setContentText("$voiceTitle sedang berkumandang")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true)
            .apply { if (contentPi != null) setContentIntent(contentPi) }
            .addAction(0, "Hentikan Azan", stopPi)
            .build()
    }

    override fun onDestroy() {
        releasePlayer()
        try {
            unregisterReceiver(stopReceiver)
        } catch (_: Exception) {
        }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val CHANNEL_ID_AZAN_ALARM = "solatkini_azan_alarm_channel"
        const val ACTION_STOP_AZAN = "com.solatkini.app.ACTION_STOP_AZAN"
        private const val NOTIFICATION_ID = 7001
        private const val DEFAULT_MAX_AZAN_SEC = 240

        private val _playbackState = MutableStateFlow(AzanPlaybackState())
        val playbackState: StateFlow<AzanPlaybackState> = _playbackState.asStateFlow()

        val AZAN_OPTIONS: List<AzanAudioOption> = listOf(
            AzanAudioOption(
                id = AzanVoice.MAKKAH,
                title = "Azan Masjidil Haram (Makkah)",
                reciter = "Syeikh Ali Ahmed Mulla",
                description = "Laungan vokal azan agung penuh syahdu dari tanah suci Makkah Al-Mukarramah.",
                durationSec = 195,
                filename = "Azan_Makkah_Ali_Ahmed_Mulla.mp3",
                assetPath = "audio/azan/makkah.mp3",
                rawResName = "azan_makkah",
                fallbackUrl = "https://cdn.aladhan.com/audio/adhans/a1.mp3"
            ),
            AzanAudioOption(
                id = AzanVoice.MADINAH,
                title = "Azan Masjid An-Nabawi (Madinah)",
                reciter = "Syeikh Essam Bukhari",
                description = "Laungan vokal azan merdu dan tenang dari Masjid Nabawi Madinah Munawwarah.",
                durationSec = 210,
                filename = "Azan_Madinah_Essam_Bukhari.mp3",
                assetPath = "audio/azan/madinah.mp3",
                rawResName = "azan_madinah",
                fallbackUrl = "https://cdn.aladhan.com/audio/adhans/a2.mp3"
            ),
            AzanAudioOption(
                id = AzanVoice.JAKIM,
                title = "Azan Rasmi Malaysia (JAKIM)",
                reciter = "Ustaz Radzi Kamarul Hailan",
                description = "Laungan vokal azan rasmi siaran Radio & Televisyen Malaysia (RTM/TV3).",
                durationSec = 180,
                filename = "Azan_Malaysia_JAKIM_TV3.mp3",
                assetPath = "audio/azan/jakim.mp3",
                rawResName = "azan_jakim",
                fallbackUrl = "https://cdn.aladhan.com/audio/adhans/a7.mp3"
            ),
            AzanAudioOption(
                id = AzanVoice.AL_AQSA,
                title = "Azan Masjid Al-Aqsa (Palestin)",
                reciter = "Syeikh Naji Qazzaz",
                description = "Laungan vokal azan bersejarah penuh keinsafan dari kiblat pertama umat Islam di Baitulmaqdis.",
                durationSec = 220,
                filename = "Azan_Al_Aqsa_Palestine.mp3",
                assetPath = "audio/azan/al_aqsa.mp3",
                rawResName = "azan_al_aqsa",
                fallbackUrl = "https://cdn.aladhan.com/audio/adhans/a8.mp3"
            ),
            AzanAudioOption(
                id = AzanVoice.MISHARY,
                title = "Azan Alunan Syeikh Mishary Al-Afasy",
                reciter = "Syeikh Mishary Rashid Al-Afasy",
                description = "Alunan vokal azan yang amat merdu dan digemari di seluruh dunia Islam.",
                durationSec = 205,
                filename = "Azan_Mishary_Rashid_Al_Afasy.mp3",
                assetPath = "audio/azan/mishary.mp3",
                rawResName = "azan_mishary",
                fallbackUrl = "https://cdn.aladhan.com/audio/adhans/a9.mp3"
            ),
            AzanAudioOption(
                id = AzanVoice.SUBUH_SPECIAL,
                title = "Azan Subuh (As-Salatu Khairum Minan Naum)",
                reciter = "Muadzin Masjid Negara",
                description = "Dilengkapi seruan vokal Solat Itu Lebih Baik Daripada Tidur khas untuk waktu Subuh.",
                durationSec = 235,
                filename = "Azan_Subuh_As_Salatu_Khair.mp3",
                assetPath = "audio/azan/subuh.mp3",
                rawResName = "azan_subuh",
                fallbackUrl = "https://cdn.aladhan.com/audio/adhans/a3.mp3"
            ),
            AzanAudioOption(
                id = AzanVoice.TAKBIR_RAYA,
                title = "Takbir Hari Raya (Aidilfitri & Adha)",
                reciter = "Kumpulan Qari Malaysia",
                description = "Laungan vokal takbir raya tradisi Nusantara yang meruntun jiwa sempena hari kebesaran.",
                durationSec = 240,
                filename = "Takbir_Hari_Raya_Malaysia.mp3",
                assetPath = "audio/azan/takbir.mp3",
                rawResName = "takbir_raya",
                fallbackUrl = "https://cdn.aladhan.com/audio/adhans/a6.mp3"
            )
        )

        fun startAzanService(
            context: Context,
            prayerKey: PrayerKey,
            prayerName: String,
            voice: AzanVoice,
            autoStopSeconds: Int = 0
        ): Boolean {
            return try {
                val intent = Intent(context, AzanAudioManager::class.java).apply {
                    putExtra(AzanAlarmScheduler.EXTRA_PRAYER_KEY, prayerKey.rawKey)
                    putExtra(AzanAlarmScheduler.EXTRA_PRAYER_NAME, prayerName)
                    putExtra(AzanAlarmScheduler.EXTRA_AZAN_VOICE, voice.id)
                    putExtra(AzanAlarmScheduler.EXTRA_AUTO_STOP_SEC, autoStopSeconds)
                }
                ContextCompat.startForegroundService(context, intent)
                true
            } catch (_: Exception) {
                false
            }
        }

        fun stopAzanService(context: Context): Boolean {
            return try {
                val stopBroadcast = Intent(ACTION_STOP_AZAN).apply { setPackage(context.packageName) }
                context.sendBroadcast(stopBroadcast)

                val stopIntent = Intent(context, AzanAudioManager::class.java).apply {
                    action = ACTION_STOP_AZAN
                }
                context.stopService(stopIntent)
                _playbackState.value = _playbackState.value.copy(isPlaying = false, currentPositionMs = 0)
                true
            } catch (_: Exception) {
                false
            }
        }
    }
}

class PrayerAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return
        val action = intent.action

        if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            val userPrefs = context.getSharedPreferences("solatkini_user_prefs", Context.MODE_PRIVATE)
            val autoStart = userPrefs.getBoolean("solatkini_autostart_boot", true)
            if (!autoStart) return

            val scheduler = AzanAlarmScheduler(context)
            val voice = scheduler.getActiveVoice()
            val backupJson = context.getSharedPreferences("solatkini_alarm_native_prefs", Context.MODE_PRIVATE)
                .getString("solatkini_scheduled_alarms_backup", null)

            if (!backupJson.isNullOrBlank()) {
                try {
                    val arr = JSONArray(backupJson)
                    val rebuilt = mutableListOf<PrayerTimeItem>()
                    val now = Date()
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        val ts = obj.optLong("timestamp", 0L)
                        if (ts <= 0L) continue
                        val targetCal = Calendar.getInstance().apply { timeInMillis = ts }
                        val time24 = String.format(
                            Locale.US,
                            "%02d:%02d",
                            targetCal.get(Calendar.HOUR_OF_DAY),
                            targetCal.get(Calendar.MINUTE)
                        )
                        val key = PrayerKey.fromRaw(obj.optString("prayerKey", "subuh"))
                        val label = obj.optString("prayerName", key.rawKey)
                        val itemVoice = AzanVoice.fromId(obj.optString("voice", voice.id))
                        rebuilt.add(
                            PrayerTimeItem(
                                key = key,
                                label = label,
                                time = time24,
                                displayTime = time24,
                                voice = itemVoice
                            )
                        )
                    }
                    if (rebuilt.isNotEmpty()) {
                        scheduler.schedulePrayers(rebuilt, voice, nowMs = now.time)
                    }
                } catch (_: Exception) {
                    // Abaikan
                }
            }
            return
        }

        if (action == AzanAlarmScheduler.ACTION_PRAYER_ALARM) {
            val prayerKey = PrayerKey.fromRaw(intent.getStringExtra(AzanAlarmScheduler.EXTRA_PRAYER_KEY))
            val prayerName = intent.getStringExtra(AzanAlarmScheduler.EXTRA_PRAYER_NAME).orEmpty().ifBlank { "Solat" }
            val voice = AzanVoice.fromId(intent.getStringExtra(AzanAlarmScheduler.EXTRA_AZAN_VOICE))
            val autoStopSec = intent.getIntExtra(AzanAlarmScheduler.EXTRA_AUTO_STOP_SEC, 0)

            val scheduler = AzanAlarmScheduler(context)
            scheduler.appendDiagnosticLog(
                prayerName = prayerName,
                prayerKey = prayerKey.rawKey,
                status = AzanLogStatus.DICETUSKAN,
                details = "Penggera dicetuskan pada ${SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())} (${voice.id})"
            )

            if (voice != AzanVoice.NONE) {
                AzanAudioManager.startAzanService(
                    context = context,
                    prayerKey = prayerKey,
                    prayerName = prayerName,
                    voice = voice,
                    autoStopSeconds = autoStopSec
                )
            }

            val eventIntent = Intent(ACTION_AZAN_TRIGGERED_EVENT).apply {
                setPackage(context.packageName)
                putExtra(AzanAlarmScheduler.EXTRA_PRAYER_KEY, prayerKey.rawKey)
                putExtra(AzanAlarmScheduler.EXTRA_PRAYER_NAME, prayerName)
                putExtra(AzanAlarmScheduler.EXTRA_AZAN_VOICE, voice.id)
            }
            context.sendBroadcast(eventIntent)
        }
    }

    companion object {
        const val ACTION_AZAN_TRIGGERED_EVENT = "com.solatkini.app.AZAN_ALARM_TRIGGERED"
    }
}
