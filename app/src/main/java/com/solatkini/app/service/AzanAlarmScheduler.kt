package com.solatkini.app.service

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.solatkini.app.model.AzanLogEntry
import com.solatkini.app.model.AzanLogStatus
import com.solatkini.app.model.AzanVoice
import com.solatkini.app.model.PrayerKey
import com.solatkini.app.model.PrayerTimeItem
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class NativeAlarmScheduleItem(
    val prayerKey: PrayerKey,
    val prayerName: String,
    val timestampMs: Long,
    val voice: AzanVoice
)

data class PermissionStatusSnapshot(
    val notificationsGranted: Boolean,
    val exactAlarmAllowed: Boolean,
    val sdkInt: Int
)

data class AutoTimeStatusSnapshot(
    val isAutoTimeEnabled: Boolean,
    val isAutoTimeZoneEnabled: Boolean
)

class AzanAlarmScheduler(private val context: Context) {
    private val alarmManager: AlarmManager? =
        context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

    private val prefs =
        context.getSharedPreferences("solatkini_alarm_native_prefs", Context.MODE_PRIVATE)

    companion object {
        const val ACTION_PRAYER_ALARM = "com.solatkini.app.ACTION_PRAYER_ALARM"
        const val EXTRA_PRAYER_KEY = "extra_prayer_key"
        const val EXTRA_PRAYER_NAME = "extra_prayer_name"
        const val EXTRA_AZAN_VOICE = "extra_azan_voice"
        const val EXTRA_AUTO_STOP_SEC = "extra_auto_stop_sec"
        const val EXTRA_IS_TEST = "extra_is_test"

        private const val KEY_SCHEDULED_BACKUP = "solatkini_scheduled_alarms_backup"
        private const val KEY_ACTIVE_VOICE = "solatkini_active_device_voice"
        private const val KEY_AZAN_LOGS = "solatkini_azan_diagnostic_logs"
        private const val MAX_LOG_AGE_MS = 24L * 3600L * 1000L
        private const val MAX_LOG_ENTRIES = 100

        fun parsePrayerTimeString(timeStr: String?): Pair<Int, Int>? {
            if (timeStr.isNullOrBlank()) return null
            val cleaned = timeStr.trim().uppercase(Locale.US)
            val isPM = cleaned.contains("PM")
            val isAM = cleaned.contains("AM")

            val timeOnly = cleaned.replace(Regex("[A-Z\s]"), "")
            val parts = timeOnly.split(":")
            if (parts.size < 2) return null

            var hours = parts[0].trim().toIntOrNull() ?: return null
            val minutes = parts[1].trim().toIntOrNull() ?: return null

            if (isPM && hours < 12) hours += 12
            else if (isAM && hours == 12) hours = 0

            if (hours !in 0..23 || minutes !in 0..59) return null
            return hours to minutes
        }
    }

    fun checkPermissions(): PermissionStatusSnapshot {
        val sdk = Build.VERSION.SDK_INT
        val notifGranted = NotificationManagerCompat.from(context).areNotificationsEnabled()
        val exactAllowed = if (sdk >= Build.VERSION_CODES.S) {
            alarmManager?.canScheduleExactAlarms() ?: true
        } else {
            true
        }
        return PermissionStatusSnapshot(
            notificationsGranted = notifGranted,
            exactAlarmAllowed = exactAllowed,
            sdkInt = sdk
        )
    }

    fun canScheduleExactAlarms(): Boolean = checkPermissions().exactAlarmAllowed

    fun openExactAlarmSettings(): Boolean {
        return try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            } else {
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            context.startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun openNotificationSettings(): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun isIgnoringBatteryOptimizations(): Boolean {
        return try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            pm?.isIgnoringBatteryOptimizations(context.packageName) ?: false
        } catch (_: Exception) {
            false
        }
    }

    fun requestIgnoreBatteryOptimization(): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun openAutostartSettings(): Boolean {
        val candidateIntents = listOf(
            Intent().apply {
                component = ComponentName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity"
                )
            },
            Intent().apply {
                component = ComponentName(
                    "com.coloros.safecenter",
                    "com.coloros.safecenter.startupapp.StartupAppListActivity"
                )
            },
            Intent().apply {
                component = ComponentName(
                    "com.vivo.permissionmanager",
                    "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                )
            },
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
            }
        )

