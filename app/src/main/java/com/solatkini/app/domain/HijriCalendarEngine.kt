package com.solatkini.app.domain

import com.solatkini.app.model.FastingRecommendation
import com.solatkini.app.model.HijriDateInfo
import com.solatkini.app.model.RamadanCountdownInfo
import java.util.Calendar
import java.util.Date
import kotlin.math.floor

object HijriCalendarEngine {
    val HIJRI_MONTHS: List<String> = listOf(
        "Muharram",
        "Safar",
        "Rabiulawal",
        "Rabiulakhir",
        "Jamadilawal",
        "Jamadilakhir",
        "Rejab",
        "Syaaban",
        "Ramadan",
        "Syawal",
        "Zulkaedah",
        "Zulhijjah"
    )

    val ISLAMIC_EVENTS: Map<String, String> = mapOf(
        "1-0" to "Awal Muharram (Tahun Baru Hijrah)",
        "10-0" to "Hari Asyura",
        "12-2" to "Maulidur Rasul",
        "27-6" to "Israk dan Mikraj",
        "15-7" to "Malam Nisfu Syaaban",
        "1-8" to "Awal Ramadan (Hari Pertama Berpuasa)",
        "17-8" to "Hari Nuzul Al-Quran",
        "1-9" to "Hari Raya Aidilfitri (1 Syawal)",
        "2-9" to "Hari Raya Aidilfitri (2 Syawal)",
        "1-11" to "Awal Bulan Zulhijjah",
        "9-11" to "Hari Wukuf / Hari Arafah (Puasa Sunat Arafah)",
        "10-11" to "Hari Raya Aidiladha (10 Zulhijjah)",
        "11-11" to "Hari Tasyrik (11 Zulhijjah)",
        "12-11" to "Hari Tasyrik (12 Zulhijjah)",
        "13-11" to "Hari Tasyrik (13 Zulhijjah)"
    )

    private val HIJRI_LEAP_YEARS_IN_CYCLE: Set<Int> = setOf(
        2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29
    )

    private const val DAY_MS = 86_400_000L

    fun parseJakimHijriString(jakimHijri: String?): String? {
        if (jakimHijri.isNullOrBlank()) return null
        val parts = jakimHijri.trim().split("-")
        if (parts.size != 3) return null
        val y = parts[0].toIntOrNull() ?: return null
        val m = parts[1].toIntOrNull() ?: return null
        val d = parts[2].toIntOrNull() ?: return null
        if (m !in 1..12 || d !in 1..30) return null
        return "$d ${HIJRI_MONTHS[m - 1]} ${y}H"
    }

    fun getHijriDate(date: Date, adjustmentDays: Int = 0): HijriDateInfo {
        val effectiveAdj = adjustmentDays.coerceIn(-2, 2)
        val cal = Calendar.getInstance().apply {
            timeInMillis = date.time + effectiveAdj * DAY_MS
        }
        val day = cal.get(Calendar.DAY_OF_MONTH)
        val month = cal.get(Calendar.MONTH)
        val year = cal.get(Calendar.YEAR)

        var m = month + 1
        var y = year
        if (m < 3) {
            y -= 1
            m += 12
        }

        val a = floor(y / 100.0)
        val b = 2.0 - a + floor(a / 4.0)
        val jd = floor(365.25 * (y + 4716.0)) +
            floor(30.6001 * (m + 1.0)) +
            day.toDouble() +
            b -
            1524.5

        val z = jd - 1948439.5
        val cyc = floor(z / 10631.0)
        val rem = z - 10631.0 * cyc
        val j = floor((rem + 0.5) / 354.36667)
        val hijriYear = (30.0 * cyc + j + 1.0).toInt()

        var dayOfYear = floor(rem - floor(j * 354.36667) + 0.5).toInt().coerceAtLeast(1)
        val yearInCycle = ((hijriYear - 1) % 30) + 1
        val isLeapYear = HIJRI_LEAP_YEARS_IN_CYCLE.contains(yearInCycle)

        var hijriMonth = 11
        val monthLengths = intArrayOf(
            30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30,
            if (isLeapYear) 30 else 29
        )

        for (i in 0 until 12) {
            val len = monthLengths[i]
            if (dayOfYear <= len) {
                hijriMonth = i
                break
            }
            dayOfYear -= len
        }

        val hijriDay = dayOfYear.coerceIn(1, 30)
        val safeMonthIdx = hijriMonth.coerceIn(0, 11)
        val monthName = HIJRI_MONTHS[safeMonthIdx]
        val formatted = "$hijriDay $monthName ${hijriYear}H"

        val isThirteenthZulhijjah = safeMonthIdx == 11 && hijriDay == 13
        val isAyyamulBidh = hijriDay in 13..15 && !isThirteenthZulhijjah
        val specialEvent = ISLAMIC_EVENTS["$hijriDay-$safeMonthIdx"]
        val isRamadan = safeMonthIdx == 8

        return HijriDateInfo(
            day = hijriDay,
            monthIndex = safeMonthIdx,
            monthName = monthName,
            year = hijriYear,
            formatted = formatted,
            isAyyamulBidh = isAyyamulBidh,
            specialEvent = specialEvent,
            isRamadan = isRamadan
        )
    }

