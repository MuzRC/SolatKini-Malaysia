import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, Sparkles, Check, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import { WIRID_LIST } from '../data/wiridAndDoa';
import { audioNotificationService } from '../services/audioNotificationService';

export const TasbihWirid: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'tasbih' | 'wirid'>('tasbih');
  const [count, setCount] = useState<number>(0);
  const [targetCount, setTargetCount] = useState<number>(33);
  const [lapCount, setLapCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);
  const [activeWiridStep, setActiveWiridStep] = useState<number>(0);

  // Digital Tasbih Tap
  const handleTap = () => {
    const nextCount = count + 1;
    setCount(nextCount);

    if (soundEnabled) {
      audioNotificationService.playTasbihClick();
    }

    // Haptic feedback
    if (vibrateEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (targetCount > 0 && nextCount % targetCount === 0) {
        // Double pulse on lap completion
        navigator.vibrate([80, 40, 120]);
      } else {
        navigator.vibrate(35);
      }
    }

    // Check lap completion
    if (targetCount > 0 && nextCount >= targetCount) {
      setLapCount((prev) => prev + 1);
      setCount(0);
    }
  };

  const handleReset = () => {
    setCount(0);
  };

  const handleResetAll = () => {
    if (window.confirm('Tetapkan semula kiraan dan pusingan tasbih?')) {
      setCount(0);
      setLapCount(0);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Switcher Tab: Tasbih Digital vs Panduan Wirid */}
      <div className="flex items-center justify-center">
        <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1">
          <button
            onClick={() => setActiveSection('tasbih')}
            className={`min-h-[44px] px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeSection === 'tasbih'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Kaunter Tasbih Digital
          </button>
          <button
            onClick={() => setActiveSection('wirid')}
            className={`min-h-[44px] px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeSection === 'wirid'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Wirid Selepas Solat Fardhu
          </button>
        </div>
      </div>

      {activeSection === 'tasbih' ? (
        /* DIGITAL TASBIH INTERFACE */
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/20 text-center shadow-2xl relative overflow-hidden">
            {/* Target Selector & Sound Controls */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                {[33, 99, 0].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTargetCount(t);
                      setCount(0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      targetCount === t
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {t === 0 ? 'Bebas' : `${t} Kali`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-xl border transition ${
                    soundEnabled
                      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                  title={soundEnabled ? 'Bunyi Aktif' : 'Bunyi Senyap'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  onClick={handleResetAll}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition"
                  title="Reset Pusingan"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lap Counter badge */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400 font-mono">
              <span>
                Pusingan Selesai:{' '}
                <strong className="text-amber-300 font-bold">{lapCount}</strong>
              </span>
              <span>·</span>
              <span>
                Sasaran:{' '}
                <strong className="text-emerald-400 font-bold">
                  {targetCount === 0 ? 'Bebas' : targetCount}
                </strong>
              </span>
            </div>

            {/* Giant Circular Tactile Tap Button */}
            <div className="my-8 flex justify-center">
              <button
                onClick={handleTap}
                className="relative group w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-br from-[#12241d] to-[#07110d] border-4 border-emerald-500/30 hover:border-emerald-400/60 shadow-2xl shadow-emerald-950/70 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 focus:outline-none select-none"
              >
                {/* Subtle ripple rings */}
                <div className="absolute inset-3 rounded-full border border-emerald-500/10 pointer-events-none" />
                <div className="absolute inset-7 rounded-full border border-dashed border-emerald-500/20 pointer-events-none" />

                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
                  Ketik Disini
                </span>
                <span className="text-6xl sm:text-7xl font-black text-white font-mono tracking-tighter tabular-nums drop-shadow-md">
                  {count}
                </span>
                <span className="text-xs text-slate-400 mt-2 font-medium">
                  {targetCount > 0 ? `Baki: ${Math.max(0, targetCount - count)}` : 'Jumlah Zikir'}
                </span>
              </button>
            </div>

            {/* Quick reset count */}
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 transition"
            >
              Reset Kiraan Semasa ke 0
            </button>
          </div>

          {/* Quick Zikir Suggestion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: 'Subhanallah', arabic: 'سُبْحَانَ اللهِ', count: '33x' },
              { title: 'Alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', count: '33x' },
              { title: 'Allahu Akbar', arabic: 'اللهُ أَكْبَرُ', count: '33x' },
            ].map((z, i) => (
              <div
                key={i}
                className="glass-card p-4 rounded-2xl text-center border border-white/5"
              >
                <div className="font-arabic text-2xl text-emerald-300 mb-1">{z.arabic}</div>
                <div className="text-xs font-semibold text-white">{z.title}</div>
                <div className="text-[11px] text-amber-300 font-mono mt-0.5">{z.count}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* STEP-BY-STEP WIRID GUIDE INTERFACE */
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-5 border border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Wirid Lengkap Selepas Solat Fardhu
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Amalan sunnah mengikut susunan mu&apos;tamad para ulama nusantara
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              {WIRID_LIST.length} Bahagian
            </span>
          </div>

          <div className="space-y-3">
            {WIRID_LIST.map((item, idx) => (
              <div
                key={item.id}
                className="glass-card rounded-2xl p-5 border border-white/5 hover:border-emerald-500/20 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono flex items-center justify-center">
                      {item.order}
                    </span>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    {item.targetCount}x
                  </span>
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

                {item.note && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-emerald-400/90">
                    {item.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
