import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { JakimZone } from '../types/prayer';

interface QiblaCompassProps {
  currentZone: JakimZone;
}

// Koordinat Kaabah di Masjidil Haram, Makkah
const MAKKAH_LAT = 21.422487;
const MAKKAH_LNG = 39.826206;

/**
 * Formula Great Circle untuk mengira sudut bearing Kiblat tepat dari koordinat semasa
 */
function calculateQiblaBearing(lat: number, lng: number): number {
  const phiK = (MAKKAH_LAT * Math.PI) / 180;
  const lambdaK = (MAKKAH_LNG * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;

  const deltaLambda = lambdaK - lambda;
  const y = Math.sin(deltaLambda);
  const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(deltaLambda);

  const qibla = (Math.atan2(y, x) * 180) / Math.PI;
  return (qibla + 360) % 360;
}

export const QiblaCompass: React.FC<QiblaCompassProps> = ({ currentZone }) => {
  // Sudut arah kompas peranti (0° = Utara Sebenar)
  const [deviceHeading, setDeviceHeading] = useState<number>(0);

  // Kira sudut bearing Kiblat awal terus daripada koordinat zon semasa
  const [qiblaAngle, setQiblaAngle] = useState<number>(() => {
    const initLat = (currentZone as any)?.lat ?? 5.347;
    const initLng = (currentZone as any)?.lng ?? 115.743;
    return Math.round(calculateQiblaBearing(initLat, initLng) * 10) / 10;
  });

  // Status sensor & ketepatan
  const [sensorAccuracy, setSensorAccuracy] = useState<'high' | 'medium' | 'unreliable'>('medium');

  // Nilai sasaran dan penapis getaran (Smoothing Filter Refs)
  const targetHeadingRef = useRef<number>(0);
  const currentHeadingRef = useRef<number>(0);
  const lastRenderedHeadingRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastVibrateRef = useRef<number>(0);
  const sampleCountRef = useRef<number>(0);

  // 1. Kira sudut Kiblat mengikut zon JAKIM semasa terlebih dahulu, kemudian haluskan dengan GPS jika aktif
  useEffect(() => {
    const fallbackLat = (currentZone as any)?.lat ?? 5.347;
    const fallbackLng = (currentZone as any)?.lng ?? 115.743;
    setQiblaAngle(Math.round(calculateQiblaBearing(fallbackLat, fallbackLng) * 10) / 10);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const angle = calculateQiblaBearing(pos.coords.latitude, pos.coords.longitude);
          setQiblaAngle(Math.round(angle * 10) / 10);
        },
        () => {
          // Kekalkan sudut berasaskan koordinat zon jika GPS dimatikan
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 }
      );
    }
  }, [currentZone]);

  // 2. Enjin Penapis Getaran Sudut Bulatan (Circular Exponential Smoothing Filter @ 60fps)
  useEffect(() => {
    const SMOOTHING_FACTOR = 0.14;

    const updateSmoothHeading = () => {
      const current = currentHeadingRef.current;
      const target = targetHeadingRef.current;

      // Kira beza sudut terpendek dalam bulatan 360 darjah (mengelakkan sentakan di 0°/360°)
      let diff = ((target - current + 180) % 360) - 180;
      if (diff < -180) diff += 360;

      if (Math.abs(diff) < 0.05) {
        currentHeadingRef.current = target;
      } else {
        currentHeadingRef.current = (current + diff * SMOOTHING_FACTOR + 360) % 360;
      }

      // Hanya kemas kini state React jika sudut berubah sekurang-kurangnya 0.1 darjah (jimat bateri & CPU)
      let renderDiff = Math.abs(currentHeadingRef.current - lastRenderedHeadingRef.current);
      if (renderDiff > 180) renderDiff = 360 - renderDiff;

      if (renderDiff >= 0.1) {
        lastRenderedHeadingRef.current = currentHeadingRef.current;
        setDeviceHeading(currentHeadingRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(updateSmoothHeading);
    };

    animationFrameRef.current = requestAnimationFrame(updateSmoothHeading);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // 3. Pendengar Sensor Orientasi Asli Android & iOS (dengan sokongan fallback)
  useEffect(() => {
    let hasAbsoluteEventFired = false;

    const processOrientationEvent = (e: any, isAbsoluteEvent: boolean) => {
      if (!isAbsoluteEvent && hasAbsoluteEventFired) {
        return; // Utamakan deviceorientationabsolute jika peranti menyokongnya
      }
      if (isAbsoluteEvent) {
        hasAbsoluteEventFired = true;
      }

      let heading: number | null = null;

      // A. Sokongan iOS / Safari
      if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) {
        heading = e.webkitCompassHeading;
        if (typeof e.webkitCompassAccuracy === 'number') {
          if (e.webkitCompassAccuracy >= 0 && e.webkitCompassAccuracy <= 15) {
            setSensorAccuracy('high');
          } else if (e.webkitCompassAccuracy > 15 && e.webkitCompassAccuracy <= 35) {
            setSensorAccuracy('medium');
          } else if (e.webkitCompassAccuracy > 35 || e.webkitCompassAccuracy < 0) {
            setSensorAccuracy('unreliable');
          }
        }
      }
      // B. Sokongan Android Native (deviceorientationabsolute / alpha)
      else if (typeof e.alpha === 'number' && !isNaN(e.alpha)) {
        const screenAngle =
          typeof window !== 'undefined' && window.screen?.orientation?.angle
            ? window.screen.orientation.angle
            : 0;

        heading = (360 - e.alpha + screenAngle) % 360;

        sampleCountRef.current += 1;
        if (sampleCountRef.current > 15) {
          if (e.absolute === true || isAbsoluteEvent) {
            setSensorAccuracy('high');
          } else {
            setSensorAccuracy('medium');
          }
        }
      }

      if (heading !== null) {
        targetHeadingRef.current = (heading + 360) % 360;
      }
    };

    const handleAbsolute = (e: Event) => processOrientationEvent(e, true);
    const handleStandard = (e: Event) => processOrientationEvent(e, false);

    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleAbsolute as EventListener, true);
    }
    if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', handleStandard as EventListener, true);
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleAbsolute as EventListener, true);
      window.removeEventListener('deviceorientation', handleStandard as EventListener, true);
    };
  }, []);

  // Sudut relatif dari kepala telefon ke arah Kiblat (-180° hingga +180°)
  const qiblaRelativeAngle = ((qiblaAngle - deviceHeading + 540) % 360) - 180;
  const isAligned = Math.abs(qiblaRelativeAngle) <= 3; // Toleransi tepat +-3 darjah

  // 4. Sentuhan Haptik bila sudut tepat menghadap Kaabah
  useEffect(() => {
    if (isAligned) {
      const now = Date.now();
      if (now - lastVibrateRef.current > 1500) {
        lastVibrateRef.current = now;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([40, 60, 40]);
          } catch {}
        }
      }
    }
  }, [isAligned]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[75vh] w-full max-w-md mx-auto px-4 py-2 select-none animate-in fade-in duration-300">
      {/* 1. Header & Status Sensor Ketepatan */}
      <div className="w-full text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 shadow-inner">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              sensorAccuracy === 'high'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : sensorAccuracy === 'medium'
                ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                : 'bg-rose-500 animate-ping'
            }`}
          />
          <span className="text-[11px] font-bold text-slate-300">
            {sensorAccuracy === 'high'
              ? 'Sensor Stabil & Tepat'
              : sensorAccuracy === 'medium'
              ? 'Sensor Sedang Menyelaras'
              : 'Perlu Kalibrasi Angka 8'}
          </span>
        </div>

        <h2 className="text-xl font-extrabold text-white flex items-center justify-center gap-2">
          <span>Kompas Arah Kiblat</span>
          {isAligned && <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />}
        </h2>

        <p className="text-xs text-slate-400">
          Zon <span className="text-emerald-400 font-bold">{currentZone.daerah.split(',')[0]}</span> ({currentZone.code}) • Kiblat: <strong className="text-white font-mono">{qiblaAngle.toFixed(1)}°</strong>
        </p>
      </div>

      {/* 2. DAIL KOMPAS ISLAMIK (Putaran 60fps tanpa konflik CSS transition di titik 0°/360°) */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 my-6 flex items-center justify-center">
        {/* Glow Lingkaran Luar bila Kiblat Tepat */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 pointer-events-none ${
            isAligned
              ? 'bg-emerald-500/15 shadow-[0_0_50px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/60 scale-105'
              : 'bg-slate-900/40 shadow-xl border border-slate-800/80'
          }`}
        />

        {/* Piring Dail Berpusing mengikut arah hadap telefon (-deviceHeading) */}
        <div
          className="absolute inset-2 rounded-full border border-slate-800/80 flex items-center justify-center bg-gradient-to-b from-[#0a1410] to-[#040806] will-change-transform shadow-2xl"
          style={{
            transform: `rotate(${-deviceHeading}deg)`,
          }}
        >
          {/* Senggatan & Titik Kompas 360 Darjah */}
          <div className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <div
                key={deg}
                className="absolute w-full h-full flex justify-center items-start pt-2"
                style={{ transform: `rotate(${deg}deg)` }}
              >
                <div
                  className={`rounded-full ${
                    deg % 90 === 0
                      ? 'w-1 h-3 bg-slate-300'
                      : 'w-0.5 h-1.5 bg-slate-600'
                  }`}
                />
              </div>
            ))}

            {/* Huruf Arah Utama: U, T, S, B */}
            <span className="absolute top-4 text-xs font-black text-rose-500">U</span>
            <span className="absolute right-4 text-xs font-bold text-slate-400">T</span>
            <span className="absolute bottom-4 text-xs font-bold text-slate-400">S</span>
            <span className="absolute left-4 text-xs font-bold text-slate-400">B</span>
          </div>

          {/* JARUM PENUNJUK KAABAH KIBLAT */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transform: `rotate(${qiblaAngle}deg)` }}
          >
            <div className="flex flex-col items-center -translate-y-20 sm:-translate-y-24">
              <div
                className={`p-1.5 rounded-xl border transition-all duration-300 shadow-lg ${
                  isAligned
                    ? 'bg-emerald-500 text-white border-emerald-300 scale-110 shadow-emerald-500/50'
                    : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50 shadow-emerald-950/80'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4 6.5L12 2L20 6.5V17.5L12 22L4 17.5V6.5Z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 2V22" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 6.5L20 17.5" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
                  <path d="M4 11.5L20 11.5" stroke="#f59e0b" strokeWidth="2" />
                </svg>
              </div>

              <div className="w-0.5 h-14 bg-gradient-to-t from-transparent via-amber-400 to-emerald-400 shadow-[0_0_8px_#f59e0b]" />
            </div>
          </div>

          {/* Pusat Kompas */}
          <div
            className={`w-12 h-12 rounded-full border flex items-center justify-center shadow-lg transition-all duration-300 ${
              isAligned
                ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_15px_#10b981]'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-slate-950/80 border border-white/20" />
          </div>
        </div>

        {/* Tanda Kepala Telefon (Top Reticle) */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
          <div
            className={`w-3 h-3 rotate-45 border-t-2 border-l-2 transition-colors duration-200 ${
              isAligned ? 'border-emerald-400 shadow-[0_0_8px_#34d399]' : 'border-rose-500'
            }`}
          />
        </div>
      </div>

      {/* 3. Panel Status & Bimbingan Pengguna */}
      <div className="w-full space-y-3">
        <div
          className={`p-4 rounded-2xl border text-center transition-all duration-300 ${
            isAligned
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/50'
              : 'bg-slate-900/70 border-slate-800'
          }`}
        >
          {isAligned ? (
            <div className="space-y-1 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 fill-emerald-500/20" />
                <span>Kiblat Tepat!</span>
              </div>
              <p className="text-xs text-slate-300">
                Peranti anda kini tepat menghadap ke arah Baitullah Al-Haram, Makkah.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400">
                Pusing telefon anda{' '}
                <span className="text-amber-400 font-bold">
                  {qiblaRelativeAngle > 0
                    ? `${Math.abs(Math.round(qiblaRelativeAngle))}° ke Kanan`
                    : `${Math.abs(Math.round(qiblaRelativeAngle))}° ke Kiri`}
                </span>
              </div>
              <div className="flex items-center justify-center gap-3 text-xs font-mono text-slate-400">
                <span>Hadap: <strong className="text-white">{Math.round(deviceHeading)}°</strong></span>
                <span>•</span>
                <span>Kiblat: <strong className="text-emerald-400">{Math.round(qiblaAngle)}°</strong></span>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p>
            Jauhkan telefon daripada bahan magnet atau logam. Jika kompas tersangkut, hayunkan peranti membentuk <strong>angka 8 di udara</strong> untuk kalibrasi sensor kompas.
          </p>
        </div>
      </div>
    </div>
  );
};
