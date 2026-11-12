import { DayPrayerTimes, JakimZone, PrayerKey } from '../types/prayer';
import { calculateLocalPrayerTimes, formatDisplayTime } from '../utils/prayerCalculator';
import { getHijriDate } from '../utils/hijriCalendar';

const CACHE_KEY_PREFIX = 'solatkini_prayer_times_';

/**
 * Format tarikh tempatan 'YYYY-MM-DD' bagi mengelakkan ralat anjakan 8 jam UTC pada waktu Subuh/Sahur
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function getSafeZoneCoordinates(zone: JakimZone): { lat: number; lng: number } {
  const lat = typeof (zone as any)?.lat === 'number' && !isNaN((zone as any).lat) ? (zone as any).lat : 5.347;
  const lng = typeof (zone as any)?.lng === 'number' && !isNaN((zone as any).lng) ? (zone as any).lng : 115.743;
  return { lat, lng };
}

const formatFromTimestampOrStr = (val: string | number | undefined): string => {
  if (typeof val === 'number' && !isNaN(val)) {
    const epochSeconds = val > 1e11 ? Math.floor(val / 1000) : val;
    const mytDate = new Date((epochSeconds + 8 * 3600) * 1000);
    const h = mytDate.getUTCHours().toString().padStart(2, '0');
    const m = mytDate.getUTCMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  if (typeof val === 'string' && val.includes(':')) {
    const parts = val.trim().split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return '00:00';
};

export async function fetchDayPrayerTimes(
  zone: JakimZone,
  date: Date = new Date(),
  forceLive: boolean = false
): Promise<{ times: DayPrayerTimes; isOfflineCalculated: boolean; lastSyncTime: string }> {
  const dateStr = getLocalDateString(date);
  const cacheKey = `${CACHE_KEY_PREFIX}${zone.code}_${dateStr}`;
  const nowTimeStr = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

  const isNetworkOnline = typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true;

  if (!forceLive && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: DayPrayerTimes = JSON.parse(cached);
        // Pastikan hijriDate dalam cache bukan format mentah YYYY-MM-DDH
        if (parsed.hijriDate && /^\d{4}-\d{2}-\d{2}H?$/.test(parsed.hijriDate)) {
          parsed.hijriDate = getHijriDate(date).formatted;
        }
        const lastSync = localStorage.getItem(`${cacheKey}_sync`) || nowTimeStr;
        return {
          times: parsed,
          isOfflineCalculated: !isNetworkOnline,
          lastSyncTime: isNetworkOnline ? lastSync : `${lastSync} (Luar Talian)`,
        };
      }
    } catch {}
  }

  let fetchedTimes: Record<PrayerKey, string> | null = null;
  let isOffline = !isNetworkOnline;

  if (isNetworkOnline) {
    try {
      const controller = new AbortController();
      // Dilanjutkan ke 7 saat agar stabil pada sambungan selular 4G kawasan luar bandar
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(`https://api.waktusolat.app/v2/solat/${zone.code}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.prayers && Array.isArray(data.prayers) && data.prayers.length > 0) {
          const currentYear = Number(data.year) || date.getFullYear();
          const currentMonthNum = Number(data.month_number) || (date.getMonth() + 1);

          if (typeof window !== 'undefined') {
            data.prayers.forEach((pItem: any) => {
              if (pItem && pItem.day) {
                const dayNum = Number(pItem.day);
                const pDayStr = dayNum.toString().padStart(2, '0');
                const pMonthStr = currentMonthNum.toString().padStart(2, '0');
                const itemDateStr = `${currentYear}-${pMonthStr}-${pDayStr}`;
                const itemCacheKey = `${CACHE_KEY_PREFIX}${zone.code}_${itemDateStr}`;

                const pTimes: Record<PrayerKey, string> = {
                  imsak: formatFromTimestampOrStr(pItem.imsak),
                  subuh: formatFromTimestampOrStr(pItem.fajr),
                  syuruk: formatFromTimestampOrStr(pItem.syuruk),
                  zohor: formatFromTimestampOrStr(pItem.dhuhr),
                  asar: formatFromTimestampOrStr(pItem.asr),
                  maghrib: formatFromTimestampOrStr(pItem.maghrib),
                  isyak: formatFromTimestampOrStr(pItem.isha),
                };

                // Bina tarikh tempatan (elak ralat UTC new Date('YYYY-MM-DD'))
                const localItemDate = new Date(currentYear, currentMonthNum - 1, dayNum);
                const dayHijri = getHijriDate(localItemDate).formatted;

                const cachedDayData: DayPrayerTimes = {
                  date: itemDateStr,
                  hijriDate: dayHijri,
                  zone: zone.code,
                  times: pTimes,
                };

                try {
                  localStorage.setItem(itemCacheKey, JSON.stringify(cachedDayData));
                  localStorage.setItem(`${itemCacheKey}_sync`, nowTimeStr);
                } catch {}
              }
            });
          }

          // Hanya padankan jika tahun dan bulan API sepadan dengan tarikh yang diminta
          const isMatchingMonth =
            currentYear === date.getFullYear() && currentMonthNum === date.getMonth() + 1;

          const todayItem = isMatchingMonth
            ? data.prayers.find((p: { day?: number }) => Number(p.day) === date.getDate())
            : null;

          if (todayItem) {
            fetchedTimes = {
              imsak: formatFromTimestampOrStr(todayItem.imsak),
              subuh: formatFromTimestampOrStr(todayItem.fajr),
              syuruk: formatFromTimestampOrStr(todayItem.syuruk),
              zohor: formatFromTimestampOrStr(todayItem.dhuhr),
              asar: formatFromTimestampOrStr(todayItem.asr),
              maghrib: formatFromTimestampOrStr(todayItem.maghrib),
              isyak: formatFromTimestampOrStr(todayItem.isha),
            };
            isOffline = false;
          }
        }
      }
    } catch {}
  }

  if (!fetchedTimes && typeof window !== 'undefined') {
    try {
      const existingCached = localStorage.getItem(cacheKey);
      if (existingCached) {
        const parsed: DayPrayerTimes = JSON.parse(existingCached);
        if (parsed.hijriDate && /^\d{4}-\d{2}-\d{2}H?$/.test(parsed.hijriDate)) {
          parsed.hijriDate = getHijriDate(date).formatted;
        }
        const lastSync = localStorage.getItem(`${cacheKey}_sync`) || nowTimeStr;
        return {
          times: parsed,
          isOfflineCalculated: true,
          lastSyncTime: `${lastSync} (Luar Talian)`,
        };
      }
    } catch {}
  }

  const coords = getSafeZoneCoordinates(zone);
  if (!fetchedTimes) {
    fetchedTimes = calculateLocalPrayerTimes(date, coords.lat, coords.lng, 8);
    isOffline = true;
  }

  if (fetchedTimes && fetchedTimes.asar) {
    const asarHour = parseInt(fetchedTimes.asar.split(':')[0], 10);
    if (isNaN(asarHour) || asarHour < 15 || asarHour > 18) {
      const fixedTimes = calculateLocalPrayerTimes(date, coords.lat, coords.lng, 8);
      fetchedTimes.asar = fixedTimes.asar;
    }
  }

  const hijri = getHijriDate(date);
  const result: DayPrayerTimes = {
    date: dateStr,
    hijriDate: hijri.formatted,
    zone: zone.code,
    times: fetchedTimes,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
      localStorage.setItem(`${cacheKey}_sync`, nowTimeStr);
    } catch {}
  }

  return {
    times: result,
    isOfflineCalculated: isOffline,
    lastSyncTime: isOffline ? `${nowTimeStr} (Luar Talian)` : nowTimeStr,
  };
}

export interface NextPrayerInfo {
  nextKey: PrayerKey;
  nextLabel: string;
  nextTime: string;          // "13:15" (Format 24 jam rasmi)
  nextTimeStr: string;       // Alias sandaran untuk keserasian kod terdahulu
  nextDisplayTime: string;   // "1:15 PM"
  targetDate: Date;          // Objek Date sebenar
  targetTimestamp: number;   // Epoch milisaat tepat untuk pemasa Android
  remainingSeconds: number;
  countdownFormatted: string;
  currentKey: PrayerKey;
  currentLabel: string;
  isPassedToday: boolean;
}

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  imsak: 'Imsak',
  subuh: 'Subuh',
  syuruk: 'Syuruk',
  zohor: 'Zohor',
  asar: 'Asar',
  maghrib: 'Maghrib',
  isyak: 'Isyak',
};

export const PRAYER_KEYS_ORDER: PrayerKey[] = [
  'imsak',
  'subuh',
  'syuruk',
  'zohor',
  'asar',
  'maghrib',
  'isyak',
];

export const OBLIGATORY_PRAYERS_ORDER: PrayerKey[] = [
  'subuh',
  'zohor',
  'asar',
  'maghrib',
  'isyak',
];

export function getPrayerDateObj(baseDate: Date, timeStr: string): Date {
  const cleaned = (timeStr || '00:00').trim().toUpperCase();
  const isPM = cleaned.includes('PM');
  const isAM = cleaned.includes('AM');
  const [hRaw, mRaw] = cleaned.replace(/[A-Z\s]/g, '').split(':').map(Number);

  let h = isNaN(hRaw) ? 0 : hRaw;
  const m = isNaN(mRaw) ? 0 : mRaw;

  if (isPM && h < 12) h += 12;
  else if (isAM && h === 12) h = 0;

  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Mengira dan menentukan waktu seterusnya merangkumi kesemua 7 checkpoint (Imsak & Syuruk disertakan).
 * Mengelakkan paparan negatif dan sentiasa beralih secara automatik.
 */
