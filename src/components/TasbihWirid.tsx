import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Play,
  Pause,
  Eye,
  EyeOff,
  ChevronDown,
  Sparkles,
  Fingerprint
} from 'lucide-react';
import { WIRID_LIST, TASBIH_LIST } from '../data/wiridAndDoa';
import { audioNotificationService } from '../services/audioNotificationService';
import { ArabicQuranText } from './QuranAyahBadge';

type FontSize = 'normal' | 'large' | 'xlarge' | '4xl';

export const TasbihWirid: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'tasbih' | 'wirid'>('tasbih');
  const [count, setCount] = useState<number>(0);
  const [targetCount, setTargetCount] = useState<number>(33);
  const [lapCount, setLapCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);

  // Mod Sentuhan Bebas (Free Touch)
  const [freeTouchEnabled, setFreeTouchEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('solatkini_tasbih_free_touch') === 'true';
    }
    return false;
  });

  const toggleFreeTouch = () => {
    setFreeTouchEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_tasbih_free_touch', String(next));
      }
      return next;
    });
  };

  // State pilihan tasbih daripada senarai luar (wiridAndDoa.ts)
  const [selectedTasbihId, setSelectedTasbihId] = useState<string>('tasbih');
  const activeTasbih = TASBIH_LIST.find((t) => t.id === selectedTasbihId) || TASBIH_LIST[0];

  const handleSelectTasbih = (id: string) => {
    setSelectedTasbihId(id);
    setCount(0);
    setLapCount(0);
    const item = TASBIH_LIST.find((t) => t.id === id);
    if (item) {
      setTargetCount(item.defaultTarget);
    }
  };

  // Saiz Tulisan
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('solatkini_wirid_font_size') as FontSize;
      if (saved === 'normal' || saved === 'large' || saved === 'xlarge' || saved === '4xl') return saved;
    }
    return 'large';
  });

  const handleSetFontSize = (s: FontSize) => {
    setFontSize(s);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_wirid_font_size', s);
    }
  };

  // Kawalan Collapse / Expand (Jawi, Rumi, Maksud)
  const [showArabic, setShowArabic] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('solatkini_wirid_show_arabic');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [showRumi, setShowRumi] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('solatkini_wirid_show_rumi');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [showTranslation, setShowTranslation] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('solatkini_wirid_show_translation');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const toggleArabic = () => {
    setShowArabic((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') localStorage.setItem('solatkini_wirid_show_arabic', String(next));
      return next;
    });
  };

  const toggleRumi = () => {
    setShowRumi((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') localStorage.setItem('solatkini_wirid_show_rumi', String(next));
      return next;
    });
  };

  const toggleTranslation = () => {
    setShowTranslation((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') localStorage.setItem('solatkini_wirid_show_translation', String(next));
      return next;
    });
  };

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    setPlayingAudioId(null);
  };

  const handleToggleAudio = (item: { id: string; audioUrl?: string; title: string }) => {
    if (!item.audioUrl) return;

    if (playingAudioId === item.id) {
      stopCurrentAudio();
      return;
    }

    stopCurrentAudio();

    const audio = new Audio(item.audioUrl);
    audioRef.current = audio;
    setPlayingAudioId(item.id);

    audio.onended = () => {
      setPlayingAudioId(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setPlayingAudioId(null);
      audioRef.current = null;
    };

    audio.play().catch(() => {
      setPlayingAudioId(null);
      audioRef.current = null;
    });
  };

  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [activeSection]);

  // Digital Tasbih Tap (Menguruskan kiraan, audio klik & getaran)
  const handleTap = () => {
    const nextCount = count + 1;
    setCount(nextCount);

    if (soundEnabled) {
      audioNotificationService.playTasbihClick();
    }

    if (vibrateEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (targetCount > 0 && nextCount % targetCount === 0) {
          navigator.vibrate([80, 40, 120]);
        } else {
          navigator.vibrate(35);
        }
      } catch {}
    }

    if (targetCount > 0 && nextCount >= targetCount) {
      setLapCount((prev) => prev + 1);
      setCount(0);
    }
  };

  const handleReset = () => setCount(0);

  const handleResetAll = () => {
    if (window.confirm('Tetapkan semula kiraan dan pusingan tasbih?')) {
      setCount(0);
      setLapCount(0);
    }
  };

  const fontStyles = {
    normal: {
      arabic: 'text-lg sm:text-xl leading-relaxed',
      rumi: 'text-xs sm:text-sm',
      translation: 'text-xs sm:text-sm',
    },
    large: {
      arabic: 'text-xl sm:text-2xl leading-loose',
      rumi: 'text-sm sm:text-base',
      translation: 'text-sm sm:text-base',
    },
    xlarge: {
      arabic: 'text-2xl sm:text-3xl leading-loose',
      rumi: 'text-base sm:text-lg',
      translation: 'text-base sm:text-lg',
    },
    '4xl': {
      arabic: 'text-3xl sm:text-4xl leading-loose',
      rumi: 'text-lg sm:text-xl',
      translation: 'text-lg sm:text-xl',
    },
  }[fontSize];

  // Senarai butang sasaran pantas
  const availableTargets = Array.from(
    new Set([33, 99, 100, activeTasbih?.defaultTarget || 0, 0])
  ).sort((a, b) => (a === 0 ? 1 : b === 0 ? -1 : a - b));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 select-none">
      {/* Switcher Tab: Tasbih Digital vs Panduan Wirid */}
      <div className="flex items-center justify-center">
        <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSection('tasbih')}
            className={`min-h-[44px] px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeSection === 'tasbih'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Kaunter Tasbih Digital
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('wirid')}
            className={`min-h-[44px] px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
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
        <div className="space-y-4">
          {/* KAD ATAS: PEMILIH TASBIH + ZON SENTUHAN BEBAS (FREE TOUCH) */}
          <div
            onClick={() => {
              if (freeTouchEnabled) {
                handleTap();
              }
            }}
            className={`glass-panel rounded-3xl p-4 sm:p-5 border transition-all duration-150 select-none ${
              freeTouchEnabled
                ? 'border-emerald-400/50 bg-emerald-950/20 shadow-emerald-950/50 cursor-pointer active:scale-[0.99] active:bg-emerald-950/40 touch-manipulation'
                : 'border-emerald-500/20 bg-slate-900/60'
            } shadow-xl space-y-3 relative`}
          >
            {/* Header: Label Pilihan & Suis Togol Free Touch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Pilih Zikir / Amalan Tasbih:
              </label>

              {/* Butang Togol Sentuhan Bebas (Hentikan Event Propagation agar tidak ter-kira semasa klik butang) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 self-end sm:self-auto bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800"
              >
                <Fingerprint
                  className={`w-3.5 h-3.5 transition-colors ${
                    freeTouchEnabled ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                />
                <span className="text-[11px] font-medium text-slate-300">
                  Sentuhan Bebas
                </span>
                <button
                  type="button"
                  onClick={toggleFreeTouch}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    freeTouchEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  title={freeTouchEnabled ? 'Nyahaktifkan Sentuhan Bebas' : 'Aktifkan Sentuhan Bebas'}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      freeTouchEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Dropdown Pemilih (Hentikan Event Propagation agar tidak ter-kira semasa memilih zikir) */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <select
                value={selectedTasbihId}
                onChange={(e) => handleSelectTasbih(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 text-xs sm:text-sm font-medium rounded-xl px-3 py-2 pr-9 border border-emerald-500/30 focus:border-emerald-400 focus:outline-none appearance-none cursor-pointer"
              >
                {TASBIH_LIST.map((item) => (
                  <option key={item.id} value={item.id} className="bg-slate-900 text-slate-100 py-1">
                    {item.name} {item.defaultTarget > 0 ? `(${item.defaultTarget}x)` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Kad Bacaan Zikir Semasa (Bila Free Touch ON, kawasan ini boleh diketik terus) */}
            <div className="pt-2 text-center space-y-2">
              <ArabicQuranText
                text={activeTasbih.arabic}
                className="font-arabic text-2xl sm:text-3xl text-emerald-300 font-bold leading-relaxed block text-center"
              />
              <p className="text-xs sm:text-sm text-slate-300 italic font-medium">
                &quot;{activeTasbih.transliteration}&quot;
              </p>
              <p className="text-[11px] sm:text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
                {activeTasbih.translation}
              </p>

              {/* Paparan Fadilat Zikir */}
              {activeTasbih.fadilat && (
                <div className="mt-3 text-left bg-emerald-950/40 border border-emerald-500/25 rounded-2xl p-3 flex items-start gap-2.5 shadow-inner">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] sm:text-xs text-emerald-100/90 leading-relaxed">
                    <strong className="text-amber-300 font-semibold uppercase tracking-wider block sm:inline mr-1">
                      Fadilat & Kelebihan:
                    </strong>
                    {activeTasbih.fadilat}
                  </p>
                </div>
              )}

              {/* Lencana Kiraan Semasa Bila Sentuhan Bebas Aktif (Pengguna tak perlu scroll bawah untuk pantau kiraan) */}
              {freeTouchEnabled && (
                <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-xs px-3 py-2 rounded-2xl bg-emerald-900/30 border text-emerald-300 animate-in fade-in duration-200">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Ketik mana-mana pada kad ini
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    Kiraan: <strong className="text-base text-white">{count}</strong>
                    {targetCount > 0 ? ` / ${targetCount}` : ' (Bebas)'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* KAUNTER TASBIH INTERFACE ASAL DI BAWAH */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/20 text-center shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                {availableTargets.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTargetCount(t);
                      setCount(0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      targetCount === t
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/50'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {t === 0 ? 'Bebas' : `${t} Kali`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    soundEnabled
                      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                  title={soundEnabled ? 'Bunyi Aktif' : 'Bunyi Senyap'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleResetAll}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition cursor-pointer"
                  title="Reset Pusingan"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400 font-mono">
              <span>
                Pusingan Selesai: <strong className="text-amber-300 font-bold">{lapCount}</strong>
              </span>
              <span>·</span>
              <span>
                Sasaran: <strong className="text-emerald-400 font-bold">{targetCount === 0 ? 'Bebas' : targetCount}</strong>
              </span>
            </div>

            {/* Bulatan Ketik - Dioptimumkan dengan touch-manipulation */}
            <div className="my-8 flex justify-center">
              <button
                type="button"
                onClick={handleTap}
                className="relative group w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-br from-[#12241d] to-[#07110d] border-4 border-emerald-500/30 hover:border-emerald-400/60 shadow-2xl shadow-emerald-950/70 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 focus:outline-none select-none cursor-pointer touch-manipulation"
              >
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

            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 transition cursor-pointer"
            >
              Reset Kiraan Semasa ke 0
            </button>
          </div>
        </div>
      ) : (
        /* STEP-BY-STEP WIRID GUIDE INTERFACE */
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-5 border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  Wirid Lengkap Selepas Solat Fardhu
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Amalan sunnah mengikut susunan mu&apos;tamad para ulama nusantara
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 self-start sm:self-center">
                {WIRID_LIST.length} Bahagian
              </span>
            </div>

            {/* Toolbar Kawalan Saiz & Togol Paparan */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 px-1.5 font-medium">Saiz:</span>
                {(['normal', 'large', 'xlarge', '4xl'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSetFontSize(s)}
                    title={s === '4xl' ? 'Saiz Ekstra 4XL' : undefined}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                      fontSize === s
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s === 'normal' ? 'A' : s === 'large' ? 'A+' : s === 'xlarge' ? 'A++' : 'A+++'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={toggleArabic}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                    showArabic
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300 bg-slate-800/40'
                  }`}
                  title={showArabic ? 'Sorokkan teks Arab' : 'Tunjukkan teks Arab'}
                >
                  {showArabic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>Jawi</span>
                </button>

                <button
                  type="button"
                  onClick={toggleRumi}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                    showRumi
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300 bg-slate-800/40'
                  }`}
                  title={showRumi ? 'Sorokkan teks Rumi' : 'Tunjukkan teks Rumi'}
                >
                  {showRumi ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>Rumi</span>
                </button>

                <button
                  type="button"
                  onClick={toggleTranslation}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                    showTranslation
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300 bg-slate-800/40'
                  }`}
                  title={showTranslation ? 'Sorokkan Terjemahan' : 'Tunjukkan Terjemahan'}
                >
                  {showTranslation ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>Maksud</span>
                </button>
              </div>
            </div>
          </div>

          {/* Senarai Kad Wirid */}
          <div className="space-y-3">
            {WIRID_LIST.map((item) => {
              const isPlaying = playingAudioId === item.id;
              const hasAudio = Boolean(item.audioUrl);

              return (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl p-5 border border-white/5 hover:border-emerald-500/20 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
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

                  {/* 1. Teks Arab Dikuasakan oleh ArabicQuranText */}
                  {showArabic && (
                    <ArabicQuranText
                      text={item.arabic}
                      className={`font-arabic text-right text-emerald-200 transition-all duration-150 ${fontStyles.arabic}`}
                    />
                  )}

                  {/* 2. Teks Rumi */}
                  {showRumi && (
                    <p className={`text-slate-300 italic leading-relaxed transition-all duration-150 ${fontStyles.rumi}`}>
                      &quot;{item.transliteration}&quot;
                    </p>
                  )}

                  {/* 3. Teks Terjemahan */}
                  {showTranslation && (
                    <p className={`text-slate-400 leading-relaxed transition-all duration-150 ${fontStyles.translation}`}>
                      <strong className="text-slate-300">Terjemahan:</strong> {item.translation}
                    </p>
                  )}

                  {/* 4. Paparan Fadilat Wirid */}
                  {item.fadilat && (
                    <div className="mt-2 text-left bg-emerald-950/40 border border-emerald-500/25 rounded-2xl p-3 flex items-start gap-2.5 shadow-inner">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] sm:text-xs text-emerald-100/90 leading-relaxed">
                        <strong className="text-amber-300 font-semibold uppercase tracking-wider block sm:inline mr-1">
                          Fadilat & Hadis Sahih:
                        </strong>
                        {item.fadilat}
                      </p>
                    </div>
                  )}

                  {!showArabic && !showRumi && !showTranslation && !item.fadilat && (
                    <div className="py-2.5 px-3 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-500 italic">
                      Teks disorokkan. Klik <strong>Jawi</strong>, <strong>Rumi</strong>, atau <strong>Maksud</strong> di atas untuk memaparkan kembali.
                    </div>
                  )}

                  {/* Butang Audio */}
                  {hasAudio && (
                    <div className="mt-2 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleToggleAudio(item)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer shadow-sm select-none ${
                          isPlaying
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50 shadow-md shadow-emerald-950/60'
                            : 'bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 hover:text-white'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4 fill-current text-white animate-pulse" />
                            <span>Hentikan Audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 text-emerald-400" />
                            <span>Dengar Alunan</span>
                            <Play className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300/60 ml-0.5" />
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        {isPlaying ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            Sedang Berputar...
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1">
                            <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                            Audio Bacaan Arab
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {item.note && (
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-emerald-400/90">
                      {item.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
