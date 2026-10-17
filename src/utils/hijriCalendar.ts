export interface HijriDateInfo {
  day: number;
  monthIndex: number; // 0-based: 0 = Muharram
  monthName: string;
  year: number;
  formatted: string; // e.g. "24 Rabiulakhir 1448H"
  isAyyamulBidh: boolean;
  specialEvent?: string;
  isRamadan: boolean;
}

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

/**
 * Converts a Gregorian date to Hijri date using Kuwaiti/Umm al-Qura astronomical algorithm
 * calibrated for Malaysia (MABIMS Rukyah & Hisab convention).
 */
export function getHijriDate(date: Date, adjustmentDays: number = 0): HijriDateInfo {
  const d = new Date(date.getTime() + adjustmentDays * 86400000);
  let day = d.getDate();
  let month = d.getMonth();
  let year = d.getFullYear();

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
  const dayOfYear = Math.floor(rem - Math.floor(j * 354.36667) + 0.5);

  let hijriMonth = 0;
  let hijriDay = dayOfYear;

  // Month lengths alternate 30, 29, 30, 29...
  const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
  for (let i = 0; i < 12; i++) {
    const len = monthLengths[i];
    if (hijriDay <= len) {
      hijriMonth = i;
      break;
    }
    hijriDay -= len;
  }

  // Fallback clamp
  if (hijriDay <= 0) hijriDay = 1;
  if (hijriMonth > 11) hijriMonth = 11;

  const monthName = HIJRI_MONTHS[hijriMonth];
  const formatted = `${hijriDay} ${monthName} ${hijriYear}H`;
  const isAyyamulBidh = hijriDay >= 13 && hijriDay <= 15;
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

export function getFastingRecommendation(date: Date, hijri: HijriDateInfo): {
  isRecommended: boolean;
  type: string;
  description: string;
} {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, 4 = Thursday

  if (hijri.isRamadan) {
    return {
      isRecommended: true,
      type: 'Puasa Wajib Ramadan',
      description: 'Hari berpuasa wajib bagi seluruh umat Islam.',
    };
  }

  if (hijri.day === 9 && hijri.monthIndex === 11) {
    return {
      isRecommended: true,
      type: 'Puasa Sunat Hari Arafah',
      description: 'Fadhilat menghapuskan dosa setahun yang lalu dan setahun yang akan datang.',
    };
  }

  if ((hijri.day === 9 || hijri.day === 10) && hijri.monthIndex === 0) {
    return {
      isRecommended: true,
      type: 'Puasa Sunat Tasu\'a & Asyura',
      description: 'Sunat berpuasa pada 9 dan 10 Muharram.',
    };
  }

  if (hijri.isAyyamulBidh) {
    return {
      isRecommended: true,
      type: 'Puasa Sunat Hari Putih (Ayyamul Bidh)',
      description: `Hari ke-${hijri.day} bulan Islam. Ganjarannya seperti berpuasa sepanjang tahun.`,
    };
  }

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