export function determineNextPrayer(
  prayerTimes: DayPrayerTimes,
  currentTime: Date = new Date()
): NextPrayerInfo {
  const now = currentTime.getTime();

  // 1. Semak kesemua 7 waktu hari ini mengikut susunan rasmi PRAYER_KEYS_ORDER
  for (let i = 0; i < PRAYER_KEYS_ORDER.length; i++) {
    const key = PRAYER_KEYS_ORDER[i];
    const timeStr = prayerTimes?.times?.[key] || '00:00';
    const prayerDate = getPrayerDateObj(currentTime, timeStr);

    if (prayerDate.getTime() > now) {
      const remainingSec = Math.max(0, Math.floor((prayerDate.getTime() - now) / 1000));
      const hours = Math.floor(remainingSec / 3600);
      const mins = Math.floor((remainingSec % 3600) / 60);
      const secs = remainingSec % 60;

      const countdown =
        hours > 0
          ? `${hours}j ${mins}m ${secs}s`
          : `${mins}m ${secs}s`;

      // Jika waktu seterusnya ialah Imsak hari ini (antara 00:00 hingga Imsak), waktu sebelumnya ialah Isyak semalam
      const prevKey = i > 0 ? PRAYER_KEYS_ORDER[i - 1] : 'isyak';

      return {
        nextKey: key,
        nextLabel: PRAYER_LABELS[key],
        nextTime: timeStr,
        nextTimeStr: timeStr,
        nextDisplayTime: formatDisplayTime(timeStr),
        targetDate: prayerDate,
        targetTimestamp: prayerDate.getTime(),
        remainingSeconds: remainingSec,
        countdownFormatted: countdown,
        currentKey: prevKey,
        currentLabel: PRAYER_LABELS[prevKey],
        isPassedToday: false,
      };
    }
  }

  // 2. Jika semua 7 waktu hari ini telah berlalu (selepas waktu Isyak), sasaran seterusnya ialah IMSAK HARI ESOK
  const tomorrowImsakStr = prayerTimes?.times?.imsak || '05:00';
  const tomorrowImsak = getPrayerDateObj(currentTime, tomorrowImsakStr);
  tomorrowImsak.setDate(tomorrowImsak.getDate() + 1);

  const remainingSec = Math.max(0, Math.floor((tomorrowImsak.getTime() - now) / 1000));
  const hours = Math.floor(remainingSec / 3600);
  const mins = Math.floor((remainingSec % 3600) / 60);
  const secs = remainingSec % 60;

  return {
    nextKey: 'imsak',
    nextLabel: PRAYER_LABELS.imsak,
    nextTime: tomorrowImsakStr,
    nextTimeStr: tomorrowImsakStr,
    nextDisplayTime: formatDisplayTime(tomorrowImsakStr),
    targetDate: tomorrowImsak,
    targetTimestamp: tomorrowImsak.getTime(),
    remainingSeconds: remainingSec,
    countdownFormatted: `${hours}j ${mins}m ${secs}s`,
    currentKey: 'isyak',
    currentLabel: PRAYER_LABELS.isyak,
    isPassedToday: true,
  };
}

