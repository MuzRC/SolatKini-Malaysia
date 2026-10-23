import React, { useState, useEffect } from 'react';
import {
  Bell,
  MapPin,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  BatteryCharging,
} from 'lucide-react';

interface OnboardingChecklistProps {
  onComplete: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ onComplete }) => {
  const [notifGranted, setNotifGranted] = useState<boolean>(false);
  const [locationGranted, setLocationGranted] = useState<boolean>(false);

  // Semak status kebenaran sedia ada bila skrin dibuka
  useEffect(() => {
    checkInitialPermissions();
  }, []);

  const checkInitialPermissions = async () => {
    // 1. Semak Notifikasi
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotifGranted(true);
      }
    }

    // 2. Semak Lokasi GPS
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const locStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (locStatus.state === 'granted') {
          setLocationGranted(true);
        }
        locStatus.onchange = () => {
          setLocationGranted(locStatus.state === 'granted');
        };
      } catch {
        // Pelayar atau Android WebView versi lama
      }
    }
  };

  // Minta Kebenaran Notifikasi (Android 13+)
  const handleRequestNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          setNotifGranted(true);
        }
      } catch (err) {
        console.warn('Gagal meminta kebenaran notifikasi:', err);
      }
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
          console.warn('Lokasi tidak dibenarkan atau ralat:', err.message);
          setLocationGranted(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // Kunci status siap onboarding ke storan kekal & buka app
  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_onboarding_completed', 'true');
    }
    onComplete();
  };

  const allReady = notifGranted && locationGranted;

  return (
    <div className="fixed inset-0 z-50 bg-[#060e0a] text-slate-100 flex flex-col justify-between p-5 sm:p-8 overflow-y-auto select-none">
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
            Sila aktifkan 2 kebenaran penting ini agar azan berkumandang tepat pada waktunya dan zon solat dikesan secara automatik.
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
                <div className="flex items-center gap-1 text-emerald-400 shrink-0 text-xs font-bold pt-1">
                  <CheckCircle2 className="w-5 h-5 fill-emerald-500/20" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestNotification}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition active:scale-95 shrink-0 cursor-pointer"
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
                <div className="flex items-center gap-1 text-teal-400 shrink-0 text-xs font-bold pt-1">
                  <CheckCircle2 className="w-5 h-5 fill-teal-500/20" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition active:scale-95 shrink-0 cursor-pointer"
                >
                  Aktifkan
                </button>
              )}
            </div>
          </div>

          {/* 3. TIPS PENGOPTIMUMAN BATERI */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <BatteryCharging className="w-4 h-4 shrink-0" />
              <span>Panduan Penjimatan Bateri Telefon:</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Untuk telefon Xiaomi, Vivo, Oppo, Realme atau Samsung, tetapkan aplikasi kepada <strong>&quot;Tiada Sekatan Bateri&quot;</strong> dan benarkan <strong>&quot;Autostart&quot;</strong> di tetapan peranti anda agar azan sentiasa berkumandang tepat pada waktunya.
            </p>
          </div>
        </div>
      </div>

      {/* Bahagian Bawah: Butang Teruskan */}
      <div className="max-w-lg w-full mx-auto pt-6 pb-2">
        <button
          type="button"
          onClick={handleFinish}
          className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition duration-200 active:scale-98 cursor-pointer ${
            allReady
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white ring-2 ring-emerald-400/30 shadow-emerald-950/60'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <span>{allReady ? 'Sedia! Mula Guna SolatKini' : 'Teruskan ke Aplikasi'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {!allReady && (
          <p className="text-[11px] text-center text-slate-500 mt-2">
            Anda boleh melaraskan kebenaran ini pada bila-bila masa di menu Tetapan.
          </p>
        )}
      </div>
    </div>
  );
};
