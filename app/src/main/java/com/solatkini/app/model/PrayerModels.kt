package com.solatkini.app.model

enum class PrayerKey(val rawKey: String) {
    IMSAK("imsak"),
    SUBUH("subuh"),
    SYURUK("syuruk"),
    ZOHOR("zohor"),
    ASAR("asar"),
    MAGHRIB("maghrib"),
    ISYAK("isyak");

    companion object {
        val ALL_ORDERED: List<PrayerKey> = listOf(
            IMSAK, SUBUH, SYURUK, ZOHOR, ASAR, MAGHRIB, ISYAK
        )

        val OBLIGATORY_ORDERED: List<PrayerKey> = listOf(
            SUBUH, ZOHOR, ASAR, MAGHRIB, ISYAK
        )

        fun fromRaw(key: String?): PrayerKey =
            entries.find { it.rawKey.equals(key?.trim(), ignoreCase = true) } ?: SUBUH
    }
}

enum class FardPrayerKey(val prayerKey: PrayerKey, val rawKey: String) {
    SUBUH(PrayerKey.SUBUH, "subuh"),
    ZOHOR(PrayerKey.ZOHOR, "zohor"),
    ASAR(PrayerKey.ASAR, "asar"),
    MAGHRIB(PrayerKey.MAGHRIB, "maghrib"),
    ISYAK(PrayerKey.ISYAK, "isyak");

    companion object {
        val ORDERED: List<FardPrayerKey> = listOf(SUBUH, ZOHOR, ASAR, MAGHRIB, ISYAK)

        fun fromRaw(key: String?): FardPrayerKey? =
            entries.find { it.rawKey.equals(key?.trim(), ignoreCase = true) }
    }
}

enum class AzanVoice(val id: String) {
    MAKKAH("makkah"),
    MADINAH("madinah"),
    JAKIM("jakim"),
    AL_AQSA("al_aqsa"),
    MISHARY("mishary"),
    SUBUH_SPECIAL("subuh_special"),
    TAKBIR_RAYA("takbir_raya"),
    CUSTOM("custom"),
    NONE("none");

    companion object {
        fun fromId(id: String?): AzanVoice =
            entries.find { it.id.equals(id?.trim(), ignoreCase = true) } ?: JAKIM
    }
}

data class AzanAudioOption(
    val id: AzanVoice,
    val title: String,
    val reciter: String,
    val description: String,
    val durationSec: Int,
    val filename: String,
    val assetPath: String,
    val rawResName: String,
    val fallbackUrl: String? = null
)

data class PrayerTimeItem(
    val key: PrayerKey,
    val label: String,
    val time: String,          // Format 24-jam "HH:mm" cth. "05:48"
    val displayTime: String,   // Format 12-jam "h:mm AM/PM" cth. "5:48 AM"
    val isNext: Boolean = false,
    val isPast: Boolean = false,
    val isCurrent: Boolean = false,
    val voice: AzanVoice = AzanVoice.JAKIM
)

data class DayPrayerTimes(
    val date: String,          // "YYYY-MM-DD"
    val hijriDate: String,     // cth. "24 Rabiulakhir 1448H"
    val zone: String,          // cth. "SBH09"
    val times: Map<PrayerKey, String>
) {
    fun timeFor(key: PrayerKey): String = times[key] ?: "--:--"
}

data class JakimZone(
    val code: String,
    val state: String,
    val daerah: String,
    val lat: Double,
    val lng: Double
) {
    val shortDaerah: String
        get() = daerah.split(",").firstOrNull()?.trim().orEmpty().ifEmpty { daerah }
}

data class NextPrayerInfo(
    val nextKey: PrayerKey,
    val nextLabel: String,
    val nextTime: String,
    val nextDisplayTime: String,
    val targetTimestamp: Long,
    val remainingSeconds: Long,
    val countdownFormatted: String,
    val currentKey: PrayerKey,
    val currentLabel: String,
    val isPassedToday: Boolean
)

data class PrayerAlertConfig(
    val enabled: Boolean = true,
    val voice: AzanVoice = AzanVoice.JAKIM,
    val beforeMinutes: Int = 0,
    val bypassSilentTone: Boolean = true
)

data class AppNotificationSettings(
    val masterEnabled: Boolean = true,
    val highPriorityAlarm: Boolean = true,
    val vibrate: Boolean = true,
    val persistentNotification: Boolean = true,
    val preferences: Map<PrayerKey, PrayerAlertConfig> = defaultPreferences()
) {
    companion object {
        fun defaultPreferences(): Map<PrayerKey, PrayerAlertConfig> = mapOf(
            PrayerKey.IMSAK to PrayerAlertConfig(enabled = false, voice = AzanVoice.JAKIM, beforeMinutes = 0, bypassSilentTone = true),
            PrayerKey.SUBUH to PrayerAlertConfig(enabled = true, voice = AzanVoice.SUBUH_SPECIAL, beforeMinutes = 0, bypassSilentTone = true),
            PrayerKey.SYURUK to PrayerAlertConfig(enabled = false, voice = AzanVoice.JAKIM, beforeMinutes = 0, bypassSilentTone = false),
            PrayerKey.ZOHOR to PrayerAlertConfig(enabled = true, voice = AzanVoice.JAKIM, beforeMinutes = 0, bypassSilentTone = true),
            PrayerKey.ASAR to PrayerAlertConfig(enabled = true, voice = AzanVoice.JAKIM, beforeMinutes = 0, bypassSilentTone = true),
            PrayerKey.MAGHRIB to PrayerAlertConfig(enabled = true, voice = AzanVoice.MAKKAH, beforeMinutes = 0, bypassSilentTone = true),
            PrayerKey.ISYAK to PrayerAlertConfig(enabled = true, voice = AzanVoice.MADINAH, beforeMinutes = 0, bypassSilentTone = true)
        )
    }
}

enum class FastingType(val id: String) {
    RAMADAN("ramadan"),
    GANTI("ganti"),
    SUNAT_ISNIN("sunat_isnin"),
    SUNAT_KHAMIS("sunat_khamis"),
    AYYAMUL_BIDH("ayyamul_bidh"),
    LAIN("lain")
}

data class FastingTrackerState(
    val isFastingToday: Boolean = false,
    val type: FastingType = FastingType.LAIN,
    val completedDays: List<String> = emptyList(),
    val gantiCompletedDays: Int = 0,
    val gantiTargetDays: Int = 7
)

enum class ActiveTab(val id: String) {
    SOLAT("solat"),
    KIBLAT("kiblat"),
    PUASA("puasa"),
    WIRID("wirid"),
    DOA("doa"),
    TASBIH("tasbih"),
    TETAPAN("tetapan"),
    WIDGET("widget"),
    KREDIT("kredit");

    companion object {
        fun fromId(id: String?): ActiveTab =
            entries.find { it.id.equals(id?.trim(), ignoreCase = true) } ?: SOLAT
    }
}

data class DailyPrayerChecklistState(
    val date: String,
    val completed: Map<FardPrayerKey, Boolean> = FardPrayerKey.ORDERED.associateWith { false }
) {
    val completedCount: Int
        get() = completed.values.count { it }

    val percentage: Int
        get() = ((completedCount / 5.0) * 100).toInt()
}
