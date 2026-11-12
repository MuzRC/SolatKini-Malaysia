import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Bell,
  BellOff,
  Volume2,
  Calendar,
  Clock,
  ChevronDown,
  Navigation,
  Sliders,
  X,
  Moon,
  SunMedium,
  Check,
  RefreshCw,
  WifiOff,
  AlertTriangle,
  Settings,
  Info,
  Sparkles
} from 'lucide-react';
import {
  DayPrayerTimes,
  JakimZone,
  PrayerKey,
  AzanVoice,
  AppNotificationSettings,
  FardPrayerKey,
  FARD_PRAYERS_ORDER
} from '../types/prayer';
import { findNearestZone } from '../data/jakimZones';
import {
  determineNextPrayer,
  PRAYER_LABELS,
  PRAYER_KEYS_ORDER,
  NextPrayerInfo,
  getFastingCountdown,
} from '../services/prayerService';
import { formatDisplayTime } from '../utils/prayerCalculator';
import { AZAN_OPTIONS } from '../services/audioNotificationService';
import { getHijriDate, getFastingRecommendation } from '../utils/hijriCalendar';
import { widgetService } from '../services/widgetService';
import { nativeAlarmService } from '../services/nativeAlarmService';

// Komponen pecahan modular
import { ZoneSelectModal } from './ZoneSelectModal';
import { DndGuideModal } from './DndGuideModal';
import { AudioSettingsModal } from './AudioSettingsModal';
import { DailyFardChecklist } from './DailyFardChecklist';

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

interface PrayerDashboardProps {
  currentZone: JakimZone;
  onZoneChange: (zone: JakimZone) => void;
  prayerTimes: DayPrayerTimes;
  isOfflineCalculated: boolean;
  lastSyncTime?: string;
  isLiveSyncing?: boolean;
  onLiveSync?: () => void;
  onNavigateToTab?: (tab: 'kiblat' | 'puasa' | 'wirid' | 'doa' | 'widget' | 'tetapan' | string) => void;
  onTriggerTestAlarm: (key: PrayerKey, name: string, voice: AzanVoice) => void;
}

