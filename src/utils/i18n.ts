import { PrayerKey } from '../types/prayer';

export type Language = 'ms' | 'en' | 'zh';

export interface LanguageOption {
  id: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'ms', name: 'Bahasa Melayu', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  { id: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { id: 'zh', name: 'Mandarin', nativeName: '简体中文', flag: '🇨🇳' },
];

export const LANG_STORAGE_KEY = 'solatkini_lang';

export function getSavedLanguage(): Language {
  if (typeof window === 'undefined') return 'ms';
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ms' || saved === 'en' || saved === 'zh') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'ms';
}

export function saveLanguage(lang: Language) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export const PRAYER_NAMES_I18N: Record<Language, Record<PrayerKey, string>> = {
  ms: {
    imsak: 'Imsak',
    subuh: 'Subuh',
    syuruk: 'Syuruk',
    zohor: 'Zohor',
    asar: 'Asar',
    maghrib: 'Maghrib',
    isyak: 'Isyak',
  },
  en: {
    imsak: 'Imsak',
    subuh: 'Fajr',
    syuruk: 'Sunrise',
    zohor: 'Dhuhr',
    asar: 'Asr',
    maghrib: 'Maghrib',
    isyak: 'Isha',
  },
  zh: {
    imsak: '封斋 (Imsak)',
    subuh: '晨礼 (Fajr)',
    syuruk: '日出 (Sunrise)',
    zohor: '晌礼 (Dhuhr)',
    asar: '晡礼 (Asr)',
    maghrib: '昏礼 (Maghrib)',
    isyak: '宵礼 (Isha)',
  },
};

export const I18N_STRINGS = {
  // Navigation
  nav_solat: {
    ms: 'Waktu Solat',
    en: 'Prayer Times',
    zh: '礼拜时间',
  },
  nav_kiblat: {
    ms: 'Kompas Kiblat',
    en: 'Qibla Compass',
    zh: '朝向指南针',
  },
  nav_puasa: {
    ms: 'Penjejak Puasa',
    en: 'Fasting Tracker',
    zh: '斋戒追踪器',
  },
  nav_wirid: {
    ms: 'Wirid & Zikir',
    en: 'Dhikr & Tasbih',
    zh: '赞念与祈祷',
  },
  nav_doa: {
    ms: 'Himpunan Doa',
    en: 'Dua Collection',
    zh: '圣训杜阿集',
  },
  nav_tetapan: {
    ms: 'Tetapan',
    en: 'Settings',
    zh: '应用设置',
  },
  nav_kredit: {
    ms: 'Info & Rujukan',
    en: 'Info & Sources',
    zh: '信息与来源',
  },

  // Prayer Dashboard
  next_prayer: {
    ms: 'Waktu Seterusnya',
    en: 'Next Prayer',
    zh: '下一次礼拜',
  },
  countdown_in: {
    ms: 'Masuk dalam',
    en: 'In',
    zh: '剩余时间',
  },
  passed_today: {
    ms: 'Semua waktu solat hari ini telah selesai',
    en: 'All prayers for today have passed',
    zh: '今日所有礼拜时间已结束',
  },
  test_alarm: {
    ms: 'Uji Azan & Penggera',
    en: 'Test Azan Alarm',
    zh: '测试宣礼警报',
  },
  voice_selection: {
    ms: 'Pilihan Muadzin',
    en: 'Muazzin Voice',
    zh: '宣礼员声音',
  },
  notif_bar_label: {
    ms: 'Bar Notifikasi 5 Waktu',
    en: '5 Prayers Notification Bar',
    zh: '5次礼拜通知栏',
  },
  active: {
    ms: 'AKTIF',
    en: 'ACTIVE',
    zh: '已开启',
  },
  disabled: {
    ms: 'MATI',
    en: 'OFF',
    zh: '已关闭',
  },
  fard_checklist: {
    ms: 'Penjejak & Rekod Solat Fardu',
    en: 'Daily Fard Prayer Checklist',
    zh: '每日主命拜完成记录',
  },
  fard_completed: {
    ms: 'Selesai',
    en: 'Completed',
    zh: '已完成',
  },
  fard_pending: {
    ms: 'Belum',
    en: 'Pending',
    zh: '未完成',
  },

  // Settings
  settings_title: {
    ms: 'Pusat Tetapan SolatKini',
    en: 'SolatKini Settings Center',
    zh: 'SolatKini 设置中心',
  },
  settings_desc: {
    ms: 'Uruskan bahasa pilihan, tema warna visual, widget notifikasi tetap dan tetapan azan telefon anda.',
    en: 'Manage your preferred language, visual themes, ongoing notification widget, and phone azan alarms.',
    zh: '管理您的首选语言、视觉主题色彩、常驻通知栏组件以及宣礼警报设置。',
  },

  // Language Card
  lang_title: {
    ms: 'Bahasa Aplikasi / Language / 语言选择',
    en: 'App Language / Bahasa / 语言选择',
    zh: '应用语言 / Language / Bahasa Melayu',
  },
  lang_desc: {
    ms: 'Pilih bahasa antaramuka paparan aplikasi. Perubahan berkuat kuasa serta-merta.',
    en: 'Choose the interface language for the application. Changes take effect immediately.',
    zh: '选择应用程序的界面语言。更改将立即生效。',
  },

  // Theme Card
  theme_title: {
    ms: 'Tema Warna Aplikasi',
    en: 'App Color Theme',
    zh: '应用主题颜色',
  },
  theme_desc: {
    ms: 'Pilih daripada 7 palet warna visual yang anggun dan selesa pada mata.',
    en: 'Choose from 7 elegant color palettes tailored for high contrast and visual clarity.',
    zh: '从 7 种优雅的主题色彩中选择，兼具视觉舒适与伊斯兰传统美感。',
  },

  // Persistent Notification Card
  notif_card_title: {
    ms: 'Widget Bar Notifikasi Tetap (Status Bar)',
    en: 'Ongoing Notification Bar Widget (Top Priority)',
    zh: '常驻通知栏组件 (置顶优先显示)',
  },
  notif_card_desc: {
    ms: 'Memaparkan kesemua 5 waktu solat sepanjang hari secara berterusan pada tetingkap notifikasi telefon anda (kedudukan teratas, senyap tanpa gangguan).',
    en: 'Displays all 5 daily prayer times permanently at the top of your phone notification shade (top priority, completely silent).',
    zh: '在手机下拉通知栏最顶部常驻显示全天5次礼拜时间（置顶优先、完全静音无打扰）。',
  },
  notif_preview_label: {
    ms: 'Rupa Sebenar di Bar Notifikasi Telefon:',
    en: 'Preview on Phone Notification Shade:',
    zh: '手机下拉通知栏实际预览：',
  },
  sync_now: {
    ms: 'Segerak Sekarang',
    en: 'Sync Now',
    zh: '立即同步',
  },
  open_app: {
    ms: 'Buka SolatKini',
    en: 'Open SolatKini',
    zh: '打开应用',
  },
  sync_prayer: {
    ms: 'Segerak Waktu',
    en: 'Sync Times',
    zh: '同步时间',
  },

  // Audio & Alarm Card
  alarm_card_title: {
    ms: 'Penggera Azan & Suara Muadzin',
    en: 'Azan Alarm & Muazzin Audio',
    zh: '宣礼警报与宣礼员声音',
  },
  alarm_card_desc: {
    ms: 'Pilih alunan vokal azan rasmi untuk dimainkan secara lantang pada aras penggera telefon.',
    en: 'Choose the official vocal azan to sound loudly at phone alarm volume level.',
    zh: '选择官方真人宣礼声，在礼拜时间以手机闹钟级别大声播放。',
  },
  current_device_azan: {
    ms: 'Azan Telefon Semasa:',
    en: 'Active Phone Azan:',
    zh: '当前手机宣礼音：',
  },
  btn_test_azan: {
    ms: 'Uji Penggera Telefon',
    en: 'Test Phone Alarm',
    zh: '测试手机警报',
  },
  btn_exact_alarm_settings: {
    ms: 'Buka Tetapan Exact Alarm Android',
    en: 'Open Android Exact Alarm Settings',
    zh: '打开安卓精确闹钟设置',
  },
  btn_dnd_settings: {
    ms: 'Panduan Bypass Silent / DND',
    en: 'Bypass Silent / DND Guide',
    zh: '勿扰模式突破设置指南',
  },

  // Home screen widget card
  home_widget_title: {
    ms: 'Widget Skrin Utama Telefon (Home Screen)',
    en: 'Android Home Screen Widget (Desktop)',
    zh: '手机桌面主屏幕小组件',
  },
  home_widget_desc: {
    ms: 'Panduan meletakkan widget jadual 5 waktu solat terus ke atas skrin utama peranti Android anda.',
    en: 'Guide to adding the 5-prayer schedule widget directly onto your Android device home screen.',
    zh: '将每日五番礼拜时刻表小组件直接添加到安卓手机桌面主屏幕的指南。',
  },
} as const;

export type TranslationKey = keyof typeof I18N_STRINGS;

export function t(key: TranslationKey, lang: Language): string {
  const item = I18N_STRINGS[key];
  if (!item) return key;
  return item[lang] || item['ms'] || key;
}
