export interface HijriDateInfo {
  day: number;
  monthIndex: number; // 0-based: 0 = Muharram
  monthName: string;
  year: number;
  formatted: string; // e.g. "2 Jamadilakhir 1448H"
  isAyyamulBidh: boolean;
  specialEvent?: string;
  isRamadan: boolean;
}

export interface RamadanCountdownInfo {
  isRamadan: boolean;
  currentRamadanDay: number; // 1-30 semasa Ramadan, 0 di luar Ramadan
  daysRemainingInRamadan: number; // Baki hari menuju 1 Syawal semasa Ramadan
  daysUntilNextRamadan: number; // Baki hari menuju 1 Ramadan seterusnya (0 jika sedang Ramadan)
  nextRamadanHijriYear: number; // Tahun Hijrah bagi Ramadan semasa atau akan datang
  estimatedRamadanStartDate: Date; // Tarikh Masihi anggaran 1 Ramadan
  ramadanYearKey: string; // Kunci unik per tahun Hijrah (cth. "1448")
}

export const HIJRI_ADJUSTMENT_STORAGE_KEY = 'solatkini_hijri_adjustment';

export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabiulawal',
  'Rabiulakhir',
  'Jamadilawal',
  'Jamadilakhir',
  'Rejab',
  'Syaaban',
  'Ramadan',
  'Syawal',
  'Zulkaedah',
  'Zulhijjah',
];

export const ISLAMIC_EVENTS: Record<string, string> = {
  '1-0': 'Awal Muharram (Tahun Baru Hijrah)',
  '10-0': 'Hari Asyura',
  '12-2': 'Maulidur Rasul',
  '27-6': 'Israk dan Mikraj',
  '15-7': 'Malam Nisfu Syaaban',
  '1-8': 'Awal Ramadan (Hari Pertama Berpuasa)',
  '17-8': 'Hari Nuzul Al-Quran',
  '1-9': 'Hari Raya Aidilfitri (1 Syawal)',
  '2-9': 'Hari Raya Aidilfitri (2 Syawal)',
  '1-11': 'Awal Bulan Zulhijjah',
  '9-11': 'Hari Wukuf / Hari Arafah (Puasa Sunat Arafah)',
  '10-11': 'Hari Raya Aidiladha (10 Zulhijjah)',
  '11-11': 'Hari Tasyrik (11 Zulhijjah)',
  '12-11': 'Hari Tasyrik (12 Zulhijjah)',
  '13-11': 'Hari Tasyrik (13 Zulhijjah)',
};

// Tahun-tahun lompat dalam kitaran 30 tahun takwim Hijriah (Zulhijjah mempunyai 30 hari)
const HIJRI_LEAP_YEARS_IN_CYCLE = new Set([2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29]);

/**
 * Baca pelarasan hari Hijrah (-2 hingga +2 hari) daripada localStorage
 * bagi menyelaraskan takwim dengan pengisytiharan rasmi JAKIM / Penyimpan Mohor Besar Raja-Raja.
 */
export function getSavedHijriAdjustment(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(HIJRI_ADJUSTMENT_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) return 0;
    return Math.max(-2, Math.min(2, parsed));
  } catch {
    return 0;
  }
}

export function saveHijriAdjustment(days: number): number {
  const clamped = Math.max(-2, Math.min(2, Math.round(days)));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(HIJRI_ADJUSTMENT_STORAGE_KEY, String(clamped));
    } catch {}
  }
  return clamped;
}

/**
 * Menukar rentetan tarikh Hijrah JAKIM e-Solat (contoh: "1448-06-03") kepada format bacaan Malaysia.
 */
export function parseJakimHijriString(jakimHijri?: string): string | null {
  if (!jakimHijri || typeof jakimHijri !== 'string') return null;
  const parts = jakimHijri.trim().split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 30) {
    return null;
  }
  return `${d} ${HIJRI_MONTHS[m - 1]} ${y}H`;
}

/**
 * Converts a Gregorian date to Hijri date using Kuwaiti/Umm al-Qura astronomical algorithm
 * calibrated for Malaysia (MABIMS Rukyah & Hisab convention).
 */
