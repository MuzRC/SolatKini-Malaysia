import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, BellRing, Sparkles, Play, Square } from 'lucide-react';
import { AzanVoice, PrayerKey } from '../types/prayer';
import { AZAN_OPTIONS, audioNotificationService } from '../services/audioNotificationService';
import { nativeAlarmService } from '../services/nativeAlarmService';
import { DUA_COLLECTION } from '../data/wiridAndDoa';

interface AzanAlarmModalProps {
  isOpen: boolean;
  prayerKey: PrayerKey;
  prayerName: string;
  voice: AzanVoice;
  onClose: () => void;
}

// Sandaran kebal sekiranya fail data doa terlewat dimuatkan
const DEFAULT_DOA_AZAN = {
  arabic: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ',
  transliteration: "Allahumma Rabba hazihid-da'watit-tammah, was-salatil-qa'imah, ati Muhammadanil-wasilata wal-fadilah, wab'athhu maqamam-mahmudanil-lazi wa'adtah.",
  translation: 'Ya Allah, Tuhan yang menguasai seruan yang sempurna ini dan solat yang didirikan. Berikanlah kepada Nabi Muhammad kedudukan yang tinggi dan keutamaan, dan bangkitkanlah baginda pada kedudukan terpuji yang telah Engkau janjikan.',
  reference: 'Sahih al-Bukhari (No. 614)',
};

