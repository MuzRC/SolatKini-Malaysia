package com.solatkini.app.data

import android.content.Context
import android.content.SharedPreferences
import com.solatkini.app.model.AppLanguage
import com.solatkini.app.model.AppNotificationSettings
import com.solatkini.app.model.AppThemeId
import com.solatkini.app.model.AzanVoice
import com.solatkini.app.model.FardPrayerKey
import com.solatkini.app.model.PrayerAlertConfig
import com.solatkini.app.model.PrayerKey
import com.solatkini.app.model.ReadingFontSize
import org.json.JSONArray
import org.json.JSONObject
import java.util.Date

data class SunnahFastingCounts(
    val isninKhamisCompleted: Int = 0,
    val isninKhamisTarget: Int = 8,
    val ayyamulBidhCompleted: Int = 0,
    val ayyamulBidhTarget: Int = 3,
    val otherSunnahCompleted: Int = 0,
    val otherSunnahTarget: Int = 6
)

class UserPreferencesStore(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("solatkini_user_prefs", Context.MODE_PRIVATE)

    companion object {
        const val KEY_ONBOARDING_COMPLETED = "solatkini_onboarding_completed"
        const val KEY_ACTIVE_ZONE = "solatkini_active_zone"
        const val KEY_AZAN_VOICE = "solatkini_azan_voice"
        const val KEY_ACTIVE_DEVICE_VOICE = "solatkini_active_device_voice"
        const val KEY_NOTIF_SETTINGS = "solatkini_notif_settings"
        const val KEY_FASTING_DATE = "solatkini_fasting_date"
        const val KEY_FASTING_ACTIVE = "solatkini_fasting_active"
        const val KEY_CHECKLIST_PREFIX = "solatkini_prayer_checklist_"
        const val KEY_LANG = "solatkini_lang"
        const val KEY_THEME = "solatkini_theme"
        const val KEY_AUTOSTART_BOOT = "solatkini_autostart_boot"
        const val KEY_HIJRI_ADJUSTMENT = "solatkini_hijri_adjustment"
        const val KEY_GANTI_COMPLETED = "solatkini_ganti_completed"
        const val KEY_GANTI_TARGET = "solatkini_ganti_target"
        const val KEY_SUNNAH_FASTS = "solatkini_sunnah_fasts_v1"
        const val KEY_RAMADAN_DAYS_PREFIX = "solatkini_ramadan_completed_days_"
        const val KEY_DUA_BOOKMARKS = "solatkini_dua_bookmarks"
        const val KEY_DUA_FONT_SIZE = "solatkini_dua_font_size"
        const val KEY_WIRID_FONT_SIZE = "solatkini_wirid_font_size"
        const val KEY_SHOW_ARABIC = "solatkini_show_arabic"
        const val KEY_SHOW_RUMI = "solatkini_show_rumi"
        const val KEY_SHOW_TRANSLATION = "solatkini_show_translation"
        const val KEY_TASBIH_SELECTED_ID = "solatkini_tasbih_selected_id"
        const val KEY_TASBIH_COUNT = "solatkini_tasbih_count"
        const val KEY_TASBIH_TARGET = "solatkini_tasbih_target"
        const val KEY_TASBIH_LAPS = "solatkini_tasbih_laps"
        const val KEY_TASBIH_SOUND = "solatkini_tasbih_sound"
        const val KEY_TASBIH_FREE_TOUCH = "solatkini_tasbih_free_touch"
        const val KEY_NOTIF_GRANTED = "solatkini_notif_granted"
    }

    fun isOnboardingCompleted(): Boolean =
        prefs.getBoolean(KEY_ONBOARDING_COMPLETED, false)

    fun setOnboardingCompleted(completed: Boolean) {
        prefs.edit().putBoolean(KEY_ONBOARDING_COMPLETED, completed).apply()
    }

    fun getActiveZoneCode(): String {
        val code = prefs.getString(KEY_ACTIVE_ZONE, null)
        return if (code.isNullOrBlank() || code == "undefined" || code == "null") {
            JakimZonesData.DEFAULT_ZONE.code
        } else {
            code
        }
    }

    fun setActiveZoneCode(code: String) {
        prefs.edit().putString(KEY_ACTIVE_ZONE, code).apply()
    }

    fun getAzanVoice(): AzanVoice {
        val raw = prefs.getString(KEY_ACTIVE_DEVICE_VOICE, null)
            ?: prefs.getString(KEY_AZAN_VOICE, null)
        return AzanVoice.fromId(raw)
    }

    fun setAzanVoice(voice: AzanVoice) {
        prefs.edit()
            .putString(KEY_AZAN_VOICE, voice.id)
            .putString(KEY_ACTIVE_DEVICE_VOICE, voice.id)
            .apply()
    }

    fun getNotificationSettings(): AppNotificationSettings {
        val defaults = AppNotificationSettings.defaultPreferences().toMutableMap()
        val raw = prefs.getString(KEY_NOTIF_SETTINGS, null) ?: return AppNotificationSettings(preferences = defaults)
        return try {
            val obj = JSONObject(raw)
            val masterEnabled = obj.optBoolean("masterEnabled", true)
            val highPriorityAlarm = obj.optBoolean("highPriorityAlarm", true)
            val vibrate = obj.optBoolean("vibrate", true)
            val persistentNotif = obj.optBoolean("persistentNotification", true)
            val prefObj = obj.optJSONObject("preferences")
            if (prefObj != null) {
                for (key in PrayerKey.ALL_ORDERED) {
                    val itemObj = prefObj.optJSONObject(key.rawKey) ?: continue
                    val base = defaults[key] ?: PrayerAlertConfig()
                    defaults[key] = PrayerAlertConfig(
                        enabled = itemObj.optBoolean("enabled", base.enabled),
                        voice = AzanVoice.fromId(itemObj.optString("voice", base.voice.id)),
                        beforeMinutes = itemObj.optInt("beforeMinutes", base.beforeMinutes),
                        bypassSilentTone = itemObj.optBoolean("bypassSilentTone", base.bypassSilentTone)
                    )
                }
            }
            AppNotificationSettings(
                masterEnabled = masterEnabled,
                highPriorityAlarm = highPriorityAlarm,
                vibrate = vibrate,
                persistentNotification = persistentNotif,
                preferences = defaults
            )
        } catch (_: Exception) {
            AppNotificationSettings(preferences = defaults)
        }
    }

    fun saveNotificationSettings(settings: AppNotificationSettings) {
        val obj = JSONObject().apply {
            put("masterEnabled", settings.masterEnabled)
            put("highPriorityAlarm", settings.highPriorityAlarm)
            put("vibrate", settings.vibrate)
            put("persistentNotification", settings.persistentNotification)
            val prefObj = JSONObject()
            for ((key, cfg) in settings.preferences) {
                prefObj.put(
                    key.rawKey,
                    JSONObject().apply {
                        put("enabled", cfg.enabled)
                        put("voice", cfg.voice.id)
                        put("beforeMinutes", cfg.beforeMinutes)
                        put("bypassSilentTone", cfg.bypassSilentTone)
                    }
                )
            }
            put("preferences", prefObj)
        }
        prefs.edit().putString(KEY_NOTIF_SETTINGS, obj.toString()).apply()
    }

    fun isUserFastingToday(now: Date = Date()): Boolean {
        val savedDate = prefs.getString(KEY_FASTING_DATE, null)
        val savedActive = prefs.getBoolean(KEY_FASTING_ACTIVE, false)
        val todayStr = PrayerRepository.getLocalDateString(now)
        return savedDate == todayStr && savedActive
    }

    fun setUserFastingToday(active: Boolean, now: Date = Date()) {
        val todayStr = PrayerRepository.getLocalDateString(now)
        prefs.edit()
            .putString(KEY_FASTING_DATE, todayStr)
            .putBoolean(KEY_FASTING_ACTIVE, active)
            .apply()
    }

    fun getPrayerChecklist(dateStr: String): Map<FardPrayerKey, Boolean> {
        val emptyMap = FardPrayerKey.ORDERED.associateWith { false }.toMutableMap()
        val raw = prefs.getString("$KEY_CHECKLIST_PREFIX$dateStr", null) ?: return emptyMap
        return try {
            val obj = JSONObject(raw)
            for (fard in FardPrayerKey.ORDERED) {
                emptyMap[fard] = obj.optBoolean(fard.rawKey, false)
            }
            emptyMap
        } catch (_: Exception) {
            emptyMap
        }
    }

    fun savePrayerChecklist(dateStr: String, checklist: Map<FardPrayerKey, Boolean>) {
        val obj = JSONObject()
        for (fard in FardPrayerKey.ORDERED) {
            obj.put(fard.rawKey, checklist[fard] == true)
        }
        prefs.edit().putString("$KEY_CHECKLIST_PREFIX$dateStr", obj.toString()).apply()
    }

    fun clearPrayerChecklist(dateStr: String) {
        prefs.edit().remove("$KEY_CHECKLIST_PREFIX$dateStr").apply()
    }

    fun getLanguage(): AppLanguage =
        AppLanguage.fromCode(prefs.getString(KEY_LANG, AppLanguage.MS.code))

    fun setLanguage(lang: AppLanguage) {
        prefs.edit().putString(KEY_LANG, lang.code).apply()
    }

    fun getTheme(): AppThemeId =
        AppThemeId.fromId(prefs.getString(KEY_THEME, AppThemeId.EMERALD.id))

    fun setTheme(theme: AppThemeId) {
        prefs.edit().putString(KEY_THEME, theme.id).apply()
    }

    fun isAutoStartBootEnabled(): Boolean =
        prefs.getBoolean(KEY_AUTOSTART_BOOT, true)

    fun setAutoStartBootEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_AUTOSTART_BOOT, enabled).apply()
    }

    fun getHijriAdjustment(): Int =
        prefs.getInt(KEY_HIJRI_ADJUSTMENT, 0).coerceIn(-2, 2)

    fun setHijriAdjustment(days: Int): Int {
        val clamped = days.coerceIn(-2, 2)
        prefs.edit().putInt(KEY_HIJRI_ADJUSTMENT, clamped).apply()
        return clamped
    }

    fun getGantiCompleted(): Int =
        prefs.getInt(KEY_GANTI_COMPLETED, 0).coerceAtLeast(0)

    fun setGantiCompleted(count: Int) {
        prefs.edit().putInt(KEY_GANTI_COMPLETED, count.coerceAtLeast(0)).apply()
    }

    fun getGantiTarget(): Int =
        prefs.getInt(KEY_GANTI_TARGET, 7).coerceAtLeast(0)

    fun setGantiTarget(target: Int) {
        prefs.edit().putInt(KEY_GANTI_TARGET, target.coerceAtLeast(0)).apply()
    }

    fun getSunnahFastingCounts(): SunnahFastingCounts {
        val raw = prefs.getString(KEY_SUNNAH_FASTS, null) ?: return SunnahFastingCounts()
        return try {
            val obj = JSONObject(raw)
            SunnahFastingCounts(
                isninKhamisCompleted = obj.optInt("isninKhamisCompleted", 0).coerceAtLeast(0),
                isninKhamisTarget = obj.optInt("isninKhamisTarget", 8).coerceAtLeast(0),
                ayyamulBidhCompleted = obj.optInt("ayyamulBidhCompleted", 0).coerceAtLeast(0),
                ayyamulBidhTarget = obj.optInt("ayyamulBidhTarget", 3).coerceAtLeast(0),
                otherSunnahCompleted = obj.optInt("otherSunnahCompleted", 0).coerceAtLeast(0),
                otherSunnahTarget = obj.optInt("otherSunnahTarget", 6).coerceAtLeast(0)
            )
        } catch (_: Exception) {
            SunnahFastingCounts()
        }
    }

    fun saveSunnahFastingCounts(counts: SunnahFastingCounts) {
        val obj = JSONObject().apply {
            put("isninKhamisCompleted", counts.isninKhamisCompleted)
            put("isninKhamisTarget", counts.isninKhamisTarget)
            put("ayyamulBidhCompleted", counts.ayyamulBidhCompleted)
            put("ayyamulBidhTarget", counts.ayyamulBidhTarget)
            put("otherSunnahCompleted", counts.otherSunnahCompleted)
            put("otherSunnahTarget", counts.otherSunnahTarget)
        }
        prefs.edit().putString(KEY_SUNNAH_FASTS, obj.toString()).apply()
    }

    fun getRamadanCompletedDays(ramadanYearKey: String): List<Int> {
        val raw = prefs.getString("$KEY_RAMADAN_DAYS_PREFIX$ramadanYearKey", null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            val list = mutableListOf<Int>()
            for (i in 0 until arr.length()) {
                val d = arr.optInt(i, -1)
                if (d in 1..30) list.add(d)
            }
            list.distinct().sorted()
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun saveRamadanCompletedDays(ramadanYearKey: String, days: List<Int>) {
        val arr = JSONArray()
        days.distinct().sorted().forEach { arr.put(it) }
        prefs.edit().putString("$KEY_RAMADAN_DAYS_PREFIX$ramadanYearKey", arr.toString()).apply()
    }

    fun getDuaBookmarks(): Set<String> {
        val raw = prefs.getString(KEY_DUA_BOOKMARKS, null)
            ?: return setOf("dua-selepas-solat", "dua-kedua-ibu-bapa")
        return try {
            val arr = JSONArray(raw)
            val set = mutableSetOf<String>()
            for (i in 0 until arr.length()) {
                val s = arr.optString(i, "")
                if (s.isNotBlank()) set.add(s)
            }
            set
        } catch (_: Exception) {
            setOf("dua-selepas-solat", "dua-kedua-ibu-bapa")
        }
    }

    fun saveDuaBookmarks(bookmarks: Set<String>) {
        val arr = JSONArray()
        bookmarks.forEach { arr.put(it) }
        prefs.edit().putString(KEY_DUA_BOOKMARKS, arr.toString()).apply()
    }

    fun getDuaFontSize(): ReadingFontSize =
        ReadingFontSize.fromId(prefs.getString(KEY_DUA_FONT_SIZE, ReadingFontSize.LARGE.id))

    fun setDuaFontSize(size: ReadingFontSize) {
        prefs.edit().putString(KEY_DUA_FONT_SIZE, size.id).apply()
    }

    fun getWiridFontSize(): ReadingFontSize =
        ReadingFontSize.fromId(prefs.getString(KEY_WIRID_FONT_SIZE, ReadingFontSize.LARGE.id))

    fun setWiridFontSize(size: ReadingFontSize) {
        prefs.edit().putString(KEY_WIRID_FONT_SIZE, size.id).apply()
    }

    fun isShowArabic(): Boolean = prefs.getBoolean(KEY_SHOW_ARABIC, true)
    fun setShowArabic(show: Boolean) { prefs.edit().putBoolean(KEY_SHOW_ARABIC, show).apply() }

    fun isShowRumi(): Boolean = prefs.getBoolean(KEY_SHOW_RUMI, true)
    fun setShowRumi(show: Boolean) { prefs.edit().putBoolean(KEY_SHOW_RUMI, show).apply() }

    fun isShowTranslation(): Boolean = prefs.getBoolean(KEY_SHOW_TRANSLATION, true)
    fun setShowTranslation(show: Boolean) { prefs.edit().putBoolean(KEY_SHOW_TRANSLATION, show).apply() }

    fun getTasbihSelectedId(): String =
        prefs.getString(KEY_TASBIH_SELECTED_ID, "tasbih") ?: "tasbih"

    fun setTasbihSelectedId(id: String) {
        prefs.edit().putString(KEY_TASBIH_SELECTED_ID, id).apply()
    }

    fun getTasbihCount(): Int = prefs.getInt(KEY_TASBIH_COUNT, 0).coerceAtLeast(0)
    fun setTasbihCount(count: Int) { prefs.edit().putInt(KEY_TASBIH_COUNT, count.coerceAtLeast(0)).apply() }

    fun getTasbihTarget(defaultVal: Int): Int = prefs.getInt(KEY_TASBIH_TARGET, defaultVal).coerceAtLeast(0)
    fun setTasbihTarget(target: Int) { prefs.edit().putInt(KEY_TASBIH_TARGET, target.coerceAtLeast(0)).apply() }

    fun getTasbihLaps(): Int = prefs.getInt(KEY_TASBIH_LAPS, 0).coerceAtLeast(0)
    fun setTasbihLaps(laps: Int) { prefs.edit().putInt(KEY_TASBIH_LAPS, laps.coerceAtLeast(0)).apply() }

    fun isTasbihSoundEnabled(): Boolean = prefs.getBoolean(KEY_TASBIH_SOUND, true)
    fun setTasbihSoundEnabled(enabled: Boolean) { prefs.edit().putBoolean(KEY_TASBIH_SOUND, enabled).apply() }

    fun isTasbihFreeTouchEnabled(): Boolean = prefs.getBoolean(KEY_TASBIH_FREE_TOUCH, false)
    fun setTasbihFreeTouchEnabled(enabled: Boolean) { prefs.edit().putBoolean(KEY_TASBIH_FREE_TOUCH, enabled).apply() }

    fun setNotificationPermissionGrantedCache(granted: Boolean) {
        if (granted) {
            prefs.edit().putString(KEY_NOTIF_GRANTED, "true").apply()
        } else {
            prefs.edit().remove(KEY_NOTIF_GRANTED).apply()
        }
    }
}
