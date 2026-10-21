import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, RotateCcw, BookOpen, Play, Pause, Eye, EyeOff } from 'lucide-react';
import { WIRID_LIST } from '../data/wiridAndDoa';
import { audioNotificationService } from '../services/audioNotificationService';

type FontSize = 'normal' | 'large' | 'xlarge' | '4xl';

/* =========================================================================
   KOMPONEN LENCANA AYAT AL-QURAN BERHIAS EMAS (MUSHAF AYAH ROSETTE)
   ========================================================================= */
const QuranAyahBadge: React.FC<{ number: string }> = ({ number }) => {
  return (
    <span
      className="inline-flex items-center justify-center align-middle mx-1.5 my-0.5 select-none"
      style={{ verticalAlign: 'middle', lineHeight: 1 }}
      dir="ltr"
      title={`Ayat ${number}`}
    >
      <svg
        className="w-7 h-7 sm:w-8 sm:h-8 inline-block drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] shrink-0 transition-transform hover:scale-110"
        viewBox="0 0 38 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Ayat ${number}`}
      >
        {/* Lingkaran luar putus-putus keemasan */}
        <circle
          cx="19"
          cy="19"
          r="17.2"
          stroke="#d97706"
          strokeWidth="0.8"
          strokeDasharray="2 1.5"
          opacity="0.85"
        />

        {/* Bingkai utama bertrim emas */}
        <circle
          cx="19"
          cy="19"
          r="15"
          fill="#041f16"
          stroke="#f59e0b"
          strokeWidth="1.3"
        />

        {/* Cincin dalaman */}
        <circle
          cx="19"
          cy="19"
          r="12.5"
          stroke="#fbbf24"
          strokeWidth="0.75"
          opacity="0.65"
        />

        {/* 4 Kelopak Bunga Kardinal */}
        <path d="M19 1.5 L20.5 3.5 L19 5.5 L17.5 3.5 Z" fill="#fbbf24" />
        <path d="M19 32.5 L20.5 34.5 L19 36.5 L17.5 34.5 Z" fill="#fbbf24" />
        <path d="M1.5 19 L3.5 20.5 L5.5 19 L3.5 17.5 Z" fill="#fbbf24" />
        <path d="M32.5 19 L34.5 20.5 L36.5 19 L34.5 17.5 Z" fill="#fbbf24" />

        {/* 4 Titik hiasan pepenjuru */}
        <circle cx="7" cy="7" r="0.9" fill="#fde047" opacity="0.85" />
        <circle cx="31" cy="7" r="0.9" fill="#fde047" opacity="0.85" />
        <circle cx="7" cy="31" r="0.9" fill="#fde047" opacity="0.85" />
        <circle cx="31" cy="31" r="0.9" fill="#fde047" opacity="0.85" />

        {/* Angka Nombor Ayat di Tengah */}
        <text
          x="19"
          y="20.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fef08a"
          fontWeight="bold"
          fontFamily="'Amiri', 'Scheherazade New', serif"
          fontSize={number.length >= 3 ? '10' : number.length === 2 ? '11.5' : '13.5'}
          className="select-none"
        >
          {number}
        </text>
      </svg>
    </span>
  );
};

/* Komponen Pengesan Simbol Ayat dan Penukar Lencana Automatik */
const ArabicQuranText: React.FC<{ text: string; className?: string }> = ({
  text,
  className = 'font-arabic text-xl sm:text-2xl text-right text-emerald-200 leading-loose mb-3',
}) => {
  const regex = /(۝[\u0660-\u0669\d]+|(?<=\s)[\u0660-\u0669]{1,4}(?=\s|$)|۝)/g;
  const parts = text.split(regex);

  if (parts.length === 1) {
    return (
      <p className={className} dir="rtl">
        {text}
      </p>
    );
  }

  return (
    <p className={className} dir="rtl">
      {parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith('۝') || /^[\u0660-\u0669\d]+$/.test(part.trim())) {
          const num = part.replace(/^۝/, '').trim();
          if (num) {
            return <QuranAyahBadge key={index} number={num} />;
          }
          return (
            <span key={index} className="text-amber-400 font-arabic mx-1">
              ۝
            </span>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </p>
  );
};

/* =========================================================================
   KOMPONEN UTAMA TASBIH & WIRID
   ========================================================================= */
export const TasbihWirid: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'tasbih' | 'wirid'>('wirid');
  const [count, setCount] = useState<number>(0);
  const [targetCount, setTargetCount] = useState<number>(33);
  const [lapCount, setLapCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);

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

  // Digital Tasbih Tap
  const handleTap = () => {
    const nextCount = count + 1;
    setCount(nextCount);

    if (soundEnabled) {
      audioNotificationService.playTasbihClick();
    }

    if (vibrateEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (targetCount > 0 && nextCount % targetCount === 0) {
        navigator.vibrate([80, 40, 120]);
      } else {
        navigator.vibrate(35);
      }
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Switcher Tab: Tasbih Digital vs Panduan Wirid */}
      <div className="flex items-center justify-center">
        <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1">
          <button
            type="button"
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
            type="button"
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
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                {[33, 99, 0].map((t) => (
                  <button
                    key={t}
                    type="button"
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
                  type="button"
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
                  type="button"
                  onClick={handleResetAll}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition"
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

            <div className="my-8 flex justify-center">
              <button
                type="button"
                onClick={handleTap}
                className="relative group w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-br from-[#12241d] to-[#07110d] border-4 border-emerald-500/30 hover:border-emerald-400/60 shadow-2xl shadow-emerald-950/70 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 focus:outline-none select-none"
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
              className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 transition"
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
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 ${
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 ${
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 ${
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

                  {/* 1. Teks Arab Dikuasakan oleh ArabicQuranText (Menggantikan <p> biasa) */}
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

                  {!showArabic && !showRumi && !showTranslation && (
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