        for (intent in candidateIntents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                return true
            } catch (_: Exception) {
                // Cuba pilihan seterusnya
            }
        }
        return false
    }

    fun checkAutoTime(): AutoTimeStatusSnapshot {
        return try {
            val autoTime = Settings.Global.getInt(context.contentResolver, Settings.Global.AUTO_TIME, 1) == 1
            val autoZone = Settings.Global.getInt(context.contentResolver, Settings.Global.AUTO_TIME_ZONE, 1) == 1
            AutoTimeStatusSnapshot(isAutoTimeEnabled = autoTime, isAutoTimeZoneEnabled = autoZone)
        } catch (_: Exception) {
            AutoTimeStatusSnapshot(isAutoTimeEnabled = true, isAutoTimeZoneEnabled = true)
        }
    }

    fun openDateSettings(): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_DATE_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun setActiveVoice(voice: AzanVoice) {
        prefs.edit().putString(KEY_ACTIVE_VOICE, voice.id).apply()
    }

    fun getActiveVoice(): AzanVoice =
        AzanVoice.fromId(prefs.getString(KEY_ACTIVE_VOICE, AzanVoice.JAKIM.id))

    private fun buildAlarmPendingIntent(
        requestCode: Int,
        prayerKey: PrayerKey,
        prayerName: String,
        voice: AzanVoice,
        autoStopSec: Int = 0,
        isTest: Boolean = false
    ): PendingIntent {
        val intent = Intent(context, PrayerAlarmReceiver::class.java).apply {
            action = ACTION_PRAYER_ALARM
            putExtra(EXTRA_PRAYER_KEY, prayerKey.rawKey)
            putExtra(EXTRA_PRAYER_NAME, prayerName)
            putExtra(EXTRA_AZAN_VOICE, voice.id)
            putExtra(EXTRA_AUTO_STOP_SEC, autoStopSec)
            putExtra(EXTRA_IS_TEST, isTest)
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(context, requestCode, intent, flags)
    }

    fun schedulePrayers(
        prayerTimes: List<PrayerTimeItem>,
        defaultVoice: AzanVoice = AzanVoice.JAKIM,
        enabledPrayers: Map<PrayerKey, Boolean>? = null,
        nowMs: Long = System.currentTimeMillis()
    ): Int {
        val alarms = mutableListOf<NativeAlarmScheduleItem>()

        for (item in prayerTimes) {
            val isTransitionOnly = item.key == PrayerKey.IMSAK || item.key == PrayerKey.SYURUK
            val isPrayerDisabled = !isTransitionOnly && enabledPrayers?.get(item.key) == false

            val parsed = parsePrayerTimeString(item.time) ?: continue
            val cal = Calendar.getInstance().apply {
                timeInMillis = nowMs
                set(Calendar.HOUR_OF_DAY, parsed.first)
                set(Calendar.MINUTE, parsed.second)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            if (cal.timeInMillis <= nowMs) {
                cal.add(Calendar.DAY_OF_MONTH, 1)
            }

            val resolvedVoice = when {
                isTransitionOnly || isPrayerDisabled -> AzanVoice.NONE
                item.voice != AzanVoice.JAKIM -> item.voice
                item.key == PrayerKey.SUBUH && defaultVoice == AzanVoice.JAKIM -> AzanVoice.SUBUH_SPECIAL
                else -> defaultVoice
            }

            alarms.add(
                NativeAlarmScheduleItem(
                    prayerKey = item.key,
                    prayerName = item.label,
                    timestampMs = cal.timeInMillis,
                    voice = resolvedVoice
                )
            )
        }

        alarms.sortBy { it.timestampMs }
        saveBackupSchedule(alarms)
        cancelAllAlarms()

        val manager = alarmManager ?: return 0
        var scheduledCount = 0

        alarms.forEachIndexed { index, alarm ->
            try {
                val reqCode = 1000 + index
                val pendingIntent = buildAlarmPendingIntent(
                    requestCode = reqCode,
                    prayerKey = alarm.prayerKey,
                    prayerName = alarm.prayerName,
                    voice = alarm.voice,
                    autoStopSec = 0,
                    isTest = false
                )

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
                    manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.timestampMs, pendingIntent)
                } else {
                    val showIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
                        PendingIntent.getActivity(
                            context,
                            2000 + index,
                            launch,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                    }
                    manager.setAlarmClock(
                        AlarmManager.AlarmClockInfo(alarm.timestampMs, showIntent),
                        pendingIntent
                    )
                }
                scheduledCount++
            } catch (e: Exception) {
                appendDiagnosticLog(
                    prayerName = alarm.prayerName,
                    prayerKey = alarm.prayerKey.rawKey,
                    status = AzanLogStatus.GAGAL,
                    details = "Gagal jadual penggera: ${e.message ?: "Ralat sistem"}"
                )
            }
        }

        setActiveVoice(defaultVoice)
        return scheduledCount
    }

    fun cancelAllAlarms() {
        val manager = alarmManager ?: return
        for (index in 0 until 20) {
            val pendingIntent = buildAlarmPendingIntent(
                requestCode = 1000 + index,
                prayerKey = PrayerKey.SUBUH,
                prayerName = "",
                voice = AzanVoice.NONE
            )
            try {
                manager.cancel(pendingIntent)
                pendingIntent.cancel()
            } catch (_: Exception) {
                // Abaikan
            }
        }
    }

    fun testAlarmNow(
        prayerName: String = "Zohor",
        prayerKey: PrayerKey = PrayerKey.ZOHOR,
        voice: AzanVoice = AzanVoice.JAKIM,
        delaySeconds: Int = 0,
        autoStopSeconds: Int = 0
    ): Boolean {
        val safeDelayMs = (delaySeconds.coerceAtLeast(0)) * 1000L
        appendDiagnosticLog(
            prayerName = prayerName,
            prayerKey = prayerKey.rawKey,
            status = AzanLogStatus.DICETUSKAN,
            details = if (delaySeconds > 0) {
                "Ujian penggera dijadualkan dalam ${delaySeconds}s (${voice.id})"
            } else {
                "Ujian audio azan dicetuskan terus (${voice.id})"
            }
        )

        if (safeDelayMs == 0L) {
            return AzanAudioManager.startAzanService(
                context = context,
                prayerKey = prayerKey,
                prayerName = prayerName,
                voice = voice,
                autoStopSeconds = autoStopSeconds
            )
        }

        val manager = alarmManager ?: return false
        return try {
            val triggerAt = System.currentTimeMillis() + safeDelayMs
            val pendingIntent = buildAlarmPendingIntent(
                requestCode = 9999,
                prayerKey = prayerKey,
                prayerName = prayerName,
                voice = voice,
                autoStopSec = autoStopSeconds,
                isTest = true
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
            } else {
                manager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAt, null), pendingIntent)
            }
            true
        } catch (_: Exception) {
            false
        }
    }

    fun stopAzanAudio(): Boolean = AzanAudioManager.stopAzanService(context)

    private fun saveBackupSchedule(alarms: List<NativeAlarmScheduleItem>) {
        val arr = JSONArray()
        for (a in alarms) {
            arr.put(
                JSONObject().apply {
                    put("prayerKey", a.prayerKey.rawKey)
                    put("prayerName", a.prayerName)
                    put("timestamp", a.timestampMs)
                    put("voice", a.voice.id)
                }
            )
        }
        prefs.edit().putString(KEY_SCHEDULED_BACKUP, arr.toString()).apply()
    }

    fun appendDiagnosticLog(
        prayerName: String,
        prayerKey: String,
        status: AzanLogStatus,
        details: String,
        timestampMs: Long = System.currentTimeMillis()
    ) {
        val existing = getDiagnosticLogs24h(nowMs = timestampMs).toMutableList()
        val timeFmt = SimpleDateFormat("HH:mm:ss", Locale("ms", "MY")).format(Date(timestampMs))
        val dateFmt = SimpleDateFormat("dd/MM/yyyy", Locale("ms", "MY")).format(Date(timestampMs))

        existing.add(
            0,
            AzanLogEntry(
                prayerName = prayerName,
                prayerKey = prayerKey,
                timestamp = timestampMs,
                timeFormatted = timeFmt,
                dateFormatted = dateFmt,
                status = status,
                details = details
            )
        )

        val trimmed = existing.take(MAX_LOG_ENTRIES)
        val arr = JSONArray()
        for (entry in trimmed) {
            arr.put(
                JSONObject().apply {
                    put("prayerName", entry.prayerName)
                    put("prayerKey", entry.prayerKey)
                    put("timestamp", entry.timestamp)
                    put("timeFormatted", entry.timeFormatted)
                    put("dateFormatted", entry.dateFormatted)
                    put("status", entry.status.name)
                    put("details", entry.details)
                }
            )
        }
        prefs.edit().putString(KEY_AZAN_LOGS, arr.toString()).apply()
    }

    fun getDiagnosticLogs24h(nowMs: Long = System.currentTimeMillis()): List<AzanLogEntry> {
        val raw = prefs.getString(KEY_AZAN_LOGS, null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            val list = mutableListOf<AzanLogEntry>()
            val cutoff = nowMs - MAX_LOG_AGE_MS

            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                val ts = obj.optLong("timestamp", 0L)
                if (ts < cutoff) continue

                val statusStr = obj.optString("status", "DICETUSKAN")
                val statusEnum = when (statusStr.uppercase(Locale.US)) {
                    "BERJAYA", "SUCCESS" -> AzanLogStatus.BERJAYA
                    "GAGAL", "FAILED" -> AzanLogStatus.GAGAL
                    else -> AzanLogStatus.DICETUSKAN
                }

                list.add(
                    AzanLogEntry(
                        prayerName = obj.optString("prayerName", "Solat"),
                        prayerKey = obj.optString("prayerKey", "subuh"),
                        timestamp = ts,
                        timeFormatted = obj.optString("timeFormatted", "--:--:--"),
                        dateFormatted = obj.optString("dateFormatted", "--/--/----"),
                        status = statusEnum,
                        details = obj.optString("details", "")
                    )
                )
            }
            list.sortedByDescending { it.timestamp }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun clearDiagnosticLogs() {
        prefs.edit().remove(KEY_AZAN_LOGS).apply()
    }
}
