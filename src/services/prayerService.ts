import { DayPrayerTimes, JakimZone, PrayerKey } from '../types/prayer';
import { calculateLocalPrayerTimes, formatDisplayTime } from '../utils/prayerCalculator';
import { getHijriDate } from '../utils/hijriCalendar';

const CACHE_KEY_PREFIX = 'solatkini_prayer_times_';

function getSafeZoneCoordinates(zone: JakimZone): { lat: number; lng: number } {
  const lat = typeof (zone as any).lat === 'number' && !isNaN((zone as any).lat) ? (zone as any).lat : 5.347;
  const lng = typeof (zone as any).lng === 'number' && !isNaN((zone as any).lng) ? (zone as any).lng : 115.743;
  return { lat, lng };
}

const formatFromTimestampOrStr = (val: string | number | undefined): string => {
  if (typeof val === 'number') {
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

export async function fetchDayPrayerTimes(
  zone: JakimZone,
  date: Date = new Date(),
  forceLive: boolean = false
): Promise<{ times: DayPrayerTimes; isOfflineCalculated: boolean; lastSyncTime: string }> {
  const dateStr = date.toISOString().split('T')[0];
  const cacheKey = `${CACHE_KEY_PREFIX}${zone.code}_${dateStr}`;
  const nowTimeStr = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

  // Semak status sambungan internet telefon
  const isNetworkOnline = typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true;

  // 1. Semak cache tempatan
  if (!forceLive && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: DayPrayerTimes = JSON.parse(cached);
        const lastSync = localStorage.getItem(`${cacheKey}_sync`) || nowTimeStr;
        // Jika telefon sedang offline (Airplane Mode), tanda terus sebagai mod luar talian
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

  // 2. Muat turun daripada API jika internet hidup
  if (isNetworkOnline) {
    try {
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
                } catch {}
              }
            });
          }

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
    } catch {}
  }

  // 3. Sandaran Cache jika gagal sedut data
  if (!fetchedTimes && typeof window !== 'undefined') {
    try {
      const existingCached = localStorage.getItem(cacheKey);
      if (existingCached) {
        const parsed: DayPrayerTimes = JSON.parse(existingCached);
        const lastSync = localStorage.getItem(`${cacheKey}_sync`) || nowTimeStr;
        return {
          times: parsed,
          isOfflineCalculated: true,
          lastSyncTime: `${lastSync} (Luar Talian)`,
        };
      }
    } catch {}
  }

  // 4. Sandaran Pengiraan Matematik Falak
  const coords = getSafeZoneCoordinates(zone);
  if (!fetchedTimes) {
    fetchedTimes = calculateLocalPrayerTimes(date, coords.lat, coords.lng, 8);
    isOffline = true;
  }

  const hijri = getHijriDate(date);
  const result: DayPrayerTimes = {
    date: dateStr,
    hijriDate: hijri.formatted,
    zone: zone.code,
    times: fetchedTimes,
  };

  return {
    times: result,
    isOfflineCalculated: isOffline,
    lastSyncTime: isOffline ? `${nowTimeStr} (Luar Talian)` : nowTimeStr,
  };
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
  maghrib: 'Maghrib',
  isyak: 'Isyak',
};

// KUNCI UTAMA: HANYA 5 SOLAT FARDHU YANG DIKIRA SEBAGAI "SOLAT SETERUSNYA"
// Imsak dan Syuruk bukan waktu solat fardhu!
export const OBLIGATORY_PRAYERS_ORDER: PrayerKey[] = [
  'subuh',
  'zohor',
  'asar',
  'maghrib',
  'isyak',
];

export function getPrayerDateObj(baseDate: Date, timeStr: string): Date {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function determineNextPrayer(
  prayerTimes: DayPrayerTimes,
  currentTime: Date = new Date()
): NextPrayerInfo {
  const now = currentTime.getTime();

  for (let i = 0; i < OBLIGATORY_PRAYERS_ORDER.length; i++) {
    const key = OBLIGATORY_PRAYERS_ORDER[i];
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

      const prevKey = i > 0 ? OBLIGATORY_PRAYERS_ORDER[i - 1] : 'isyak';

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

  // Jika semua waktu solat hari ini selesai (selepas Isyak), waktu solat seterusnya ialah Subuh esok!
  const tomorrowSubuhStr = prayerTimes?.times?.subuh || '05:00';
  const tomorrowSubuh = getPrayerDateObj(currentTime, tomorrowSubuhStr);
  tomorrowSubuh.setDate(tomorrowSubuh.getDate() + 1);
  const remainingSec = Math.max(0, Math.floor((tomorrowSubuh.getTime() - now) / 1000));
  const hours = Math.floor(remainingSec / 3600);
  const mins = Math.floor((remainingSec % 3600) / 60);
  const secs = remainingSec % 60;

  return {
    nextKey: 'subuh',
    nextLabel: PRAYER_LABELS.subuh,
    nextTimeStr: tomorrowSubuhStr,
    nextDisplayTime: formatDisplayTime(tomorrowSubuhStr),
    remainingSeconds: remainingSec,
    countdownFormatted: `${hours}j ${mins}m ${secs}s`,
    currentKey: 'isyak',
    currentLabel: PRAYER_LABELS.isyak,
    isPassedToday: true,
  };
}
