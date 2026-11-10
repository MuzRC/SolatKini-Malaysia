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
  AlertTriangle,
  X,
  Settings,
  RefreshCw,
  Info
} from 'lucide-react';
import { nativeAlarmService } from '../services/nativeAlarmService';

interface OnboardingChecklistProps {
  onComplete: () => void;
}

type ModalType = 'notif' | 'location' | 'battery' | null;

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ onComplete }) => {
  const [notifGranted, setNotifGranted] = useState<boolean>(false);
  const [locationGranted, setLocationGranted] = useState<boolean>(false);
  const [batteryIgnored, setBatteryIgnored] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State untuk mengawal popup modal bagi setiap kebenaran
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

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

  // 1. Tindakan Kebenaran Notifikasi
  const handleRequestNotification = async () => {
    setModalFeedback(null);
    try {
      let granted = false;
      if (nativeAlarmService && typeof nativeAlarmService.requestNotificationPermission === 'function') {
        granted = await nativeAlarmService.requestNotificationPermission();
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        const res = await Notification.requestPermission();
        granted = res === 'granted';
      }

      if (granted) {
        setNotifGranted(true);
        setActiveModal(null);
      } else {
        // Jika sistem Android tidak membuka popup (kerana pernah ditolak), buka popup modal panduan
        setActiveModal('notif');
        setModalFeedback('Kebenaran belum aktif. Sila tekan butang "Buka Tetapan Telefon" di bawah.');
      }
    } catch {
      setActiveModal('notif');
    }
  };

  // 2. Tindakan Kebenaran Lokasi GPS
  const handleRequestLocation = () => {
    setModalFeedback(null);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationGranted(true);
          setActiveModal(null);
        },
        (err) => {
          console.warn('GPS ditolak atau gagal dikesan:', err.message);
          // Buka popup modal paksa supaya pengguna ada jalan keluar ke tetapan
          setActiveModal('location');
          if (err.code === 1) {
            setModalFeedback('Akses lokasi telah disekat oleh Android (Pernah Ditolak). Sila tekan butang di bawah untuk membuka Tetapan Telefon dan hidupkan suis Lokasi.');
          } else if (err.code === 2) {
            setModalFeedback('Isyarat GPS mati. Sila hidupkan ikon Lokasi di bar tetapan pantas telefon anda.');
          } else {
            setModalFeedback('Masa carian GPS tamat. Sila cuba lagi atau pilih zon solat secara manual.');
          }
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setActiveModal('location');
      setModalFeedback('Peranti ini tidak menyokong fungsi geolokasi web.');
    }
  };

  // 3. Tindakan Kebenaran Bateri & Autostart
  const handleRequestBattery = async () => {
    try {
      if (nativeAlarmService && typeof nativeAlarmService.requestIgnoreBatteryOptimization === 'function') {
        await nativeAlarmService.requestIgnoreBatteryOptimization();
      }
    } catch (err) {
      console.warn('Dialog bateri tidak disokong:', err);
    }
    setBatteryIgnored(true);
  };

  const handleOpenAutostart = async () => {
    try {
      if (nativeAlarmService && typeof nativeAlarmService.openAutostartSettings === 'function') {
        await nativeAlarmService.openAutostartSettings();
      } else {
        await nativeAlarmService.openNotificationSettings();
      }
    } catch {
      await nativeAlarmService.openNotificationSettings();
    }
  };

  // Selesai onboarding: simpan zon & teruskan
  const handleFinish = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_onboarding_completed', 'true');
        if (!localStorage.getItem('solatkini_selected_zone')) {
          localStorage.setItem('solatkini_selected_zone', 'SBH07'); // Default Beaufort / Sabah
        }
      }
    } catch (err) {
      console.error('Ralat simpan localStorage:', err);
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
            Sila aktifkan 3 tetapan penting ini agar laungan azan dan jadual waktu solat beroperasi dengan lancar.
          </p>
        </div>

        {/* Senarai 3 Kad Kebenaran */}
        <div className="space-y-3.5 pt-2">
          {/* 1. KAD NOTIFIKASI */}
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
                    Memastikan penggera azan berbunyi tepat dan status waktu solat dipaparkan pada bar telefon.
                  </p>
                </div>
              </div>

              {notifGranted ? (
                <div className="flex items-center gap-1.5 text-emerald-400 shrink-0 text-xs font-bold pt-1">
                  <CheckCircle2 className="w-5 h-5 fill-emerald-500/20" />
                  <span>Aktif</span>
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

          {/* 2. KAD LOKASI (GPS) */}
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
                    Menyelaraskan zon solat rasmi JAKIM mengikut koordinat semasa anda secara automatik.
                  </p>
                </div>
              </div>

              {locationGranted ? (
                <div className="flex items-center gap-1.5 text-teal-400 shrink-0 text-xs font-bold pt-1">
                  <CheckCircle2 className="w-5 h-5 fill-teal-500/20" />
                  <span>Aktif</span>
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
                Pengguna <strong>Xiaomi, Vivo, Oppo, Realme atau Samsung</strong> wajib mematikan sekatan bateri agar telefon tidak membekukan azan semasa skrin ditutup.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveModal('battery')}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Buka Menu Kebenaran Bateri</span>
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
          Zon solat lalai akan diselaraskan secara automatik atau boleh dipilih manual di Dashboard.
        </p>
      </div>

      {/* ======================================================== */}
      {/* POPUP MODAL 1: KEBENARAN NOTIFIKASI & AZAN */}
      {/* ======================================================== */}
      {activeModal === 'notif' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#10241c] to-[#091510] border border-emerald-500/40 p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Kebenaran Notifikasi Azan</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Sistem Android 13 ke atas memerlukan kebenaran notifikasi bagi membolehkan laungan azan dan peringatan waktu solat berbunyi pada skrin kunci telefon anda.
            </p>

            {modalFeedback && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalFeedback}</span>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  await nativeAlarmService.openNotificationSettings();
                  setActiveModal(null);
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Buka Tetapan Notifikasi Telefon</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await checkPermissions();
                  setActiveModal(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Semak Semula Selepas Dibenarkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* POPUP MODAL 2: KEBENARAN LOKASI GPS (PENYELESAI BLOCKED) */}
      {/* ======================================================== */}
      {activeModal === 'location' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#132520] to-[#0a1512] border border-teal-500/40 p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Kebenaran Lokasi (GPS)</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Kebenaran lokasi diperlukan untuk memadankan zon waktu solat rasmi JAKIM secara automatik. Jika dialog izin pernah ditolak sebelum ini, sistem Android akan menyekat popup automatik.
            </p>

            {modalFeedback && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalFeedback}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <strong>Langkah membenarkan di telefon:</strong>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                <li>Tekan butang hijau <strong>&quot;Buka Tetapan Aplikasi&quot;</strong> di bawah.</li>
                <li>Pilih <strong>Permissions (Keizinan) &gt; Location (Lokasi)</strong>.</li>
                <li>Tandakan <strong>&quot;Allow only while using the app&quot;</strong>.</li>
              </ol>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  await nativeAlarmService.openNotificationSettings();
                  setActiveModal(null);
                }}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-950/50 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Buka Tetapan Aplikasi Telefon</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  // Pilihan sandaran: pengguna tetap boleh guna aplikasi secara manual
                  setLocationGranted(true);
                  setActiveModal(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
              >
                <span>Guna Zon Solat Manual Saja</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* POPUP MODAL 3: PANDUAN SEKATAN BATERI & AUTOSTART */}
      {/* ======================================================== */}
      {activeModal === 'battery' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#22170d] to-[#110c07] border border-amber-500/40 p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                  <BatteryCharging className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Sekatan Bateri & Autostart</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Untuk mengelakkan sistem operasi peranti membekukan azan bila telefon dikunci atau skrin terpadam, sila aktifkan kedua-dua kebenaran ini:
            </p>

            <div className="space-y-2.5 pt-1">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>1. Nyahaktif Sekatan Bateri (Doze Mode)</span>
                  {batteryIgnored && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Membenarkan penggera azan tepat beroperasi tanpa had penjimat bateri.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await handleRequestBattery();
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{batteryIgnored ? 'Sekatan Bateri Dinyahaktifkan' : 'Tekan untuk Nyahaktif Bateri'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white">
                  <span>2. Kebenaran Autostart (Xiaomi/Vivo/Oppo/Realme)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Membolehkan aplikasi menjadualkan semula azan selepas telefon dimatikan atau dihidupkan semula.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await handleOpenAutostart();
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Buka Menu Autostart Telefon</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setBatteryIgnored(true);
                  setActiveModal(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 shadow-md"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
