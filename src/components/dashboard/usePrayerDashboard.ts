import { useState, useEffect, useCallback } from 'react';
import {
  DayPrayerTimes,
  JakimZone,
  PrayerKey,
  AzanVoice,
  AppNotificationSettings,
  FardPrayerKey,
} from '../../types/prayer';
import { findNearestZone } from '../../data/jakimZones';
import {
  determineNextPrayer,
  NextPrayerInfo,
  getFastingCountdown,
} from '../../services/prayerService';
import { getHijriDate, getFastingRecommendation } from '../../utils/hijriCalendar';
import { widgetService } from '../../services/widgetService';
import { nativeAlarmService } from '../../services/nativeAlarmService';

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

interface UsePrayerDashboardParams {
  currentZone: JakimZone;
  onZoneChange: (zone: JakimZone) => void;
  prayerTimes: DayPrayerTimes;
  isLiveSyncing?: boolean;
  onLiveSync?: () => void;
}

export function usePrayerDashboard({
  currentZone,
  onZoneChange,
  prayerTimes,
  isLiveSyncing,
  onLiveSync,
}: UsePrayerDashboardParams) {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [nextPrayerInfo, setNextPrayerInfo] = useState<NextPrayerInfo>(() =>
    determineNextPrayer(prayerTimes, new Date())
  );

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
  const safePrayerDate = prayerTimes?.date || getLocalDateString(currentTime);

  // Pantau status rangkaian internet
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

  // Semak kebenaran sistem, jam automatik & segerak masa semasa fokus semula
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
    if (prayerTimes?.date && prayerTimes.date !== todayStr && onLiveSync && !isLiveSyncing) {
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

  // Pemasa undur masa nyata setiap 1 saat
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setNextPrayerInfo(determineNextPrayer(prayerTimes, now));
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes]);

  // Kemas kini widget skrin utama
  useEffect(() => {
    if (prayerTimes && currentZone) {
      widgetService.syncWidget(prayerTimes, currentZone);
    }
  }, [prayerTimes, currentZone]);

  // Kemas kini notifikasi kekal apabila waktu solat seterusnya bertukar
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

  // Penjejak puasa harian
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

  // Rekod semak solat fardu harian
  const [prayerChecklist, setPrayerChecklist] = useState<Record<FardPrayerKey, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`solatkini_prayer_checklist_${safePrayerDate}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { subuh: false, zohor: false, asar: false, maghrib: false, isyak: false };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`solatkini_prayer_checklist_${safePrayerDate}`);
        if (saved) {
          setPrayerChecklist(JSON.parse(saved));
        } else {
          setPrayerChecklist({ subuh: false, zohor: false, asar: false, maghrib: false, isyak: false });
        }
      } catch {}
    }
  }, [safePrayerDate]);

  const handleTogglePrayerDone = (fardKey: FardPrayerKey) => {
    setPrayerChecklist((prev) => {
      const updated = { ...prev, [fardKey]: !prev[fardKey] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`solatkini_prayer_checklist_${safePrayerDate}`, JSON.stringify(updated));
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
      localStorage.removeItem(`solatkini_prayer_checklist_${safePrayerDate}`);
    }
  };

  const handleVoiceSelect = (voice: AzanVoice) => {
    setSelectedVoice(voice);
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
      const currentPref = prev.preferences?.[key] || {
        enabled: true,
        voice: 'jakim',
        beforeMinutes: 0,
        bypassSilentTone: true,
      };
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
            message:
              'Kebenaran lokasi telah disekat oleh Android. Sila benarkan akses Lokasi pada menu Keizinan Aplikasi (App Info > Permissions) di Tetapan Telefon.',
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

  return {
    currentTime,
    nextPrayerInfo,
    hijri,
    recommendation,
    isOnline,
    isLocating,
    locationError,
    setLocationError,
    notificationsGranted,
    setNotificationsGranted,
    isAutoTimeEnabled,
    setIsAutoTimeEnabled,
    selectedVoice,
    notificationSettings,
    isFastingActive,
    fastingCountdown,
    toggleUserFastingToday,
    prayerChecklist,
    handleTogglePrayerDone,
    handleResetChecklist,
    handleVoiceSelect,
    handleTogglePrayerNotif,
    handleDetectGPS,
  };
}
