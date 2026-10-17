import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Sparkles,
  Download,
  Share2,
  Clock,
  Moon,
  Sun,
  MapPin,
  Check,
  ChevronRight,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { DayPrayerTimes, JakimZone } from '../types/prayer';
import { determineNextPrayer, PRAYER_LABELS, PRAYER_KEYS_ORDER, getFastingCountdown } from '../services/prayerService';
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
  const [currentTime] = useState<Date>(new Date());
  const [activeWidgetSize, setActiveWidgetSize] = useState<'mini' | 'medium' | 'fasting'>('medium');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check standalone mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    } else {
      // Show iOS Safari guidance
      setShowIOSModal(true);
    }
  };

  const nextPrayer = determineNextPrayer(prayerTimes, currentTime);
  const hijri = getHijriDate(currentTime);
  const isUserFastingToday = typeof window !== 'undefined' && localStorage.getItem('solatkini_fasting_active') === 'true';
  const fasting = getFastingCountdown(prayerTimes, currentTime, {
    isRamadan: hijri.isRamadan,
    isUserFasting: isUserFastingToday,
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Banner PWA & Widget */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase mb-2">
              <Layers className="w-3.5 h-3.5 text-amber-300" />
              Sokongan Widget & PWA
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Widget Skrin Utama Telefon
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Pasang SolatKini sebagai aplikasi terus pada skrin utama telefon anda untuk widget interaktif
            </p>
          </div>

          <button
            onClick={handleInstallClick}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-emerald-950/50 transition active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            {isInstalled ? 'Aplikasi Sudah Dipasang' : 'Pasang ke Skrin Utama'}
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

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#0f1a16] border border-emerald-500/30 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              Pasang pada iPhone / iPad
            </h3>
            <div className="mt-3 space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <p>
                1. Tekan ikon <strong>Kongsi (Share / <Share2 className="w-3.5 h-3.5 inline text-emerald-400" />)</strong> di bar bawah pelayar Safari.
              </p>
              <p>
                2. Skrol ke bawah dan pilih <strong>&quot;Add to Home Screen&quot; (Tambah ke Skrin Utama)</strong>.
              </p>
              <p>
                3. Tekan <strong>Add</strong> di sudut atas kanan. SolatKini kini sedia beroperasi seperti aplikasi native.
              </p>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
            >
              Faham
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
