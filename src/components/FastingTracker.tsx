import React, { useState, useEffect, useMemo } from 'react';
import {
  Moon,
  Check,
  Plus,
  Minus,
  Calendar,
  Sparkles,
  Copy,
  BarChart3,
  TrendingUp,
  Flame,
  RotateCcw,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DayPrayerTimes, JakimZone } from '../types/prayer';
import { getFastingCountdown, getLocalDateString } from '../services/prayerService';
import { formatDisplayTime } from '../utils/prayerCalculator';
import {
  getHijriDate,
  getFastingRecommendation,
  getRamadanCountdownInfo,
  getSavedHijriAdjustment,
  saveHijriAdjustment,
  parseJakimHijriString,
} from '../utils/hijriCalendar';
import { DUA_COLLECTION } from '../data/wiridAndDoa';

interface FastingTrackerProps {
  prayerTimes: DayPrayerTimes;
  currentZone: JakimZone;
}

// Custom Tooltip untuk Recharts dengan tema gelap SolatKini
const CustomChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; fill?: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 p-3 rounded-xl shadow-2xl text-xs space-y-1">
        <p className="font-bold text-emerald-300 border-b border-slate-800 pb-1 mb-1">{label}</p>
        {payload.map((entry, idx) => (
          <div key={`item-${idx}`} className="flex items-center justify-between gap-3 text-slate-200">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill || '#10b981' }}
              />
              <span>{entry.name}:</span>
            </span>
            <span className="font-mono font-bold text-white">{entry.value} Hari</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const FastingTracker: React.FC<FastingTrackerProps> = ({ prayerTimes, currentZone }) => {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmResetRamadan, setConfirmResetRamadan] = useState<boolean>(false);
  const [confirmResetGanti, setConfirmResetGanti] = useState<boolean>(false);
  const [hijriAdjustment, setHijriAdjustment] = useState<number>(() => getSavedHijriAdjustment());

  // Jam masa nyata berdetik setiap saat untuk kiraan waktu berbuka puasa
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hijri = useMemo(
    () => getHijriDate(currentTime, hijriAdjustment),
    [currentTime, hijriAdjustment]
  );
  const ramadanInfo = useMemo(
    () => getRamadanCountdownInfo(currentTime, hijriAdjustment),
    [currentTime, hijriAdjustment]
  );
  const recommendation = useMemo(
    () => getFastingRecommendation(currentTime, hijri),
    [currentTime, hijri]
  );

  const jakimOfficialHijri = useMemo(() => {
    const rawHijri = (prayerTimes as DayPrayerTimes & { hijri?: string })?.hijri;
    return parseJakimHijriString(rawHijri);
  }, [prayerTimes]);

  // Tab pilihan paparan carta: automatik pilih 'ramadan' hanya apabila bulan Ramadan sebenar aktif
  const [chartTab, setChartTab] = useState<'ramadan' | 'sunnah'>(() => {
    return getHijriDate(new Date(), getSavedHijriAdjustment()).isRamadan ? 'ramadan' : 'sunnah';
  });

  // Kemas kini tab automatik apabila bulan Ramadan bertukar atau pelarasan tarikh diubah
  useEffect(() => {
    setChartTab(hijri.isRamadan ? 'ramadan' : 'sunnah');
  }, [hijri.isRamadan]);

  const handleAdjustHijri = (delta: number) => {
    const next = delta === 0 ? 0 : hijriAdjustment + delta;
    const saved = saveHijriAdjustment(next);
    setHijriAdjustment(saved);
  };

  // Simpanan data puasa ganti
  const [completedGantiCount, setCompletedGantiCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const val = Number(localStorage.getItem('solatkini_ganti_completed') || '0');
      return isNaN(val) ? 0 : Math.max(0, val);
    }
    return 0;
  });

  const [targetGantiCount, setTargetGantiCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const val = Number(localStorage.getItem('solatkini_ganti_target') || '7');
      return isNaN(val) ? 7 : Math.max(0, val);
    }
    return 7;
  });

  // Data Puasa Sunat (Isnin/Khamis, Ayyamul Bidh, 6 Syawal/Lain)
  const [sunnahData, setSunnahData] = useState<{
    isninKhamisCompleted: number;
    isninKhamisTarget: number;
    ayyamulBidhCompleted: number;
    ayyamulBidhTarget: number;
    otherSunnahCompleted: number;
    otherSunnahTarget: number;
  }>(() => {
    const defaults = {
      isninKhamisCompleted: 0,
      isninKhamisTarget: 8,
      ayyamulBidhCompleted: 0,
      ayyamulBidhTarget: 3,
      otherSunnahCompleted: 0,
      otherSunnahTarget: 6,
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('solatkini_sunnah_fasts_v1');
      if (saved) {
        try {
          return { ...defaults, ...JSON.parse(saved) };
        } catch {}
      }
    }
    return defaults;
  });

  const ramadanStorageKey = `solatkini_ramadan_completed_days_${ramadanInfo.ramadanYearKey}`;

  // Data Puasa Ramadan diasingkan mengikut tahun Hijrah (cth. 1448H)
  const [ramadanCompletedDays, setRamadanCompletedDays] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const key = `solatkini_ramadan_completed_days_${getRamadanCountdownInfo(new Date(), getSavedHijriAdjustment()).ramadanYearKey}`;
      const saved = localStorage.getItem(key) || localStorage.getItem('solatkini_ramadan_completed_days');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ramadanStorageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setRamadanCompletedDays(parsed);
            return;
          }
        } catch {}
      }
      setRamadanCompletedDays([]);
    }
  }, [ramadanStorageKey]);

  // Simpan data sunnah bila berubah
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_sunnah_fasts_v1', JSON.stringify(sunnahData));
    }
  }, [sunnahData]);

  // Simpan data Ramadan bila berubah
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ramadanStorageKey, JSON.stringify(ramadanCompletedDays));
    }
  }, [ramadanCompletedDays, ramadanStorageKey]);

  const toggleRamadanDay = (dayNum: number) => {
    setRamadanCompletedDays((prev) => {
      const exists = prev.includes(dayNum);
      if (exists) {
        return prev.filter((d) => d !== dayNum);
      } else {
        return [...prev, dayNum].sort((a, b) => a - b);
      }
    });
  };

  const markAllPastRamadanDays = () => {
    const currentDay = hijri.isRamadan ? Math.min(30, Math.max(1, hijri.day)) : 30;
    const allDays: number[] = [];
    for (let i = 1; i <= currentDay; i++) {
      allDays.push(i);
    }
    setRamadanCompletedDays(allDays);
  };

  const resetRamadanDays = () => {
    if (!confirmResetRamadan) {
      setConfirmResetRamadan(true);
      setTimeout(() => setConfirmResetRamadan(false), 3500);
      return;
    }
    setRamadanCompletedDays([]);
    setConfirmResetRamadan(false);
  };

  const updateSunnahCount = (
    key: 'isninKhamisCompleted' | 'ayyamulBidhCompleted' | 'otherSunnahCompleted',
    delta: number
  ) => {
    setSunnahData((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  // Gunakan getLocalDateString() supaya selaras dengan PrayerDashboard.tsx dan bebas ralat UTC pada waktu Sahur/Subuh
  const [isUserFastingToday, setIsUserFastingToday] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('solatkini_fasting_date');
      const savedActive = localStorage.getItem('solatkini_fasting_active');
      const today = getLocalDateString(new Date());
      return savedDate === today && savedActive === 'true';
    }
    return false;
  });

  const toggleUserFastingToday = () => {
    setIsUserFastingToday((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        const today = getLocalDateString(new Date());
        localStorage.setItem('solatkini_fasting_date', today);
        localStorage.setItem('solatkini_fasting_active', next ? 'true' : 'false');
      }
      return next;
    });
  };

  const isFastingActive = hijri.isRamadan || isUserFastingToday;
  const fastingCountdown = getFastingCountdown(prayerTimes, currentTime, {
    isRamadan: hijri.isRamadan,
    isUserFasting: isUserFastingToday,
  });

  const handleUpdateTarget = (delta: number) => {
    const newVal = Math.max(0, targetGantiCount + delta);
    setTargetGantiCount(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_ganti_target', String(newVal));
    }
  };

  const handleToggleCompletedDay = () => {
    const newVal = completedGantiCount + 1;
    setCompletedGantiCount(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_ganti_completed', String(newVal));
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(100);
      } catch {}
    }
  };

  const handleResetGanti = () => {
    if (!confirmResetGanti) {
      setConfirmResetGanti(true);
      setTimeout(() => setConfirmResetGanti(false), 3500);
      return;
    }
    setCompletedGantiCount(0);
    setConfirmResetGanti(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_ganti_completed', '0');
    }
  };

  const handleCopyText = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const doaBerbuka = (DUA_COLLECTION || []).filter((d) => d.category === 'puasa');

  // Data carta Ramadan untuk Recharts
  const ramadanChartData = useMemo(() => {
    const w1 = ramadanCompletedDays.filter((d) => d >= 1 && d <= 7).length;
    const w2 = ramadanCompletedDays.filter((d) => d >= 8 && d <= 14).length;
    const w3 = ramadanCompletedDays.filter((d) => d >= 15 && d <= 21).length;
    const w4 = ramadanCompletedDays.filter((d) => d >= 22 && d <= 30).length;

    return [
      { name: 'Minggu 1 (H1-7)', Selesai: w1, Sasaran: 7 },
      { name: 'Minggu 2 (H8-14)', Selesai: w2, Sasaran: 7 },
      { name: 'Minggu 3 (H15-21)', Selesai: w3, Sasaran: 7 },
      { name: 'Minggu 4 (H22-30)', Selesai: w4, Sasaran: 9 },
    ];
  }, [ramadanCompletedDays]);

  const ramadanPieData = useMemo(() => {
    const done = ramadanCompletedDays.length;
    const remaining = Math.max(0, 30 - done);
    return [
      { name: 'Selesai', value: done, color: '#10b981' },
      { name: 'Baki', value: remaining, color: '#334155' },
    ];
  }, [ramadanCompletedDays]);

  // Data carta Sunnah & Qadha untuk Recharts
  const sunnahChartData = useMemo(() => {
    return [
      {
        name: 'Isnin & Khamis',
        Selesai: sunnahData.isninKhamisCompleted,
        Sasaran: sunnahData.isninKhamisTarget,
      },
      {
        name: 'Ayyamul Bidh',
        Selesai: sunnahData.ayyamulBidhCompleted,
        Sasaran: sunnahData.ayyamulBidhTarget,
      },
      {
        name: "Puasa Qada'",
        Selesai: completedGantiCount,
        Sasaran: targetGantiCount,
      },
      {
        name: 'Sunat Lain',
        Selesai: sunnahData.otherSunnahCompleted,
        Sasaran: sunnahData.otherSunnahTarget,
      },
    ];
  }, [sunnahData, completedGantiCount, targetGantiCount]);

  const sunnahPieData = useMemo(() => {
    const data = [
      { name: 'Isnin & Khamis', value: sunnahData.isninKhamisCompleted, color: '#10b981' },
      { name: 'Ayyamul Bidh', value: sunnahData.ayyamulBidhCompleted, color: '#38bdf8' },
      { name: "Puasa Qada'", value: completedGantiCount, color: '#f59e0b' },
      { name: 'Sunat Lain', value: sunnahData.otherSunnahCompleted, color: '#a855f7' },
    ].filter((item) => item.value > 0);

    if (data.length === 0) {
      return [{ name: 'Belum Ada Rekod', value: 1, color: '#334155' }];
    }
    return data;
  }, [sunnahData, completedGantiCount]);

  const ramadanPercentage = Math.round((ramadanCompletedDays.length / 30) * 100);
  const totalSunnahCompleted =
    sunnahData.isninKhamisCompleted +
    sunnahData.ayyamulBidhCompleted +
    completedGantiCount +
    sunnahData.otherSunnahCompleted;

  const estimatedRamadanFormatted = useMemo(() => {
    return ramadanInfo.estimatedRamadanStartDate.toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [ramadanInfo.estimatedRamadanStartDate]);

  // Fasa semasa berasaskan hari sebenar Ramadan (bukan bilangan petak ditanda)
  const activeRamadanPhase = useMemo(() => {
    const dayRef = hijri.isRamadan ? hijri.day : 1;
    if (dayRef <= 10) {
      return { title: '10 Malam Rahmat', subtitle: 'Fasa 1: Hari 1–10' };
    }
    if (dayRef <= 20) {
      return { title: '10 Malam Keampunan', subtitle: 'Fasa 2: Hari 11–20' };
    }
    return { title: '10 Malam Pembebasan', subtitle: 'Fasa 3: Hari 21–30' };
  }, [hijri.isRamadan, hijri.day]);

  const remainingGantiCount = Math.max(0, targetGantiCount - completedGantiCount);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 select-none">
      {/* Top Banner Waktu Berbuka / Imsak */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                <Moon className="w-3.5 h-3.5" />
                Penunjuk Waktu Berbuka Puasa & Imsak
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  hijri.isRamadan
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-slate-800/90 text-slate-300 border-slate-700'
                }`}
              >
                <Calendar className="w-3 h-3 text-amber-300" />
                {hijri.isRamadan
                  ? `Ramadan Aktif · Hari ke-${hijri.day} Ramadan ${hijri.year}H`
                  : `${hijri.formatted}${jakimOfficialHijri && jakimOfficialHijri !== hijri.formatted ? ` (JAKIM: ${jakimOfficialHijri})` : ''}`}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isFastingActive ? fastingCountdown.title : 'Jadual Waktu Berbuka & Imsak'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Zon {currentZone.code} ({currentZone.daerah})
              {!hijri.isRamadan &&
                ` · ${ramadanInfo.daysUntilNextRamadan} Hari Lagi Menuju 1 Ramadan ${ramadanInfo.nextRamadanHijriYear}H`}
            </p>

            {/* Fasting Recommendation Pill */}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-xs text-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>
                <strong>{recommendation.type}:</strong> {recommendation.description}
              </span>
            </div>
          </div>

          {/* Maghrib & Imsak Big Box */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-center">
              <div className="text-xs text-amber-300/80 font-medium">Waktu Imsak</div>
              <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1">
                {formatDisplayTime(prayerTimes.times.imsak)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Tamat Waktu Sahur</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center glow-emerald">
              <div className="text-xs text-emerald-300/80 font-medium">Waktu Berbuka</div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                {formatDisplayTime(prayerTimes.times.maghrib)}
              </div>
              <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">Azan Maghrib</div>
            </div>
          </div>
        </div>

        {/* Pelarasan Takwim Hijrah Malaysia (Rukyah / Pengisytiharan JAKIM) */}
        <div className="mt-4 px-3.5 py-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Takwim Hijrah: <strong className="text-white">{hijri.formatted}</strong>
              {hijriAdjustment !== 0 && (
                <span className="text-amber-300 font-mono ml-1">
                  ({hijriAdjustment > 0 ? `+${hijriAdjustment}` : hijriAdjustment} hari)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAdjustHijri(-1)}
              disabled={hijriAdjustment <= -2}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono text-[11px] border border-slate-700 cursor-pointer"
              title="Anjak 1 hari ke belakang mengikut rukyah"
            >
              -1 Hari
            </button>
            <button
              onClick={() => handleAdjustHijri(0)}
              className={`px-2 py-1 rounded-lg font-mono text-[11px] border cursor-pointer ${
                hijriAdjustment === 0
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Tetapkan semula kepada kiraan automatik MABIMS"
            >
              Auto
            </button>
            <button
              onClick={() => handleAdjustHijri(1)}
              disabled={hijriAdjustment >= 2}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono text-[11px] border border-slate-700 cursor-pointer"
              title="Anjak 1 hari ke hadapan mengikut rukyah"
            >
              +1 Hari
            </button>
          </div>
        </div>

        {/* Toggle Mod Berpuasa Hari Ini (Di Luar Ramadan) */}
        {!hijri.isRamadan && (
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Status Berpuasa Hari Ini:</span>
                {isUserFastingToday ? (
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
                    Sedang Berpuasa
                  </span>
                ) : (
                  <span className="text-[11px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
                    Tidak Berpuasa
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Aktifkan suis ini jika anda sedang menunaikan puasa sunat (Isnin/Khamis/Hari Putih) atau puasa ganti.
              </p>
            </div>
            <button
              onClick={toggleUserFastingToday}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition active:scale-95 shrink-0 cursor-pointer ${
                isUserFastingToday
                  ? 'bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
              }`}
            >
              {isUserFastingToday ? 'Nyahaktifkan Mod Puasa' : 'Saya Sedang Berpuasa Hari Ini'}
            </button>
          </div>
        )}

        {/* Progress Bar for Fasting */}
        {isFastingActive && (
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
              <span>Mula: Subuh ({formatDisplayTime(prayerTimes.times.subuh)})</span>
              <span className="font-mono font-bold text-emerald-400">
                {fastingCountdown.remainingFormatted}
              </span>
              <span>Berbuka: Maghrib ({formatDisplayTime(prayerTimes.times.maghrib)})</span>
            </div>

            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${fastingCountdown.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CARTA KEMAJUAN & RINGKASAN PUASA (RECHARTS) */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 shadow-xl relative overflow-hidden">
        {/* Header Seksyen Carta & Tab Penukar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold mb-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Carta Kemajuan Visual
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Ringkasan Kemajuan Puasa
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {hijri.isRamadan
                ? `Bulan Ramadan ${hijri.year}H sedang berlangsung (Hari ke-${hijri.day} daripada 30 hari)`
                : `Mod Luar Ramadan (${hijri.monthName} ${hijri.year}H) · Paparan automatik Puasa Sunat & Qadha`}
            </p>
          </div>

          {/* Tab Switcher: Susun tab aktif mengikut bulan Hijrah sebenar */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800 shrink-0">
            {hijri.isRamadan ? (
              <>
                <button
                  onClick={() => setChartTab('ramadan')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    chartTab === 'ramadan'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Puasa Ramadan</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono">
                    {ramadanCompletedDays.length}/30
                  </span>
                </button>
                <button
                  onClick={() => setChartTab('sunnah')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    chartTab === 'sunnah'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Puasa Sunat & Qadha</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono">
                    {totalSunnahCompleted} Hari
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setChartTab('sunnah')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    chartTab === 'sunnah'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Puasa Sunat & Qadha</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono">
                    {totalSunnahCompleted} Hari
                  </span>
                </button>
                <button
                  onClick={() => setChartTab('ramadan')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    chartTab === 'ramadan'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Ramadan {ramadanInfo.nextRamadanHijriYear}H</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 font-mono">
                    -{ramadanInfo.daysUntilNextRamadan}h
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* KANDUNGAN TAB 1: PUASA RAMADAN */}
        {chartTab === 'ramadan' && (
          <div className="mt-5 space-y-6">
            {/* Banner Status Khas Apabila Di Luar Bulan Ramadan */}
            {!hijri.isRamadan && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-emerald-950/50 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    <Clock className="w-3.5 h-3.5" />
                    Belum Masuk Bulan Ramadan (Sekarang: {hijri.formatted})
                  </div>
                  <h4 className="text-base sm:text-lg font-extrabold text-white">
                    {ramadanInfo.daysUntilNextRamadan} Hari Lagi Menuju 1 Ramadan {ramadanInfo.nextRamadanHijriYear}H
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Anggaran mula berpuasa pada <strong className="text-emerald-300">{estimatedRamadanFormatted}</strong> (tertakluk kepada pengisytiharan rasmi JAKIM).
                    {remainingGantiCount > 0 && (
                      <>
                        {' '}Anda masih mempunyai baki <strong className="text-amber-300">{remainingGantiCount} hari</strong> puasa ganti (Qada&apos;) yang disarankan selesai sebelum Ramadan tiba.
                      </>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => setChartTab('sunnah')}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition active:scale-95 cursor-pointer shadow-md"
                >
                  Ke Puasa Sunat &amp; Qadha
                </button>
              </div>
            )}

            {/* Ringkasan Kad Statistik Ramadan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Selesai Berpuasa</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5">
                  {ramadanCompletedDays.length}{' '}
                  <span className="text-xs text-slate-400 font-sans font-normal">/ 30 Hari</span>
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-0.5 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Tahun {ramadanInfo.ramadanYearKey}H
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">
                  {hijri.isRamadan ? 'Baki Hingga Syawal' : 'Menuju 1 Ramadan'}
                </span>
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-0.5">
                  {hijri.isRamadan
                    ? ramadanInfo.daysRemainingInRamadan
                    : ramadanInfo.daysUntilNextRamadan}{' '}
                  <span className="text-xs text-slate-400 font-sans font-normal">Hari</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {hijri.isRamadan ? 'Hingga 1 Syawal' : estimatedRamadanFormatted}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Kadar Kejayaan</span>
                <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
                  {ramadanPercentage}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  {hijri.isRamadan ? `Hari ke-${hijri.day} Ramadan` : 'Sasaran 100%'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">
                  {hijri.isRamadan ? 'Fasa Semasa' : 'Status Takwim'}
                </span>
                <div className="text-sm font-bold text-amber-300 truncate mt-1">
                  {hijri.isRamadan ? activeRamadanPhase.title : `Menanti Ramadan ${ramadanInfo.nextRamadanHijriYear}H`}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {hijri.isRamadan ? activeRamadanPhase.subtitle : `Bulan ${hijri.monthName}`}
                </div>
              </div>
            </div>

            {/* Carta Recharts: Bar Chart Mingguan + Donut Ring Peratusan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {/* Carta Bar Kemajuan Mengikut 4 Fasa / Minggu */}
              <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 min-w-0 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                    Pencapaian Mingguan Ramadan {ramadanInfo.ramadanYearKey}H
                  </span>
                  <span className="text-[10px] text-slate-400">Sasaran vs Selesai</span>
                </div>
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ramadanChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickLine={false}
                        domain={[0, 10]}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                        iconType="circle"
                      />
                      <Bar
                        dataKey="Selesai"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        name="Hari Selesai"
                      />
                      <Bar
                        dataKey="Sasaran"
                        fill="#475569"
                        radius={[6, 6, 0, 0]}
                        name="Sasaran Hari"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Carta Gelang Donut (Recharts PieChart) */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 min-w-0 flex flex-col justify-between items-center text-center">
                <div className="w-full flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">Kadar Keseluruhan</span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {ramadanCompletedDays.length}/30
                  </span>
                </div>

                <div className="relative w-full h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomChartTooltip />} />
                      <Pie
                        data={ramadanPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {ramadanPieData.map((entry, index) => (
                          <Cell key={`ramadan-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Teks di tengah gelang donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-white font-mono leading-none">
                      {ramadanPercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                      Selesai
                    </span>
                  </div>
                </div>

                <div className="w-full flex items-center justify-around text-[11px] pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Selesai ({ramadanCompletedDays.length})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                    <span>Baki ({Math.max(0, 30 - ramadanCompletedDays.length)})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Interaktif 30 Hari Puasa Ramadan */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {hijri.isRamadan
                      ? `Kalendar Semakan Harian Ramadan ${hijri.year}H (Hari Ini: Hari ke-${hijri.day})`
                      : `Perancangan Kalendar Ramadan ${ramadanInfo.nextRamadanHijriYear}H (30 Hari)`}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Ketik mana-mana nombor hari untuk menandakan puasa selesai atau belum
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {hijri.isRamadan && (
                    <button
                      onClick={markAllPastRamadanDays}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[11px] font-medium transition cursor-pointer"
                    >
                      Tanda Hingga Hari ke-{hijri.day}
                    </button>
                  )}
                  {ramadanCompletedDays.length > 0 && (
                    <button
                      onClick={resetRamadanDays}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                        confirmResetRamadan
                          ? 'bg-red-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-red-400'
                      }`}
                      title="Tetapkan Semula Rekod Ramadan"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {confirmResetRamadan && <span>Sahkan Reset?</span>}
                    </button>
                  )}
                </div>
              </div>

              {/* Grid 30 Petak Hari */}
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((dayNum) => {
                  const isDone = ramadanCompletedDays.includes(dayNum);
                  const isTodayRamadan = hijri.isRamadan && hijri.day === dayNum;
                  return (
                    <button
                      key={`day-${dayNum}`}
                      onClick={() => toggleRamadanDay(dayNum)}
                      className={`h-9 rounded-xl flex flex-col items-center justify-center text-xs font-mono font-bold transition active:scale-90 cursor-pointer ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60 border border-emerald-400/50'
                          : isTodayRamadan
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400 ring-1 ring-amber-400/50'
                          : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 border border-slate-700/50'
                      }`}
                      title={`Hari ke-${dayNum} Ramadan${isTodayRamadan ? ' (Hari Ini)' : ''} - ${
                        isDone ? 'Selesai' : 'Belum Selesai'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {isDone && <Check className="w-2.5 h-2.5 text-emerald-200 -mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* KANDUNGAN TAB 2: PUASA SUNAT & QADHA */}
        {chartTab === 'sunnah' && (
          <div className="mt-5 space-y-6">
            {/* Ringkasan Kad Statistik Puasa Sunat & Qadha */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Isnin & Khamis</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5">
                  {sunnahData.isninKhamisCompleted}{' '}
                  <span className="text-xs text-slate-400 font-sans font-normal">
                    / {sunnahData.isninKhamisTarget} Hari
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-0.5">Amalan Mingguan</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Ayyamul Bidh</span>
                <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono mt-0.5">
                  {sunnahData.ayyamulBidhCompleted}{' '}
                  <span className="text-xs text-slate-400 font-sans font-normal">
                    / {sunnahData.ayyamulBidhTarget} Hari
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">13, 14, 15 Bulan Hijri</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Puasa Qada&apos;</span>
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-0.5">
                  {completedGantiCount}{' '}
                  <span className="text-xs text-slate-400 font-sans font-normal">
                    / {targetGantiCount} Hari
                  </span>
                </div>
                <div className="text-[10px] text-amber-300/80 mt-0.5">Kewajipan Ganti</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Sunat-Sunat Lain</span>
                <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono mt-0.5">
                  {sunnahData.otherSunnahCompleted}{' '}
                  <span className="text-xs text-slate-400 font-sans font-normal">
                    / {sunnahData.otherSunnahTarget} Hari
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">6 Syawal / Asyura / dsb</div>
              </div>
            </div>

            {/* Carta Recharts: Bar Chart Kategori + Donut Ring Pembahagian */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {/* Carta Bar Kategori Puasa Sunat */}
              <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 min-w-0 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                    Pencapaian Mengikut Kategori Puasa
                  </span>
                  <span className="text-[10px] text-slate-400">Selesai vs Sasaran</span>
                </div>
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sunnahChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                        iconType="circle"
                      />
                      <Bar
                        dataKey="Selesai"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        name="Hari Selesai"
                      />
                      <Bar
                        dataKey="Sasaran"
                        fill="#f59e0b"
                        radius={[6, 6, 0, 0]}
                        name="Sasaran Hari"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donut Ring Taburan Puasa Sunat */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 min-w-0 flex flex-col justify-between items-center text-center">
                <div className="w-full flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">Taburan Jenis Puasa</span>
                  <span className="text-[10px] font-mono text-amber-300">
                    {totalSunnahCompleted} Hari
                  </span>
                </div>

                <div className="relative w-full h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomChartTooltip />} />
                      <Pie
                        data={sunnahPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sunnahPieData.map((entry, index) => (
                          <Cell key={`sunnah-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-amber-300 font-mono leading-none">
                      {totalSunnahCompleted}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                      Hari Selesai
                    </span>
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-1 text-[10px] pt-1 border-t border-slate-800/80 text-left">
                  <div className="flex items-center gap-1.5 text-emerald-300 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Isnin/Khamis ({sunnahData.isninKhamisCompleted})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sky-300 truncate">
                    <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                    <span>Hari Putih ({sunnahData.ayyamulBidhCompleted})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>Qada&apos; ({completedGantiCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-300 truncate">
                    <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                    <span>Lain-lain ({sunnahData.otherSunnahCompleted})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kawalan Log Pantas Puasa Sunat */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Catat & Kemas Kini Rekod Puasa Sunat
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Isnin & Khamis */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Isnin & Khamis</div>
                    <div className="text-lg font-mono font-bold text-emerald-400">
                      {sunnahData.isninKhamisCompleted} / {sunnahData.isninKhamisTarget}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateSunnahCount('isninKhamisCompleted', -1)}
                      className="w-7 h-7 rounded-lg bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateSunnahCount('isninKhamisCompleted', 1)}
                      className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center text-xs cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Ayyamul Bidh */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Ayyamul Bidh</div>
                    <div className="text-lg font-mono font-bold text-sky-400">
                      {sunnahData.ayyamulBidhCompleted} / {sunnahData.ayyamulBidhTarget}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateSunnahCount('ayyamulBidhCompleted', -1)}
                      className="w-7 h-7 rounded-lg bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateSunnahCount('ayyamulBidhCompleted', 1)}
                      className="w-7 h-7 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center text-xs cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Puasa Qada' (diselaraskan terus dengan completedGantiCount) */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Puasa Qada&apos;</div>
                    <div className="text-lg font-mono font-bold text-amber-300">
                      {completedGantiCount} / {targetGantiCount}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const newVal = Math.max(0, completedGantiCount - 1);
                        setCompletedGantiCount(newVal);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('solatkini_ganti_completed', String(newVal));
                        }
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleToggleCompletedDay}
                      className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center text-xs cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sunat Lain */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Sunat Lain</div>
                    <div className="text-lg font-mono font-bold text-purple-400">
                      {sunnahData.otherSunnahCompleted} / {sunnahData.otherSunnahTarget}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateSunnahCount('otherSunnahCompleted', -1)}
                      className="w-7 h-7 rounded-lg bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateSunnahCount('otherSunnahCompleted', 1)}
                      className="w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center text-xs cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PUASA GANTI (QADA') TRACKER WIDGET */}
      <div className="glass-panel rounded-3xl p-6 border border-white/5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Penjejak Puasa Ganti (Qada&apos;)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pantau baki bilangan hari puasa yang perlu diganti sebelum ketibaan Ramadan {ramadanInfo.nextRamadanHijriYear}H
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sasaran:</span>
            <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-1">
              <button
                onClick={() => handleUpdateTarget(-1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 font-mono font-bold text-amber-300 text-sm">
                {targetGantiCount}
              </span>
              <button
                onClick={() => handleUpdateTarget(1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="text-center sm:text-left">
              <div className="text-3xl font-black text-white font-mono">
                {completedGantiCount} / {targetGantiCount}{' '}
                <span className="text-xs text-slate-400 font-sans">Hari Selesai</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Baki yang tinggal:{' '}
                <strong className="text-amber-300 font-mono">
                  {remainingGantiCount} hari
                </strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleCompletedDay}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Tanda 1 Hari Selesai
            </button>
            {completedGantiCount > 0 && (
              <button
                onClick={handleResetGanti}
                className={`px-3 py-2.5 rounded-2xl text-xs transition cursor-pointer ${
                  confirmResetGanti
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-red-400'
                }`}
              >
                {confirmResetGanti ? 'Sahkan Reset?' : 'Reset'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LAFAZ NIAT & DOA BERBUKA CARDS */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2 px-1">
          <Moon className="w-5 h-5 text-emerald-400" />
          Koleksi Niat Puasa & Doa Berbuka
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doaBerbuka.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      {item.title}
                    </span>
                    <button
                      onClick={() => handleCopyText(item.id, `${item.arabic}\n\n${item.translation}`)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Salin Teks"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="font-arabic text-xl sm:text-2xl text-right text-emerald-200 leading-loose mb-3" dir="rtl">
                    {item.arabic}
                  </p>

                  <p className="text-xs text-slate-300 italic mb-2 leading-relaxed">
                    &quot;{item.transliteration}&quot;
                  </p>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>Terjemahan:</strong> {item.translation}
                  </p>
                </div>

                {item.reference && (
                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400/80">
                    Rujukan: {item.reference}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