export function getHijriDate(date: Date, adjustmentDays?: number): HijriDateInfo {
  const effectiveAdj = adjustmentDays !== undefined ? adjustmentDays : getSavedHijriAdjustment();
  const d = new Date(date.getTime() + effectiveAdj * 86400000);
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  let m = month + 1;
  let y = year;
  if (m < 3) {
    y -= 1;
    m += 12;
  }

  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5;

  const z = jd - 1948439.5;
  const cyc = Math.floor(z / 10631);
  const rem = z - 10631 * cyc;
  const j = Math.floor((rem + 0.5) / 354.36667);
  const hijriYear = 30 * cyc + j + 1;

  // Day of the year in Hijri
  const dayOfYear = Math.max(1, Math.floor(rem - Math.floor(j * 354.36667) + 0.5));

  const yearInCycle = ((hijriYear - 1) % 30) + 1;
  const isLeapYear = HIJRI_LEAP_YEARS_IN_CYCLE.has(yearInCycle);

  let hijriMonth = 11;
  let hijriDay = dayOfYear;

  // Panjang bulan berselang-seli 30, 29... dan bulan ke-12 (Zulhijjah) mempunyai 30 hari pada tahun lompat
  const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, isLeapYear ? 30 : 29];
  for (let i = 0; i < 12; i++) {
    const len = monthLengths[i];
    if (hijriDay <= len) {
      hijriMonth = i;
      break;
    }
    hijriDay -= len;
  }

  // Fallback clamp keselamatan (jika melebihi 355 hari)
  if (hijriDay <= 0) hijriDay = 1;
  if (hijriDay > 30) hijriDay = 30;
  if (hijriMonth > 11) hijriMonth = 11;

  const monthName = HIJRI_MONTHS[hijriMonth];
  const formatted = `${hijriDay} ${monthName} ${hijriYear}H`;

  // 13 Zulhijjah ialah Hari Tasyrik (haram berpuasa), jadi kecualikan daripada Ayyamul Bidh
  const isThirteenthZulhijjah = hijriMonth === 11 && hijriDay === 13;
  const isAyyamulBidh = hijriDay >= 13 && hijriDay <= 15 && !isThirteenthZulhijjah;

  const eventKey = `${hijriDay}-${hijriMonth}`;
  const specialEvent = ISLAMIC_EVENTS[eventKey];
  const isRamadan = hijriMonth === 8;

  return {
    day: hijriDay,
    monthIndex: hijriMonth,
    monthName,
    year: hijriYear,
    formatted,
    isAyyamulBidh,
    specialEvent,
    isRamadan,
  };
}

/**
 * Mengesan status Ramadan semasa secara automatik serta mengira baki hari
 * menuju 1 Ramadan (jika di luar Ramadan) atau baki hari menuju 1 Syawal (jika sedang Ramadan).
 */
export function getRamadanCountdownInfo(date: Date, adjustmentDays?: number): RamadanCountdownInfo {
  const effectiveAdj = adjustmentDays !== undefined ? adjustmentDays : getSavedHijriAdjustment();
  const baseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const currentHijri = getHijriDate(baseDate, effectiveAdj);

  if (currentHijri.isRamadan) {
    // Cari tarikh 1 Syawal untuk kiraan baki hari Ramadan yang tepat
    let daysToSyawal = Math.max(0, 30 - currentHijri.day);
    for (let i = 1; i <= 31; i++) {
      const future = new Date(baseDate.getTime() + i * 86400000);
      const h = getHijriDate(future, effectiveAdj);
      if (h.monthIndex === 9 && h.day === 1) {
        daysToSyawal = i;
        break;
      }
    }

    const startDate = new Date(baseDate.getTime() - (currentHijri.day - 1) * 86400000);
    return {
      isRamadan: true,
      currentRamadanDay: currentHijri.day,
      daysRemainingInRamadan: daysToSyawal,
      daysUntilNextRamadan: 0,
      nextRamadanHijriYear: currentHijri.year,
      estimatedRamadanStartDate: startDate,
      ramadanYearKey: String(currentHijri.year),
    };
  }

  // Di luar bulan Ramadan: imbas ke hadapan sehingga jumpa 1 Ramadan
  let daysUntil = 0;
  let targetYear = currentHijri.monthIndex < 8 ? currentHijri.year : currentHijri.year + 1;
  let estimatedStart = new Date(baseDate.getTime() + 30 * 86400000);

  for (let i = 1; i <= 370; i++) {
    const future = new Date(baseDate.getTime() + i * 86400000);
    const h = getHijriDate(future, effectiveAdj);
    if (h.monthIndex === 8 && h.day === 1) {
      daysUntil = i;
      targetYear = h.year;
      estimatedStart = future;
      break;
    }
  }

  return {
    isRamadan: false,
    currentRamadanDay: 0,
    daysRemainingInRamadan: 0,
    daysUntilNextRamadan: daysUntil,
    nextRamadanHijriYear: targetYear,
    estimatedRamadanStartDate: estimatedStart,
    ramadanYearKey: String(targetYear),
  };
}

