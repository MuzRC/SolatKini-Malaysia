import React from 'react';
import { Info, X } from 'lucide-react';

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
            Pelayar web moden dan sistem operasi mempunyai had keselamatan privasi perkakasan. Untuk memastikan azan sentiasa berbunyi walaupun telefon anda dalam mod Jangan Ganggu (Do Not Disturb) atau Senyap:
          </p>

          <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div>
                <strong className="text-white">Aplikasi Android (APK) Siap Pasang:</strong>
                <p className="text-slate-400 text-xs mt-0.5">
                  Aplikasi SolatKini berjalan sebagai aplikasi native penuh pada telefon anda untuk keizinan penggera audio dan sokongan widget skrin utama.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div>
                <strong className="text-white">Untuk Pengguna Android:</strong>
                <p className="text-slate-400 text-xs mt-0.5">
                  Buka <em>Settings &gt; Apps &gt; SolatKini &gt; Notifications</em>. Pilih kategori Penggera dan aktifkan <strong>&quot;Override Do Not Disturb&quot;</strong>.
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

          <p className="text-emerald-400 text-xs">
            Aplikasi ini dilengkapi penggera enjin Web Audio bervolum tinggi yang akan melancarkan modal azan automatik apabila waktu solat tiba.
          </p>
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
