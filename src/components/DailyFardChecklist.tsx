import React from 'react';
import { Check, CheckCircle2, Sparkles } from 'lucide-react';
import { DayPrayerTimes, FardPrayerKey, FARD_PRAYERS_ORDER } from '../types/prayer';
import { PRAYER_LABELS } from '../services/prayerService';
import { formatDisplayTime } from '../utils/prayerCalculator';

interface DailyFardChecklistProps {
  prayerTimes: DayPrayerTimes;
  prayerChecklist: Record<FardPrayerKey, boolean>;
  onTogglePrayerDone: (key: FardPrayerKey) => void;
  onResetChecklist: () => void;
  currentTime: Date;
}

export const DailyFardChecklist: React.FC<DailyFardChecklistProps> = ({
  prayerTimes,
  prayerChecklist,
  onTogglePrayerDone,
  onResetChecklist,
  currentTime,
}) => {
  const completedFardCount = FARD_PRAYERS_ORDER.filter((k) => prayerChecklist[k]).length;
  const fardPercentage = Math.round((completedFardCount / 5) * 100);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0a1612] via-[#0e2119] to-[#08120e] border border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-4 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Checklist Solat Fardu Harian
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 font-semibold font-mono shadow-sm">
              {completedFardCount}/5 Selesai ({fardPercentage}%)
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Tandakan 5 solat fardu yang telah disempurnakan hari ini ({currentTime.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'short' })}).
          </p>
        </div>

        {completedFardCount > 0 && (
          <button
            type="button"
            onClick={onResetChecklist}
            className="text-xs text-slate-400 hover:text-red-400 transition self-start sm:self-center px-2.5 py-1 rounded-xl border border-slate-800 hover:border-red-900/50 bg-slate-900/60 cursor-pointer"
          >
            Set Semula
          </button>
        )}
      </div>

      <div className="w-full bg-slate-950/80 rounded-full h-2.5 overflow-hidden border border-emerald-950">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${fardPercentage}%` }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
        {FARD_PRAYERS_ORDER.map((fardKey) => {
          const isDone = prayerChecklist[fardKey];
          const prayerName = PRAYER_LABELS[fardKey];
          const prayerTime = formatDisplayTime(prayerTimes.times[fardKey]);

          return (
            <button
              key={fardKey}
              type="button"
              onClick={() => onTogglePrayerDone(fardKey)}
              className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 active:scale-95 cursor-pointer ${
                isDone
                  ? 'bg-emerald-950/70 border-emerald-400/60 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  {prayerName}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {prayerTime}
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition ${
                  isDone
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'border-2 border-slate-600 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </button>
          );
        })}
      </div>

      {completedFardCount === 5 && (
        <div className="p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-400/40 flex items-center gap-3 text-xs text-emerald-200 animate-in fade-in-50 duration-300 text-left">
          <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
          <span>
            <strong>Alhamdulillah!</strong> Anda telah menyempurnakan kesemua 5 waktu solat fardu hari ini. Semoga setiap sujud dan doa diterima oleh Allah SWT.
          </span>
        </div>
      )}
    </div>
  );
};
