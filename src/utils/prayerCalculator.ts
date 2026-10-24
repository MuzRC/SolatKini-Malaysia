import { PrayerKey } from '../types/prayer';

/**
 * Astronomical Solar Calculations conforming to JAKIM (Jabatan Kemajuan Islam Malaysia):
 * - Subuh angle: 20°
 * - Isyak angle: 18°
 * - Asr: Shafi'i shadow ratio (shadow = object + noon shadow)
 * - Imsak: 10 minutes prior to Subuh
 * - Syuruk: Sunrise (-0.833°)
 * - Zohor: Solar Noon + 2-3 minutes ihtiyat
 * - Timezone: Malaysia Standard Time (UTC+8)
 */

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function fixAngle(angle: number): number {
  let a = angle - 360 * Math.floor(angle / 360);
  return a < 0 ? a + 360 : a;
}

function fixHour(hour: number): number {
  let h = hour - 24 * Math.floor(hour / 24);
  return h < 0 ? h + 24 : h;
}

// Calculate Julian Date
function getJulianDate(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    B -
    1524.5
  );
}

// Sun coordinates
function sunCoordinates(d: number) {
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);
  const L = fixAngle(q + 1.915 * Math.sin(toRadians(g)) + 0.02 * Math.sin(toRadians(2 * g)));
  const e = 23.439 - 0.00000036 * d;
  const RA =
    toDegrees(
      Math.atan2(Math.cos(toRadians(e)) * Math.sin(toRadians(L)), Math.cos(toRadians(L)))
    ) / 15;
  const dec = toDegrees(Math.asin(Math.sin(toRadians(e)) * Math.sin(toRadians(L))));
  
  // Normalisasikan Equation of Time (EqT) agar sentiasa dalam julat [-12, +12] jam (sekitar -16 min hingga +16 min)
  let EqT = q / 15 - fixHour(RA);
  if (EqT > 12) EqT -= 24;
  if (EqT < -12) EqT += 24;

  return { dec, EqT };
}

// Compute hour angle for given angle below horizon (e.g. Subuh 20°, Isyak 18°)
function hourAngle(lat: number, dec: number, angle: number): number {
  const cosHA =
    (Math.sin(toRadians(-angle)) - Math.sin(toRadians(lat)) * Math.sin(toRadians(dec))) /
    (Math.cos(toRadians(lat)) * Math.cos(toRadians(dec)));
  if (cosHA < -1) return 180;
  if (cosHA > 1) return 0;
  return toDegrees(Math.acos(cosHA));
}

// Compute hour angle for given positive altitude above horizon (e.g. Asr)
function hourAngleForAltitude(lat: number, dec: number, altitude: number): number {
  const cosHA =
    (Math.sin(toRadians(altitude)) - Math.sin(toRadians(lat)) * Math.sin(toRadians(dec))) /
    (Math.cos(toRadians(lat)) * Math.cos(toRadians(dec)));
  if (cosHA < -1) return 180;
  if (cosHA > 1) return 0;
  return toDegrees(Math.acos(cosHA));
}

// Format fractional hours to "HH:mm" secara selamat (elak nilai negatif atau >= 24)
export function formatHour(hour: number): string {
  const hFixed = fixHour(hour);
  const totalMinutes = Math.round(hFixed * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Format "HH:mm" 24-jam kepada format paparan 12-jam "h:mm AM/PM" (kebal ralat crash jika input kosong/undefined)
export function formatDisplayTime(time24: string): string {
  if (!time24 || typeof time24 !== 'string' || !time24.includes(':')) {
    return '--:--';
  }
  const [hStr, mStr] = time24.trim().split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) {
    return '--:--';
  }
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function calculateLocalPrayerTimes(
  date: Date,
  lat: number,
  lng: number,
  timezone: number = 8
): Record<PrayerKey, string> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const jd = getJulianDate(year, month, day);
  const d = jd - 2451545.0;
  const { dec, EqT } = sunCoordinates(d);

  // Solar noon in hours UTC+8
  const noon = fixHour(12 + timezone - lng / 15 - EqT);

  // Fajr / Subuh: 20 degrees
  const fajrHA = hourAngle(lat, dec, 20);
  const fajrTime = noon - fajrHA / 15;

  // Sunrise / Syuruk: 0.833 degrees
  const sunriseHA = hourAngle(lat, dec, 0.833);
  const sunriseTime = noon - sunriseHA / 15;

  // Sunset / Maghrib: 0.833 degrees
  const sunsetHA = hourAngle(lat, dec, 0.833);
  const sunsetTime = noon + sunsetHA / 15;

  // Asr: Shafi'i method (shadow length = noon shadow + object length)
  const asrAlt = toDegrees(
    Math.atan(1 / (1 + Math.tan(toRadians(Math.abs(lat - dec)))))
  );
  const asrHA = hourAngleForAltitude(lat, dec, asrAlt);
  const asrTime = noon + asrHA / 15;

  // Isha / Isyak: 18 degrees
  const ishaHA = hourAngle(lat, dec, 18);
  const ishaTime = noon + ishaHA / 15;

  // Precautionary buffer (Ihtiyat) applied by JAKIM:
  // Zohor: +2 min, Asr: +2 min, Maghrib: +2 min, Isyak: +2 min, Subuh: +2 min
  const ihtiyatMinutes = 2 / 60;
  const subuhHours = fajrTime + ihtiyatMinutes;
  const imsakHours = subuhHours - 10 / 60; // 10 minutes before Subuh
  const syurukHours = sunriseTime;
  const zohorHours = noon + ihtiyatMinutes;
  const asarHours = asrTime + ihtiyatMinutes;
  const maghribHours = sunsetTime + ihtiyatMinutes;
  const isyakHours = ishaTime + ihtiyatMinutes;

  return {
    imsak: formatHour(imsakHours),
    subuh: formatHour(subuhHours),
    syuruk: formatHour(syurukHours),
    zohor: formatHour(zohorHours),
    asar: formatHour(asarHours),
    maghrib: formatHour(maghribHours),
    isyak: formatHour(isyakHours),
  };
}