export function getFastingRecommendation(date: Date, hijri: HijriDateInfo): {
  isRecommended: boolean;
  type: string;
  description: string;
} {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, 4 = Thursday

  // 1. Semak Hari Haram Berpuasa terlebih dahulu (1 Syawal, 10 Zulhijjah, & Hari Tasyrik 11-13 Zulhijjah)
  const isAidilfitri = hijri.monthIndex === 9 && hijri.day === 1;
  const isAidiladha = hijri.monthIndex === 11 && hijri.day === 10;
  const isHariTasyrik = hijri.monthIndex === 11 && hijri.day >= 11 && hijri.day <= 13;

  if (isAidilfitri || isAidiladha || isHariTasyrik) {
    return {
      isRecommended: false,
      type: isHariTasyrik ? 'Hari Tasyrik (Diharamkan Berpuasa)' : 'Hari Raya (Diharamkan Berpuasa)',
      description: 'Umat Islam diharamkan berpuasa pada Hari Raya Aidilfitri, Aidiladha, dan tiga Hari Tasyrik.',
    };
  }

  // 2. Puasa Wajib Ramadan
  if (hijri.isRamadan) {
    return {
      isRecommended: true,
      type: 'Puasa Wajib Ramadan',
      description: 'Hari berpuasa wajib bagi seluruh umat Islam.',
    };
  }

  // 3. Puasa Sunat Hari Arafah (9 Zulhijjah)
  if (hijri.day === 9 && hijri.monthIndex === 11) {
    return {
      isRecommended: true,
      type: 'Puasa Sunat Hari Arafah',
      description: 'Fadhilat menghapuskan dosa setahun yang lalu dan setahun yang akan datang.',
    };
  }

  // 4. Puasa Sunat Tasu'a & Asyura (9 & 10 Muharram)
  if ((hijri.day === 9 || hijri.day === 10) && hijri.monthIndex === 0) {
    return {
      isRecommended: true,
      type: "Puasa Sunat Tasu'a & Asyura",
      description: 'Sunat berpuasa pada 9 dan 10 Muharram.',
    };
  }

  // 5. Puasa Sunat Ayyamul Bidh (13, 14, 15 setiap bulan kecuali 13 Zulhijjah)
  if (hijri.isAyyamulBidh) {
    return {
      isRecommended: true,
      type: 'Puasa Sunat Hari Putih (Ayyamul Bidh)',
      description: `Hari ke-${hijri.day} bulan Islam. Ganjarannya seperti berpuasa sepanjang tahun.`,
    };
  }

  // 6. Puasa Sunat Isnin & Khamis
  if (dayOfWeek === 1) {
    return {
      isRecommended: true,
      type: 'Puasa Sunat Hari Isnin',
      description: 'Sunnah Nabi SAW berpuasa pada hari kelahiran baginda.',
    };
  }

  if (dayOfWeek === 4) {
    return {
      isRecommended: true,
      type: 'Puasa Sunat Hari Khamis',
      description: 'Hari di mana segala amalan diangkat kepada Allah SWT.',
    };
  }

  return {
    isRecommended: false,
    type: 'Tiada Puasa Khusus',
    description: 'Anda boleh niat berpuasa sunat mutlak atau puasa ganti (qada).',
  };
}
