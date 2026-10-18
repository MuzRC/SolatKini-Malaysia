import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Compass,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Info,
  Calendar,
  Clock,
  ChevronDown,
  Navigation,
  CheckCircle2,
  Radio,
  Sliders,
  X,
  Moon,
  SunMedium,
  Download,
  HardDrive,
  Trash2,
  Check,
  RefreshCw
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
import { JAKIM_ZONES, findNearestZone } from '../data/jakimZones';
import {
  determineNextPrayer,
  PRAYER_LABELS,
  PRAYER_KEYS_ORDER,
  NextPrayerInfo,
  getFastingCountdown,
} from '../services/prayerService';
import { formatDisplayTime } from '../utils/prayerCalculator';
import { AZAN_OPTIONS, audioNotificationService, ExtendedAzanAudioOption } from '../services/audioNotificationService';
import { audioStorageService } from '../services/audioStorageService';
import { getHijriDate, getFastingRecommendation } from '../utils/hijriCalendar';
import { widgetService } from '../services/widgetService';
import { nativeAlarmService } from '../services/nativeAlarmService';

interface PrayerDashboardProps {
  currentZone: JakimZone;
  onZoneChange: (zone: JakimZone) => void;
  prayerTimes: DayPrayerTimes;
  isOfflineCalculated: boolean;
  lastSyncTime?: string;
  isLiveSyncing?: boolean;
  onLiveSync?: () => void;
  onNavigateToTab: (tab: 'kiblat' | 'puasa' | 'wirid' | 'doa' | 'widget') => void;
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
  onNavigateToTab,
  onTriggerTestAlarm,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [nextPrayerInfo, setNextPrayerInfo] = useState<NextPrayerInfo>(() =>
    determineNextPrayer(prayerTimes, new Date())
  );
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isDndGuideOpen, setIsDndGuideOpen] = useState(false);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('Semua');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Azan and notification preferences
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
        if (saved) return JSON.parse(saved);
      } catch {
        // use default
      }
    }
    return defaultSettings;
  });

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [cachedVoiceIds, setCachedVoiceIds] = useState<string[]>([]);
  const [downloadingVoiceId, setDownloadingVoiceId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [audioToast, setAudioToast] = useState<string | null>(null);
  const [activeDeviceVoice, setActiveDeviceVoice] = useState<string | null>(() => {
    return audioStorageService.getActiveDeviceVoice();
  });

  // Load cached voices list
  useEffect(() => {
    audioStorageService.getAllCachedVoiceIds().then((ids) => {
      setCachedVoiceIds(ids);
    });
    const devVoice = audioStorageService.getActiveDeviceVoice();
    if (devVoice) setActiveDeviceVoice(devVoice);
  }, [isAudioSettingsOpen]);

  const handleSetAsDeviceVoice = async (opt: ExtendedAzanAudioOption) => {
    audioNotificationService.stopAudio();
    setIsPlayingPreview(false);

    // 1. Tetapkan serta-merta sebagai nada azan pilihan peranti
    audioStorageService.setActiveDeviceVoice(opt.id);
    setActiveDeviceVoice(opt.id);
    setSelectedVoice(opt.id);
    setAudioToast(`Berjaya! ${opt.title} kini ditetapkan sebagai nada azan telefon anda.`);
    setTimeout(() => setAudioToast(null), 4000);

    // 2. Simpan ke memori luar talian di latar belakang jika belum disimpan
    if (!cachedVoiceIds.includes(opt.id)) {
      setDownloadingVoiceId(opt.id);
      setDownloadProgress(0);
      try {
        await audioStorageService.downloadAndCacheAzan(
          opt.id,
          opt.audioUrl,
          opt.filename,
          false,
          (p) => setDownloadProgress(p),
          opt.fallbackUrl
        );
        setCachedVoiceIds((prev) => Array.from(new Set([...prev, opt.id])));
      } catch (err) {
        console.warn('Pra-simpanan audio latar belakang:', err);
      } finally {
        setDownloadingVoiceId(null);
      }
    }
  };

  const handleDownloadFile = async (opt: ExtendedAzanAudioOption) => {
    try {
      setDownloadingVoiceId(opt.id);
      setDownloadProgress(0);
      await audioStorageService.downloadAndCacheAzan(
        opt.id,
        opt.audioUrl,
        opt.filename,
        true, // trigger disk download
        (p) => setDownloadProgress(p),
        opt.fallbackUrl
      );
      setCachedVoiceIds((prev) => Array.from(new Set([...prev, opt.id])));
      setAudioToast(`Fail ${opt.filename} berjaya dimuat turun ke telefon dan disimpan ke memori luar talian!`);
      setTimeout(() => setAudioToast(null), 4000);
    } catch (err: any) {
      setAudioToast(`Ralat muat turun: ${err.message || 'Sila cuba sebentar lagi'}`);
      setTimeout(() => setAudioToast(null), 4000);
    } finally {
      setDownloadingVoiceId(null);
    }
  };

  const handleToggleOfflineCache = async (opt: ExtendedAzanAudioOption) => {
    const isCached = cachedVoiceIds.includes(opt.id);
    if (isCached) {
      await audioStorageService.removeAudioBlob(opt.id);
      setCachedVoiceIds((prev) => prev.filter((id) => id !== opt.id));
      setAudioToast(`Audio ${opt.title} dikeluarkan dari memori luar talian.`);
      setTimeout(() => setAudioToast(null), 3000);
    } else {
      try {
        setDownloadingVoiceId(opt.id);
        setDownloadProgress(0);
        await audioStorageService.downloadAndCacheAzan(
          opt.id,
          opt.audioUrl,
          opt.filename,
          false, // cache only
          (p) => setDownloadProgress(p),
          opt.fallbackUrl
        );
        setCachedVoiceIds((prev) => [...prev, opt.id]);
        setAudioToast(`Audio ${opt.title} berjaya disimpan ke memori luar talian.`);
        setTimeout(() => setAudioToast(null), 3000);
      } catch (err: any) {
        setAudioToast(`Ralat muat turun: ${err.message || 'Sila cuba lagi'}`);
        setTimeout(() => setAudioToast(null), 3000);
      } finally {
        setDownloadingVoiceId(null);
      }
    }
  };

  const handleClearAllAudioCache = async () => {
    try {
      audioNotificationService.stopAudio();
      setIsPlayingPreview(false);
      await audioStorageService.clearAllAudioCache();
      setCachedVoiceIds([]);
      setAudioToast('Memori cache berjaya dikosongkan! Vokal azan MP3 rasmi sedia dimainkan secara lancar.');
      setTimeout(() => setAudioToast(null), 4000);
    } catch (err: any) {
      setAudioToast(`Ralat mengosongkan cache: ${err?.message || 'Sila cuba lagi'}`);
      setTimeout(() => setAudioToast(null), 4000);
    }
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setNextPrayerInfo(determineNextPrayer(prayerTimes, now));
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes]);

  // Sync to native Android Home Screen Widget
  useEffect(() => {
    if (prayerTimes && currentZone) {
      widgetService.syncWidget(prayerTimes, currentZone);
    }
  }, [prayerTimes, currentZone]);

  // Sync to native Android AlarmManager (Exact Alarms for background wake-up)
  useEffect(() => {
    if (prayerTimes && prayerTimes.times) {
      const list = PRAYER_KEYS_ORDER.map((k) => ({
        key: k,
        label: PRAYER_LABELS[k],
        time: prayerTimes.times[k],
        displayTime: formatDisplayTime(prayerTimes.times[k]),
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

  const hijri = getHijriDate(currentTime);
  const recommendation = getFastingRecommendation(currentTime, hijri);

  const [isUserFastingToday, setIsUserFastingToday] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('solatkini_fasting_date');
      const savedActive = localStorage.getItem('solatkini_fasting_active');
      const today = new Date().toISOString().split('T')[0];
      return savedDate === today && savedActive === 'true';
    }
    return false;
  });

  const toggleUserFastingToday = () => {
    setIsUserFastingToday((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('solatkini_fasting_date', today);
        localStorage.setItem('solatkini_fasting_active', next ? 'true' : 'false');
      }
      setAudioToast(
        next
          ? 'Mod Berpuasa diaktifkan untuk hari ini. Penjejak waktu berbuka sedia dipaparkan.'
          : 'Mod Berpuasa dinyahaktifkan.'
      );
      setTimeout(() => setAudioToast(null), 3000);
      return next;
    });
  };

  const isFastingActive = hijri.isRamadan || isUserFastingToday;
  const fastingCountdown = getFastingCountdown(prayerTimes, currentTime, {
    isRamadan: hijri.isRamadan,
    isUserFasting: isUserFastingToday,
  });

  // 5 Fard Prayers Daily Checklist State
  const [prayerChecklist, setPrayerChecklist] = useState<Record<FardPrayerKey, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`solatkini_prayer_checklist_${prayerTimes.date}`);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // ignore
      }
    }
    return {
      subuh: false,
      zohor: false,
      asar: false,
      maghrib: false,
      isyak: false,
    };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`solatkini_prayer_checklist_${prayerTimes.date}`);
        if (saved) {
          setPrayerChecklist(JSON.parse(saved));
        } else {
          setPrayerChecklist({
            subuh: false,
            zohor: false,
            asar: false,
            maghrib: false,
            isyak: false,
          });
        }
      } catch {
        // ignore
      }
    }
  }, [prayerTimes.date]);

  const handleTogglePrayerDone = (fardKey: FardPrayerKey) => {
    setPrayerChecklist((prev) => {
      const updated = {
        ...prev,
        [fardKey]: !prev[fardKey],
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            `solatkini_prayer_checklist_${prayerTimes.date}`,
            JSON.stringify(updated)
          );
        } catch {
          // ignore
        }
      }
      return updated;
    });

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }
  };

  const handleResetChecklist = () => {
    const initial = {
      subuh: false,
      zohor: false,
      asar: false,
      maghrib: false,
      isyak: false,
    };
    setPrayerChecklist(initial);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`solatkini_prayer_checklist_${prayerTimes.date}`);
    }
  };

  const completedFardCount = FARD_PRAYERS_ORDER.filter((k) => prayerChecklist[k]).length;
  const fardPercentage = Math.round((completedFardCount / 5) * 100);

  const handleVoiceSelect = (voice: AzanVoice) => {
    // Stop any active or preview audio immediately when selecting a voice
    audioNotificationService.stopAudio();
    setIsPlayingPreview(false);
    setSelectedVoice(voice);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_azan_voice', voice);
    }
  };

  const handleTogglePrayerNotif = async (key: PrayerKey) => {
    const isCurrentlyEnabled = notificationSettings.preferences[key]?.enabled;
    if (!isCurrentlyEnabled) {
      // User is activating an azan alarm: check & prompt for Android 13+ permission
      const perms = await nativeAlarmService.checkPermissions();
      if (!perms.notificationsGranted) {
        await nativeAlarmService.requestNotificationPermission();
      }
    }

    setNotificationSettings((prev) => {
      const updated = {
        ...prev,
        preferences: {
          ...prev.preferences,
          [key]: {
            ...prev.preferences[key],
            enabled: !prev.preferences[key].enabled,
          },
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_notif_settings', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handlePlayPreview = (voice: AzanVoice) => {
    audioNotificationService.unlockAudio();
    if (isPlayingPreview && selectedVoice === voice) {
      audioNotificationService.stopAudio();
      setIsPlayingPreview(false);
    } else {
      audioNotificationService.stopAudio();
      setSelectedVoice(voice);
      setIsPlayingPreview(true);
      audioNotificationService.playAzan(voice, () => setIsPlayingPreview(false));
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setLocationError('Pelayar anda tidak menyokong pengesanan GPS.');
      return;
    }
    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const nearest = findNearestZone(pos.coords.latitude, pos.coords.longitude);
        onZoneChange(nearest);
      },
      (err) => {
        setIsLocating(false);
        setLocationError('Gagal mengesan lokasi automatik. Sila pilih zon secara manual.');
      },
      { timeout: 8000 }
    );
  };

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
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Top Header Card */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap text-xs font-semibold uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px]">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                e-Solat JAKIM Online
              </span>
              {lastSyncTime && (
                <span className="text-[11px] text-slate-400 font-mono lowercase">
                  dikemas kini {lastSyncTime}
                </span>
              )}
              {isOfflineCalculated && (
                <span className="text-[11px] text-amber-300 font-normal ml-1">
                  (Mod Falak Luar Talian)
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

          {/* Action Zone: Sync Button & Zone Selector */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {onLiveSync && (
              <button
                onClick={onLiveSync}
                disabled={isLiveSyncing}
                title="Segerak waktu solat terkini daripada e-Solat JAKIM"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-emerald-300 transition active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLiveSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden sm:inline">{isLiveSyncing ? 'Menyegerak...' : 'Segerak'}</span>
              </button>
            )}
            <button
              onClick={() => setIsZoneModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm font-semibold transition active:scale-95 shadow-lg shadow-emerald-950/40"
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
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 transition active:scale-95"
            >
              <Navigation className={`w-4 h-4 text-emerald-400 ${isLocating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {locationError && (
          <div className="mt-3 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-xl p-2.5">
            {locationError}
          </div>
        )}
      </div>

      {/* Hero Countdown & Next Prayer Spotlight Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e241c] via-[#091712] to-[#060c0a] border border-emerald-500/20 p-6 sm:p-8 shadow-2xl">
        {/* Subtle decorative background lights */}
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

            {/* Fasting Quick Snippet - Only active during Ramadan, if user enabled fasting mode, or optional Sunnah reminder */}
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
                    className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-900/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/20 transition shrink-0"
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
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold border border-amber-400/30 transition shrink-0 active:scale-95"
                >
                  Saya Berpuasa
                </button>
              </div>
            ) : null}
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => onTriggerTestAlarm(nextPrayerInfo.nextKey, nextPrayerInfo.nextLabel, selectedVoice)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-900/40 transition active:scale-95"
            >
              <Volume2 className="w-4 h-4" />
              Uji Azan & Penggera
            </button>

            <button
              onClick={() => setIsAudioSettingsOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-200 font-medium text-xs sm:text-sm transition active:scale-95"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              Pilihan Muadzin ({AZAN_OPTIONS.find((v) => v.id === selectedVoice)?.reciter.split(' ')[0]})
            </button>

            <button
              onClick={() => setIsDndGuideOpen(true)}
              className="flex items-center justify-center gap-1.5 text-[11px] text-amber-300/90 hover:text-amber-200 font-medium py-1 transition"
            >
              <Info className="w-3.5 h-3.5" />
              Bypass Silent / DND Tetapan
            </button>
          </div>
        </div>
      </div>

      {/* Penjejak & Checklist Solat Harian (5 Waktu Fardu) */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0a1612] via-[#0e2119] to-[#08120e] border border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Checklist Solat Fardu Harian
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 font-semibold font-mono shadow-sm">
                {completedFardCount}/5 Selesai ({fardPercentage}%)
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Tandakan 5 solat fardu yang telah disempurnakan hari ini ({currentTime.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'short' })}).
            </p>
          </div>

          {completedFardCount > 0 && (
            <button
              onClick={handleResetChecklist}
              className="text-xs text-slate-400 hover:text-red-400 transition self-start sm:self-center px-2.5 py-1 rounded-xl border border-slate-800 hover:border-red-900/50 bg-slate-900/60"
            >
              Set Semula
            </button>
          )}
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-950/80 rounded-full h-2.5 overflow-hidden border border-emerald-950">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${fardPercentage}%` }}
          />
        </div>

        {/* 5 Fard Prayers Quick Toggle Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {FARD_PRAYERS_ORDER.map((fardKey) => {
            const isDone = prayerChecklist[fardKey];
            const prayerName = PRAYER_LABELS[fardKey];
            const prayerTime = formatDisplayTime(prayerTimes.times[fardKey]);

            return (
              <button
                key={fardKey}
                onClick={() => handleTogglePrayerDone(fardKey)}
                className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 active:scale-95 ${
                  isDone
                    ? 'bg-emerald-950/70 border-emerald-400/60 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    {prayerName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {prayerTime}
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition ${
                    isDone
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'border-2 border-slate-600 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Celebratory message upon completing 5/5 prayers */}
        {completedFardCount === 5 && (
          <div className="p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-400/40 flex items-center gap-3 text-xs text-emerald-200 animate-in fade-in-50 duration-300">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
            <span>
              <strong>Alhamdulillah!</strong> Anda telah menyempurnakan kesemua 5 waktu solat fardu hari ini. Semoga setiap sujud dan doa diterima oleh Allah SWT.
            </span>
          </div>
        )}
      </div>

      {/* 7 Daily Prayer Times Schedule Grid */}
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
            const isAlertEnabled = notificationSettings.preferences[key]?.enabled;
            const isSpecialFastingTime = key === 'imsak' || key === 'maghrib';

            return (
              <div
                key={key}
                className={`relative rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between ${
                  isNext
                    ? 'glass-card-active ring-1 ring-emerald-400/60'
                    : 'glass-card hover:border-emerald-500/30'
                }`}
              >
                <div>
                  {isNext && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wider uppercase border border-emerald-400/30">
                      Seterusnya
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      {label}
                      {isSpecialFastingTime && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">
                          {key === 'imsak' ? 'Imsak' : 'Berbuka'}
                        </span>
                      )}
                    </span>
                    
                    {/* Alert toggle */}
                    <button
                      onClick={() => handleTogglePrayerNotif(key)}
                      title={isAlertEnabled ? 'Azan Aktif' : 'Azan Senyap'}
                      className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl transition ${
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

                {/* Checklist action for Fard prayer */}
                {FARD_PRAYERS_ORDER.includes(key as FardPrayerKey) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePrayerDone(key as FardPrayerKey);
                    }}
                    className={`mt-3 w-full py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition active:scale-95 ${
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

      {/* Quick Navigation Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <button
          onClick={() => onNavigateToTab('kiblat')}
          className="glass-card hover:bg-emerald-950/40 p-4 rounded-2xl flex flex-col items-center justify-center text-center group transition active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2 group-hover:bg-emerald-500/20 text-emerald-400">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-white">Kompas Kiblat</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Arah tepat ke Kaabah</span>
        </button>

        <button
          onClick={() => onNavigateToTab('puasa')}
          className="glass-card hover:bg-emerald-950/40 p-4 rounded-2xl flex flex-col items-center justify-center text-center group transition active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 group-hover:bg-amber-500/20 text-amber-400">
            <Moon className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-white">Penjejak Puasa</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Waktu berbuka & niat</span>
        </button>

        <button
          onClick={() => onNavigateToTab('wirid')}
          className="glass-card hover:bg-emerald-950/40 p-4 rounded-2xl flex flex-col items-center justify-center text-center group transition active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2 group-hover:bg-emerald-500/20 text-emerald-400">
            <Radio className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-white">Wirid & Tasbih</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Zikir bergetar haptik</span>
        </button>

        <button
          onClick={() => onNavigateToTab('widget')}
          className="glass-card hover:bg-emerald-950/40 p-4 rounded-2xl flex flex-col items-center justify-center text-center group transition active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2 group-hover:bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-white">Widget Skrin</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Widget Telefon & Jam Meja</span>
        </button>
      </div>

      {/* ZONE SELECTOR MODAL */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl max-h-[85vh] rounded-3xl bg-[#0f1a16] border border-emerald-500/20 p-6 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white">Pilih Zon Waktu Solat JAKIM</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Merangkumi seluruh negeri di Semenanjung, Sabah & Sarawak
                </p>
              </div>
              <button
                onClick={() => setIsZoneModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and state filters */}
            <div className="pt-4 space-y-3">
              <input
                type="text"
                placeholder="Cari daerah, negeri, atau kod (cth: Shah Alam, SGR01)..."
                value={zoneSearchQuery}
                onChange={(e) => setZoneSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
              />

              {/* State Filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs scrollbar-none">
                {states.map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStateFilter(st)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
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

            {/* Zones List */}
            <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
              {filteredZones.map((z) => {
                const isSelected = z.code === currentZone.code;
                return (
                  <button
                    key={z.code}
                    onClick={() => {
                      onZoneChange(z);
                      setIsZoneModalOpen(false);
                    }}
                    className={`w-full p-3.5 rounded-xl text-left flex items-start justify-between transition ${
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
      )}

      {/* AUDIO AZAN SELECTION DRAWER */}
      {isAudioSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#0f1a16] border border-emerald-500/20 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white">Pilihan Audio Azan</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pilih alunan muadzin kegemaran anda untuk laungan azan
                </p>
              </div>
              <button
                onClick={() => {
                  audioNotificationService.stopAudio();
                  setIsPlayingPreview(false);
                  setIsAudioSettingsOpen(false);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification toast inside modal */}
            {audioToast && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-900/80 border border-emerald-400 text-xs text-white flex items-center justify-between">
                <span>{audioToast}</span>
                <button onClick={() => setAudioToast(null)} className="text-slate-300 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="mt-4 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Pilih muadzin, simpan ke memori peranti untuk luar talian, atau muat turun fail audio MP3 ke telefon anda.</span>
              </div>

              {/* Active Device Azan Status Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-[#0e241c] border border-emerald-500/40 shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      Azan Telefon Anda Semasa
                    </span>
                    <h4 className="text-sm font-extrabold text-white">
                      {AZAN_OPTIONS.find((v) => v.id === (activeDeviceVoice || selectedVoice))?.title}
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Fail audio ini dimuat turun & digunakan secara automatik apabila masuk waktu solat
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const voiceToTest = (activeDeviceVoice || selectedVoice) as AzanVoice;
                    handlePlayPreview(voiceToTest);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 shadow-md transition active:scale-95"
                >
                  {isPlayingPreview ? 'Henti' : 'Uji Bunyi'}
                </button>
              </div>

              {/* Native Android AlarmManager & TargetSDK 33 Status Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1813] to-[#08120e] border border-emerald-500/30 text-left space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Sistem Penggera Azan Asli (Android AlarmManager)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    TargetSDK 33+
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Dikuasakan oleh perkakasan <code className="text-emerald-300 font-mono">AlarmManager.setExactAndAllowWhileIdle</code> dan saluran audio <code className="text-emerald-300 font-mono">STREAM_ALARM</code> bagi menjamin laungan azan berkumandang tepat pada waktunya dan berupaya melepasi mod senyap serta skrin kunci.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    onClick={async () => {
                      const prayerName = nextPrayerInfo.nextLabel || 'Subuh';
                      const res = await nativeAlarmService.testAlarm(prayerName, selectedVoice, 3);
                      if (res) {
                        setAudioToast('Penggera azan asli dijadualkan! Kunci skrin telefon anda sekarang untuk menguji.');
                      } else {
                        onTriggerTestAlarm(nextPrayerInfo.nextKey, prayerName, selectedVoice);
                        setAudioToast('Ujian azan dimulakan.');
                      }
                      setTimeout(() => setAudioToast(null), 5000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-950/40"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Uji Penggera Asli Telefon (3 Saat)
                  </button>
                  <button
                    onClick={async () => {
                      await nativeAlarmService.openNotificationSettings();
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition"
                  >
                    Tetapan Notifikasi Telefon
                  </button>
                  <button
                    onClick={async () => {
                      await nativeAlarmService.openExactAlarmSettings();
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                  >
                    Tetapan Penggera Tepat
                  </button>
                </div>
              </div>

              {AZAN_OPTIONS.map((opt) => {
                const isCurrent = opt.id === selectedVoice;
                const isDeviceActive = (activeDeviceVoice || selectedVoice) === opt.id;
                const isCached = cachedVoiceIds.includes(opt.id);
                const isDownloading = downloadingVoiceId === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleVoiceSelect(opt.id)}
                    className={`p-4 rounded-2xl cursor-pointer border transition flex flex-col gap-3 ${
                      isDeviceActive
                        ? 'bg-emerald-950/70 border-emerald-400/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400/40'
                        : isCurrent
                        ? 'bg-emerald-950/50 border-emerald-500/40'
                        : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">{opt.title}</h4>
                          {isDeviceActive && (
                            <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black tracking-wide flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-3 h-3 fill-slate-950 text-emerald-500" />
                              AZAN TELEFON AKTIF
                            </span>
                          )}
                          {isCached ? (
                            <span className="text-[10px] bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" /> Tersimpan di Memori
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                              Vokal Asli MP3
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-400 mt-0.5 font-medium">{opt.reciter}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{opt.description}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPreview(opt.id);
                        }}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 transition shadow-md shadow-emerald-950/40"
                        title={isPlayingPreview && selectedVoice === opt.id ? 'Henti Pratonton' : 'Dengar Alunan Azan'}
                      >
                        {isPlayingPreview && selectedVoice === opt.id ? (
                          <Square className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white" />
                        )}
                      </button>
                    </div>

                    {/* Download Progress Bar if downloading */}
                    {isDownloading && (
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full transition-all duration-200"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    )}

                    {/* Action Toolbar for Phone Azan, Offline & Download */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
                      {/* Set as Active Device Azan Button */}
                      {isDeviceActive ? (
                        <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Digunakan untuk waktu solat
                        </div>
                      ) : (
                        <button
                          disabled={isDownloading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetAsDeviceVoice(opt);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition active:scale-95 shadow-sm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Guna Untuk Azan Telefon</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        {/* Offline Cache Button */}
                        <button
                          disabled={isDownloading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleOfflineCache(opt);
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition ${
                            isCached
                              ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-red-400'
                              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50'
                          }`}
                          title={isCached ? 'Padam dari memori telefon' : 'Simpan ke memori untuk luar talian'}
                        >
                          <HardDrive className="w-3 h-3" />
                          <span>{isCached ? 'Padam Memori' : 'Simpan'}</span>
                        </button>

                        {/* Download .MP3 File to Device Disk */}
                        <button
                          disabled={isDownloading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(opt);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition active:scale-95"
                          title={`Muat turun fail ${opt.filename} ke memori telefon`}
                        >
                          <Download className="w-3 h-3 text-emerald-400" />
                          <span>Muat Turun .MP3</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Custom Local MP3 Upload */}
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Muat Naik Fail Audio Azan Sendiri
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pilih fail .mp3 atau .wav dari peranti anda untuk dijadikan azan utama
                  </p>
                </div>
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold text-center border border-slate-700 shrink-0 transition active:scale-95">
                  <span>Pilih Fail Audio</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        audioNotificationService.setCustomAudio(url);
                        audioNotificationService.playAzan(selectedVoice, () => setIsPlayingPreview(false));
                        setIsPlayingPreview(true);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Reset & Purge Audio Cache */}
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    Kosongkan & Segarkan Cache Audio
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gunakan butang ini jika audio senyap atau tersekat untuk menetapkan semula ke fail MP3 vokal rasmi
                  </p>
                </div>
                <button
                  onClick={handleClearAllAudioCache}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold shrink-0 transition active:scale-95 flex items-center justify-center gap-1.5"
                  title="Kosongkan memori audio IndexedDB lama"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kosongkan Cache</span>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                Tekan mana-mana laungan azan untuk mendengar alunan
              </div>
              <button
                onClick={() => {
                  audioNotificationService.stopAudio();
                  setIsPlayingPreview(false);
                  setIsAudioSettingsOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DND & SILENT BYPASS GUIDANCE MODAL */}
      {isDndGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#0f1a16] border border-amber-500/30 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Panduan Bypass Silent & DND</h3>
              </div>
              <button
                onClick={() => setIsDndGuideOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
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
                onClick={() => setIsDndGuideOpen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm"
              >
                Faham & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
