export type PrayerKey = 'imsak' | 'subuh' | 'syuruk' | 'zohor' | 'asar' | 'maghrib' | 'isyak';

export interface PrayerTimeItem {
  key: PrayerKey;
  label: string;
  time: string; // "05:48" (24h)
  displayTime: string; // "5:48 AM" / "1:15 PM"
  isNext?: boolean;
  isPast?: boolean;
  isCurrent?: boolean;
}

export interface DayPrayerTimes {
  date: string; // YYYY-MM-DD
  hijriDate: string; // e.g. "24 Rabiulakhir 1448H"
  zone: string;
  times: Record<PrayerKey, string>; // "HH:mm"
}

export interface JakimZone {
  code: string;
  state: string;
  daerah: string;
  lat: number;
  lng: number;
}

export type AzanVoice = 'makkah' | 'madinah' | 'jakim' | 'al_aqsa' | 'mishary' | 'subuh_special' | 'takbir_raya';

export interface AzanAudioOption {
  id: AzanVoice;
  title: string;
  reciter: string;
  description: string;
  durationSec: number;
}

export interface PrayerAlertConfig {
  enabled: boolean;
  voice: AzanVoice;
  beforeMinutes: number; // 0 for exact, 5, 10, 15 min early alert
  bypassSilentTone: boolean;
}

export interface AppNotificationSettings {
  masterEnabled: boolean;
  highPriorityAlarm: boolean;
  vibrate: boolean;
  persistentNotification?: boolean;
  preferences: Record<PrayerKey, PrayerAlertConfig>;
}

export interface DuaItem {
  id: string;
  category: 'selepas_solat' | 'pagi_petang' | 'harian' | 'puasa' | 'ibu_bapa_keluarga' | 'perlindungan_rezeki';
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference?: string;
  benefits?: string;
}

export interface WiridItem {
  id: string;
  order: number;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  targetCount: number;
  note?: string;
  audioUrl?: string;
}

export interface FastingTrackerState {
  isFastingToday: boolean;
  type: 'ramadan' | 'ganti' | 'sunat_isnin' | 'sunat_khamis' | 'ayyamul_bidh' | 'lain';
  completedDays: string[]; // ['2026-10-15', ...]
  gantiTargetDays: number;
}

export type ActiveTab = 'solat' | 'kiblat' | 'puasa' | 'wirid' | 'doa' | 'tetapan' | 'widget' | 'kredit';

export type FardPrayerKey = 'subuh' | 'zohor' | 'asar' | 'maghrib' | 'isyak';

export interface DailyPrayerChecklistState {
  date: string; // YYYY-MM-DD
  completed: Record<FardPrayerKey, boolean>;
}

export const FARD_PRAYERS_ORDER: FardPrayerKey[] = ['subuh', 'zohor', 'asar', 'maghrib', 'isyak'];
