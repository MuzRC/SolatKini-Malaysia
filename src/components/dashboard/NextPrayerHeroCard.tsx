import React from 'react';
import { Volume2, Clock, Sliders, Moon, Info, Sparkles } from 'lucide-react';
import { DayPrayerTimes, JakimZone, PrayerKey, AzanVoice } from '../../types/prayer';
import { NextPrayerInfo } from '../../services/prayerService';
import { formatDisplayTime } from '../../utils/prayerCalculator';
import { AZAN_OPTIONS } from '../../services/audioNotificationService';

interface NextPrayerHeroCardProps {
  nextPrayerInfo: NextPrayerInfo;
  currentZone: JakimZone;
  prayerTimes: DayPrayerTimes;
  isRamadan: boolean;
  isFastingActive: boolean;
  fastingCountdown: {
    title: string;
    remainingFormatted: string;
  };
  recommendation: {
    isRecommended: boolean;
    type: string;
    description: string;
  };
  onToggleUserFasting: () => void;
  selectedVoice: AzanVoice;
  onTriggerTestAlarm: (key: PrayerKey, name: string, voice: AzanVoice) => void;
  onOpenAudioSettings: () => void;
  onOpenDndGuide: () => void;
}

export const NextPrayerHeroCard: React.FC<NextPrayerHeroCardProps> = ({
  nextPrayerInfo,
  currentZone,
  prayerTimes,
  isRamadan,
  isFastingActive,
  fastingCountdown,
  recommendation,
  onToggleUserFasting,
  selectedVoice,
  onTriggerTestAlarm,
  onOpenAudioSettings,
  onOpenDndGuide,
}) => {
  const reciterName = (AZAN_OPTIONS.find((v) => v.id === selectedVoice)?.reciter || 'JAKIM').split(' ')[0];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e241c] via-[#091712] to-[#060c0a] border border-emerald-500/20 p-6 sm:p-8 shadow-2xl">
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-3">
            <Clock className="w-3.5 h-3.5" />
            Solat Seterusnya: {nextPrayerInfo.nextLabel}
          </div>

          <div className="flex items-baseline gap-3">
            <h2 className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight tabular-nums">
              {nextPrayerInfo.countdownFormatted}
            </h2>
          </div>
          <p className="text-sm text-slate-300 mt-2">
            Waktu masuk pada{' '}
            <strong className="text-amber-300 font-semibold text-base">
              {nextPrayerInfo.nextDisplayTime}
            </strong>{' '}
            ({currentZone.daerah})
          </p>

          {isFastingActive ? (
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-emerald-200/90 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2.5 rounded-xl shadow-inner">
              <div className="flex items-center gap-2.5 min-w-0">
                <Moon className="w-4 h-4 text-amber-300 shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-white">{fastingCountdown.title}:</span>{' '}
                  {fastingCountdown.remainingFormatted} (Waktu Berbuka:{' '}
                  {formatDisplayTime(prayerTimes?.times?.maghrib || '18:30')})
                </div>
              </div>
              {!isRamadan && (
                <button
                  onClick={onToggleUserFasting}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-900/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/20 transition shrink-0 cursor-pointer"
                  title="Nyahaktifkan mod berpuasa untuk hari ini"
                >
                  Batal Puasa
                </button>
              )}
            </div>
          ) : recommendation.isRecommended ? (
            <div className="mt-4 flex items-center justify-between gap-2.5 text-xs text-amber-200/90 bg-amber-950/40 border border-amber-500/30 px-3.5 py-2 rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">
                  <strong>{recommendation.type}:</strong> {recommendation.description}
                </span>
              </div>
              <button
                onClick={onToggleUserFasting}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold border border-amber-400/30 transition shrink-0 active:scale-95 cursor-pointer"
              >
                Saya Berpuasa
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
          <button
            onClick={() => {
              const testVoice = (
                nextPrayerInfo.nextKey === 'subuh' && selectedVoice === 'jakim'
                  ? 'subuh_special'
                  : selectedVoice
              ) as AzanVoice;
              onTriggerTestAlarm(nextPrayerInfo.nextKey, nextPrayerInfo.nextLabel, testVoice);
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-900/40 transition active:scale-95 cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            Uji Azan & Penggera
          </button>

          <button
            onClick={onOpenAudioSettings}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-200 font-medium text-xs sm:text-sm transition active:scale-95 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            Pilihan Muadzin ({reciterName})
          </button>

          <button
            onClick={onOpenDndGuide}
            className="flex items-center justify-center gap-1.5 text-[11px] text-amber-300/90 hover:text-amber-200 font-medium py-1 transition cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            Bypass Silent / DND Tetapan
          </button>
        </div>
      </div>
    </div>
  );
};
