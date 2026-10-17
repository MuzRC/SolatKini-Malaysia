import React, { useState } from 'react';
import { Moon, Sun, Check, Plus, Minus, Calendar, Sparkles, Volume2, Copy } from 'lucide-react';
import { DayPrayerTimes, JakimZone } from '../types/prayer';
import { getFastingCountdown } from '../services/prayerService';
import { formatDisplayTime } from '../utils/prayerCalculator';
import { getHijriDate, getFastingRecommendation } from '../utils/hijriCalendar';
import { DUA_COLLECTION } from '../data/wiridAndDoa';

interface FastingTrackerProps {
  prayerTimes: DayPrayerTimes;
  currentZone: JakimZone;
}

export const FastingTracker: React.FC<FastingTrackerProps> = ({ prayerTimes, currentZone }) => {
  const [currentTime] = useState<Date>(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fasting ganti storage
  const [completedGantiCount, setCompletedGantiCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('solatkini_ganti_completed') || '0');
    }
    return 0;
  });

  const [targetGantiCount, setTargetGantiCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('solatkini_ganti_target') || '7');
    }
    return 7;
  });

  const hijri = getHijriDate(currentTime);
  const recommendation = getFastingRecommendation(currentTime, hijri);

  const [isUserFastingToday, setIsUserFastingToday] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('solatkini_fasting_date');
      const savedActive = localStorage.getItem('solatkini_fasting_active');
      const today = new Date().toISOString().split('T')[0];
      return savedDate === today && savedActive === 'true';
    }
    return false;
  });

  const toggleUserFastingToday = () => {
    setIsUserFastingToday((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        const today = new Date().toISOString().split('T')[0];
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
      navigator.vibrate(100);
    }
  };

  const handleResetGanti = () => {
    if (window.confirm('Adakah anda pasti ingin menetapkan semula rekod puasa ganti?')) {
      setCompletedGantiCount(0);
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_ganti_completed', '0');
      }
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const doaBerbuka = DUA_COLLECTION.filter((d) => d.category === 'puasa');

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Top Banner Waktu Berbuka / Imsak */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-2">
              <Moon className="w-3.5 h-3.5" />
              Penunjuk Waktu Berbuka Puasa & Imsak
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isFastingActive ? fastingCountdown.title : 'Jadual Waktu Berbuka & Imsak'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Zon {currentZone.code} ({currentZone.daerah})
              {!hijri.isRamadan && !isFastingActive && ' · Bukan Bulan Ramadan (Rujukan Jadual)'}
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

        {/* Toggle Mod Berpuasa Hari Ini (Di Luar Ramadan) */}
        {!hijri.isRamadan && (
          <div className="mt-5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition active:scale-95 shrink-0 ${
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

      {/* PUASA GANTI (QADA') TRACKER WIDGET */}
      <div className="glass-panel rounded-3xl p-6 border border-white/5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Penjejak Puasa Ganti (Qada&apos;)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pantau baki bilangan hari puasa yang perlu diganti sebelum ketibaan Ramadan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sasaran:</span>
            <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-1">
              <button
                onClick={() => handleUpdateTarget(-1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 font-mono font-bold text-amber-300 text-sm">
                {targetGantiCount}
              </span>
              <button
                onClick={() => handleUpdateTarget(1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white"
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
                  {Math.max(0, targetGantiCount - completedGantiCount)} hari
                </strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleCompletedDay}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-950/40"
            >
              <Check className="w-4 h-4" />
              Tanda 1 Hari Selesai
            </button>
            {completedGantiCount > 0 && (
              <button
                onClick={handleResetGanti}
                className="px-3 py-2.5 rounded-2xl bg-slate-800 text-slate-400 hover:text-red-400 text-xs transition"
              >
                Reset
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
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
                      title="Salin Teks"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="font-arabic text-xl sm:text-2xl text-right text-emerald-200 leading-loose mb-3">
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
