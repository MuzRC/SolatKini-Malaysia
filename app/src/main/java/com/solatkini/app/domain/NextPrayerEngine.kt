package com.solatkini.app.domain

import com.solatkini.app.model.DayPrayerTimes
import com.solatkini.app.model.FastingCountdownInfo
import com.solatkini.app.model.FastingPhase
import com.solatkini.app.model.NextPrayerInfo
import com.solatkini.app.model.PrayerKey
import java.util.Calendar
import java.util.Date
import java.util.Locale

object NextPrayerEngine {
    fun toMinutes(timeStr: String?): Int {
        if (timeStr.isNullOrBlank() || !timeStr.contains(":")) return 0
        val parts = timeStr.trim().split(":")
        val h = parts.getOrNull(0)?.trim()?.toIntOrNull() ?: 0
        val m = parts.getOrNull(1)?.trim()?.toIntOrNull() ?: 0
        return h * 60 + m
    }

    fun getPrayerDateObj(baseDate: Date, timeStr: String?): Date {
        val cleaned = (timeStr ?: "00:00").trim().uppercase(Locale.US)
        val isPM = cleaned.contains("PM")
        val isAM = cleaned.contains("AM")

        val timeOnly = cleaned.replace(Regex("[A-Z\s]"), "")
        val parts = timeOnly.split(":")
        var h = parts.getOrNull(0)?.trim()?.toIntOrNull() ?: 0
        val m = parts.getOrNull(1)?.trim()?.toIntOrNull() ?: 0

        if (isPM && h < 12) h += 12
        else if (isAM && h == 12) h = 0

        return Calendar.getInstance().apply {
            time = baseDate
            set(Calendar.HOUR_OF_DAY, h.coerceIn(0, 23))
            set(Calendar.MINUTE, m.coerceIn(0, 59))
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.time
    }

    fun formatRemainingDuration(remainingSec: Long, includeSeconds: Boolean = true): String {
        val safeSec = remainingSec.coerceAtLeast(0L)
        val hours = safeSec / 3600L
        val mins = (safeSec % 3600L) / 60L
        val secs = safeSec % 60L

        return if (includeSeconds) {
            if (hours > 0L) {
                "${hours}j ${mins}m ${secs}s"
            } else {
                "${mins}m ${secs}s"
            }
        } else {
            if (hours > 0L) {
                "${hours}j ${mins}m"
            } else {
                "${mins}m"
            }
        }
    }

    fun determineNextPrayer(
        prayerTimes: DayPrayerTimes,
        currentTime: Date = Date(),
        labelProvider: (PrayerKey) -> String = { key ->
            when (key) {
                PrayerKey.IMSAK -> "Imsak"
                PrayerKey.SUBUH -> "Subuh"
                PrayerKey.SYURUK -> "Syuruk"
                PrayerKey.ZOHOR -> "Zohor"
                PrayerKey.ASAR -> "Asar"
                PrayerKey.MAGHRIB -> "Maghrib"
                PrayerKey.ISYAK -> "Isyak"
            }
        }
    ): NextPrayerInfo {
        val nowMs = currentTime.time
        val order = PrayerKey.ALL_ORDERED

        for (i in order.indices) {
            val key = order[i]
            val timeStr = prayerTimes.times[key] ?: "00:00"
            val prayerDate = getPrayerDateObj(currentTime, timeStr)

            if (prayerDate.time > nowMs) {
                val remainingSec = ((prayerDate.time - nowMs) / 1000L).coerceAtLeast(0L)
                val prevKey = if (i > 0) order[i - 1] else PrayerKey.ISYAK

                return NextPrayerInfo(
                    nextKey = key,
                    nextLabel = labelProvider(key),
                    nextTime = timeStr,
                    nextDisplayTime = PrayerCalculator.formatDisplayTime(timeStr),
                    targetTimestamp = prayerDate.time,
                    remainingSeconds = remainingSec,
                    countdownFormatted = formatRemainingDuration(remainingSec, includeSeconds = true),
                    currentKey = prevKey,
                    currentLabel = labelProvider(prevKey),
                    isPassedToday = false
                )
            }
        }

        val tomorrowImsakStr = prayerTimes.times[PrayerKey.IMSAK] ?: "05:00"
        val tomorrowImsakCal = Calendar.getInstance().apply {
            time = getPrayerDateObj(currentTime, tomorrowImsakStr)
            add(Calendar.DAY_OF_MONTH, 1)
        }
        val targetMs = tomorrowImsakCal.timeInMillis
        val remainingSec = ((targetMs - nowMs) / 1000L).coerceAtLeast(0L)

        return NextPrayerInfo(
            nextKey = PrayerKey.IMSAK,
            nextLabel = labelProvider(PrayerKey.IMSAK),
            nextTime = tomorrowImsakStr,
            nextDisplayTime = PrayerCalculator.formatDisplayTime(tomorrowImsakStr),
            targetTimestamp = targetMs,
            remainingSeconds = remainingSec,
            countdownFormatted = formatRemainingDuration(remainingSec, includeSeconds = true),
            currentKey = PrayerKey.ISYAK,
            currentLabel = labelProvider(PrayerKey.ISYAK),
            isPassedToday = true
        )
    }

    fun getFastingCountdown(
        prayerTimes: DayPrayerTimes,
        currentTime: Date = Date(),
        isRamadan: Boolean = false,
        isUserFasting: Boolean = false
    ): FastingCountdownInfo {
        val nowMs = currentTime.time
        val subuhStr = prayerTimes.times[PrayerKey.SUBUH] ?: "05:30"
        val maghribStr = prayerTimes.times[PrayerKey.MAGHRIB] ?: "18:30"
        val imsakStr = prayerTimes.times[PrayerKey.IMSAK] ?: "05:20"

        val subuhMs = getPrayerDateObj(currentTime, subuhStr).time
        val maghribMs = getPrayerDateObj(currentTime, maghribStr).time
        val imsakMs = getPrayerDateObj(currentTime, imsakStr).time

        val isFastingDay = isRamadan || isUserFasting

        if (nowMs in imsakMs until subuhMs) {
            val secLeft = ((subuhMs - nowMs) / 1000L).coerceAtLeast(0L)
            val m = secLeft / 60L
            val s = secLeft % 60L
            return FastingCountdownInfo(
                phase = FastingPhase.IMSAK_ALERT,
                title = if (isFastingDay) "Waktu Imsak (Tamat Sahur)" else "Waktu Imsak Hari Ini",
                targetTimeStr = subuhStr,
                targetDisplayTime = PrayerCalculator.formatDisplayTime(subuhStr),
                remainingFormatted = "${m}m ${s}s lagi ke Subuh",
                percentage = 95,
                isCurrentlyFasting = isFastingDay
            )
        }

        if (nowMs in subuhMs until maghribMs) {
            val totalDuration = (maghribMs - subuhMs).coerceAtLeast(1L).toDouble()
            val elapsed = (nowMs - subuhMs).toDouble()
            val progress = ((elapsed / totalDuration) * 100.0).coerceIn(0.0, 100.0).toInt()
            val secLeft = ((maghribMs - nowMs) / 1000L).coerceAtLeast(0L)

            val title = when {
                isRamadan -> "Sedang Berpuasa Ramadan"
                isUserFasting -> "Sedang Berpuasa (Sunat / Ganti)"
                else -> "Kiraan Menuju Maghrib"
            }

            return FastingCountdownInfo(
                phase = FastingPhase.FASTING,
                title = title,
                targetTimeStr = maghribStr,
                targetDisplayTime = PrayerCalculator.formatDisplayTime(maghribStr),
                remainingFormatted = "${formatRemainingDuration(secLeft, includeSeconds = true)} lagi",
                percentage = progress,
                isCurrentlyFasting = isFastingDay
            )
        }

        return FastingCountdownInfo(
            phase = FastingPhase.EATING,
            title = if (isFastingDay) "Waktu Berbuka / Sahur" else "Waktu Menuju Imsak Esok",
            targetTimeStr = imsakStr,
            targetDisplayTime = PrayerCalculator.formatDisplayTime(imsakStr),
            remainingFormatted = "Sila bersedia untuk sahur & imsak",
            percentage = 100,
            isCurrentlyFasting = false
        )
    }
}
