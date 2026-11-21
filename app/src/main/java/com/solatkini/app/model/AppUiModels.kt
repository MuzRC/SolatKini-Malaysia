package com.solatkini.app.model

enum class AppLanguage(
    val code: String,
    val displayName: String,
    val nativeName: String,
    val flag: String
) {
    MS("ms", "Bahasa Melayu", "Bahasa Melayu", "🇲🇾"),
    EN("en", "English", "English", "🇬🇧"),
    ZH("zh", "Mandarin", "简体中文", "🇨🇳");

    companion object {
        fun fromCode(code: String?): AppLanguage =
            entries.find { it.code.equals(code?.trim(), ignoreCase = true) } ?: MS
    }
}

enum class AppThemeId(
    val id: String,
    val nameMs: String,
    val nameEn: String,
    val nameZh: String,
    val descriptionMs: String,
    val descriptionEn: String,
    val descriptionZh: String,
    val accentHex: Long
) {
    EMERALD(
        id = "emerald",
        nameMs = "Emerald Zamrud",
        nameEn = "Emerald Green",
        nameZh = "祖母绿",
        descriptionMs = "Hijau zamrud klasik Islamik lambang ketenangan Nusantara (Lalai).",
        descriptionEn = "Classic Islamic emerald green reflecting tranquility (Default).",
        descriptionZh = "经典伊斯兰祖母绿，象征宁静与平和（默认）。",
        accentHex = 0xFF10B981
    ),
    GOLD(
        id = "gold",
        nameMs = "Emas Diraja",
        nameEn = "Royal Gold",
        nameZh = "皇家金",
        descriptionMs = "Kilauan emas diraja yang mewah, hangat dan bercahaya.",
        descriptionEn = "Luxurious royal gold, warm and radiant.",
        descriptionZh = "华丽的皇家金，温暖而光芒四射。",
        accentHex = 0xFFF59E0B
    ),
    BLUE(
        id = "blue",
        nameMs = "Biru Nilam",
        nameEn = "Sapphire Blue",
        nameZh = "蓝宝石",
        descriptionMs = "Biru nilam laut dalam yang jernih, tenang dan profesional.",
        descriptionEn = "Deep crystal sapphire blue, calm and professional.",
        descriptionZh = "深邃的蓝宝石，沉静而专业。",
        accentHex = 0xFF3B82F6
    ),
    TEAL(
        id = "teal",
        nameMs = "Teal Tropika",
        nameEn = "Tropical Teal",
        nameZh = "热带青",
        descriptionMs = "Gabungan hijau pirus dan biru toska moden yang menyegarkan.",
        descriptionEn = "Refreshing blend of modern turquoise and oceanic teal.",
        descriptionZh = "现代绿松石与海青色的清新融合。",
        accentHex = 0xFF14B8A6
    ),
    PURPLE(
        id = "purple",
        nameMs = "Ungu Amethyst",
        nameEn = "Amethyst Purple",
        nameZh = "紫水晶",
        descriptionMs = "Alunan ungu kerohanian yang anggun, tenang dan mendalam.",
        descriptionEn = "Graceful spiritual purple, serene and meditative.",
        descriptionZh = "优雅的精神紫，宁静而深邃。",
        accentHex = 0xFFA855F7
    ),
    RED(
        id = "red",
        nameMs = "Merah Delima",
        nameEn = "Ruby Red",
        nameZh = "红宝石",
        descriptionMs = "Warna merah delima berani penuh semangat dan ketegasan.",
        descriptionEn = "Bold ruby crimson, full of energy and devotion.",
        descriptionZh = "鲜艳的红宝石，充满生机与热忱。",
        accentHex = 0xFFF43F5E
    ),
    SILVER(
        id = "silver",
        nameMs = "Karbon Perak",
        nameEn = "Silver Slate",
        nameZh = "碳板银",
        descriptionMs = "Monokrom moden berprofil tinggi, bersih dan selesa pada mata.",
        descriptionEn = "Sleek modern monochrome, clean and minimal.",
        descriptionZh = "时尚现代的单色调，干净且护眼。",
        accentHex = 0xFF94A3B8
    );

    companion object {
        fun fromId(id: String?): AppThemeId =
            entries.find { it.id.equals(id?.trim(), ignoreCase = true) } ?: EMERALD
    }
}

enum class ReadingFontSize(val id: String, val badgeLabel: String, val scaleMultiplier: Float) {
    NORMAL("normal", "A", 1.0f),
    LARGE("large", "A+", 1.15f),
    XLARGE("xlarge", "A++", 1.3f),
    FOUR_XL("4xl", "A+++", 1.45f);

    companion object {
        fun fromId(id: String?): ReadingFontSize =
            entries.find { it.id.equals(id?.trim(), ignoreCase = true) } ?: LARGE
    }
}

data class AppUpdateInfo(
    val hasUpdate: Boolean,
    val latestVersion: String,
    val versionCode: Int,
    val releaseNotes: String,
    val downloadUrl: String
)

enum class AzanLogStatus {
    BERJAYA,
    DICETUSKAN,
    GAGAL
}

data class AzanLogEntry(
    val prayerName: String,
    val prayerKey: String,
    val timestamp: Long,
    val timeFormatted: String,
    val dateFormatted: String,
    val status: AzanLogStatus,
    val details: String
)

enum class DiagnosticLogLevel {
    CRITICAL,
    ERROR,
    WARN
}

data class MusaLogEntry(
    val id: Long = System.currentTimeMillis(),
    val date: String,
    val time: String,
    val level: DiagnosticLogLevel,
    val message: String,
    val stackTrace: String? = null
)

data class HijriDateInfo(
    val day: Int,
    val monthIndex: Int, // 0 = Muharram .. 11 = Zulhijjah
    val monthName: String,
    val year: Int,
    val formatted: String,
    val isAyyamulBidh: Boolean,
    val specialEvent: String? = null,
    val isRamadan: Boolean
)

data class RamadanCountdownInfo(
    val isRamadan: Boolean,
    val currentRamadanDay: Int,
    val daysRemainingInRamadan: Int,
    val daysUntilNextRamadan: Int,
    val nextRamadanHijriYear: Int,
    val estimatedRamadanStartEpoch: Long,
    val ramadanYearKey: String
)

data class FastingRecommendation(
    val isRecommended: Boolean,
    val type: String,
    val description: String
)

data class FastingCountdownInfo(
    val phase: FastingPhase,
    val title: String,
    val targetTimeStr: String,
    val targetDisplayTime: String,
    val remainingFormatted: String,
    val percentage: Int,
    val isCurrentlyFasting: Boolean
)

enum class FastingPhase {
    FASTING,
    EATING,
    IMSAK_ALERT
}
