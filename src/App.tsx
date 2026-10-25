import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Compass,
  Moon,
  MoonStar,
  Radio,
  BookOpen,
  Volume2,
  MapPin,
  X,
  Award,
  Settings
} from 'lucide-react';
import { ActiveTab, DayPrayerTimes, JakimZone, PrayerKey, AzanVoice } from './types/prayer';
import { JAKIM_ZONES, findZoneByCode, findNearestZone } from './data/jakimZones';
import { fetchDayPrayerTimes, PRAYER_KEYS_ORDER, PRAYER_LABELS } from './services/prayerService';
import { audioNotificationService } from './services/audioNotificationService';
import { nativeAlarmService } from './services/nativeAlarmService';
import { widgetService } from './services/widgetService';
import { PrayerDashboard } from './components/PrayerDashboard';
import { QiblaCompass } from './components/QiblaCompass';
import { FastingTracker } from './components/FastingTracker';
import { TasbihWirid } from './components/TasbihWirid';
import { DuaCollection } from './components/DuaCollection';
import { SettingsView } from './components/SettingsView';
import { CreditsPage } from './components/CreditsPage';
import { AzanAlarmModal } from './components/AzanAlarmModal';
import { OnboardingChecklist } from './components/OnboardingChecklist';
import { Language, getSavedLanguage, t, saveLanguage } from './utils/i18n';
import { ThemeId, getSavedTheme, applyTheme, THEME_OPTIONS } from './utils/theme';
import { getHijriDate } from './utils/hijriCalendar';
import { formatDisplayTime } from './utils/prayerCalculator';

