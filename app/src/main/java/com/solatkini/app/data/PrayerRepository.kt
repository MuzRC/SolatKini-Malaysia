package com.solatkini.app.data

import android.content.Context
import android.content.SharedPreferences
import com.solatkini.app.model.AppUpdateInfo
import com.solatkini.app.model.DayPrayerTimes
import com.solatkini.app.model.JakimZone
import com.solatkini.app.model.PrayerKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class PrayerFetchResult(
    val times: DayPrayerTimes,
    val isOfflineCalculated: Boolean,
    val lastSyncTime: String
)

enum class UpdateCheckStatus {
    UPDATE_AVAILABLE,
    UP_TO_DATE,
    ERROR,
    SKIPPED
}

data class UpdateCheckOutcome(
    val status: UpdateCheckStatus,
    val info: AppUpdateInfo? = null,
    val message: String
)

class PrayerRepository(
    context: Context,
    private val localCalculator: (Date, Double, Double, Int) -> Map<PrayerKey, String>,
    private val hijriFormatter: (Date) -> String
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("solatkini_prayer_cache_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val CACHE_KEY_PREFIX = "solatkini_prayer_times_"
        private const val LAST_UPDATE_CHECK_KEY = "solatkini_last_update_check"
        private const val UPDATE_CHECK_INTERVAL_MS = 6L * 3600L * 1000L

        const val CURRENT_APP_VERSION = "2.5.0"
        const val CURRENT_VERSION_CODE = 25
        const val GITHUB_REPO = "MuzRC/SolatKini-Malaysia"
        private const val VERSION_CHECK_URL =
            "https://raw.githubusercontent.com/$GITHUB_REPO/main/version.json"
        private const val GITHUB_RELEASES_API =
            "https://api.github.com/repos/$GITHUB_REPO/releases/latest"

        fun getLocalDateString(date: Date = Date()): String {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            return sdf.format(date)
        }

        fun formatFromTimestampOrStr(raw: Any?): String {
            if (raw == null || raw == JSONObject.NULL) return "00:00"
            return when (raw) {
                is Number -> {
                    val num = raw.toLong()
                    val epochSec = if (num > 100_000_000_000L) num / 1000L else num
                    val cal = Calendar.getInstance(TimeZone.getTimeZone("GMT+8"))
                    cal.timeInMillis = epochSec * 1000L
                    String.format(
                        Locale.US,
                        "%02d:%02d",
                        cal.get(Calendar.HOUR_OF_DAY),
                        cal.get(Calendar.MINUTE)
                    )
                }
                else -> {
                    val str = raw.toString().trim()
                    if (str.contains(":")) {
                        val parts = str.split(":")
                        val h = parts.getOrNull(0)?.trim()?.toIntOrNull() ?: 0
                        val m = parts.getOrNull(1)?.trim()?.toIntOrNull() ?: 0
                        String.format(Locale.US, "%02d:%02d", h, m)
                    } else {
                        "00:00"
                    }
                }
            }
        }
    }

    private fun currentTimeShort(): String =
        SimpleDateFormat("HH:mm", Locale("ms", "MY")).format(Date())

    private fun serializeDayPrayerTimes(data: DayPrayerTimes): String {
        val obj = JSONObject()
        obj.put("date", data.date)
        obj.put("hijriDate", data.hijriDate)
        obj.put("zone", data.zone)
        val timesObj = JSONObject()
        for (key in PrayerKey.ALL_ORDERED) {
            timesObj.put(key.rawKey, data.times[key] ?: "00:00")
        }
        obj.put("times", timesObj)
        return obj.toString()
    }

    private fun deserializeDayPrayerTimes(jsonStr: String, fallbackDate: Date): DayPrayerTimes? {
        return try {
            val obj = JSONObject(jsonStr)
            val date = obj.optString("date", getLocalDateString(fallbackDate))
            var hijri = obj.optString("hijriDate", "")
            if (hijri.isBlank() || Regex("^\d{4}-\d{2}-\d{2}H?$").matches(hijri)) {
                hijri = hijriFormatter(fallbackDate)
            }
            val zone = obj.optString("zone", JakimZonesData.DEFAULT_ZONE.code)
            val timesObj = obj.optJSONObject("times") ?: return null
            val timesMap = PrayerKey.ALL_ORDERED.associateWith { key ->
                timesObj.optString(key.rawKey, "00:00")
            }
            DayPrayerTimes(date = date, hijriDate = hijri, zone = zone, times = timesMap)
        } catch (_: Exception) {
            null
        }
    }

    fun getCachedDaysFromDate(zoneCode: String, fromDateStr: String, limit: Int = 14): List<DayPrayerTimes> {
        val prefix = "$CACHE_KEY_PREFIX${zoneCode}_"
        val results = mutableListOf<DayPrayerTimes>()
        for ((key, value) in prefs.all) {
            if (key.startsWith(prefix) && !key.endsWith("_sync") && value is String) {
                val parsed = deserializeDayPrayerTimes(value, Date())
                if (parsed != null && parsed.date >= fromDateStr) {
                    results.add(parsed)
                }
            }
        }
        return results.sortedBy { it.date }.take(limit)
    }

    suspend fun fetchDayPrayerTimes(
        zone: JakimZone,
        date: Date = Date(),
        forceLive: Boolean = false,
        isNetworkOnline: Boolean = true
    ): PrayerFetchResult = withContext(Dispatchers.IO) {
        val dateStr = getLocalDateString(date)
        val cacheKey = "$CACHE_KEY_PREFIX${zone.code}_$dateStr"
        val nowTimeStr = currentTimeShort()

        if (!forceLive) {
            val cachedStr = prefs.getString(cacheKey, null)
            if (cachedStr != null) {
                val parsed = deserializeDayPrayerTimes(cachedStr, date)
                if (parsed != null) {
                    val lastSync = prefs.getString("${cacheKey}_sync", nowTimeStr) ?: nowTimeStr
                    return@withContext PrayerFetchResult(
                        times = parsed,
                        isOfflineCalculated = !isNetworkOnline,
                        lastSyncTime = if (isNetworkOnline) lastSync else "$lastSync (Luar Talian)"
                    )
                }
            }
        }

        var fetchedTimes: Map<PrayerKey, String>? = null
        var isOffline = !isNetworkOnline

        if (isNetworkOnline) {
            try {
                val url = URL("https://api.waktusolat.app/v2/solat/${zone.code}")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 7000
                    readTimeout = 7000
                    setRequestProperty("Accept", "application/json")
                }

                if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                    val body = conn.inputStream.bufferedReader().use { it.readText() }
                    val root = JSONObject(body)
                    val prayersArr: JSONArray? = root.optJSONArray("prayers")

                    if (prayersArr != null && prayersArr.length() > 0) {
                        val targetCal = Calendar.getInstance().apply { time = date }
                        val reqYear = targetCal.get(Calendar.YEAR)
                        val reqMonth = targetCal.get(Calendar.MONTH) + 1
                        val reqDay = targetCal.get(Calendar.DAY_OF_MONTH)

                        val apiYear = root.optInt("year", reqYear)
                        val apiMonth = root.optInt("month_number", reqMonth)

                        val editor = prefs.edit()
                        for (i in 0 until prayersArr.length()) {
                            val pItem = prayersArr.optJSONObject(i) ?: continue
                            val dayNum = pItem.optInt("day", -1)
                            if (dayNum <= 0) continue

                            val itemDateStr = String.format(Locale.US, "%04d-%02d-%02d", apiYear, apiMonth, dayNum)
                            val itemCacheKey = "$CACHE_KEY_PREFIX${zone.code}_$itemDateStr"

                            val pTimes = mapOf(
                                PrayerKey.IMSAK to formatFromTimestampOrStr(pItem.opt("imsak")),
                                PrayerKey.SUBUH to formatFromTimestampOrStr(pItem.opt("fajr")),
                                PrayerKey.SYURUK to formatFromTimestampOrStr(pItem.opt("syuruk")),
                                PrayerKey.ZOHOR to formatFromTimestampOrStr(pItem.opt("dhuhr")),
                                PrayerKey.ASAR to formatFromTimestampOrStr(pItem.opt("asr")),
                                PrayerKey.MAGHRIB to formatFromTimestampOrStr(pItem.opt("maghrib")),
                                PrayerKey.ISYAK to formatFromTimestampOrStr(pItem.opt("isha"))
                            )

                            val localCal = Calendar.getInstance().apply {
                                set(Calendar.YEAR, apiYear)
                                set(Calendar.MONTH, (apiMonth - 1).coerceIn(0, 11))
                                set(Calendar.DAY_OF_MONTH, dayNum)
                                set(Calendar.HOUR_OF_DAY, 12)
                                set(Calendar.MINUTE, 0)
                                set(Calendar.SECOND, 0)
                            }

                            val dayEntry = DayPrayerTimes(
                                date = itemDateStr,
                                hijriDate = hijriFormatter(localCal.time),
                                zone = zone.code,
                                times = pTimes
                            )
                            editor.putString(itemCacheKey, serializeDayPrayerTimes(dayEntry))
                            editor.putString("${itemCacheKey}_sync", nowTimeStr)

                            if (apiYear == reqYear && apiMonth == reqMonth && dayNum == reqDay) {
                                fetchedTimes = pTimes
                                isOffline = false
                            }
                        }
                        editor.apply()
                    }
                }
                conn.disconnect()
            } catch (_: Exception) {
                // Terus ke cache atau kiraan falak tempatan
            }
        }

        if (fetchedTimes == null) {
            val existingCached = prefs.getString(cacheKey, null)
            if (existingCached != null) {
                val parsed = deserializeDayPrayerTimes(existingCached, date)
                if (parsed != null) {
                    val lastSync = prefs.getString("${cacheKey}_sync", nowTimeStr) ?: nowTimeStr
                    return@withContext PrayerFetchResult(
                        times = parsed,
                        isOfflineCalculated = true,
                        lastSyncTime = "$lastSync (Luar Talian)"
                    )
                }
            }
        }

        val calcMap = fetchedTimes?.toMutableMap()
            ?: localCalculator(date, zone.lat, zone.lng, 8).toMutableMap()

        val asarStr = calcMap[PrayerKey.ASAR] ?: "16:00"
        val asarHour = asarStr.substringBefore(":").toIntOrNull() ?: 16
        if (asarHour !in 15..18) {
            val fixed = localCalculator(date, zone.lat, zone.lng, 8)
            calcMap[PrayerKey.ASAR] = fixed[PrayerKey.ASAR] ?: "16:15"
        }

        val resultTimes = DayPrayerTimes(
            date = dateStr,
            hijriDate = hijriFormatter(date),
            zone = zone.code,
            times = calcMap
        )

        prefs.edit()
            .putString(cacheKey, serializeDayPrayerTimes(resultTimes))
            .putString("${cacheKey}_sync", nowTimeStr)
            .apply()

        PrayerFetchResult(
            times = resultTimes,
            isOfflineCalculated = isOffline,
            lastSyncTime = if (isOffline) "$nowTimeStr (Luar Talian)" else nowTimeStr
        )
    }

    suspend fun checkForAppUpdate(
        forceCheck: Boolean = false,
        isNetworkOnline: Boolean = true
    ): UpdateCheckOutcome = withContext(Dispatchers.IO) {
        if (!isNetworkOnline) {
            return@withContext UpdateCheckOutcome(
                status = UpdateCheckStatus.ERROR,
                message = "Tiada sambungan internet. Sila hidupkan data atau Wi-Fi untuk menyemak kemaskini."
            )
        }

        val now = System.currentTimeMillis()
        if (!forceCheck) {
            val lastCheck = prefs.getLong(LAST_UPDATE_CHECK_KEY, 0L)
            if (lastCheck > 0L && (now - lastCheck) < UPDATE_CHECK_INTERVAL_MS) {
                return@withContext UpdateCheckOutcome(
                    status = UpdateCheckStatus.SKIPPED,
                    message = "Semakan automatik baru sahaja dijalankan."
                )
            }
        }

        // 1. Cuba version.json
        try {
            val url = URL("$VERSION_CHECK_URL?t=$now")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 6000
                readTimeout = 6000
            }
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                val raw = conn.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(raw)
                prefs.edit().putLong(LAST_UPDATE_CHECK_KEY, now).apply()

                val remoteCode = json.optInt("versionCode", 0)
                if (remoteCode > CURRENT_VERSION_CODE) {
                    val latestVer = json.optString("latestVersion", "Baharu")
                    return@withContext UpdateCheckOutcome(
                        status = UpdateCheckStatus.UPDATE_AVAILABLE,
                        message = "Versi baharu v$latestVer sedia dimuat turun!",
                        info = AppUpdateInfo(
                            hasUpdate = true,
                            latestVersion = latestVer,
                            versionCode = remoteCode,
                            releaseNotes = json.optString(
                                "releaseNotes",
                                "Penambahbaikan prestasi dan pembetulan pepijat."
                            ),
                            downloadUrl = json.optString(
                                "downloadUrl",
                                "https://github.com/$GITHUB_REPO/releases/latest"
                            )
                        )
                    )
                } else if (remoteCode > 0) {
                    return@withContext UpdateCheckOutcome(
                        status = UpdateCheckStatus.UP_TO_DATE,
                        message = "Aplikasi anda sudah menggunakan versi terkini (v$CURRENT_APP_VERSION)."
                    )
                }
            }
            conn.disconnect()
        } catch (_: Exception) {
            // Terus ke GitHub Releases API
        }

        // 2. Sandaran GitHub Releases API
        try {
            val url = URL(GITHUB_RELEASES_API)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 6000
                readTimeout = 6000
                setRequestProperty("Accept", "application/vnd.github.v3+json")
            }
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                val raw = conn.inputStream.bufferedReader().use { it.readText() }
                val release = JSONObject(raw)
                prefs.edit().putLong(LAST_UPDATE_CHECK_KEY, now).apply()

                val tagName = release.optString("tag_name", "")
                val cleanVer = tagName.replace(Regex("^[vV]"), "")
                val numericCode = cleanVer.replace(Regex("\D"), "").toIntOrNull() ?: 0

                var downloadUrl = release.optString(
                    "html_url",
                    "https://github.com/$GITHUB_REPO/releases/latest"
                )
                val assets = release.optJSONArray("assets")
                if (assets != null) {
                    for (i in 0 until assets.length()) {
                        val asset = assets.optJSONObject(i) ?: continue
                        val name = asset.optString("name", "")
                        if (name.endsWith(".apk", ignoreCase = true)) {
                            downloadUrl = asset.optString("browser_download_url", downloadUrl)
                            break
                        }
                    }
                }

                if (numericCode > CURRENT_VERSION_CODE) {
                    return@withContext UpdateCheckOutcome(
                        status = UpdateCheckStatus.UPDATE_AVAILABLE,
                        message = "Versi baharu v$cleanVer ditemui di GitHub Releases!",
                        info = AppUpdateInfo(
                            hasUpdate = true,
                            latestVersion = cleanVer,
                            versionCode = numericCode,
                            releaseNotes = release.optString(
                                "name",
                                "Kemaskini SolatKini Malaysia v$cleanVer"
                            ),
                            downloadUrl = downloadUrl
                        )
                    )
                }

                return@withContext UpdateCheckOutcome(
                    status = UpdateCheckStatus.UP_TO_DATE,
                    message = "Aplikasi anda sudah menggunakan versi terkini (v$CURRENT_APP_VERSION)."
                )
            }
            conn.disconnect()
        } catch (_: Exception) {
            // Jatuh ke mesej ralat
        }

        UpdateCheckOutcome(
            status = UpdateCheckStatus.ERROR,
            message = "Tidak dapat menyemak kemaskini buat masa ini. Sila pastikan nama repositori & internet aktif."
        )
    }
}
