import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Clock,
  Moon,
  Check,
  Layers,
  Maximize2,
  Minimize2,
  Tv,
  Smartphone
} from 'lucide-react';
import { DayPrayerTimes, JakimZone } from '../types/prayer';
import { determineNextPrayer, PRAYER_LABELS, getFastingCountdown } from '../services/prayerService';
import { formatDisplayTime } from '../utils/prayerCalculator';
import { getHijriDate } from '../utils/hijriCalendar';

interface HomeWidgetPreviewProps {
  prayerTimes: DayPrayerTimes;
  currentZone: JakimZone;
}

export const HomeWidgetPreview: React.FC<HomeWidgetPreviewProps> = ({
  prayerTimes,
  currentZone,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [activeWidgetSize, setActiveWidgetSize] = useState<'mini' | 'medium' | 'fasting'>('medium');
  const [isStandbyMode, setIsStandbyMode] = useState<boolean>(false);
  const [wakeLockSentinel, setWakeLockSentinel] = useState<any>(null);

  // Live timer for widget clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Screen Wake Lock for Standby / Desk Clock Mode
  useEffect(() => {
    let sentinel: any = null;
    const requestWakeLock = async () => {
      if (isStandbyMode && 'wakeLock' in navigator) {
        try {
          sentinel = await (navigator as any).wakeLock.request('screen');
          setWakeLockSentinel(sentinel);
        } catch (err) {
          console.warn('Wake Lock tidak disokong atau ditolak:', err);
        }
      }
    };

    if (isStandbyMode) {
      requestWakeLock();
    } else if (wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {});
      setWakeLockSentinel(null);
    }

    return () => {
      if (sentinel) sentinel.release().catch(() => {});
    };
  }, [isStandbyMode]);

  const nextPrayer = determineNextPrayer(prayerTimes, currentTime);
  const hijri = getHijriDate(currentTime);
  const isUserFastingToday = typeof window !== 'undefined' && localStorage.getItem('solatkini_fasting_active') === 'true';
  const fasting = getFastingCountdown(prayerTimes, currentTime, {
    isRamadan: hijri.isRamadan,
    isUserFasting: isUserFastingToday,
  });

  // FULL SCREEN STANDBY / DESK CLOCK MODE
  if (isStandbyMode) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050b08] text-white flex flex-col justify-between p-6 sm:p-10 select-none">
        {/* Top bar with zone and exit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">SolatKini · Jam Meja</h1>
              <p className="text-xs text-emerald-400 font-mono">
                {currentZone.code} — {currentZone.daerah}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsStandbyMode(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95"
          >
            <Minimize2 className="w-4 h-4 text-emerald-400" />
            <span>Keluar Mod Skrin Penuh</span>
          </button>
        </div>

        {/* Center Clock & Next Prayer */}
        <div className="text-center my-auto space-y-4">
          <div className="text-6xl sm:text-8xl md:text-9xl font-black font-mono tracking-tight text-emerald-400 drop-shadow-[0_0_35px_rgba(16,185,129,0.3)]">
            {currentTime.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>

          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-sm sm:text-base font-semibold">
            <Clock className="w-4 h-4 text-amber-300" />
            <span>Waktu Seterusnya: <strong>{nextPrayer.nextLabel}</strong> jam <strong>{nextPrayer.nextDisplayTime}</strong></span>
            <span className="text-amber-300 font-mono">({nextPrayer.countdownFormatted} lagi)</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-400">
            {hijri.formatted}
          </p>
        </div>

        {/* Bottom 5 Prayers Strip */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 max-w-4xl mx-auto w-full">
          {(['subuh', 'zohor', 'asar', 'maghrib', 'isyak'] as const).map((k) => {
            const isNext = nextPrayer.nextKey === k;
            return (
              <div
                key={k}
                className={`p-3 rounded-2xl text-center border transition ${
                  isNext
                    ? 'bg-emerald-600/30 border-emerald-400 shadow-lg shadow-emerald-950'
                    : 'bg-slate-900/40 border-slate-800'
                }`}
              >
                <div className="text-[11px] sm:text-xs text-slate-400 font-medium">
                  {PRAYER_LABELS[k].split(' ')[0]}
                </div>
                <div className="text-base sm:text-xl font-bold font-mono text-white mt-1">
                  {prayerTimes.times[k]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Banner Widget & Jam Meja */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase mb-2">
              <Layers className="w-3.5 h-3.5 text-amber-300" />
              Sokongan Widget Telefon & Jam Meja
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Widget Skrin Utama & Jam Meja
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Paparkan waktu solat secara masa nyata di Skrin Utama telefon atau jadikan telefon anda sebagai jam solat digital di meja.
            </p>
          </div>

          <button
            onClick={() => setIsStandbyMode(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-emerald-950/50 transition active:scale-95 shrink-0"
          >
            <Maximize2 className="w-4 h-4 text-amber-300" />
            <span>Aktifkan Mod Jam Meja (AOD)</span>
          </button>
        </div>
      </div>

      {/* Widget Size Selector Tabs */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setActiveWidgetSize('mini')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeWidgetSize === 'mini'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Widget Mini (2x2)
        </button>
        <button
          onClick={() => setActiveWidgetSize('medium')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeWidgetSize === 'medium'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Widget Jadual Penuh (4x2)
        </button>
        <button
          onClick={() => setActiveWidgetSize('fasting')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeWidgetSize === 'fasting'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Widget Berbuka Puasa
        </button>
      </div>

      {/* Smartphone Mockup Container */}
      <div className="relative mx-auto max-w-sm sm:max-w-md rounded-[42px] p-4 bg-slate-950 border-4 border-slate-800 shadow-2xl">
        {/* Phone Speaker Notch */}
        <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-4" />

        {/* Home Screen Simulated Background */}
        <div className="rounded-[32px] p-5 bg-gradient-to-b from-[#0c1c16] via-[#091510] to-[#040806] border border-white/5 min-h-[480px] flex flex-col justify-between">
          {/* Top Status Clock */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
            <span>
              {currentTime.getHours().toString().padStart(2, '0')}:
              {currentTime.getMinutes().toString().padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>

          {/* ACTIVE SIMULATED WIDGET */}
          <div className="my-auto py-2">
            {activeWidgetSize === 'mini' && (
              /* Mini 2x2 Widget */
              <div className="mx-auto w-48 h-48 rounded-3xl bg-gradient-to-br from-[#12281e] to-[#0a1711] border border-emerald-500/30 p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      SolatKini
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{currentZone.code}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">{nextPrayer.nextLabel}</div>
                  <div className="text-xl font-black text-white font-mono mt-0.5">
                    {nextPrayer.nextDisplayTime}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] text-amber-300 font-mono">
                    {nextPrayer.countdownFormatted} lagi
                  </div>
                  <div className="text-[9px] text-slate-400 truncate mt-0.5">
                    {currentZone.daerah.split(',')[0]}
                  </div>
                </div>
              </div>
            )}

            {activeWidgetSize === 'medium' && (
              /* Medium 4x2 Widget (All Prayers) */
              <div className="w-full rounded-3xl bg-gradient-to-br from-[#12281e] via-[#0d1c15] to-[#07110d] border border-emerald-500/30 p-4 shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-xs font-bold text-white tracking-tight">SolatKini Malaysia</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {currentZone.code}
                  </span>
                </div>

                {/* 5 Prayers Row */}
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {(['subuh', 'zohor', 'asar', 'maghrib', 'isyak'] as const).map((k) => {
                    const isNext = nextPrayer.nextKey === k;
                    return (
                      <div
                        key={k}
                        className={`p-1.5 rounded-xl transition ${
                          isNext
                            ? 'bg-emerald-500/25 border border-emerald-400/50'
                            : 'bg-slate-900/40'
                        }`}
                      >
                        <div className="text-[10px] text-slate-400 font-medium">{PRAYER_LABELS[k].split(' ')[0]}</div>
                        <div className="text-[11px] font-bold text-white font-mono mt-0.5">
                          {prayerTimes.times[k]}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                  <span>{hijri.formatted}</span>
                  <span className="text-amber-300 font-medium">
                    Seterusnya: {nextPrayer.nextLabel} ({nextPrayer.nextDisplayTime})
                  </span>
                </div>
              </div>
            )}

            {activeWidgetSize === 'fasting' && (
              /* Fasting Lockscreen Widget */
              <div className="w-full rounded-3xl bg-gradient-to-br from-[#1b1c12] to-[#0a110d] border border-amber-500/30 p-5 shadow-2xl space-y-3 text-center">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  <Moon className="w-3 h-3" />
                  WAKTU BERBUKA PUASA
                </div>

                <div className="text-3xl font-black text-white font-mono tracking-tight">
                  {formatDisplayTime(prayerTimes.times.maghrib)}
                </div>

                <div className="text-xs text-amber-300/90 font-mono">
                  {fasting.remainingFormatted}
                </div>

                <div className="text-[10px] text-slate-400">
                  Imsak: {formatDisplayTime(prayerTimes.times.imsak)} · Subuh: {formatDisplayTime(prayerTimes.times.subuh)}
                </div>
              </div>
            )}
          </div>

          {/* Simulated App Grid Icons */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-800/60">
            {['Solat', 'Kiblat', 'Puasa', 'Wirid'].map((app, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold shadow-lg">
                  {app[0]}
                </div>
                <span className="text-[10px] text-slate-300 mt-1">{app}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Android Widget Installation Guide Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0c1a14] via-slate-900 to-[#0c1a14] border border-emerald-500/30 p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Panduan Memasang Widget di Skrin Telefon</h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Aplikasi Android
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Widget rasmi SolatKini membolehkan anda melihat waktu solat terus tanpa perlu membuka aplikasi.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> 1. Tekan Lama Skrin
            </div>
            <p className="text-[11px] text-slate-300">
              Tekan dan tahan pada mana-mana ruang kosong di Skrin Utama (Home Screen) telefon anda.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> 2. Pilih Menu &apos;Widgets&apos;
            </div>
            <p className="text-[11px] text-slate-300">
              Ketik pada ikon <strong>Widgets</strong> yang muncul di bahagian bawah skrin pelancar anda.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> 3. Letakkan SolatKini
            </div>
            <p className="text-[11px] text-slate-300">
              Cari <strong>SolatKini</strong>, tarik widget ke skrin utama anda dan lepaskan pada saiz yang anda sukai.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