// ==========================================
// MULA: MUSALOG (PADAM BAHAGIAN INI UNTUK BUANG)
// ==========================================
import { MusaLog } from './musalog';
// ==========================================
// AKHIR: MUSALOG
// ==========================================

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('solatkini_onboarding_completed') !== 'true';
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('solat');
  const [currentLang, setCurrentLang] = useState<Language>(() => getSavedLanguage());
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => getSavedTheme());

  const currentThemeAccent =
    THEME_OPTIONS?.find((t) => t.id === currentTheme)?.accentHex || '#10b981';

  const [selectedVoice, setSelectedVoice] = useState<AzanVoice>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('solatkini_azan_voice') as AzanVoice) || 'jakim';
    }
    return 'jakim';
  });

  const [persistentNotification, setPersistentNotification] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('solatkini_notif_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.persistentNotification ?? true;
        }
      } catch {}
    }
    return true;
  });

  const [_isDndGuideOpen, setIsDndGuideOpen] = useState(false);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const [currentZone, setCurrentZone] = useState<JakimZone>(() => {
    if (typeof window !== 'undefined') {
      const savedCode = localStorage.getItem('solatkini_active_zone');
      if (savedCode) {
        return findZoneByCode(savedCode);
      }
    }
    return JAKIM_ZONES[0];
  });

  const [prayerData, setPrayerData] = useState<{
    times: DayPrayerTimes;
    isOfflineCalculated: boolean;
    lastSyncTime: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);

  const [geoStatus, setGeoStatus] = useState<{
    type: 'detected' | 'error' | null;
    message: string;
    zoneName?: string;
  } | null>(null);

  const hasAutoLocatedRef = useRef(false);

  const [alarmModalState, setAlarmModalState] = useState<{
    isOpen: boolean;
    prayerKey: PrayerKey;
    prayerName: string;
    voice: AzanVoice;
  }>({
    isOpen: false,
    prayerKey: 'subuh',
    prayerName: 'Subuh',
    voice: 'jakim',
  });

  // Fungsi pembantu untuk menjadwalkan alarm ke sistem Android
  const syncAlarmsToNative = (times: DayPrayerTimes, voice: AzanVoice) => {
    if (!times || !times.times) return;
    try {
      let enabledMap: Record<PrayerKey, boolean> = {
        imsak: false,
        subuh: true,
        syuruk: false,
        zohor: true,
        asar: true,
        maghrib: true,
        isyak: true,
      };

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('solatkini_notif_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.preferences) {
            enabledMap.subuh = parsed.preferences.subuh?.enabled ?? true;
            enabledMap.zohor = parsed.preferences.zohor?.enabled ?? true;
            enabledMap.asar = parsed.preferences.asar?.enabled ?? true;
            enabledMap.maghrib = parsed.preferences.maghrib?.enabled ?? true;
            enabledMap.isyak = parsed.preferences.isyak?.enabled ?? true;
          }
        }
      }

      const list = PRAYER_KEYS_ORDER.map((k) => ({
        key: k,
        label: PRAYER_LABELS[k],
        time: times.times[k],
        displayTime: formatDisplayTime(times.times[k]),
        voice: (k === 'subuh' ? 'subuh_special' : voice) as AzanVoice,
      }));

      nativeAlarmService.schedulePrayers(list, voice, enabledMap);
    } catch (e) {
      console.warn('Gagal menjadualkan penggera dari App:', e);
    }
  };

  // 1. Deteksi GPS otomatis
  useEffect(() => {
    if (showOnboarding) return;
    if (hasAutoLocatedRef.current) return;
    hasAutoLocatedRef.current = true;

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const nearest = findNearestZone(latitude, longitude);

          setCurrentZone(nearest);
          localStorage.setItem('solatkini_active_zone', nearest.code);

          setGeoStatus({
            type: 'detected',
            message: 'Zon waktu solat JAKIM diselaraskan secara automatik mengikut koordinat GPS anda.',
            zoneName: `${nearest.daerah.split(',')[0]} (${nearest.code})`,
          });

          setTimeout(() => {
            setGeoStatus(null);
          }, 5000);
        },
        (error) => {
          console.info('Makluman geolokasi:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        }
      );
    }
  }, [showOnboarding]);

  // 2. Muat data waktu solat & jadwalkan alarm native
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchDayPrayerTimes(currentZone, new Date(), false).then((data) => {
      if (isMounted) {
        setPrayerData(data);
        setIsLoading(false);
        syncAlarmsToNative(data.times, selectedVoice);
      }
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_active_zone', currentZone.code);
    }

    return () => {
      isMounted = false;
    };
  }, [currentZone, selectedVoice]);

  // 3. Semakan anjakan hari tengah malam (00:00 Auto-Refresh)
  useEffect(() => {
    let lastDate = new Date().getDate();
    const interval = setInterval(() => {
      const currentDate = new Date().getDate();
      if (currentDate !== lastDate) {
        lastDate = currentDate;
        fetchDayPrayerTimes(currentZone, new Date(), true).then((data) => {
          setPrayerData(data);
          syncAlarmsToNative(data.times, selectedVoice);
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentZone, selectedVoice]);

  const handleLiveSync = async () => {
    setIsLiveSyncing(true);
    try {
      const data = await fetchDayPrayerTimes(currentZone, new Date(), true);
      setPrayerData(data);
      syncAlarmsToNative(data.times, selectedVoice);
    } finally {
      setIsLiveSyncing(false);
    }
  };

  // 4. Periksa izin notifikasi Android 13+ & tangani event azan asli
  useEffect(() => {
    nativeAlarmService.checkPermissions().then((status) => {
      if (!status.notificationsGranted) {
        nativeAlarmService.requestNotificationPermission();
      }
    });

    const handleNativeAzanTrigger = (event: any) => {
      try {
        let data: { prayerName?: string; prayerKey?: PrayerKey; voice?: AzanVoice } = {};
        if (typeof event.detail === 'string') {
          data = JSON.parse(event.detail);
        } else if (event.detail) {
          data = event.detail;
        }
        audioNotificationService.stopAudio();

        setAlarmModalState({
          isOpen: true,
          prayerKey: (data.prayerKey as PrayerKey) || ('solat' as PrayerKey),
          prayerName: data.prayerName || 'Solat',
          voice: data.voice || 'jakim',
        });
      } catch (e) {
        console.warn('Ralat menerima acara azan asli:', e);
      }
    };

    window.addEventListener('azanAlarmTriggered', handleNativeAzanTrigger);
    return () => window.removeEventListener('azanAlarmTriggered', handleNativeAzanTrigger);
  }, []);

  // 5. Listener untuk peramban web
  useEffect(() => {
    const unsubscribe = audioNotificationService.registerAzanTriggerListener(
      (prayerKey, prayerName, voice) => {
        setAlarmModalState({
          isOpen: true,
          prayerKey,
          prayerName,
          voice,
        });
      }
    );
    return () => unsubscribe();
  }, []);

  const handleZoneChange = (zone: JakimZone) => {
    setCurrentZone(zone);
  };

  const handleTriggerTestAlarm = (key: PrayerKey, name: string, voice: AzanVoice) => {
    if (nativeAlarmService.getIsNative()) {
      audioNotificationService.stopAudio();
      nativeAlarmService.testAlarm(name, voice, 1);
    } else {
      audioNotificationService.unlockAudio();
      audioNotificationService.triggerAzan(key, name, voice);
    }
  };

  const handleVoiceChange = (voice: AzanVoice) => {
    setSelectedVoice(voice);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_azan_voice', voice);
      localStorage.setItem('solatkini_active_device_voice', voice);
    }
    nativeAlarmService.setActiveVoice(voice);
    if (prayerData && prayerData.times) {
      syncAlarmsToNative(prayerData.times, voice);
    }
  };

  const handleTogglePersistentNotification = async () => {
    const nextVal = !persistentNotification;
    setPersistentNotification(nextVal);
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('solatkini_notif_settings');
        const parsed = saved ? JSON.parse(saved) : {};
        parsed.persistentNotification = nextVal;
        localStorage.setItem('solatkini_notif_settings', JSON.stringify(parsed));
      } catch {}
    }
    if (prayerData && prayerData.times && currentZone) {
      const hijri = getHijriDate(new Date());
      await widgetService.syncPersistentNotification(
        prayerData.times,
        currentZone,
        hijri.formatted,
        nextVal
      );
    }
  };

  const handleOnboardingComplete = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_onboarding_completed', 'true');
    }
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingChecklist onComplete={handleOnboardingComplete} />;
  }

  const navItems = [
    { id: 'solat', label: t('nav_solat', currentLang), icon: Clock },
    { id: 'kiblat', label: t('nav_kiblat', currentLang), icon: Compass },
    { id: 'puasa', label: t('nav_puasa', currentLang), icon: Moon },
    { id: 'wirid', label: t('nav_wirid', currentLang), icon: Radio },
    { id: 'doa', label: t('nav_doa', currentLang), icon: BookOpen },
    { id: 'tetapan', label: t('nav_tetapan', currentLang), icon: Settings },
    { id: 'kredit', label: t('nav_kredit', currentLang), icon: Award },
  ] as const;

  return (
    <div className="min-h-screen bg-[#070d0b] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-emerald-950/20 rounded-full blur-[120px] pointer-events-none" />

      {geoStatus && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-4 duration-300">
          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/40 bg-[#0d1f18]/95 shadow-2xl flex items-start justify-between gap-3 text-left">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Lokasi Dikesan: <span className="text-emerald-300 font-mono">{geoStatus.zoneName}</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{geoStatus.message}</p>
              </div>
            </div>
            <button
              onClick={() => setGeoStatus(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#070d0b]/80 backdrop-blur-xl border-b border-emerald-900/30 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 lg:gap-8">
          <div
            onClick={() => setActiveTab('solat')}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/25 shadow-md transition-all duration-300"
              style={{
                backgroundColor: currentThemeAccent,
                boxShadow: `0 4px 14px ${currentThemeAccent}55`,
              }}
            >
              <MoonStar className="w-5 h-5 text-white stroke-[2.3] fill-white/20" />
            </div>

            <span className="text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
              SolatKini{' '}
              <span
                className="font-bold text-xs ml-1 transition-colors duration-300"
                style={{ color: currentThemeAccent }}
              >
                Malaysia
              </span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={`relative p-2.5 rounded-xl transition-all duration-200 group flex items-center justify-center cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  {isActive && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleTriggerTestAlarm('zohor', 'Zohor', selectedVoice)}
              className="px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
              style={{
                backgroundColor: currentThemeAccent,
                boxShadow: `0 4px 12px ${currentThemeAccent}40`,
              }}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Uji</span> Azan
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-20 md:pb-12">
        {isLoading || !prayerData ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Memuatkan Waktu Solat JAKIM...</p>
          </div>
        ) : (
          <>
            {activeTab === 'solat' && (
              <PrayerDashboard
                currentZone={currentZone}
                onZoneChange={handleZoneChange}
                prayerTimes={prayerData.times}
                isOfflineCalculated={prayerData.isOfflineCalculated}
                lastSyncTime={prayerData.lastSyncTime}
                isLiveSyncing={isLiveSyncing}
                onLiveSync={handleLiveSync}
                onNavigateToTab={(tab) => setActiveTab(tab as ActiveTab)}
                onTriggerTestAlarm={handleTriggerTestAlarm}
              />
            )}

            {activeTab === 'kiblat' && <QiblaCompass currentZone={currentZone} />}

            {activeTab === 'puasa' && (
              <FastingTracker prayerTimes={prayerData.times} currentZone={currentZone} />
            )}

            {activeTab === 'wirid' && <TasbihWirid />}

            {activeTab === 'doa' && <DuaCollection />}

            {(activeTab === 'tetapan' || activeTab === 'widget') && (
              <SettingsView
                currentLang={currentLang}
                onLanguageChange={(lang) => {
                  setCurrentLang(lang);
                  saveLanguage(lang);
                }}
                currentTheme={currentTheme}
                onThemeChange={(th) => {
                  setCurrentTheme(th);
                  applyTheme(th);
                }}
                prayerTimes={prayerData.times}
                currentZone={currentZone}
                selectedVoice={selectedVoice}
                onVoiceChange={handleVoiceChange}
                persistentNotification={persistentNotification}
                onTogglePersistentNotification={handleTogglePersistentNotification}
                onOpenDndGuide={() => setIsDndGuideOpen(true)}
                onTriggerTestAlarm={() => handleTriggerTestAlarm('zohor', 'Zohor', selectedVoice)}
              />
            )}

            {activeTab === 'kredit' && (
              <CreditsPage onNavigateToTab={(tab) => setActiveTab(tab)} />
            )}
          </>
        )}
      </main>

      <footer className="mt-auto border-t border-emerald-950/60 bg-[#060a08]/90 backdrop-blur-md py-6 px-4 sm:px-6 mb-16 md:mb-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
              <span className="font-bold text-white tracking-tight">SolatKini Malaysia</span>
              <span className="text-emerald-500">•</span>
              <span className="text-emerald-400 font-medium">Idea: Musa Bin Sarudin</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-medium">Dilaksanakan Oleh: Gemini 3.8</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Data rasmi Jabatan Kemajuan Islam Malaysia (JAKIM) • 60 Zon Waktu Solat • Versi 2.5.0 APK Android
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setActiveTab('kredit')}
              className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'kredit'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              Halaman Kredit & Info
            </button>
            <button
              onClick={() => setActiveTab('solat')}
              className="text-slate-400 hover:text-emerald-300 transition cursor-pointer"
            >
              Waktu Solat
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => setActiveTab('kiblat')}
              className="text-slate-400 hover:text-emerald-300 transition cursor-pointer"
            >
              Kiblat
            </button>
          </div>
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070d0b]/95 backdrop-blur-xl border-t border-emerald-900/30 px-2 py-2 pb-safe shadow-2xl">
        <div className="grid grid-cols-7 items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`relative h-12 flex items-center justify-center rounded-2xl transition-all duration-200 active:scale-90 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 transition-transform" />
                {isActive && (
                  <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-emerald-400 shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <AzanAlarmModal
        isOpen={alarmModalState.isOpen}
        prayerKey={alarmModalState.prayerKey}
        prayerName={alarmModalState.prayerName}
        voice={alarmModalState.voice}
        onClose={() => setAlarmModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ========================================== */}
      {/* MULA: MUSALOG (PADAM BAHAGIAN INI UNTUK BUANG) */}
      {/* ========================================== */}
      <MusaLog />
      {/* ========================================== */}
      {/* AKHIR: MUSALOG */}
      {/* ========================================== */}
    </div>
  );
}
