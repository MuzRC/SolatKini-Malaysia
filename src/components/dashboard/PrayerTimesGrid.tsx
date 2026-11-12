import React from 'react';
import { Bell, BellOff, SunMedium, Check } from 'lucide-react';
import {
  DayPrayerTimes,
  JakimZone,
  PrayerKey,
  AppNotificationSettings,
  FardPrayerKey,
  FARD_PRAYERS_ORDER,
} from '../../types/prayer';
import { PRAYER_LABELS, PRAYER_KEYS_ORDER } from '../../services/prayerService';
import { formatDisplayTime } from '../../utils/prayerCalculator';
import { toMinutes } from './usePrayerDashboard';

interface PrayerTimesGridProps {
  prayerTimes: DayPrayerTimes;
  currentZone: JakimZone;
  currentTime: Date;
  nextPrayerKey: PrayerKey;
  notificationSettings: AppNotificationSettings;
  onTogglePrayerNotif: (key: PrayerKey) => void;
  prayerChecklist: Record<FardPrayerKey, boolean>;
  onTogglePrayerDone: (fardKey: FardPrayerKey) => void;
}

export const PrayerTimesGrid: React.FC<PrayerTimesGridProps> = ({
  prayerTimes,
  currentZone,
  currentTime,
  nextPrayerKey,
  notificationSettings,
  onTogglePrayerNotif,
  prayerChecklist,
  onTogglePrayerDone,
}) => {
  const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const subuhMins = toMinutes(prayerTimes?.times?.subuh);
  const syurukMins = toMinutes(prayerTimes?.times?.syuruk);
  const zohorMins = toMinutes(prayerTimes?.times?.zohor);
  const asarMins = toMinutes(prayerTimes?.times?.asar);
  const maghribMins = toMinutes(prayerTimes?.times?.maghrib);
  const isyakMins = toMinutes(prayerTimes?.times?.isyak);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <SunMedium className="w-5 h-5 text-amber-400" />
          Jadual Waktu Solat Hari Ini
        </h3>
        <span className="text-xs text-slate-400 font-mono">Zon: {currentZone.code}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {PRAYER_KEYS_ORDER.map((key) => {
          const time24 = prayerTimes?.times?.[key] || '--:--';
          const displayTime = formatDisplayTime(time24);
          const label = PRAYER_LABELS[key];
          const isNext = nextPrayerKey === key;

          let isCurrent = false;
          if (key === 'subuh') {
            isCurrent = currentMins >= subuhMins && currentMins < syurukMins;
          } else if (key === 'zohor') {
            isCurrent = currentMins >= zohorMins && currentMins < asarMins;
          } else if (key === 'asar') {
            isCurrent = currentMins >= asarMins && currentMins < maghribMins;
          } else if (key === 'maghrib') {
            isCurrent = currentMins >= maghribMins && currentMins < isyakMins;
          } else if (key === 'isyak') {
            isCurrent = currentMins >= isyakMins || currentMins < subuhMins;
          }
          isCurrent = isCurrent && !isNext;

          const isAlertEnabled = notificationSettings.preferences?.[key]?.enabled;
          const isSpecialFastingTime = key === 'imsak' || key === 'maghrib';

          return (
            <div
              key={key}
              className={`relative rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between ${
                isNext
                  ? 'glass-card-active ring-1 ring-emerald-400/60 shadow-lg shadow-emerald-950/50'
                  : isCurrent
                  ? 'bg-gradient-to-br from-emerald-950/50 to-slate-900/80 border border-emerald-500/50 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                  : 'glass-card hover:border-emerald-500/30'
              }`}
            >
              <div>
                {isNext ? (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wider uppercase border border-emerald-400/30">
                    Seterusnya
                  </div>
                ) : isCurrent ? (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sedang Masuk
                  </div>
                ) : null}

                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                    {label}
                    {isSpecialFastingTime && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">
                        {key === 'imsak' ? 'Imsak' : 'Berbuka'}
                      </span>
                    )}
                  </span>

                  <button
                    onClick={() => onTogglePrayerNotif(key)}
                    title={isAlertEnabled ? 'Azan Aktif' : 'Azan Senyap'}
                    className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl transition cursor-pointer ${
                      isAlertEnabled
                        ? 'text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/60'
                        : 'text-slate-500 hover:text-slate-300 bg-slate-900/40'
                    }`}
                  >
                    {isAlertEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>
                </div>

                <div className="text-2xl font-black text-white font-mono tracking-tight tabular-nums">
                  {displayTime}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  {time24} (24 Jam)
                </div>
              </div>

              {FARD_PRAYERS_ORDER.includes(key as FardPrayerKey) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePrayerDone(key as FardPrayerKey);
                  }}
                  className={`mt-3 w-full py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition active:scale-95 cursor-pointer ${
                    prayerChecklist[key as FardPrayerKey]
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Check
                    className={`w-3.5 h-3.5 ${
                      prayerChecklist[key as FardPrayerKey]
                        ? 'text-emerald-400 stroke-[3]'
                        : 'text-slate-500'
                    }`}
                  />
                  <span>
                    {prayerChecklist[key as FardPrayerKey] ? 'Telah Solat' : 'Tanda Selesai'}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
