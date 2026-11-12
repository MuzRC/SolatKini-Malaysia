import React from 'react';
import { Info, X, Settings, ShieldCheck } from 'lucide-react';
import { nativeAlarmService } from '../services/nativeAlarmService';

interface DndGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DndGuideModal: React.FC<DndGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0f1a16] border border-amber-500/30 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Panduan Bypass Silent & DND</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed text-left">
          <p>
            Untuk memastikan laungan azan sentiasa berkumandang walaupun telefon anda berada dalam mod Jangan Ganggu (<em>Do Not Disturb</em>) atau Senyap:
          </p>

          <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div>
                <strong className="text-white">Saluran Audio Penggera (STREAM_ALARM):</strong>
                <p className="text-slate-400 text-xs mt-0.5">
                  Aplikasi Android SolatKini memainkan azan menggunakan saluran penggera sistem (<code className="text-emerald-300">STREAM_ALARM</code>) supaya tetap berbunyi walaupun telefon ditetapkan kepada mod senyap (<em>Silent / Vibrate</em>).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div>
                <strong className="text-white">Untuk Pengguna Android (Melepasi DND):</strong>
                <p className="text-slate-400 text-xs mt-0.5">
                  Buka <em>Settings &gt; Apps &gt; SolatKini &gt; Notifications</em>. Pilih kategori <strong>Penggera Azan SolatKini</strong> dan pastikan pilihan <strong>&quot;Override Do Not Disturb&quot;</strong> diaktifkan.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <div>
                <strong className="text-white">Untuk Pengguna iOS / iPhone:</strong>
                <p className="text-slate-400 text-xs mt-0.5">
                  Buka <em>Settings &gt; Focus &gt; Do Not Disturb</em>. Di bawah <em>Allowed Apps</em>, tambahkan SolatKini sebagai aplikasi berkecuali.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={async () => {
                await nativeAlarmService.openNotificationSettings();
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Buka Tetapan Notifikasi Telefon</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await nativeAlarmService.openExactAlarmSettings();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buka Tetapan Penggera Tepat</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm cursor-pointer transition active:scale-95"
          >
            Faham & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