export const AzanAlarmModal: React.FC<AzanAlarmModalProps> = ({
  isOpen,
  prayerKey,
  prayerName,
  voice,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [volume, setVolume] = useState(1.0);
  const [showDoa, setShowDoa] = useState(false);

  const isNative = nativeAlarmService.getIsNative();

  // Kunci kebal Subuh Khas
  const effectiveVoice: AzanVoice = prayerKey === 'subuh' ? 'subuh_special' : voice;

  // Padanan suara pintar: Mengelakkan fallback ke JAKIM jika ID Subuh didaftarkan sebagai 'subuh'
  const selectedVoice =
    AZAN_OPTIONS.find(
      (v) =>
        v.id === effectiveVoice ||
        (effectiveVoice === 'subuh_special' && (v.id === 'subuh' || v.id === 'subuh_special'))
    ) || {
      id: effectiveVoice,
      title: effectiveVoice === 'subuh_special' ? 'Azan Subuh (Khas)' : 'Azan Rasmi SolatKini',
      reciter: effectiveVoice === 'subuh_special' ? 'As-Salatu Khayrum Minan-Naum' : 'Muazzin Rasmi',
    };

  const doaAzan = DUA_COLLECTION?.find((d) => d.id === 'dua-selepas-azan') || DEFAULT_DOA_AZAN;

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(true);
      setShowDoa(false);

      // Hanya dengar servis audio web sekiranya BUKAN di peranti Android asli
      if (!isNative) {
        const unsubscribe = audioNotificationService.addAudioStateListener(
          (playing, cur, dur) => {
            setIsPlaying(playing);
            setProgress({ current: cur, total: dur });
          }
        );
        return () => unsubscribe();
      }
    }
  }, [isOpen, isNative]);

  if (!isOpen) return null;

  const handleStopAudio = () => {
    audioNotificationService.stopAudio();
    nativeAlarmService.stopNativeAzan();
    setIsPlaying(false);
  };

  const handlePlayAudio = () => {
    if (isNative) {
      // Di Android Native, laungkan semula melalui perkhidmatan penggera STREAM_ALARM
      nativeAlarmService.testAlarm(prayerName, effectiveVoice, 1);
      setIsPlaying(true);
    } else {
      audioNotificationService.unlockAudio();
      audioNotificationService.playAzan(effectiveVoice, () => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const handleCloseAll = () => {
    audioNotificationService.stopAudio();
    nativeAlarmService.stopNativeAzan();
    onClose();
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioNotificationService.setVolume(newVol);
  };

  const formatSec = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#13221c] to-[#0a120f] border border-emerald-500/30 p-6 sm:p-8 shadow-2xl shadow-emerald-950/60 text-center overflow-hidden">
        {/* Hiasan Kilauan Lembut */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Ikon Loceng Berdenyut */}
        <div className="relative mx-auto mb-5 w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-75" />
          <BellRing className="w-10 h-10 text-emerald-400 animate-bounce" />
        </div>

        {/* Lencana Makluman Rasmi */}
        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Pemberitahuan Waktu Solat Rasmi JAKIM
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
          Masuk Waktu {prayerName}
        </h2>
        <p className="text-sm text-slate-300 mt-1 flex items-center justify-center gap-1.5 flex-wrap">
          <span>{selectedVoice.title}</span>
          <span className="text-slate-500">·</span>
          <span className="text-amber-300 font-medium">{selectedVoice.reciter}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            Vokal Asli
          </span>
        </p>

        {/* Visual Gelombang Penyama Audio (Equalizer) */}
        <div className="my-5 flex items-center justify-center gap-1.5 h-10">
          {[40, 75, 55, 90, 65, 80, 50, 95, 60, 45, 85, 65, 90, 50, 70].map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-full bg-gradient-to-t from-emerald-500 to-amber-300 transition-all ${
                isPlaying ? 'animate-pulse' : 'opacity-25'
              }`}
              style={{
                height: isPlaying ? `${h}%` : '20%',
                animationDelay: `${(i % 5) * 0.15}s`,
                animationDuration: '0.8s',
              }}
            />
          ))}
        </div>

        {/* Bar Kemajuan Audio Sebenar (Mod Pelayar Web) */}
        {progress.total > 0 && (
          <div className="mb-5 px-4">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
              <span>{formatSec(progress.current)}</span>
              <span>{formatSec(progress.total)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-amber-300 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Kawalan Aras Suara Pintar (Slider di Web / Info di Android Native) */}
        {!isNative ? (
          <div className="mb-5 flex items-center justify-center gap-3 px-6">
            <button
              type="button"
              onClick={() => handleVolumeChange(volume === 0 ? 1 : 0)}
              className="text-slate-400 hover:text-white transition cursor-pointer"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-32 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] text-slate-400 font-mono w-8">{Math.round(volume * 100)}%</span>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 mb-5 flex items-center justify-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            Audio azan dilaungkan pada aras penggera sistem maksima (STREAM_ALARM)
          </p>
        )}

        {/* Butang Tindakan */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center mb-6">
          {isPlaying ? (
            <button
              type="button"
              onClick={handleStopAudio}
              className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-red-400 text-red-400" />
              Hentikan Azan
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlayAudio}
              className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white text-white" />
              Mainkan Azan (MP3)
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDoa(!showDoa)}
            className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            {showDoa ? 'Tutup Doa Azan' : 'Baca Doa Selepas Azan'}
          </button>
        </div>

        {/* Paparan Doa Selepas Azan */}
        {showDoa && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 text-left animate-in slide-in-from-bottom-2 duration-200">
            <h4 className="text-xs uppercase font-bold text-amber-300 tracking-wider mb-2">
              Doa Selepas Azan (Sunnah)
            </h4>
            <p className="font-arabic text-xl text-right text-emerald-200 leading-loose mb-3" dir="rtl">
              {doaAzan.arabic}
            </p>
            <p className="text-xs text-slate-300 italic mb-2 leading-relaxed">
              &quot;{doaAzan.transliteration}&quot;
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>Terjemahan:</strong> {doaAzan.translation}
            </p>
            <p className="text-[11px] text-emerald-400/80 mt-2 font-medium">
              Rujukan: {doaAzan.reference}
            </p>
          </div>
        )}

        {/* Bahagian Bawah Penutup Modal */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Mod Penggera Prioriti Tinggi</span>
          <button
            type="button"
            onClick={handleCloseAll}
            className="px-4 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium transition cursor-pointer"
          >
            Tutup Paparan
          </button>
        </div>
      </div>
    </div>
  );
};
