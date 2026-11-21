package com.solatkini.app.data

import com.solatkini.app.model.AppLanguage
import com.solatkini.app.model.AppThemeId
import com.solatkini.app.model.PrayerKey

enum class UiStringKey {
    NAV_SOLAT,
    NAV_KIBLAT,
    NAV_PUASA,
    NAV_WIRID,
    NAV_DOA,
    NAV_TETAPAN,
    NAV_KREDIT,
    NEXT_PRAYER,
    COUNTDOWN_IN,
    PASSED_TODAY,
    TEST_ALARM,
    VOICE_SELECTION,
    NOTIF_BAR_LABEL,
    ACTIVE,
    DISABLED,
    FARD_CHECKLIST,
    FARD_COMPLETED,
    FARD_PENDING,
    SETTINGS_TITLE,
    SETTINGS_DESC,
    LANG_TITLE,
    LANG_DESC,
    THEME_TITLE,
    THEME_DESC,
    NOTIF_CARD_TITLE,
    NOTIF_CARD_DESC,
    NOTIF_PREVIEW_LABEL,
    SYNC_NOW,
    OPEN_APP,
    SYNC_PRAYER,
    ALARM_CARD_TITLE,
    ALARM_CARD_DESC,
    CURRENT_DEVICE_AZAN,
    BTN_TEST_AZAN,
    BTN_EXACT_ALARM_SETTINGS,
    BTN_DND_SETTINGS,
    HOME_WIDGET_TITLE,
    HOME_WIDGET_DESC
}

object ThemeAndLocaleData {
    val THEME_OPTIONS: List<AppThemeId> = AppThemeId.entries
    val LANGUAGE_OPTIONS: List<AppLanguage> = AppLanguage.entries

    private val PRAYER_NAMES: Map<AppLanguage, Map<PrayerKey, String>> = mapOf(
        AppLanguage.MS to mapOf(
            PrayerKey.IMSAK to "Imsak",
            PrayerKey.SUBUH to "Subuh",
            PrayerKey.SYURUK to "Syuruk",
            PrayerKey.ZOHOR to "Zohor",
            PrayerKey.ASAR to "Asar",
            PrayerKey.MAGHRIB to "Maghrib",
            PrayerKey.ISYAK to "Isyak"
        ),
        AppLanguage.EN to mapOf(
            PrayerKey.IMSAK to "Imsak",
            PrayerKey.SUBUH to "Fajr",
            PrayerKey.SYURUK to "Sunrise",
            PrayerKey.ZOHOR to "Dhuhr",
            PrayerKey.ASAR to "Asr",
            PrayerKey.MAGHRIB to "Maghrib",
            PrayerKey.ISYAK to "Isha"
        ),
        AppLanguage.ZH to mapOf(
            PrayerKey.IMSAK to "封斋 (Imsak)",
            PrayerKey.SUBUH to "晨礼 (Fajr)",
            PrayerKey.SYURUK to "日出 (Sunrise)",
            PrayerKey.ZOHOR to "晌礼 (Dhuhr)",
            PrayerKey.ASAR to "晡礼 (Asr)",
            PrayerKey.MAGHRIB to "昏礼 (Maghrib)",
            PrayerKey.ISYAK to "宵礼 (Isha)"
        )
    )

