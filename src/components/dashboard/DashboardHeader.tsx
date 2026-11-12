import React from 'react';
import {
  MapPin,
  Calendar,
  ChevronDown,
  Navigation,
  X,
  RefreshCw,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';
import { JakimZone } from '../../types/prayer';

interface DashboardHeaderProps {
  currentZone: JakimZone;
  currentTime: Date;
  hijriFormatted: string;
  isOnline: boolean;
  isOfflineCalculated: boolean;
  lastSyncTime?: string;
  isLiveSyncing?: boolean;
  onLiveSync?: () => void;
  onOpenZoneModal: () => void;
  onDetectGPS: () => void;
  isLocating: boolean;
  locationError: { message: string; isDenied: boolean } | null;
  onClearLocationError: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentZone,
  currentTime,
  hijriFormatted,
  isOnline,
  isOfflineCalculated,
  lastSyncTime,
  isLiveSyncing,
  onLiveSync,
  onOpenZoneModal,
  onDetectGPS,
  isLocating,
  locationError,
  onClearLocationError,
}) => {
  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl border border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold uppercase tracking-wider mb-1">
            {!isOnline ? (
              <span className="flex items-center gap-1.5 text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-[10px]">
                <WifiOff className="w-3 h-3 text-amber-400" />
                {isOfflineCalculated ? 'Falak Luar Talian' : 'Luar Talian (Data Tersimpan)'}
              </span>
            ) : isOfflineCalculated ? (
              <span className="flex items-center gap-1.5 text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-[10px]">
                <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                Kiraan Falak Tempatan
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px]">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                e-Solat JAKIM Online
              </span>
            )}

            {lastSyncTime && (
              <span className="text-[11px] text-slate-400 font-mono lowercase">
                dikemas kini {lastSyncTime}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            SolatKini Malaysia
          </h1>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 mt-1">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>{hijriFormatted}</span>
            <span className="text-slate-500">·</span>
            <span>
              {currentTime.toLocaleDateString('ms-MY', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onLiveSync && (
            <button
              onClick={onLiveSync}
              disabled={isLiveSyncing}
              title="Segerak waktu solat terkini daripada e-Solat JAKIM"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-emerald-300 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLiveSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">{isLiveSyncing ? 'Menyegerak...' : 'Segerak'}</span>
            </button>
          )}

          <button
            onClick={onOpenZoneModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm font-semibold transition active:scale-95 shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-left">
              <div className="text-[10px] text-emerald-400/80 font-mono leading-none">{currentZone.code}</div>
              <div className="font-semibold text-white truncate max-w-[150px] sm:max-w-[190px]">
                {currentZone.daerah.split(',')[0]}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
          </button>

          <button
            onClick={onDetectGPS}
            title="Kesan Lokasi GPS"
            disabled={isLocating}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 transition active:scale-95 cursor-pointer"
          >
            <Navigation className={`w-4 h-4 text-emerald-400 ${isLocating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {locationError && (
        <div className="mt-3 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{locationError.message}</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {locationError.isDenied && (
              <button
                type="button"
                onClick={onOpenZoneModal}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-[11px] flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Pilih Zon Manual</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClearLocationError}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