export interface FastingCountdownOptions {
  isRamadan?: boolean;
  isUserFasting?: boolean;
}

export function getFastingCountdown(
  prayerTimes: DayPrayerTimes,
  currentTime: Date = new Date(),
  options?: FastingCountdownOptions
): {
  phase: 'fasting' | 'eating' | 'imsak_alert';
  title: string;
  targetTimeStr: string;
  targetDisplayTime: string;
  remainingFormatted: string;
  percentage: number;
  isCurrentlyFasting: boolean;
} {
  const now = currentTime.getTime();
  const subuhStr = prayerTimes?.times?.subuh || '05:30';
  const maghribStr = prayerTimes?.times?.maghrib || '18:30';
  const imsakStr = prayerTimes?.times?.imsak || '05:20';

  const subuhDate = getPrayerDateObj(currentTime, subuhStr).getTime();
  const maghribDate = getPrayerDateObj(currentTime, maghribStr).getTime();
  const imsakDate = getPrayerDateObj(currentTime, imsakStr).getTime();

  const isFastingDay = Boolean(options?.isRamadan || options?.isUserFasting);

  if (now >= imsakDate && now < subuhDate) {
    const secLeft = Math.floor((subuhDate - now) / 1000);
    const m = Math.floor(secLeft / 60);
    const s = secLeft % 60;
    return {
      phase: 'imsak_alert',
      title: isFastingDay ? 'Waktu Imsak (Tamat Sahur)' : 'Waktu Imsak Hari Ini',
      targetTimeStr: subuhStr,
      targetDisplayTime: formatDisplayTime(subuhStr),
      remainingFormatted: `${m}m ${s}s lagi ke Subuh`,
      percentage: 95,
      isCurrentlyFasting: isFastingDay,
    };
  }

  if (now >= subuhDate && now < maghribDate) {
    const totalDuration = Math.max(1, maghribDate - subuhDate);
    const elapsed = now - subuhDate;
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    const secLeft = Math.floor((maghribDate - now) / 1000);
    const h = Math.floor(secLeft / 3600);
    const m = Math.floor((secLeft % 3600) / 60);
    const s = secLeft % 60;

    let title = 'Kiraan Menuju Maghrib';
    if (options?.isRamadan) {
      title = 'Sedang Berpuasa Ramadan';
    } else if (options?.isUserFasting) {
      title = 'Sedang Berpuasa (Sunat / Ganti)';
    }

    return {
      phase: 'fasting',
      title,
      targetTimeStr: maghribStr,
      targetDisplayTime: formatDisplayTime(maghribStr),
      remainingFormatted: `${h}j ${m}m ${s}s lagi`,
      percentage: Math.round(progress),
      isCurrentlyFasting: isFastingDay,
    };
  }

  return {
    phase: 'eating',
    title: isFastingDay ? 'Waktu Berbuka / Sahur' : 'Waktu Menuju Imsak Esok',
    targetTimeStr: imsakStr,
    targetDisplayTime: formatDisplayTime(imsakStr),
    remainingFormatted: 'Sila bersedia untuk sahur & imsak',
    percentage: 100,
    isCurrentlyFasting: false,
  };
}
