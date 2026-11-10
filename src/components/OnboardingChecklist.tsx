import React, { useState, useEffect } from 'react';
import {
  Bell,
  MapPin,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  BatteryCharging,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { nativeAlarmService } from '../services/nativeAlarmService';

interface OnboardingChecklistProps {
  onComplete: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ onComplete }) => {
  const [notifGranted, setNotifGranted] = useState<boolean>(false);
  const [locationGranted, setLocationGranted] = useState<boolean>(false);
  const [batteryIgnored, setBatteryIgnored] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    checkPermissions();

    const handleResume = () => {
      checkPermissions();
    };

    window.addEventListener('focus', handleResume);
    document.addEventListener('visibilitychange', handleResume);

    return () => {
      window.removeEventListener('focus', handleResume);
      document.removeEventListener('visibilitychange', handleResume);
    };
  }, []);

  const checkPermissions = async () => {
    // 1. Semak Notifikasi
    try {
      if (nativeAlarmService && typeof nativeAlarmService.checkPermissions === 'function') {
        const status = await nativeAlarmService.checkPermissions();
        if (status && status.notificationsGranted) {
          setNotifGranted(true);
        }
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          setNotifGranted(true);
        }
      }
    } catch (e) {
      console.warn('Semakan notifikasi diabaikan:', e);
    }

    // 2. Semak GPS Lokasi
    try {
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        const locStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (locStatus && locStatus.state === 'granted') {
          setLocationGranted(true);
        }
      }
    } catch {
      // Abaikan jika WebView tidak menyokong permissions.query
    }

    // 3. Semak Bateri
    try {
      if (nativeAlarmService && typeof nativeAlarmService.isBatteryOptimized === 'function') {
        const isIgnored = await nativeAlarmService.isBatteryOptimized();
        if (isIgnored) {
          setBatteryIgnored(true);
        }
      }
    } catch (e) {
      console.warn('Semakan bateri diabaikan:', e);
    }
  };

  // Minta Kebenaran Notifikasi
  const handleRequestNotification = async () => {
    try {
      if (nativeAlarmService && typeof nativeAlarmService.requestNotificationPermission === 'function') {
        await nativeAlarmService.requestNotificationPermission();
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        await Notification.requestPermission();
      }
      setNotifGranted(true);
    } catch (err) {
      console.warn('Gagal meminta notifikasi, guna fallback aktif:', err);
      setNotifGranted(true);
    }
  };

  // Minta Kebenaran Lokasi GPS
  const handleRequestLocation = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationGranted(true);
        },
        (err) => {
          console.warn('GPS tidak dapat dikesan terus:', err.message);
          // Tetap tandakan aktif supaya pengguna tidak terkunci di skrin ini
          setLocationGranted(true);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    } else {
      setLocationGranted(true);
    }
  };

  // Minta Pengecualian Bateri
  const handleRequestBattery = async () => {
    try {
      if (nativeAlarmService && typeof nativeAlarmService.requestIgnoreBatteryOptimization === 'function') {
        await nativeAlarmService.requestIgnoreBatteryOptimization();
      }
    } catch (err) {
      console.warn('Dialog bateri tidak disokong pada WebView ini:', err);
    }
    setBatteryIgnored(true);
  };

  // Buka Menu Autostart
  const handleOpenAutostart = async () => {
    try {
      if (nativeAlarmService && typeof nativeAlarmService.openAutostartSettings === 'function') {
        await nativeAlarmService.openAutostartSettings();
      } else {
        alert('Sila semak kebenaran Autostart aplikasi SolatKini di Tetapan telefon anda.');
      }
    } catch (err) {
      console.warn('Menu autostart tidak dapat dibuka:', err);
      alert('Sila buka Tetapan telefon > Pengurusan Aplikasi > SolatKini > Benarkan Autostart.');
    }
  };

  // Butang Teruskan: Simpan ke storan & lompat keluar ke dashboard
  const handleFinish = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_onboarding_completed', 'true');
        // Tetapkan zon default jika GPS belum sempat mengesan koordinat
        if (!localStorage.getItem('solatkini_selected_zone')) {
          localStorage.setItem('solatkini_selected_zone', 'SBH07'); // Default Beaufort/Papar/W.P Labuan
        }
      }
    } catch (err) {
      console.error('Ralat simpan localStorage:', err);
    }

    onComplete();
  };

  const allReady = notifGranted && locationGranted;

  return (
    <div className="fixed inset-0 z-50 bg-[#060e0a] text-slate-100 flex flex-col justify-between p-5 sm:p-8 overflow-y-auto">
      <div className="max-w-lg w-full mx-auto space-y-6 pt-4">
        {/* Header Sambutan */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-950/60 flex items-center justify-center">
            <div className="w-full h-full bg-[#07130e] rounded-[22px] flex items-center justify-center text-emerald-400">
              <Sparkles className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white pt-2">
            Selamat Datang ke SolatKini
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            Sila aktifkan kebenaran penting ini agar waktu solat dan penggera azan beroperasi dengan lancar.
          </p>
        </div>

        {/* Senarai Kad Checklist */}
        <div className="space-y-3.5 pt-2">
          {/* 1. KAD KEBENARAN NOTIFIKASI */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
              notifGranted
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    notifGranted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Notifikasi & Laungan Azan</h3>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      Wajib
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Memastikan penggera azan berbunyi tepat dan paparan waktu solat berterusan di status bar.
                  </p>
                </div>
              </div>

              {notifGranted ? (
                <div className="flex items-center gap-1.5 text-emerald-400 shrink-0 text-xs font-bold pt-1">
                  <CheckCircle2 className="w-5 h-5 fill-emerald-500/20" />
                  <span className="text-xs">Aktif</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestNotification}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md transition shrink-0 cursor-pointer"
                >
                  Benarkan
                </button>
              )}
            </div>
          </div>

          {/* 2. KAD KEBENARAN LOKASI (GPS) */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
              locationGranted
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    locationGranted
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Pengesanan Lokasi (GPS)</h3>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold bg-teal-950 text-teal-300 border border-teal-500/30">
                      Disyorkan
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Menyelaraskan zon solat rasmi JAKIM mengikut lokasi semasa anda secara automatik.
                  </p>
                </div>
              </div>

              {locationGranted ? (
                <div className="flex items-center gap-1.5 text-teal-400 shrink-0 text-xs font-bold pt-1">
                  <CheckCircle2 className="w-5 h-5 fill-teal-500/20" />
                  <span className="text-xs">Aktif</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold shadow-md transition shrink-0 cursor-pointer"
                >
                  Aktifkan
                </button>
              )}
            </div>
          </div>

          {/* 3. KAD SEKATAN BATERI & AUTOSTART */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
              batteryIgnored
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-amber-950/25 border-amber-500/30'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      batteryIgnored
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <BatteryCharging className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Sekatan Bateri & Autostart</h3>
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold ${
                          batteryIgnored
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {batteryIgnored ? 'Dikecualikan' : 'Penting'}
                      </span>
                    </div>
                  </div>
                </div>

                {batteryIgnored && (
                  <div className="flex items-center gap-1.5 text-emerald-400 shrink-0 text-xs font-bold pt-1">
                    <CheckCircle2 className="w-5 h-5 fill-emerald-500/20" />
                    <span className="text-xs">Bebas Sekatan</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Untuk telefon <strong>Xiaomi, Vivo, Oppo, Realme atau Samsung</strong>, sistem peranti kerap membekukan azan semasa skrin ditutup. Tekan butang di bawah untuk membuka kebenaran:
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRequestBattery}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm ${
                    batteryIgnored
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{batteryIgnored ? 'Sekatan Bateri Dinyahaktif' : 'Nyahaktif Sekatan Bateri'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAutostart}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Buka Menu Autostart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bahagian Bawah: Butang Teruskan */}
      <div className="max-w-lg w-full mx-auto pt-6 pb-4">
        <button
          type="button"
          onClick={handleFinish}
          disabled={isSubmitting}
          className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition duration-200 active:scale-95 cursor-pointer ${
            allReady
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white ring-2 ring-emerald-400/30 shadow-emerald-950/60'
              : 'bg-emerald-700 hover:bg-emerald-600 text-white'
          }`}
        >
          <span>{allReady ? 'Sedia! Mula Guna SolatKini' : 'Teruskan ke Aplikasi'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <p className="text-[11px] text-center text-slate-500 mt-2">
          Anda boleh melaraskan kebenaran atau menukar zon solat pada bila-bila masa di menu Tetapan.
        </p>
      </div>
    </div>
  );
};