export const PrayerDashboard: React.FC<PrayerDashboardProps> = ({
  currentZone,
  onZoneChange,
  prayerTimes,
  isOfflineCalculated,
  lastSyncTime,
  isLiveSyncing,
  onLiveSync,
  onNavigateToTab: _onNavigateToTab,
  onTriggerTestAlarm,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [nextPrayerInfo, setNextPrayerInfo] = useState<NextPrayerInfo>(() =>
    determineNextPrayer(prayerTimes, new Date())
  );

  // Status modal popup
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isDndGuideOpen, setIsDndGuideOpen] = useState(false);

  // Status sensor & sistem peranti
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<{ message: string; isDenied: boolean } | null>(null);
  const [notificationsGranted, setNotificationsGranted] = useState<boolean>(true);
  const [isAutoTimeEnabled, setIsAutoTimeEnabled] = useState<boolean>(true);

  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine ?? true;
    }
    return true;
  });

  const [selectedVoice, setSelectedVoice] = useState<AzanVoice>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('solatkini_azan_voice') as AzanVoice) || 'jakim';
    }
    return 'jakim';
  });

  const [notificationSettings, setNotificationSettings] = useState<AppNotificationSettings>(() => {
    const defaultSettings: AppNotificationSettings = {
      masterEnabled: true,
      highPriorityAlarm: true,
      vibrate: true,
      persistentNotification: true,
      preferences: {
        imsak: { enabled: false, voice: 'jakim', beforeMinutes: 0, bypassSilentTone: true },
        subuh: { enabled: true, voice: 'subuh_special', beforeMinutes: 0, bypassSilentTone: true },
        syuruk: { enabled: false, voice: 'jakim', beforeMinutes: 0, bypassSilentTone: false },
        zohor: { enabled: true, voice: 'jakim', beforeMinutes: 0, bypassSilentTone: true },
        asar: { enabled: true, voice: 'jakim', beforeMinutes: 0, bypassSilentTone: true },
        maghrib: { enabled: true, voice: 'makkah', beforeMinutes: 0, bypassSilentTone: true },
        isyak: { enabled: true, voice: 'madinah', beforeMinutes: 0, bypassSilentTone: true },
      },
    };
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('solatkini_notif_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...defaultSettings,
            ...parsed,
            preferences: {
              ...defaultSettings.preferences,
              ...(parsed.preferences || {}),
            },
            persistentNotification:
              parsed.persistentNotification !== undefined ? parsed.persistentNotification : true,
          };
        }
      } catch {}
    }
    return defaultSettings;
  });

  const hijri = getHijriDate(currentTime);
  const recommendation = getFastingRecommendation(currentTime, hijri);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPermsAndState = useCallback(() => {
    nativeAlarmService.checkPermissions().then((res) => {
      setNotificationsGranted(res.notificationsGranted);
    });
    if (typeof nativeAlarmService.checkAutoTime === 'function') {
      nativeAlarmService.checkAutoTime().then((enabled) => {
        setIsAutoTimeEnabled(enabled);
      });
    }
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine ?? true);
    }
    if (typeof window !== 'undefined') {
      const savedVoice = localStorage.getItem('solatkini_azan_voice') as AzanVoice | null;
      if (savedVoice) {
        setSelectedVoice(savedVoice);
      }
    }

    const now = new Date();
    setCurrentTime(now);
    setNextPrayerInfo(determineNextPrayer(prayerTimes, now));

    const todayStr = getLocalDateString(now);
    if (prayerTimes && prayerTimes.date !== todayStr && onLiveSync && !isLiveSyncing) {
      onLiveSync();
    }

    if (prayerTimes && currentZone) {
      const currentHijri = getHijriDate(now);
      const isPersistentEnabled = notificationSettings.persistentNotification ?? true;
      widgetService.syncPersistentNotification(
        prayerTimes,
        currentZone,
        currentHijri.formatted,
        isPersistentEnabled
      );
    }
  }, [prayerTimes, onLiveSync, isLiveSyncing, currentZone, notificationSettings.persistentNotification]);

  useEffect(() => {
    checkPermsAndState();
    window.addEventListener('focus', checkPermsAndState);
    document.addEventListener('visibilitychange', checkPermsAndState);
    return () => {
      window.removeEventListener('focus', checkPermsAndState);
      document.removeEventListener('visibilitychange', checkPermsAndState);
    };
  }, [checkPermsAndState]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setNextPrayerInfo(determineNextPrayer(prayerTimes, now));
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes]);

  useEffect(() => {
    if (prayerTimes && currentZone) {
      widgetService.syncWidget(prayerTimes, currentZone);
    }
  }, [prayerTimes, currentZone]);

  // Penjadualan automatik ke Android AlarmManager apabila jadual, suara, atau suis waktu solat berubah
  useEffect(() => {
    if (prayerTimes && prayerTimes.times) {
      const list = PRAYER_KEYS_ORDER.map((k) => ({
        key: k,
        label: PRAYER_LABELS[k],
        time: prayerTimes.times[k],
        displayTime: formatDisplayTime(prayerTimes.times[k]),
        voice: (k === 'subuh' && selectedVoice === 'jakim' ? 'subuh_special' : selectedVoice) as AzanVoice,
      }));

      const enabledMap: Record<PrayerKey, boolean> = {
        imsak: false,
        subuh: notificationSettings.preferences.subuh?.enabled ?? true,
        syuruk: false,
        zohor: notificationSettings.preferences.zohor?.enabled ?? true,
        asar: notificationSettings.preferences.asar?.enabled ?? true,
        maghrib: notificationSettings.preferences.maghrib?.enabled ?? true,
        isyak: notificationSettings.preferences.isyak?.enabled ?? true,
      };

      if (notificationSettings.masterEnabled) {
        nativeAlarmService.schedulePrayers(list, selectedVoice, enabledMap);
      } else {
        nativeAlarmService.cancelAllAlarms();
      }
    }
  }, [prayerTimes, selectedVoice, notificationSettings]);

  useEffect(() => {
    if (prayerTimes && currentZone) {
      const isPersistentEnabled = notificationSettings.persistentNotification ?? true;
      widgetService.syncPersistentNotification(
        prayerTimes,
        currentZone,
        hijri.formatted,
        isPersistentEnabled
      );
    }
  }, [prayerTimes, currentZone, notificationSettings.persistentNotification, hijri.formatted, nextPrayerInfo.nextKey]);

  const [isUserFastingToday, setIsUserFastingToday] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('solatkini_fasting_date');
      const savedActive = localStorage.getItem('solatkini_fasting_active');
      const today = getLocalDateString(new Date());
      return savedDate === today && savedActive === 'true';
    }
    return false;
  });

  const toggleUserFastingToday = () => {
    setIsUserFastingToday((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        const today = getLocalDateString(new Date());
        localStorage.setItem('solatkini_fasting_date', today);
        localStorage.setItem('solatkini_fasting_active', next ? 'true' : 'false');
      }
      return next;
    });
  };

  const isFastingActive = hijri.isRamadan || isUserFastingToday;
  const fastingCountdown = getFastingCountdown(prayerTimes, currentTime, {
    isRamadan: hijri.isRamadan,
    isUserFasting: isUserFastingToday,
  });

  const [prayerChecklist, setPrayerChecklist] = useState<Record<FardPrayerKey, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`solatkini_prayer_checklist_${prayerTimes.date}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { subuh: false, zohor: false, asar: false, maghrib: false, isyak: false };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`solatkini_prayer_checklist_${prayerTimes.date}`);
        if (saved) {
          setPrayerChecklist(JSON.parse(saved));
        } else {
          setPrayerChecklist({ subuh: false, zohor: false, asar: false, maghrib: false, isyak: false });
        }
      } catch {}
    }
  }, [prayerTimes.date]);

  const handleTogglePrayerDone = (fardKey: FardPrayerKey) => {
    setPrayerChecklist((prev) => {
      const updated = { ...prev, [fardKey]: !prev[fardKey] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`solatkini_prayer_checklist_${prayerTimes.date}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {}
    }
  };

  const handleResetChecklist = () => {
    const initial = { subuh: false, zohor: false, asar: false, maghrib: false, isyak: false };
    setPrayerChecklist(initial);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`solatkini_prayer_checklist_${prayerTimes.date}`);
    }
  };

  const handleVoiceSelect = (voice: AzanVoice) => {
    setSelectedVoice(voice);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_azan_voice', voice);
      localStorage.setItem('solatkini_active_device_voice', voice);
    }
    nativeAlarmService.setActiveVoice(voice);

    // Kemas kini state notificationSettings; useEffect akan menjadualkan semula penggera secara tunggal & selamat
    setNotificationSettings((prev) => {
      const updated: AppNotificationSettings = {
        ...prev,
        preferences: {
          ...prev.preferences,
          subuh: {
            ...(prev.preferences?.subuh || {}),
            voice: voice === 'jakim' ? 'subuh_special' : voice,
            enabled: prev.preferences?.subuh?.enabled ?? true,
            beforeMinutes: 0,
            bypassSilentTone: true,
          },
          zohor: { ...(prev.preferences?.zohor || {}), voice, enabled: prev.preferences?.zohor?.enabled ?? true, beforeMinutes: 0, bypassSilentTone: true },
          asar: { ...(prev.preferences?.asar || {}), voice, enabled: prev.preferences?.asar?.enabled ?? true, beforeMinutes: 0, bypassSilentTone: true },
          maghrib: { ...(prev.preferences?.maghrib || {}), voice, enabled: prev.preferences?.maghrib?.enabled ?? true, beforeMinutes: 0, bypassSilentTone: true },
          isyak: { ...(prev.preferences?.isyak || {}), voice, enabled: prev.preferences?.isyak?.enabled ?? true, beforeMinutes: 0, bypassSilentTone: true },
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_notif_settings', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleTogglePrayerNotif = async (key: PrayerKey) => {
    const isCurrentlyEnabled = notificationSettings.preferences?.[key]?.enabled;
    if (!isCurrentlyEnabled) {
      const perms = await nativeAlarmService.checkPermissions();
      if (!perms.notificationsGranted) {
        const granted = await nativeAlarmService.requestNotificationPermission();
        setNotificationsGranted(granted);
      }
    }

    setNotificationSettings((prev) => {
      const currentPref = prev.preferences?.[key] || { enabled: true, voice: 'jakim', beforeMinutes: 0, bypassSilentTone: true };
      const updated = {
        ...prev,
        preferences: {
          ...prev.preferences,
          [key]: { ...currentPref, enabled: !currentPref.enabled },
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_notif_settings', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Pengesanan GPS dengan pengendalian ralat selamat
  const handleDetectGPS = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError({
        message: 'Peranti anda tidak menyokong pengesanan geolokasi GPS.',
        isDenied: false,
      });
      return;
    }
    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const nearest = findNearestZone(pos.coords.latitude, pos.coords.longitude);
        onZoneChange(nearest);
        setLocationError(null);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setLocationError({
            message: 'Kebenaran lokasi telah disekat oleh Android. Sila benarkan akses Lokasi pada menu Keizinan Aplikasi (App Info > Permissions) di Tetapan Telefon.',
            isDenied: true,
          });
        } else if (err.code === 2) {
          setLocationError({
            message: 'GPS peranti dimatikan atau tiada isyarat. Sila hidupkan suis Lokasi di bar atas telefon.',
            isDenied: false,
          });
        } else if (err.code === 3) {
          setLocationError({
            message: 'Masa carian GPS tamat. Sila cuba lagi atau pilih zon solat secara manual.',
            isDenied: false,
          });
        } else {
          setLocationError({
            message: `Gagal mengesan lokasi (${err.message || 'Ralat tidak diketahui'}). Sila pilih secara manual.`,
            isDenied: false,
          });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 select-none">
      {/* 1. Header & Kawalan Zon */}
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
              <span>{hijri.formatted}</span>
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
              onClick={() => setIsZoneModalOpen(true)}
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
              onClick={handleDetectGPS}
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
                  onClick={() => setIsZoneModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-[11px] flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Pilih Zon Manual</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setLocationError(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Amaran Jam Telefon Automatik Dimatikan */}
      {!isAutoTimeEnabled && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-rose-950/80 via-amber-950/70 to-[#1f0f0a] border border-rose-500/50 text-left space-y-2.5 shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
              <h4 className="text-sm font-bold text-white">
                Masa Automatik Telefon Dimatikan
              </h4>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase tracking-wider">
              Risiko Waktu Tersasar
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Pilihan <strong>&quot;Set time automatically&quot;</strong> dimatikan di tetapan telefon anda. Sekiranya jam telefon dianjak secara manual, jadual waktu solat dan laungan azan mungkin tidak tepat.
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              onClick={async () => {
                await nativeAlarmService.openDateSettings();
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-rose-950/40 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              Buka Tetapan Tarikh & Masa Telefon
            </button>
            <button
              onClick={() => {
                nativeAlarmService.checkAutoTime().then((enabled) => {
                  setIsAutoTimeEnabled(enabled);
                });
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Semak Semula
            </button>
          </div>
        </div>
      )}

      {/* 3. Amaran Kebenaran Notifikasi Belum Aktif */}
      {!notificationsGranted && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-950/70 to-[#1e1408] border border-amber-500/50 text-left space-y-2.5 shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BellOff className="w-5 h-5 text-amber-400 shrink-0" />
              <h4 className="text-sm font-bold text-white">
                Kebenaran Notifikasi Belum Diaktifkan
              </h4>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
              Tindakan Diperlukan
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Untuk membolehkan laungan azan dan penggera waktu solat berbunyi pada telefon anda, sila benarkan notifikasi sistem Android.
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              onClick={async () => {
                const granted = await nativeAlarmService.requestNotificationPermission();
                setNotificationsGranted(granted);
                if (!granted) {
                  await nativeAlarmService.openNotificationSettings();
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-950/40 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 fill-slate-950" />
              Minta Kebenaran Notifikasi Sekarang
            </button>
            <button
              onClick={async () => {
                await nativeAlarmService.openNotificationSettings();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition cursor-pointer"
            >
              Buka Tetapan Notifikasi
            </button>
          </div>
        </div>
      )}

      {/* 4. Kad Hero Waktu Solat Seterusnya & Pembilang Detik */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e241c] via-[#091712] to-[#060c0a] border border-emerald-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-3">
              <Clock className="w-3.5 h-3.5" />
              Solat Seterusnya: {nextPrayerInfo.nextLabel}
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight tabular-nums">
                {nextPrayerInfo.countdownFormatted}
              </h2>
            </div>
            <p className="text-sm text-slate-300 mt-2">
              Waktu masuk pada{' '}
              <strong className="text-amber-300 font-semibold text-base">
                {nextPrayerInfo.nextDisplayTime}
              </strong>{' '}
              ({currentZone.daerah})
            </p>

            {isFastingActive ? (
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-emerald-200/90 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2.5 rounded-xl shadow-inner">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Moon className="w-4 h-4 text-amber-300 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-white">{fastingCountdown.title}:</span>{' '}
                    {fastingCountdown.remainingFormatted} (Waktu Berbuka: {formatDisplayTime(prayerTimes.times.maghrib)})
                  </div>
                </div>
                {!hijri.isRamadan && (
                  <button
                    onClick={toggleUserFastingToday}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-900/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/20 transition shrink-0 cursor-pointer"
                    title="Nyahaktifkan mod berpuasa untuk hari ini"
                  >
                    Batal Puasa
                  </button>
                )}
              </div>
            ) : recommendation.isRecommended ? (
              <div className="mt-4 flex items-center justify-between gap-2.5 text-xs text-amber-200/90 bg-amber-950/40 border border-amber-500/30 px-3.5 py-2 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">
                    <strong>{recommendation.type}:</strong> {recommendation.description}
                  </span>
                </div>
                <button
                  onClick={toggleUserFastingToday}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold border border-amber-400/30 transition shrink-0 active:scale-95 cursor-pointer"
                >
                  Saya Berpuasa
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => {
                const testVoice = (nextPrayerInfo.nextKey === 'subuh' && selectedVoice === 'jakim' ? 'subuh_special' : selectedVoice) as AzanVoice;
                onTriggerTestAlarm(nextPrayerInfo.nextKey, nextPrayerInfo.nextLabel, testVoice);
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-900/40 transition active:scale-95 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              Uji Azan & Penggera
            </button>

            <button
              onClick={() => setIsAudioSettingsOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-200 font-medium text-xs sm:text-sm transition active:scale-95 cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              Pilihan Muadzin ({(AZAN_OPTIONS.find((v) => v.id === selectedVoice)?.reciter || 'JAKIM').split(' ')[0]})
            </button>

            <button
              onClick={() => setIsDndGuideOpen(true)}
              className="flex items-center justify-center gap-1.5 text-[11px] text-amber-300/90 hover:text-amber-200 font-medium py-1 transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              Bypass Silent / DND Tetapan
            </button>
          </div>
        </div>
      </div>

      {/* 5. Komponen Checklist Solat Fardu Harian */}
      <DailyFardChecklist
        prayerTimes={prayerTimes}
        prayerChecklist={prayerChecklist}
        onTogglePrayerDone={handleTogglePrayerDone}
        onResetChecklist={handleResetChecklist}
        currentTime={currentTime}
      />

      {/* 6. Grid Jadual Waktu Solat Hari Ini */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <SunMedium className="w-5 h-5 text-amber-400" />
            Jadual Waktu Solat Hari Ini
          </h3>
          <span className="text-xs text-slate-400 font-mono">Zon: {currentZone.code}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {PRAYER_KEYS_ORDER.map((key) => {
            const time24 = prayerTimes.times[key];
            const displayTime = formatDisplayTime(time24);
            const label = PRAYER_LABELS[key];
            const isNext = nextPrayerInfo.nextKey === key;

            const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
            const subuhMins = toMinutes(prayerTimes.times.subuh);
            const syurukMins = toMinutes(prayerTimes.times.syuruk);
            const zohorMins = toMinutes(prayerTimes.times.zohor);
            const asarMins = toMinutes(prayerTimes.times.asar);
            const maghribMins = toMinutes(prayerTimes.times.maghrib);
            const isyakMins = toMinutes(prayerTimes.times.isyak);

            let isCurrent = false;
            if (key === 'subuh') {
              isCurrent = currentMins >= subuhMins && currentMins < syurukMins;
            } else if (key === 'zohor') {
              isCurrent = currentMins >= zohorMins && currentMins < asarMins;
            } else if (key === 'asar') {
              isCurrent = currentMins >= asarMins && currentMins < maghribMins;
            } else if (key === 'maghrib') {
              isCurrent = currentMins >= maghribMins && currentMins < isyakMins;
            } else if (key === 'isyak') {
              isCurrent = currentMins >= isyakMins || currentMins < subuhMins;
            }
            isCurrent = isCurrent && !isNext;

            const isAlertEnabled = notificationSettings.preferences[key]?.enabled;
            const isSpecialFastingTime = key === 'imsak' || key === 'maghrib';

            return (
              <div
                key={key}
                className={`relative rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between ${
                  isNext
                    ? 'glass-card-active ring-1 ring-emerald-400/60 shadow-lg shadow-emerald-950/50'
                    : isCurrent
                    ? 'bg-gradient-to-br from-emerald-950/50 to-slate-900/80 border border-emerald-500/50 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                    : 'glass-card hover:border-emerald-500/30'
                }`}
              >
                <div>
                  {isNext ? (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wider uppercase border border-emerald-400/30">
                      Seterusnya
                    </div>
                  ) : isCurrent ? (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Sedang Masuk
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      {label}
                      {isSpecialFastingTime && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">
                          {key === 'imsak' ? 'Imsak' : 'Berbuka'}
                        </span>
                      )}
                    </span>

                    <button
                      onClick={() => handleTogglePrayerNotif(key)}
                      title={isAlertEnabled ? 'Azan Aktif' : 'Azan Senyap'}
                      className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl transition cursor-pointer ${
                        isAlertEnabled
                          ? 'text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/60'
                          : 'text-slate-500 hover:text-slate-300 bg-slate-900/40'
                      }`}
                    >
                      {isAlertEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="text-2xl font-black text-white font-mono tracking-tight tabular-nums">
                    {displayTime}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    {time24} (24 Jam)
                  </div>
                </div>

                {FARD_PRAYERS_ORDER.includes(key as FardPrayerKey) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePrayerDone(key as FardPrayerKey);
                    }}
                    className={`mt-3 w-full py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition active:scale-95 cursor-pointer ${
                      prayerChecklist[key as FardPrayerKey]
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${
                        prayerChecklist[key as FardPrayerKey]
                          ? 'text-emerald-400 stroke-[3]'
                          : 'text-slate-500'
                      }`}
                    />
                    <span>
                      {prayerChecklist[key as FardPrayerKey]
                        ? 'Telah Solat'
                        : 'Tanda Selesai'}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Modal Pemilih Zon Solat JAKIM */}
      <ZoneSelectModal
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        currentZone={currentZone}
        onZoneChange={onZoneChange}
      />

      {/* 8. Modal Pilihan Suara Muadzin & Audio Azan */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        selectedVoice={selectedVoice}
        onVoiceSelect={handleVoiceSelect}
        nextPrayerKey={nextPrayerInfo.nextKey}
        nextPrayerLabel={nextPrayerInfo.nextLabel}
        onTriggerTestAlarm={onTriggerTestAlarm}
      />

      {/* 9. Modal Panduan Melepasi Mod Senyap (DND) */}
      <DndGuideModal
        isOpen={isDndGuideOpen}
        onClose={() => setIsDndGuideOpen(false)}
      />
    </div>
  );
};