    private val STRINGS: Map<UiStringKey, Triple<String, String, String>> = mapOf(
        UiStringKey.NAV_SOLAT to Triple("Waktu Solat", "Prayer Times", "礼拜时间"),
        UiStringKey.NAV_KIBLAT to Triple("Kompas Kiblat", "Qibla Compass", "朝向指南针"),
        UiStringKey.NAV_PUASA to Triple("Penjejak Puasa", "Fasting Tracker", "斋戒追踪器"),
        UiStringKey.NAV_WIRID to Triple("Wirid & Zikir", "Dhikr & Tasbih", "赞念与祈祷"),
        UiStringKey.NAV_DOA to Triple("Himpunan Doa", "Dua Collection", "圣训杜阿集"),
        UiStringKey.NAV_TETAPAN to Triple("Tetapan", "Settings", "应用设置"),
        UiStringKey.NAV_KREDIT to Triple("Info & Rujukan", "Info & Sources", "信息与来源"),
        UiStringKey.NEXT_PRAYER to Triple("Waktu Seterusnya", "Next Prayer", "下一次礼拜"),
        UiStringKey.COUNTDOWN_IN to Triple("Masuk dalam", "In", "剩余时间"),
        UiStringKey.PASSED_TODAY to Triple("Semua waktu solat hari ini telah selesai", "All prayers for today have passed", "今日所有礼拜时间已结束"),
        UiStringKey.TEST_ALARM to Triple("Uji Azan & Penggera", "Test Azan Alarm", "测试宣礼警报"),
        UiStringKey.VOICE_SELECTION to Triple("Pilihan Muadzin", "Muazzin Voice", "宣礼员声音"),
        UiStringKey.NOTIF_BAR_LABEL to Triple("Bar Notifikasi 5 Waktu", "5 Prayers Notification Bar", "5次礼拜通知栏"),
        UiStringKey.ACTIVE to Triple("AKTIF", "ACTIVE", "已开启"),
        UiStringKey.DISABLED to Triple("MATI", "OFF", "已关闭"),
        UiStringKey.FARD_CHECKLIST to Triple("Penjejak & Rekod Solat Fardu", "Daily Fard Prayer Checklist", "每日主命拜完成记录"),
        UiStringKey.FARD_COMPLETED to Triple("Selesai", "Completed", "已完成"),
        UiStringKey.FARD_PENDING to Triple("Belum", "Pending", "未完成"),
        UiStringKey.SETTINGS_TITLE to Triple("Pusat Tetapan SolatKini", "SolatKini Settings Center", "SolatKini 设置中心"),
        UiStringKey.SETTINGS_DESC to Triple(
            "Uruskan bahasa pilihan, tema warna visual, widget notifikasi tetap dan tetapan azan telefon anda.",
            "Manage your preferred language, visual themes, ongoing notification widget, and phone azan alarms.",
            "管理您的首选语言、视觉主题色彩、常驻通知栏组件以及宣礼警报设置。"
        ),
        UiStringKey.LANG_TITLE to Triple("Bahasa Aplikasi / Language / 语言选择", "App Language / Bahasa / 语言选择", "应用语言 / Language / Bahasa Melayu"),
        UiStringKey.LANG_DESC to Triple(
            "Pilih bahasa antaramuka paparan aplikasi. Perubahan berkuat kuasa serta-merta.",
            "Choose the interface language for the application. Changes take effect immediately.",
            "选择应用程序的界面语言。更改将立即生效。"
        ),
        UiStringKey.THEME_TITLE to Triple("Tema Warna Aplikasi", "App Color Theme", "应用主题颜色"),
        UiStringKey.THEME_DESC to Triple(
            "Pilih daripada 7 palet warna visual yang anggun dan selesa pada mata.",
            "Choose from 7 elegant color palettes tailored for high contrast and visual clarity.",
            "从 7 种优雅的主题色彩中选择，兼具视觉舒适与伊斯兰传统美感。"
        ),
        UiStringKey.NOTIF_CARD_TITLE to Triple("Widget Bar Notifikasi Tetap (Status Bar)", "Ongoing Notification Bar Widget (Top Priority)", "常驻通知栏组件 (置顶优先显示)"),
        UiStringKey.NOTIF_CARD_DESC to Triple(
            "Memaparkan kesemua 5 waktu solat sepanjang hari secara berterusan pada tetingkap notifikasi telefon anda (kedudukan teratas, senyap tanpa gangguan).",
            "Displays all 5 daily prayer times permanently at the top of your phone notification shade (top priority, completely silent).",
            "在手机下拉通知栏最顶部常驻显示全天5次礼拜时间（置顶优先、完全静音无打扰）。"
        ),
        UiStringKey.NOTIF_PREVIEW_LABEL to Triple("Rupa Sebenar di Bar Notifikasi Telefon:", "Preview on Phone Notification Shade:", "手机下拉通知栏实际预览："),
        UiStringKey.SYNC_NOW to Triple("Segerak Sekarang", "Sync Now", "立即同步"),
        UiStringKey.OPEN_APP to Triple("Buka SolatKini", "Open SolatKini", "打开应用"),
        UiStringKey.SYNC_PRAYER to Triple("Segerak Waktu", "Sync Times", "同步时间"),
        UiStringKey.ALARM_CARD_TITLE to Triple("Penggera Azan & Suara Muadzin", "Azan Alarm & Muazzin Audio", "宣礼警报与宣礼员声音"),
        UiStringKey.ALARM_CARD_DESC to Triple(
            "Pilih alunan vokal azan rasmi untuk dimainkan secara lantang pada aras penggera telefon.",
            "Choose the official vocal azan to sound loudly at phone alarm volume level.",
            "选择官方真人宣礼声，在礼拜时间以手机闹钟级别大声播放。"
        ),
        UiStringKey.CURRENT_DEVICE_AZAN to Triple("Azan Telefon Semasa:", "Active Phone Azan:", "当前手机宣礼音："),
        UiStringKey.BTN_TEST_AZAN to Triple("Uji Penggera Telefon", "Test Phone Alarm", "测试手机警报"),
        UiStringKey.BTN_EXACT_ALARM_SETTINGS to Triple("Buka Tetapan Exact Alarm Android", "Open Android Exact Alarm Settings", "打开安卓精确闹钟设置"),
        UiStringKey.BTN_DND_SETTINGS to Triple("Panduan Bypass Silent / DND", "Bypass Silent / DND Guide", "勿扰模式突破设置指南"),
        UiStringKey.HOME_WIDGET_TITLE to Triple("Widget Skrin Utama Telefon (Home Screen)", "Android Home Screen Widget (Desktop)", "手机桌面主屏幕小组件"),
        UiStringKey.HOME_WIDGET_DESC to Triple(
            "Panduan meletakkan widget jadual 5 waktu solat terus ke atas skrin utama peranti Android anda.",
            "Guide to adding the 5-prayer schedule widget directly onto your Android device home screen.",
            "将每日五番礼拜时刻表小组件直接添加到安卓手机桌面主屏幕的指南。"
        )
    )

    fun prayerLabel(key: PrayerKey, lang: AppLanguage): String =
        PRAYER_NAMES[lang]?.get(key) ?: PRAYER_NAMES[AppLanguage.MS]?.get(key) ?: key.rawKey

    fun string(key: UiStringKey, lang: AppLanguage): String {
        val triple = STRINGS[key] ?: return key.name.lowercase()
        return when (lang) {
            AppLanguage.MS -> triple.first
            AppLanguage.EN -> triple.second
            AppLanguage.ZH -> triple.third
        }
    }

    fun themeName(theme: AppThemeId, lang: AppLanguage): String = when (lang) {
        AppLanguage.MS -> theme.nameMs
        AppLanguage.EN -> theme.nameEn
        AppLanguage.ZH -> theme.nameZh
    }

    fun themeDescription(theme: AppThemeId, lang: AppLanguage): String = when (lang) {
        AppLanguage.MS -> theme.descriptionMs
        AppLanguage.EN -> theme.descriptionEn
        AppLanguage.ZH -> theme.descriptionZh
    }
}
