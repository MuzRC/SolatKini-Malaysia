import React from 'react';
import { Bell, BellOff, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { nativeAlarmService } from '../../services/nativeAlarmService';

interface SystemStatusAlertsProps {
  isAutoTimeEnabled: boolean;
  onAutoTimeChecked: (enabled: boolean) => void;
  notificationsGranted: boolean;
  onNotificationsChecked: (granted: boolean) => void;
}

export const SystemStatusAlerts: React.FC<SystemStatusAlertsProps> = ({
  isAutoTimeEnabled,
  onAutoTimeChecked,
  notificationsGranted,
  onNotificationsChecked,
}) => {
  return (
    <>
      {!isAutoTimeEnabled && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-rose-950/80 via-amber-950/70 to-[#1f0f0a] border border-rose-500/50 text-left space-y-2.5 shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
              <h4 className="text-sm font-bold text-white">
                Masa Automatik Telefon Dimatikan
              </h4>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase tracking-wider">
              Risiko Waktu Tersasar
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Pilihan <strong>&quot;Set time automatically&quot;</strong> dimatikan di tetapan telefon anda. Sekiranya jam telefon dianjak secara manual, jadual waktu solat dan laungan azan mungkin tidak tepat.
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              onClick={async () => {
                await nativeAlarmService.openDateSettings();
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-rose-950/40 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              Buka Tetapan Tarikh & Masa Telefon
            </button>
            <button
              onClick={() => {
                nativeAlarmService.checkAutoTime().then((enabled) => {
                  onAutoTimeChecked(enabled);
                });
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Semak Semula
            </button>
          </div>
        </div>
      )}

      {!notificationsGranted && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-950/70 to-[#1e1408] border border-amber-500/50 text-left space-y-2.5 shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BellOff className="w-5 h-5 text-amber-400 shrink-0" />
              <h4 className="text-sm font-bold text-white">
                Kebenaran Notifikasi Belum Diaktifkan
              </h4>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
              Tindakan Diperlukan
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Untuk membolehkan laungan azan dan penggera waktu solat berbunyi pada telefon anda, sila benarkan notifikasi sistem Android.
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              onClick={async () => {
                const granted = await nativeAlarmService.requestNotificationPermission();
                onNotificationsChecked(granted);
                if (!granted) {
                  await nativeAlarmService.openNotificationSettings();
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-950/40 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 fill-slate-950" />
              Minta Kebenaran Notifikasi Sekarang
            </button>
            <button
              onClick={async () => {
                await nativeAlarmService.openNotificationSettings();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition cursor-pointer"
            >
              Buka Tetapan Notifikasi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
