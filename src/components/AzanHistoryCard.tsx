// ==============================================================================================
// [MULA KOD BOLEH PADAM] : FAIL KOMPONEN LOG DIAGNOSTIK AZAN 24 JAM
// Padam keseluruhan fail ini jika mahu membuang modul log di kemudian hari
// ==============================================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { History, CheckCircle2, AlertCircle, RefreshCw, Trash2, Clock, BellRing } from 'lucide-react';
import { getAzanHistoryLogs, clearAzanHistoryLogs, AzanLogEntry } from '../services/nativeAlarmService';

export const AzanHistoryCard: React.FC = () => {
  const [logs, setLogs] = useState<AzanLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAzanHistoryLogs();
      setLogs(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    const handleResume = () => {
      fetchLogs();
    };

    window.addEventListener('focus', handleResume);
    document.addEventListener('visibilitychange', handleResume);
    return () => {
      window.removeEventListener('focus', handleResume);
      document.removeEventListener('visibilitychange', handleResume);
    };
  }, [fetchLogs]);

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    await clearAzanHistoryLogs();
    setLogs([]);
    setConfirmClear(false);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0c1813] to-[#08120e] border border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-950/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Log Diagnostik Azan
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                24 Jam Terakhir
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Pengesahan sama ada penggera dan audio azan berjaya berkumandang semasa skrin mati
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            title="Muat semula rekod"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          {logs.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              title="Padam rekod log"
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                confirmClear
                  ? 'bg-red-600 text-white border-red-400 font-bold'
                  : 'bg-red-950/40 hover:bg-red-900/50 text-red-300 border-red-500/30'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmClear ? 'Sahkan Padam?' : 'Padam'}</span>
            </button>
          )}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="py-6 text-center space-y-1">
          <Clock className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Tiada rekod laungan azan dalam tempoh 24 jam lalu.</p>
          <p className="text-[10px] text-slate-500">Rekod automatik dicipta sebaik sahaja penggera azan berbunyi.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {logs.map((item, index) => {
            const isSuccess = item.status === 'BERJAYA';
            const isTriggered = item.status === 'DICETUSKAN';

            const cardClass = isSuccess
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100'
              : isTriggered
              ? 'bg-amber-950/35 border-amber-500/30 text-amber-100'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-100';

            const badgeClass = isSuccess
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
              : isTriggered
              ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
              : 'bg-rose-500/20 text-rose-300 border-rose-400/30';

            return (
              <div
                key={`${item.timestamp}-${index}`}
                className={`p-3 rounded-2xl border transition flex items-start justify-between gap-3 ${cardClass}`}
              >
                <div className="flex items-start gap-2.5">
                  {isSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : isTriggered ? (
                    <BellRing className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white uppercase">{item.prayerName}</span>
                      <span className="text-[10px] font-mono text-slate-300 bg-black/40 px-2 py-0.5 rounded-md">
                        {item.timeFormatted} ({item.dateFormatted})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {item.details}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 border ${badgeClass}`}
                >
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
// ==============================================================================================
// [TAMAT KOD BOLEH PADAM] : FAIL KOMPONEN LOG DIAGNOSTIK AZAN 24 JAM
// ==============================================================================================
