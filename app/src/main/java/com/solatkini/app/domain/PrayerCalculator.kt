package com.solatkini.app.domain

import com.solatkini.app.model.PrayerKey
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.atan
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin
import kotlin.math.tan

object PrayerCalculator {
    private fun toRadians(deg: Double): Double = Math.toRadians(deg)
    private fun toDegrees(rad: Double): Double = Math.toDegrees(rad)

    private fun fixAngle(angle: Double): Double {
        val a = angle - 360.0 * floor(angle / 360.0)
        return if (a < 0.0) a + 360.0 else a
    }

    private fun fixHour(hour: Double): Double {
        val h = hour - 24.0 * floor(hour / 24.0)
        return if (h < 0.0) h + 24.0 else h
    }

    private fun getJulianDate(year: Int, month: Int, day: Int): Double {
        var y = year
        var m = month
        if (m <= 2) {
            y -= 1
            m += 12
        }
        val a = floor(y / 100.0)
        val b = 2.0 - a + floor(a / 4.0)
        return floor(365.25 * (y + 4716.0)) +
            floor(30.6001 * (m + 1.0)) +
            day.toDouble() +
            b -
            1524.5
    }

    private data class SunCoords(val dec: Double, val eqT: Double)

    private fun sunCoordinates(d: Double): SunCoords {
        val g = fixAngle(357.529 + 0.98560028 * d)
        val q = fixAngle(280.459 + 0.98564736 * d)
        val l = fixAngle(q + 1.915 * sin(toRadians(g)) + 0.02 * sin(toRadians(2.0 * g)))
        val e = 23.439 - 0.00000036 * d
        val ra = toDegrees(
            atan2(cos(toRadians(e)) * sin(toRadians(l)), cos(toRadians(l)))
        ) / 15.0
        val dec = toDegrees(asin(sin(toRadians(e)) * sin(toRadians(l))))

        var eqT = q / 15.0 - fixHour(ra)
        if (eqT > 12.0) eqT -= 24.0
        if (eqT < -12.0) eqT += 24.0

        return SunCoords(dec = dec, eqT = eqT)
    }

    private fun hourAngle(lat: Double, dec: Double, angle: Double): Double {
        val cosHa =
            (sin(toRadians(-angle)) - sin(toRadians(lat)) * sin(toRadians(dec))) /
                (cos(toRadians(lat)) * cos(toRadians(dec)))
        if (cosHa < -1.0) return 180.0
        if (cosHa > 1.0) return 0.0
        return toDegrees(acos(cosHa.coerceIn(-1.0, 1.0)))
    }

    private fun hourAngleForAltitude(lat: Double, dec: Double, altitude: Double): Double {
        val cosHa =
            (sin(toRadians(altitude)) - sin(toRadians(lat)) * sin(toRadians(dec))) /
                (cos(toRadians(lat)) * cos(toRadians(dec)))
        if (cosHa < -1.0) return 180.0
        if (cosHa > 1.0) return 0.0
        return toDegrees(acos(cosHa.coerceIn(-1.0, 1.0)))
    }

    fun formatHour(hour: Double): String {
        val hFixed = fixHour(hour)
        val totalMinutes = Math.round(hFixed * 60.0).toInt()
        val h = (totalMinutes / 60) % 24
        val m = totalMinutes % 60
        return String.format(Locale.US, "%02d:%02d", h, m)
    }

    fun formatDisplayTime(time24: String?): String {
        if (time24.isNullOrBlank() || !time24.contains(":")) {
            return "--:--"
        }
        val cleaned = time24.trim().uppercase(Locale.US)
        val hasPM = cleaned.contains("PM")
        val hasAM = cleaned.contains("AM")

        val timeOnly = cleaned.replace(Regex("[A-Z\s]"), "")
        val parts = timeOnly.split(":")
        var h = parts.getOrNull(0)?.trim()?.toIntOrNull() ?: return "--:--"
        val m = parts.getOrNull(1)?.trim()?.toIntOrNull() ?: return "--:--"

        if (hasPM && h < 12) h += 12
        else if (hasAM && h == 12) h = 0

        val ampm = if (h >= 12) "PM" else "AM"
        val hour12 = when (val mod = h % 12) {
            0 -> 12
            else -> mod
        }
        return String.format(Locale.US, "%d:%02d %s", hour12, m, ampm)
    }

    fun calculateLocalPrayerTimes(
        date: Date,
        lat: Double,
        lng: Double,
        timezoneHours: Int = 8
    ): Map<PrayerKey, String> {
        val cal = Calendar.getInstance(TimeZone.getTimeZone("GMT+8")).apply {
            time = date
        }
        val year = cal.get(Calendar.YEAR)
        val month = cal.get(Calendar.MONTH) + 1
        val day = cal.get(Calendar.DAY_OF_MONTH)

        val jd = getJulianDate(year, month, day) + 0.5 - timezoneHours / 24.0
        val d = jd - 2451545.0
        val (dec, eqT) = sunCoordinates(d)

        val noon = fixHour(12.0 + timezoneHours - lng / 15.0 - eqT)

        val fajrHa = hourAngle(lat, dec, 20.0)
        val fajrTime = noon - fajrHa / 15.0

        val sunriseHa = hourAngle(lat, dec, 0.833)
        val sunriseTime = noon - sunriseHa / 15.0

        val sunsetHa = hourAngle(lat, dec, 0.833)
        val sunsetTime = noon + sunsetHa / 15.0

        val asrAlt = toDegrees(atan(1.0 / (1.0 + tan(toRadians(Math.abs(lat - dec))))))
        val asrHa = hourAngleForAltitude(lat, dec, asrAlt)
        val asrTime = noon + asrHa / 15.0

        val ishaHa = hourAngle(lat, dec, 18.0)
        val ishaTime = noon + ishaHa / 15.0

        val ihtiyatHours = 2.0 / 60.0
        val subuhHours = fajrTime + ihtiyatHours
        val imsakHours = subuhHours - 10.0 / 60.0
        val syurukHours = sunriseTime
        val zohorHours = noon + ihtiyatHours
        val asarHours = asrTime + ihtiyatHours
        val maghribHours = sunsetTime + ihtiyatHours
        val isyakHours = ishaTime + ihtiyatHours

        return mapOf(
            PrayerKey.IMSAK to formatHour(imsakHours),
            PrayerKey.SUBUH to formatHour(subuhHours),
            PrayerKey.SYURUK to formatHour(syurukHours),
            PrayerKey.ZOHOR to formatHour(zohorHours),
            PrayerKey.ASAR to formatHour(asarHours),
            PrayerKey.MAGHRIB to formatHour(maghribHours),
            PrayerKey.ISYAK to formatHour(isyakHours)
        )
    }
}
