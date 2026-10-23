import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Sparkles,
  Navigation,
  Info,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  X
} from 'lucide-react';
import { JakimZone } from '../types/prayer';
import { calculateQiblaDirection, calculateDistanceToKaaba } from '../utils/qibla';

interface QiblaCompassProps {
  currentZone: JakimZone;
}

type CompassAccuracy = 'high' | 'medium' | 'low';

export const QiblaCompass: React.FC<QiblaCompassProps> = ({ currentZone }) => {
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [hasSensor, setHasSensor] = useState<boolean>(false);
  const [accuracy, setAccuracy] = useState<CompassAccuracy>('high');
  const [showCalibrateModal, setShowCalibrateModal] = useState<boolean>(false);
  const [manualHeading, setManualHeading] = useState<number>(0);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const lastVibrateRef = useRef<number>(0);

  const qiblaAngle = calculateQiblaDirection(currentZone.lat, currentZone.lng);
  const distanceKm = calculateDistanceToKaaba(currentZone.lat, currentZone.lng);

  // Active heading: sensor sebenar atau peluncur ujian manual
  const activeHeading = hasSensor ? deviceHeading : manualHeading;
  
  // Beza sudut antara arah telefon dengan Kaabah
  const angleDiff = (qiblaAngle - activeHeading + 360) % 360;
  const isAligned = angleDiff <= 4 || angleDiff >= 356;

  // Maklum balas getaran haptik apabila tepat menghadap kiblat
  useEffect(() => {
    if (isAligned) {
      const now = Date.now();
      if (now - lastVibrateRef.current > 1500) {
        lastVibrateRef.current = now;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 150]);
        }
      }
    }
  }, [isAligned]);

  const requestCompassPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      'DeviceOrientationEvent' in window &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (response === 'granted') {
          setPermissionState('granted');
          setupSensorListener();
        } else {
          setPermissionState('denied');
        }
      } catch {
        setPermissionState('denied');
      }
    } else {
      setupSensorListener();
    }
  };

  const setupSensorListener = () => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading = 0;
      // iOS webkitCompassHeading (True North)
      if ('webkitCompassHeading' in e && typeof (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading === 'number') {
        heading = (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading;
        setHasSensor(true);
      } else if (e.alpha !== null) {
        // Android absolute orientation
        heading = 360 - e.alpha;
        setHasSensor(true);
      }
      setDeviceHeading(Math.round(heading));

      // Semak status ketepatan penentukuran sensor
      const acc = (e as unknown as { webkitCompassAccuracy?: number }).webkitCompassAccuracy;
      if (typeof acc === 'number') {
        if (acc > 0 && acc <= 15) {
          setAccuracy('high');
        } else if (acc > 15 && acc <= 30) {
          setAccuracy('medium');
        } else {
          setAccuracy('low');
        }
      } else {
        // Pada Android WebView, semak jika orientasi mutlak (absolute)
        if (e.absolute === false) {
          setAccuracy('medium');
        } else {
          setAccuracy('high');
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission !== 'function') {
        setupSensorListener();
      }
    }
  }, []);

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      {/* Header Info */}
      <div className="glass-panel rounded-3xl p-6 text-center shadow-xl border border-white/5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase mb-2">
          <Compass className="w-3.5 h-3.5 text-amber-300" />
          Penentuan Arah Kiblat
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Arah Kaabah di Makkah
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Zon: <strong className="text-emerald-300">{currentZone.daerah} ({currentZone.code})</strong>
        </p>

        {/* Big Degrees & Distance Metrics */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400">Sudut Azimuth Kiblat</div>
            <div className="text-2xl font-black text-amber-300 font-mono mt-0.5">
              {qiblaAngle}° <span className="text-xs text-slate-400 font-sans">Barat-Barat Laut</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400">Jarak ke Makkah</div>
            <div className="text-2xl font-black text-emerald-300 font-mono mt-0.5">
              {distanceKm.toLocaleString('ms-MY')}{' '}
              <span className="text-xs text-slate-400 font-sans">km</span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPASS DIAL CONTAINER */}
      <div className="relative rounded-3xl glass-panel p-6 sm:p-8 flex flex-col items-center justify-center overflow-hidden border border-emerald-500/20 shadow-2xl">
        {/* Alignment banner */}
        <div
          className={`mb-3 w-full max-w-sm px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 text-center ${
            isAligned
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 scale-102'
              : 'bg-slate-800/80 text-slate-300'
          }`}
        >
          {isAligned ? (
            <>
              <CheckCircle2 className="w-4 h-4 fill-slate-950 text-emerald-500 shrink-0" />
              <span>Tepat Menghadap Kiblat! (Solat Bersedia)</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
              <span>Pusingkan peranti anda sehingga jarum bertindih dengan Kaabah</span>
            </>
          )}
        </div>

        {/* Lencana Status Kalibrasi Sensor Semasa */}
        <div className="w-full max-w-sm flex items-center justify-between gap-2 px-3.5 py-2 mb-6 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            {accuracy === 'high' && (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-slate-400 text-[11px]">Status Kalibrasi:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ditentukur (Tinggi)
                </span>
              </>
            )}

            {accuracy === 'medium' && (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-slate-400 text-[11px]">Status Kalibrasi:</span>
                <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" /> Sederhana
                </span>
              </>
            )}

            {accuracy === 'low' && (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-slate-400 text-[11px]">Status Kalibrasi:</span>
                <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                  <ShieldAlert className="w-3.5 h-3.5" /> Perlu Kalibrasi
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCalibrateModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-semibold border border-slate-700 transition active:scale-95"
            title="Buka panduan kalibrasi sensor kompas"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Kalibrasi</span>
          </button>
        </div>

        {/* Outer Compass Housing */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full border-4 border-emerald-950/80 bg-gradient-to-b from-[#0c1813] to-[#060c09] shadow-inner flex items-center justify-center">
          {/* Compass Rose Markings (U, T, S, B) */}
          <div
            className="absolute inset-2 rounded-full transition-transform duration-200 ease-out pointer-events-none"
            style={{ transform: `rotate(${-activeHeading}deg)` }}
          >
            {/* North Indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span className="text-xs font-black text-red-500 font-mono">U</span>
              <div className="w-1 h-2 bg-red-500 rounded-full mt-0.5" />
            </div>

            {/* East Indicator */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              <div className="w-2 h-1 bg-slate-600 rounded-full mr-0.5" />
              <span className="text-xs font-bold text-slate-400 font-mono">T</span>
            </div>

            {/* South Indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-1 h-2 bg-slate-600 rounded-full mb-0.5" />
              <span className="text-xs font-bold text-slate-400 font-mono">S</span>
            </div>

            {/* West Indicator */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center">
              <span className="text-xs font-bold text-slate-400 font-mono">B</span>
              <div className="w-2 h-1 bg-slate-600 rounded-full ml-0.5" />
            </div>

            {/* 360 Degree Ticks */}
            {Array.from({ length: 36 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 flex justify-center"
                style={{ transform: `rotate(${i * 10}deg)` }}
              >
                <div
                  className={`w-0.5 ${
                    i % 9 === 0 ? 'h-3 bg-slate-400' : 'h-1.5 bg-slate-700'
                  }`}
                />
              </div>
            ))}

            {/* Kaaba Target Emblem Positioned at Qibla Degrees */}
            <div
              className="absolute inset-0 flex justify-center pointer-events-none"
              style={{ transform: `rotate(${qiblaAngle}deg)` }}
            >
              <div className="absolute -top-3 flex flex-col items-center">
                <div className="w-7 h-7 rounded-lg bg-black border-2 border-amber-400 shadow-md shadow-amber-500/50 flex items-center justify-center">
                  <div className="w-4 h-1 bg-amber-400 mb-1 rounded-sm" />
                </div>
                <span className="text-[10px] font-black text-amber-300 font-mono mt-1 bg-black/80 px-1 rounded">
                  KAABAH
                </span>
              </div>
            </div>
          </div>

          {/* Central Qibla Pointer Needle */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out"
            style={{ transform: `rotate(${angleDiff}deg)` }}
          >
            <div className="relative w-3 h-32 flex flex-col items-center justify-start -mt-20">
              <div
                className={`w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[45px] ${
                  isAligned ? 'border-b-emerald-400 filter drop-shadow(0 0 8px #34d399)' : 'border-b-amber-400'
                }`}
              />
              <div
                className={`w-2 h-16 ${
                  isAligned ? 'bg-emerald-400' : 'bg-amber-400'
                } rounded-b-full`}
              />
            </div>
          </div>

          {/* Central Pivot Hub */}
          <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 border-2 border-emerald-400/60 shadow-xl flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-emerald-400" />
          </div>
        </div>

        {/* Sensor Status / Permission Button */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {permissionState === 'prompt' && !hasSensor && (
            <button
              onClick={requestCompassPermission}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition active:scale-95"
            >
              Aktifkan Penderia Kompas Telefon
            </button>
          )}

          {hasSensor ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Penderia Magnetometer Berfungsi · Haluan Semasa: {deviceHeading}°
            </div>
          ) : (
            <div className="w-full max-w-sm mt-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <p className="text-xs text-slate-300 mb-2">
                Simulasi Manual Haluan Peranti (Untuk Laptop / Ujian):
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">0°</span>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={manualHeading}
                  onChange={(e) => setManualHeading(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs text-slate-400 font-mono">360°</span>
              </div>
              <div className="text-xs text-amber-300 font-mono mt-1">
                Haluan Diuji: {manualHeading}°
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Petua Penentukuran Kompas */}
      <div className="glass-panel rounded-3xl p-5 border border-white/5 space-y-3 text-xs text-slate-300">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400" />
          Petua Penentukuran Kompas
        </h4>
        <ul className="space-y-1.5 list-disc list-inside text-slate-400 leading-relaxed">
          <li>
            Gerakkan telefon anda dalam corak bentuk <strong>angka 8</strong> di udara beberapa kali untuk menentukur semula sensor magnetik jika arah lari.
          </li>
          <li>
            Pastikan peranti diletakkan di atas permukaan rata dan jauh daripada sebarang objek magnet atau besi (seperti komputer riba atau pembesar suara).
          </li>
          <li>
            Arah kiblat bagi Malaysia secara astronomi menghala ke arah <strong>Barat-Barat Laut (antara 291° ke 294°)</strong>.
          </li>
        </ul>
      </div>

      {/* MODAL PANDUAN KALIBRASI HAYUNAN BENTUK 8 */}
      {showCalibrateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#0d1713] border border-emerald-500/30 p-6 text-center space-y-4 shadow-2xl">
            <button
              onClick={() => setShowCalibrateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold text-white">Kalibrasi Kompas Telefon</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pegang telefon anda dan hayunkan peranti membentuk <strong>angka 8 (∞)</strong> di udara secara perlahan-lahan selama 3 hingga 5 saat.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 text-[11px] text-amber-300 space-y-1 text-left">
              <p className="font-semibold flex items-center gap-1.5 text-amber-300">
                <Sparkles className="w-3.5 h-3.5" /> Tip Ketepatan Sensor:
              </p>
              <p className="text-slate-400 leading-relaxed">
                Tanggalkan sarung telefon jika ia mempunyai magnet atau logam, dan jauhkan telefon daripada perkakas elektronik lain.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setAccuracy('high');
                setShowCalibrateModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/50"
            >
              Selesai Kalibrasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
