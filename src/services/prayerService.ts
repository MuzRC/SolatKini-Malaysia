import { DayPrayerTimes, JakimZone, PrayerKey } from '../types/prayer';
import { calculateLocalPrayerTimes, formatDisplayTime } from '../utils/prayerCalculator';
import { getHijriDate } from '../utils/hijriCalendar';

const CACHE_KEY_PREFIX = 'solatkini_prayer_times_';

export async function fetchDayPrayerTimes(
  zone: JakimZone,
  date: Date = new Date(),
  forceLive: boolean = false
): Promise<{ times: DayPrayerTimes; isOfflineCalculated: boolean; lastSyncTime: string }> {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const cacheKey = `${CACHE_KEY_PREFIX}${zone.code}_${dateStr}`;
  const nowTimeStr = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

  // 1. Check local storage cache if not forcing live sync
  if (!forceLive && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: DayPrayerTimes = JSON.parse(cached);
        const lastSync = localStorage.getItem(`${cacheKey}_sync`) || nowTimeStr;
        return { times: parsed, isOfflineCalculated: false, lastSyncTime: lastSync };
      }
    } catch {
      // ignore storage error
    }
  }

  // 2. Try fetching from e-Solat JAKIM / API endpoint
  let fetchedTimes: Record<PrayerKey, string> | null = null;
  let isOffline = true;

  // Strict Malaysia UTC+8 timestamp conversion (prevents timezone drift on SIM-less phones)
  const formatFromTimestampOrStr = (val: string | number): string => {
    if (typeof val === 'number') {
      // Force exact Malaysia UTC+8 timezone: epoch + (8 * 3600) seconds
      const mytDate = new Date((val + 8 * 3600) * 1000);
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

  try {
    // Attempt with 3.5s timeout to maintain instantaneous UI response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.waktusolat.app/v2/solat/${zone.code}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.prayers && Array.isArray(data.prayers) && data.prayers.length > 0) {
        const currentYear = data.year || date.getFullYear();
        const currentMonthNum = data.month_number || (date.getMonth() + 1);

        // AUTO-CACHE FULL 30 DAYS: Crucial for WiFi-only phones so times remain accurate offline
        if (typeof window !== 'undefined') {
          data.prayers.forEach((pItem: any) => {
            if (pItem && pItem.day) {
              const pDayStr = pItem.day.toString().padStart(2, '0');
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

              const dayHijri = pItem.hijri ? `${pItem.hijri}H` : getHijriDate(new Date(itemDateStr)).formatted;
              const cachedDayData: DayPrayerTimes = {
                date: itemDateStr,
                hijriDate: dayHijri,
                zone: zone.code,
                times: pTimes,
              };

              try {
                localStorage.setItem(itemCacheKey, JSON.stringify(cachedDayData));
                localStorage.setItem(`${itemCacheKey}_sync`, nowTimeStr);
              } catch {
                // ignore storage limits
              }
            }
          });
        }

        // Today's item or first item
        const todayItem =
          data.prayers.find((p: { day?: number }) => p.day === date.getDate()) ||
          data.prayers[0];

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
  } catch {
    // Fall through to offline calculation
  }

  // 3. Fallback to precise local astronomical calculation conforming to JAKIM standards
  if (!fetchedTimes) {
    fetchedTimes = calculateLocalPrayerTimes(date, zone.lat, zone.lng, 8);
    isOffline = true;
  }

  // Sanity check: Ensure Asar is never skewed
  if (fetchedTimes.asar) {
    const asarHour = parseInt(fetchedTimes.asar.split(':')[0], 10);
    if (isNaN(asarHour) || asarHour < 15 || asarHour > 18) {
      const fixedTimes = calculateLocalPrayerTimes(date, zone.lat, zone.lng, 8);
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

  // Cache result for offline access
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
      localStorage.setItem(`${cacheKey}_sync`, nowTimeStr);
    } catch {
      // storage full or disabled
    }
  }

  return { times: result, isOfflineCalculated: isOffline, lastSyncTime: nowTimeStr };
}

export interface NextPrayerInfo {
  nextKey: PrayerKey;
  nextLabel: string;
  nextTimeStr: string;
  nextDisplayTime: string;
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
  maghrib: 'Maghrib (Berbuka)',
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

export function getPrayerDateObj(baseDate: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

export function determineNextPrayer(
  prayerTimes: DayPrayerTimes,
  currentTime: Date = new Date()
): NextPrayerInfo {
  const now = currentTime.getTime();

  for (let i = 0; i < PRAYER_KEYS_ORDER.length; i++) {
    const key = PRAYER_KEYS_ORDER[i];
    const timeStr = prayerTimes.times[key];
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

      const prevKey = i > 0 ? PRAYER_KEYS_ORDER[i - 1] : 'isyak';

      return {
        nextKey: key,
        nextLabel: PRAYER_LABELS[key],
        nextTimeStr: timeStr,
        nextDisplayTime: formatDisplayTime(timeStr),
        remainingSeconds: remainingSec,
        countdownFormatted: countdown,
        currentKey: prevKey,
        currentLabel: PRAYER_LABELS[prevKey],
        isPassedToday: false,
      };
    }
  }

  // If all prayers for today have passed, next is tomorrow's Imsak / Subuh
  const tomorrowImsak = getPrayerDateObj(currentTime, prayerTimes.times.imsak);
  tomorrowImsak.setDate(tomorrowImsak.getDate() + 1);
  const remainingSec = Math.max(0, Math.floor((tomorrowImsak.getTime() - now) / 1000));
  const hours = Math.floor(remainingSec / 3600);
  const mins = Math.floor((remainingSec % 3600) / 60);
  const secs = remainingSec % 60;

  return {
    nextKey: 'imsak',
    nextLabel: PRAYER_LABELS.imsak,
    nextTimeStr: prayerTimes.times.imsak,
    nextDisplayTime: formatDisplayTime(prayerTimes.times.imsak),
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
  const subuhDate = getPrayerDateObj(currentTime, prayerTimes.times.subuh).getTime();
  const maghribDate = getPrayerDateObj(currentTime, prayerTimes.times.maghrib).getTime();
  const imsakDate = getPrayerDateObj(currentTime, prayerTimes.times.imsak).getTime();

  const isFastingDay = Boolean(options?.isRamadan || options?.isUserFasting);

  if (now >= imsakDate && now < subuhDate) {
    // 10 minutes before Subuh
    const secLeft = Math.floor((subuhDate - now) / 1000);
    const m = Math.floor(secLeft / 60);
    const s = secLeft % 60;
    return {
      phase: 'imsak_alert',
      title: isFastingDay ? 'Waktu Imsak (Tamat Sahur)' : 'Waktu Imsak Hari Ini',
      targetTimeStr: prayerTimes.times.subuh,
      targetDisplayTime: formatDisplayTime(prayerTimes.times.subuh),
      remainingFormatted: `${m}m ${s}s lagi ke Subuh`,
      percentage: 95,
      isCurrentlyFasting: isFastingDay,
    };
  }

  if (now >= subuhDate && now < maghribDate) {
    // Daytime between Subuh and Maghrib
    const totalDuration = maghribDate - subuhDate;
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
      targetTimeStr: prayerTimes.times.maghrib,
      targetDisplayTime: formatDisplayTime(prayerTimes.times.maghrib),
      remainingFormatted: `${h}j ${m}m ${s}s lagi`,
      percentage: Math.round(progress),
      isCurrentlyFasting: isFastingDay,
    };
  }

  // Between Maghrib and tomorrow Subuh (Night time / Sahur period)
  return {
    phase: 'eating',
    title: isFastingDay ? 'Waktu Berbuka / Sahur' : 'Waktu Menuju Imsak Esok',
    targetTimeStr: prayerTimes.times.imsak,
    targetDisplayTime: formatDisplayTime(prayerTimes.times.imsak),
    remainingFormatted: 'Sila bersedia untuk sahur & imsak',
    percentage: 100,
    isCurrentlyFasting: false,
  };
}
