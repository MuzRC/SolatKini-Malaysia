import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Bell,
  BellOff,
  Volume2,
  Play,
  Square,
  Sparkles,
  Info,
  Calendar,
  Clock,
  ChevronDown,
  Navigation,
  CheckCircle2,
  Sliders,
  X,
  Moon,
  SunMedium,
  Download,
  HardDrive,
  Trash2,
  Check,
  RefreshCw,
  WifiOff,
  AlertTriangle
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
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isDndGuideOpen, setIsDndGuideOpen] = useState(false);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('Semua');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [notificationsGranted, setNotificationsGranted] = useState<boolean>(true);
  const [isAutoTimeEnabled, setIsAutoTimeEnabled] = useState<boolean>(true);

  // Status sambungan internet langsung peranti
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine ?? true;
    }
    return true;
  });

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

  // Semak status kebenaran notifikasi, masa automatik dan pantau apabila aplikasi dibuka semula
  useEffect(() => {
    const checkPermsAndState = () => {
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
      const now = new Date();
      setCurrentTime(now);
      setNextPrayerInfo(determineNextPrayer(prayerTimes, now));

      const todayStr = now.toISOString().split('T')[0];
      if (prayerTimes && prayerTimes.date !== todayStr && onLiveSync) {
        onLiveSync();
      }
    };

    checkPermsAndState();
    window.addEventListener('focus', checkPermsAndState);
    document.addEventListener('visibilitychange', checkPermsAndState);
    return () => {
      window.removeEventListener('focus', checkPermsAndState);
      document.removeEventListener('visibilitychange', checkPermsAndState);
    };
  }, [prayerTimes, onLiveSync]);

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
            persistentNotification: parsed.persistentNotification !== undefined ? parsed.persistentNotification : true,
          };
        }
      } catch {
        // default
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

    audioStorageService.setActiveDeviceVoice(opt.id);
    setActiveDeviceVoice(opt.id);
    setSelectedVoice(opt.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_azan_voice', opt.id);
      localStorage.setItem('solatkini_active_device_voice', opt.id);
    }
    nativeAlarmService.setActiveVoice(opt.id);

    setNotificationSettings((prev) => {
      const updated: AppNotificationSettings = {
        ...prev,
        preferences: {
          ...prev.preferences,
          subuh: { ...(prev.preferences?.subuh || {}), voice: 'subuh_special', enabled: prev.preferences?.subuh?.enabled ?? true, beforeMinutes: 0, bypassSilentTone: true },
          zohor: { ...(prev.preferences?.zohor || {}), voice: opt.id as AzanVoice, enabled: prev.preferences?.zohor?.enabled ?? true, beforeMinutes: 0, bypassSilentTone: true },
          asar: { ...(prev.preferences?.asar || {}), voice: opt.id as AzanVoice, enabled: prev.preferences?.asar?.enabled ?? true, beforeMinutes: 0, bypassSilentTone: true },
          maghrib: { ...(prev.preferences?.maghrib || {}), voice: opt.id as AzanVoice, enabled: prev.preferences?.maghrib?.enabled ?? true, beforeMinutes: 0, bypassSilentTone: true },
          isyak: { ...(prev.preferences?.isyak || {}), voice: opt.id as AzanVoice, enabled: prev.preferences?.isyak?.enabled ?? true, beforeMinutes: 0, bypassSilentTone: true },
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_notif_settings', JSON.stringify(updated));
      }
      return updated;
    });

    if (prayerTimes && prayerTimes.times && notificationSettings.masterEnabled) {
      const list = PRAYER_KEYS_ORDER.map((k) => ({
        key: k,
        label: PRAYER_LABELS[k],
        time: prayerTimes.times[k],
        displayTime: formatDisplayTime(prayerTimes.times[k]),
        voice: (k === 'subuh' ? 'subuh_special' : opt.id) as AzanVoice,
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
      nativeAlarmService.schedulePrayers(list, opt.id, enabledMap);
    }

    setAudioToast(`Berjaya! ${opt.title} ditetapkan untuk solat harian (Subuh kekal Azan Subuh khas).`);
    setTimeout(() => setAudioToast(null), 4000);

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
        true,
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
          false,
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

  useEffect(() => {
    if (prayerTimes && prayerTimes.times) {
      const list = PRAYER_KEYS_ORDER.map((k) => ({
        key: k,
        label: PRAYER_LABELS[k],
        time: prayerTimes.times[k],
        displayTime: formatDisplayTime(prayerTimes.times[k]),
        voice: (k === 'subuh' ? 'subuh_special' : selectedVoice) as AzanVoice,
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

  useEffect(() => {
    const handleRemoteSync = () => {
      if (onLiveSync) {
        onLiveSync();
      }
    };
    window.addEventListener('solatSyncRequested', handleRemoteSync);
    return () => window.removeEventListener('solatSyncRequested', handleRemoteSync);
  }, [onLiveSync]);

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

  const handleVoiceSelect = async (voice: AzanVoice) => {
    audioNotificationService.stopAudio();
    setIsPlayingPreview(false);
    setSelectedVoice(voice);
    setActiveDeviceVoice(voice);
    audioStorageService.setActiveDeviceVoice(voice);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_azan_voice', voice);
      localStorage.setItem('solatkini_active_device_voice', voice);
    }
    nativeAlarmService.setActiveVoice(voice);

    setNotificationSettings((prev) => {
      const updated: AppNotificationSettings = {
        ...prev,
        preferences: {
          ...prev.preferences,
          subuh: { ...(prev.preferences?.subuh || {}), voice: 'subuh_special', enabled: prev.preferences?.subuh?.enabled ?? true, beforeMinutes: 0, bypassSilentTone: true },
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

    if (prayerTimes && prayerTimes.times && notificationSettings.masterEnabled) {
      const list = PRAYER_KEYS_ORDER.map((k) => ({
        key: k,
        label: PRAYER_LABELS[k],
        time: prayerTimes.times[k],
        displayTime: formatDisplayTime(prayerTimes.times[k]),
        voice: (k === 'subuh' ? 'subuh_special' : voice) as AzanVoice,
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
      nativeAlarmService.schedulePrayers(list, voice, enabledMap);
    }
  };

  const handleTogglePrayerNotif = async (key: PrayerKey) => {
    const isCurrentlyEnabled = notificationSettings.preferences?.[key]?.enabled;
    if (!isCurrentlyEnabled) {
      const perms = await nativeAlarmService.checkPermissions();
      if (!perms.notificationsGranted) {
        await nativeAlarmService.requestNotificationPermission();
      }
    }

    setNotificationSettings((prev) => {
      const currentPref = prev.preferences?.[key] || { enabled: true, voice: 'jakim', beforeMinutes: 0, bypassSilentTone: true };
      const updated = {
        ...prev,
        preferences: {
          ...prev.preferences,
          [key]: {
            ...currentPref,
            enabled: !currentPref.enabled,
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
      () => {
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

          {/* Action Zone: Sync Button & Zone Selector */}
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
          <div className="mt-3 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-xl p-2.5">
            {locationError}
          </div>
        )}
      </div>

      {/* WARNING BANNER: MASA AUTOMATIK DIMATIKAN */}
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

      {/* NOTIFICATION PERMISSION WARNING BANNER IF NOT GRANTED */}
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
                await nativeAlarmService.requestNotificationPermission();
                setTimeout(async () => {
                  const perms = await nativeAlarmService.checkPermissions();
                  setNotificationsGranted(perms.notificationsGranted);
                }, 1000);
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
              Buka Tetapan Telefon (App Info)
            </button>
          </div>
          <div className="text-[11px] text-amber-200/90 bg-black/40 p-3 rounded-xl border border-amber-500/30 mt-1 leading-relaxed">
            <strong>Panduan Suis Kelabu (Android 13/14 Sideload):</strong> Jika suis notifikasi dimalapkan (greyed out) dalam Tetapan Telefon:
            <ol className="list-decimal list-inside mt-1 space-y-0.5 text-slate-300">
              <li>Tekan butang <strong className="text-amber-300">&quot;Buka Tetapan Telefon (App Info)&quot;</strong> di atas.</li>
              <li>Tekan <strong>ikon 3 titik di sudut atas kanan</strong> halaman tersebut.</li>
              <li>Pilih <strong>&quot;Benarkan tetapan terhad&quot; (Allow restricted settings)</strong> dan masukkan PIN / cap jari telefon anda.</li>
              <li>Suis notifikasi kini aktif dan sedia dihidupkan.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Hero Countdown & Next Prayer Spotlight Card */}
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

            {/* Fasting Quick Snippet */}
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

          {/* Quick Action Controls */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => {
                const testVoice = (nextPrayerInfo.nextKey === 'subuh' ? 'subuh_special' : selectedVoice) as AzanVoice;
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
              className="text-xs text-slate-400 hover:text-red-400 transition self-start sm:self-center px-2.5 py-1 rounded-xl border border-slate-800 hover:border-red-900/50 bg-slate-900/60 cursor-pointer"
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
                className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 active:scale-95 cursor-pointer ${
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
            const isCurrent = nextPrayerInfo.currentKey === key && !isNext && key !== 'imsak' && key !== 'syuruk';
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
                    
                    {/* Alert toggle */}
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

                {/* Checklist action for Fard prayer */}
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
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="pt-4 space-y-3">
              <input
                type="text"
                placeholder="Cari daerah, negeri, atau kod (cth: Shah Alam, SGR01)..."
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
                      setIsZoneModalOpen(false);
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
      )}

      {/* AUDIO AZAN SELECTION DRAWER */}
      {isAudioSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#0f1a16] border border-emerald-500/20 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white">Pilihan Audio Azan</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pilih alunan muadzin kegemaran anda untuk laungan azan solat harian
                </p>
              </div>
              <button
                onClick={() => {
                  audioNotificationService.stopAudio();
                  setIsPlayingPreview(false);
                  setIsAudioSettingsOpen(false);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {audioToast && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-900/80 border border-emerald-400 text-xs text-white flex items-center justify-between">
                <span>{audioToast}</span>
                <button onClick={() => setAudioToast(null)} className="text-slate-300 hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="mt-4 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Pilihan di bawah digunakan untuk Zohor, Asar, Maghrib & Isyak. Waktu Subuh kekal automatik menggunakan alunan Azan Subuh khas.</span>
              </div>

              {/* Active Device Azan Status Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-[#0e241c] border border-emerald-500/40 shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      Azan Harian Semasa
                    </span>
                    <h4 className="text-sm font-extrabold text-white">
                      {AZAN_OPTIONS.find((v) => v.id === (activeDeviceVoice || selectedVoice))?.title || 'Azan Rasmi JAKIM'}
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Digunakan pada waktu Zohor, Asar, Maghrib & Isyak
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const voiceToTest = (activeDeviceVoice || selectedVoice) as AzanVoice;
                    handlePlayPreview(voiceToTest);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 shadow-md transition active:scale-95 cursor-pointer"
                >
                  {isPlayingPreview ? 'Henti' : 'Uji Bunyi'}
                </button>
              </div>

              {/* Native Android AlarmManager Status Card */}
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
                  Dikuasakan oleh perkakasan <code className="text-emerald-300 font-mono">AlarmManager.setAlarmClock</code> dan saluran audio <code className="text-emerald-300 font-mono">STREAM_ALARM</code> bagi menjamin laungan azan berkumandang tepat pada waktunya dan berupaya melepasi mod senyap serta skrin kunci.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    onClick={async () => {
                      const prayerKey = nextPrayerInfo.nextKey || 'subuh';
                      const prayerName = nextPrayerInfo.nextLabel || 'Subuh';
                      const testVoice = (prayerKey === 'subuh' ? 'subuh_special' : selectedVoice) as AzanVoice;
                      const res = await nativeAlarmService.testAlarm(prayerName, testVoice, 3);
                      if (res) {
                        setAudioToast('Penggera azan asli dijadualkan! Kunci skrin telefon anda sekarang untuk menguji.');
                      } else {
                        onTriggerTestAlarm(prayerKey, prayerName, testVoice);
                        setAudioToast('Ujian azan dimulakan.');
                      }
                      setTimeout(() => setAudioToast(null), 5000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-950/40 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Uji Penggera Asli Telefon (3 Saat)
                  </button>
                  <button
                    onClick={async () => {
                      await nativeAlarmService.openNotificationSettings();
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition cursor-pointer"
                  >
                    Tetapan Notifikasi Telefon
                  </button>
                  <button
                    onClick={async () => {
                      await nativeAlarmService.openExactAlarmSettings();
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
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
                              AZAN HARIAN AKTIF
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
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 transition shadow-md shadow-emerald-950/40 cursor-pointer"
                        title={isPlayingPreview && selectedVoice === opt.id ? 'Henti Pratonton' : 'Dengar Alunan Azan'}
                      >
                        {isPlayingPreview && selectedVoice === opt.id ? (
                          <Square className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white" />
                        )}
                      </button>
                    </div>

                    {isDownloading && (
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full transition-all duration-200"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
                      {isDeviceActive ? (
                        <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Digunakan untuk Zohor, Asar, Maghrib & Isyak
                        </div>
                      ) : (
                        <button
                          disabled={isDownloading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetAsDeviceVoice(opt);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition active:scale-95 shadow-sm cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Guna Untuk Azan Harian</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          disabled={isDownloading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleOfflineCache(opt);
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition cursor-pointer ${
                            isCached
                              ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-red-400'
                              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50'
                          }`}
                          title={isCached ? 'Padam dari memori telefon' : 'Simpan ke memori untuk luar talian'}
                        >
                          <HardDrive className="w-3 h-3" />
                          <span>{isCached ? 'Padam Memori' : 'Simpan'}</span>
                        </button>

                        <button
                          disabled={isDownloading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(opt);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition active:scale-95 cursor-pointer"
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
                    Pilih fail .mp3 atau .wav dari peranti anda untuk dijadikan azan solat harian
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
                  className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold shrink-0 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
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
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition cursor-pointer"
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
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm cursor-pointer"
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