    fun getRamadanCountdownInfo(date: Date, adjustmentDays: Int = 0): RamadanCountdownInfo {
        val effectiveAdj = adjustmentDays.coerceIn(-2, 2)
        val baseCal = Calendar.getInstance().apply {
            time = date
            set(Calendar.HOUR_OF_DAY, 12)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val baseMs = baseCal.timeInMillis
        val currentHijri = getHijriDate(Date(baseMs), effectiveAdj)

        if (currentHijri.isRamadan) {
            var daysToSyawal = (30 - currentHijri.day).coerceAtLeast(0)
            for (i in 1..31) {
                val futureDate = Date(baseMs + i * DAY_MS)
                val h = getHijriDate(futureDate, effectiveAdj)
                if (h.monthIndex == 9 && h.day == 1) {
                    daysToSyawal = i
                    break
                }
            }
            val startEpoch = baseMs - (currentHijri.day - 1) * DAY_MS
            return RamadanCountdownInfo(
                isRamadan = true,
                currentRamadanDay = currentHijri.day,
                daysRemainingInRamadan = daysToSyawal,
                daysUntilNextRamadan = 0,
                nextRamadanHijriYear = currentHijri.year,
                estimatedRamadanStartEpoch = startEpoch,
                ramadanYearKey = currentHijri.year.toString()
            )
        }

        var daysUntil = 0
        var targetYear = if (currentHijri.monthIndex < 8) currentHijri.year else currentHijri.year + 1
        var estimatedStartEpoch = baseMs + 30 * DAY_MS

        for (i in 1..370) {
            val futureDate = Date(baseMs + i * DAY_MS)
            val h = getHijriDate(futureDate, effectiveAdj)
            if (h.monthIndex == 8 && h.day == 1) {
                daysUntil = i
                targetYear = h.year
                estimatedStartEpoch = futureDate.time
                break
            }
        }

        return RamadanCountdownInfo(
            isRamadan = false,
            currentRamadanDay = 0,
            daysRemainingInRamadan = 0,
            daysUntilNextRamadan = daysUntil,
            nextRamadanHijriYear = targetYear,
            estimatedRamadanStartEpoch = estimatedStartEpoch,
            ramadanYearKey = targetYear.toString()
        )
    }

    fun getFastingRecommendation(date: Date, hijri: HijriDateInfo): FastingRecommendation {
        val cal = Calendar.getInstance().apply { time = date }
        val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK) // Calendar.MONDAY = 2, Calendar.THURSDAY = 5

        val isAidilfitri = hijri.monthIndex == 9 && hijri.day == 1
        val isAidiladha = hijri.monthIndex == 11 && hijri.day == 10
        val isHariTasyrik = hijri.monthIndex == 11 && hijri.day in 11..13

        if (isAidilfitri || isAidiladha || isHariTasyrik) {
            return FastingRecommendation(
                isRecommended = false,
                type = if (isHariTasyrik) "Hari Tasyrik (Diharamkan Berpuasa)" else "Hari Raya (Diharamkan Berpuasa)",
                description = "Umat Islam diharamkan berpuasa pada Hari Raya Aidilfitri, Aidiladha, dan tiga Hari Tasyrik."
            )
        }

        if (hijri.isRamadan) {
            return FastingRecommendation(
                isRecommended = true,
                type = "Puasa Wajib Ramadan",
                description = "Hari berpuasa wajib bagi seluruh umat Islam."
            )
        }

        if (hijri.day == 9 && hijri.monthIndex == 11) {
            return FastingRecommendation(
                isRecommended = true,
                type = "Puasa Sunat Hari Arafah",
                description = "Fadhilat menghapuskan dosa setahun yang lalu dan setahun yang akan datang."
            )
        }

        if ((hijri.day == 9 || hijri.day == 10) && hijri.monthIndex == 0) {
            return FastingRecommendation(
                isRecommended = true,
                type = "Puasa Sunat Tasu'a & Asyura",
                description = "Sunat berpuasa pada 9 dan 10 Muharram."
            )
        }

        if (hijri.isAyyamulBidh) {
            return FastingRecommendation(
                isRecommended = true,
                type = "Puasa Sunat Hari Putih (Ayyamul Bidh)",
                description = "Hari ke-${hijri.day} bulan Islam. Ganjarannya seperti berpuasa sepanjang tahun."
            )
        }

        if (dayOfWeek == Calendar.MONDAY) {
            return FastingRecommendation(
                isRecommended = true,
                type = "Puasa Sunat Hari Isnin",
                description = "Sunnah Nabi SAW berpuasa pada hari kelahiran baginda."
            )
        }

        if (dayOfWeek == Calendar.THURSDAY) {
            return FastingRecommendation(
                isRecommended = true,
                type = "Puasa Sunat Hari Khamis",
                description = "Hari di mana segala amalan diangkat kepada Allah SWT."
            )
        }

        return FastingRecommendation(
            isRecommended = false,
            type = "Tiada Puasa Khusus",
            description = "Anda boleh niat berpuasa sunat mutlak atau puasa ganti (qada)."
        )
    }
}
