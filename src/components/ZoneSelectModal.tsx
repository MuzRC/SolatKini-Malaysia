import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { JakimZone } from '../types/prayer';
import { JAKIM_ZONES } from '../data/jakimZones';

interface ZoneSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentZone: JakimZone;
  onZoneChange: (zone: JakimZone) => void;
}

export const ZoneSelectModal: React.FC<ZoneSelectModalProps> = ({
  isOpen,
  onClose,
  currentZone,
  onZoneChange,
}) => {
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('Semua');

  if (!isOpen) return null;

  const states = ['Semua', ...Array.from(new Set(JAKIM_ZONES.map((z) => z.state)))];

  const filteredZones = JAKIM_ZONES.filter((zone) => {
    const matchesState = selectedStateFilter === 'Semua' || zone.state === selectedStateFilter;
    const matchesQuery =
      zone.code.toLowerCase().includes(zoneSearchQuery.toLowerCase()) ||
      zone.daerah.toLowerCase().includes(zoneSearchQuery.toLowerCase()) ||
      zone.state.toLowerCase().includes(zoneSearchQuery.toLowerCase());
    return matchesState && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[85vh] rounded-3xl bg-[#0f1a16] border border-emerald-500/20 p-6 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-white">Pilih Zon Waktu Solat JAKIM</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Merangkumi seluruh negeri di Semenanjung, Sabah & Sarawak
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-4 space-y-3">
          <input
            type="text"
            placeholder="Cari daerah, negeri, atau kod (cth: Beaufort, SBH07, Shah Alam)..."
            value={zoneSearchQuery}
            onChange={(e) => setZoneSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs scrollbar-none">
            {states.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStateFilter(st)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                  selectedStateFilter === st
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
          {filteredZones.map((z) => {
            const isSelected = z.code === currentZone.code;
            return (
              <button
                key={z.code}
                onClick={() => {
                  onZoneChange(z);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-xl text-left flex items-start justify-between transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 font-bold">
                      {z.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{z.state}</span>
                  </div>
                  <p className="text-sm font-medium text-white mt-1.5 leading-snug">
                    {z.daerah}
                  </p>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
