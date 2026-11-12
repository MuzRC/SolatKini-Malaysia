import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe,
  Palette,
  Volume2,
  Tv,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Sliders,
  Bell,
  Power,
  ShieldAlert,
  Square,
  BatteryCharging,
} from 'lucide-react';
import { DayPrayerTimes, JakimZone, AzanVoice } from '../types/prayer';
import { Language, LANGUAGE_OPTIONS, t, saveLanguage } from '../utils/i18n';
import { ThemeId, THEME_OPTIONS, applyTheme } from '../utils/theme';
import { AZAN_OPTIONS, audioNotificationService } from '../services/audioNotificationService';
import { audioStorageService } from '../services/audioStorageService';
import { nativeAlarmService } from '../services/nativeAlarmService';

// ==============================================================================================
// [MULA KOD BOLEH PADAM] : IMPORT KAD LOG AZAN
// Padam 3 baris ini jika mahu membuang modul log di kemudian hari
// ==============================================================================================
import { AzanHistoryCard } from './AzanHistoryCard';
// ==============================================================================================
// [TAMAT KOD BOLEH PADAM] : IMPORT KAD LOG AZAN
// ==============================================================================================

interface SettingsViewProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  prayerTimes: DayPrayerTimes;
  currentZone: JakimZone;
  selectedVoice: AzanVoice;
  onVoiceChange: (voice: AzanVoice) => void;
  persistentNotification: boolean;
  onTogglePersistentNotification: () => void;
  onOpenDndGuide: () => void;
  onTriggerTestAlarm: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentLang,
  onLanguageChange,
  currentTheme,
  onThemeChange,
  prayerTimes: _prayerTimes,
  currentZone: _currentZone,
  selectedVoice,
  onVoiceChange,
  persistentNotification,
  onTogglePersistentNotification,
  onOpenDndGuide,
  onTriggerTestAlarm: _onTriggerTestAlarm,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeDeviceVoice, setActiveDeviceVoice] = useState<string | null>(() => {
    return audioStorageService.getActiveDeviceVoice() || selectedVoice;
  });

  // State untuk Auto-Start Selepas Restart Telefon (Lalai / Default: TRUE)
  const [autoStartBoot, setAutoStartBoot] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('solatkini_autostart_boot');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  // State ujian suara azan pada saluran penggera (STREAM_ALARM) dengan had 20 saat
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);
  const [testCountdown, setTestCountdown] = useState<number>(0);
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAzanTest = useCallback(() => {
    if (testTimerRef.current) {
      clearTimeout(testTimerRef.current);
      testTimerRef.current = null;
    }
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    nativeAlarmService.stopNativeAzan();
    audioNotificationService.stopAudio();
    setTestingVoiceId(null);
    setTestCountdown(0);
  }, []);

  const playAzanTestOnAlarm = (voiceId: AzanVoice, voiceTitle: string) => {
    stopAzanTest();
    setTestingVoiceId(voiceId);
    setTestCountdown(20);

    if (nativeAlarmService.getIsNative()) {
      // Mainkan serta-merta pada saluran STREAM_ALARM telefon dengan henti automatik 20s
      nativeAlarmService.testAlarm(`Ujian ${voiceTitle}`, voiceId, 0, 20);
      // Pastikan pilihan suara utama dalam SharedPreferences kekal selaras
      nativeAlarmService.setActiveVoice(voiceId);
    } else {
      audioNotificationService.unlockAudio();
      audioNotificationService.playAzan(voiceId, () => stopAzanTest());
    }

    testIntervalRef.current = setInterval(() => {
      setTestCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    testTimerRef.current = setTimeout(() => {
      stopAzanTest();
    }, 20000);
  };

  useEffect(() => {
    return () => {
      stopAzanTest();
    };
  }, [stopAzanTest]);

  // Selaraskan activeDeviceVoice apabila prop selectedVoice berubah
  useEffect(() => {
    if (selectedVoice) {
      setActiveDeviceVoice(selectedVoice);
    }
  }, [selectedVoice]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const devVoice = audioStorageService.getActiveDeviceVoice();
    if (devVoice) setActiveDeviceVoice(devVoice);

    // Tetapkan nilai lalai ke dalam localStorage jika pemasangan baru
    if (typeof window !== 'undefined' && localStorage.getItem('solatkini_autostart_boot') === null) {
      localStorage.setItem('solatkini_autostart_boot', 'true');
    }
  }, []);

  const handleToggleAutoStart = async () => {
    const nextVal = !autoStartBoot;
    setAutoStartBoot(nextVal);

    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_autostart_boot', String(nextVal));
    }

    if (nextVal && nativeAlarmService.getIsNative()) {
      await nativeAlarmService.openAutostartSettings();
    }

    showToast(
      nextVal
        ? 'Auto-start selepas restart telefon diaktifkan.'
        : 'Auto-start selepas restart telefon dimatikan.'
    );
  };

  const handleSelectLanguage = (lang: Language) => {
    saveLanguage(lang);
    onLanguageChange(lang);
    showToast(
      lang === 'ms'
        ? 'Bahasa aplikasi ditukar ke Bahasa Melayu.'
        : lang === 'en'
        ? 'Application language changed to English.'
        : '应用语言已切换至简体中文。'
    );
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    applyTheme(themeId);
    onThemeChange(themeId);
    const themeName = THEME_OPTIONS.find((t) => t.id === themeId)?.name || themeId;
    showToast(`${t('theme_title', currentLang)}: ${themeName}`);
  };

  const handleClearAudioCache = async () => {
    try {
      stopAzanTest();
      await audioStorageService.clearAllAudioCache();
      showToast(
        currentLang === 'ms'
          ? 'Memori cache audio dikosongkan.'
          : currentLang === 'en'
          ? 'Audio cache cleared successfully.'
          : '音频缓存已成功清除。'
      );
    } catch (e: any) {
      showToast(e.message || 'Ralat');
    }
  };

  const currentVoiceData =
    AZAN_OPTIONS.find((v) => v.id === (activeDeviceVoice || selectedVoice)) ||
    AZAN_OPTIONS[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 select-none animate-in fade-in duration-300">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c1913] via-[#091510] to-[#060e0a] border border-emerald-500/30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {t('settings_title', currentLang)}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {t('settings_desc', currentLang)}
            </p>
          </div>
        </div>
      </div>

      {/* 1. KAD PILIHAN BAHASA */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/90 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              {t('lang_title', currentLang)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('lang_desc', currentLang)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {LANGUAGE_OPTIONS.map((lang) => {
            const isSelected = currentLang === lang.id;
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => handleSelectLanguage(lang.id)}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-950/70 border-emerald-400/60 ring-1 ring-emerald-400/50 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{lang.nativeName}</h4>
                    <p className="text-[11px] text-slate-400">{lang.name}</p>
                  </div>
                </div>
                {isSelected && (
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. KAD TEMA WARNA APLIKASI */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/90 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {t('theme_title', currentLang)}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-300 font-bold">
                7 Pilihan Warna
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('theme_desc', currentLang)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = currentTheme === theme.id;
            const themeTitle =
              currentLang === 'en'
                ? theme.nameEn
                : currentLang === 'zh'
                ? theme.nameZh
                : theme.name;
            const themeDesc =
              currentLang === 'en'
                ? theme.descriptionEn
                : currentLang === 'zh'
                ? theme.descriptionZh
                : theme.descriptionMs;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-white/40 ring-2 ring-white/30 shadow-lg shadow-black/60'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full shrink-0 shadow-sm border border-white/20"
                      style={{ backgroundColor: theme.accentHex }}
                    />
                    <span className="text-xs font-bold text-white truncate">{themeTitle}</span>
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-white text-slate-950 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {themeDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. KAD NOTIFIKASI BERTERUSAN (STATUS BAR ANDROID) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/90 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Notifikasi Waktu Solat Berterusan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Paparkan waktu solat seterusnya secara kekal pada panel notifikasi telefon
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onTogglePersistentNotification}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 shrink-0 cursor-pointer ${
              persistentNotification ? 'bg-emerald-500' : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                persistentNotification ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 4. KAD AUTO-START SELEPAS RESTART TELEFON */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/90 shadow-lg space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Auto-Start Selepas Restart Telefon
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Jadualkan semula azan dan mulakan aplikasi secara automatik bila peranti dihidupkan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleAutoStart}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 shrink-0 cursor-pointer ${
              autoStartBoot ? 'bg-emerald-500' : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                autoStartBoot ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Nota Tambahan & Pintasan Terus ke Tetapan OEM / Bateri */}
        <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-slate-300 space-y-2.5">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Perhatian untuk Pengguna Xiaomi / Vivo / Oppo / Realme:</span>
          </div>
          <p className="leading-relaxed text-slate-400">
            Sila pastikan anda mengaktifkan kebenaran <strong>&quot;Autostart / Mulakan Sendiri&quot;</strong> dan menetapkan <strong>&quot;Tiada Sekatan Bateri&quot;</strong> di Tetapan Telefon agar azan tidak disekat daripada berbunyi tepat pada waktunya.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => nativeAlarmService.openAutostartSettings()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Buka Tetapan Autostart</span>
            </button>
            <button
              type="button"
              onClick={() => nativeAlarmService.requestIgnoreBatteryOptimization()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <BatteryCharging className="w-3.5 h-3.5" />
              <span>Kecualikan Sekatan Bateri</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. KAD PENGGERA AZAN & MUADZIN TELEFON */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/90 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              {t('alarm_card_title', currentLang)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('alarm_card_desc', currentLang)}
            </p>
          </div>
        </div>

        {/* Active Phone Voice Info */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-[#0e241c] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
              <span>{t('current_device_azan', currentLang)}</span>
              {testingVoiceId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] border border-rose-500/40 animate-pulse font-mono">
                  ● Sedang Berbunyi (STREAM_ALARM) · {testCountdown}s
                </span>
              )}
            </span>
            <h4 className="text-sm font-extrabold text-white mt-0.5">
              {currentVoiceData.title}
            </h4>
            <p className="text-[11px] text-slate-300">
              {currentVoiceData.reciter} · Saluran Penggera Sistem (STREAM_ALARM)
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (testingVoiceId) {
                stopAzanTest();
              } else {
                playAzanTestOnAlarm(
                  (activeDeviceVoice || selectedVoice) as AzanVoice,
                  currentVoiceData.title
                );
              }
            }}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 shadow-md transition active:scale-95 cursor-pointer ${
              testingVoiceId
                ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
            }`}
          >
            {testingVoiceId ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Hentikan ({testCountdown}s)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>{t('btn_test_azan', currentLang)}</span>
              </>
            )}
          </button>
        </div>

        {/* Muazzin Voice Selector Grid */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Pilihan Suara Laungan Azan Harian (Zohor, Asar, Maghrib & Isyak):
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">
              Ketik untuk pilih & uji serta-merta (STREAM_ALARM)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AZAN_OPTIONS.map((opt) => {
              const isActive = (activeDeviceVoice || selectedVoice) === opt.id;
              const isThisTesting = testingVoiceId === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    if (isThisTesting) {
                      stopAzanTest();
                      return;
                    }

                    // 1. Kemas kini pilihan suara melalui onVoiceChange (App.tsx akan menguruskan
                    // jadual AlarmManager mengikut suis waktu solat sebenar pengguna)
                    audioStorageService.setActiveDeviceVoice(opt.id);
                    setActiveDeviceVoice(opt.id);
                    onVoiceChange(opt.id);

                    // 2. Mainkan ujian audio azan serta-merta pada saluran STREAM_ALARM (henti automatik 20 saat)
                    playAzanTestOnAlarm(opt.id, opt.title);
                    showToast(`Azan harian: ${opt.title} (STREAM_ALARM sedang diuji)`);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                    isThisTesting
                      ? 'bg-rose-950/50 border-rose-500/70 ring-2 ring-rose-500/40 shadow-lg'
                      : isActive
                      ? 'bg-emerald-950/70 border-emerald-400/60 ring-1 ring-emerald-400/40'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h5 className="text-xs font-bold text-white truncate">{opt.title}</h5>
                      {isThisTesting && (
                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                      )}
                    </div>
                    <p className="text-[10px] text-emerald-400 mt-0.5 truncate">{opt.reciter}</p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isThisTesting ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          stopAzanTest();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 shadow transition cursor-pointer"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Henti ({testCountdown}s)</span>
                      </button>
                    ) : isActive ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          Aktif
                        </span>
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 hover:text-emerald-300 font-medium px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60">
                        Uji & Pilih
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Android Hardware Settings & DND bypass */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              await nativeAlarmService.openExactAlarmSettings();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('btn_exact_alarm_settings', currentLang)}</span>
          </button>

          <button
            type="button"
            onClick={onOpenDndGuide}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('btn_dnd_settings', currentLang)}</span>
          </button>

          <button
            type="button"
            onClick={handleClearAudioCache}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-red-950/40 text-slate-300 hover:text-red-300 text-xs font-medium border border-slate-700 transition ml-auto cursor-pointer"
            title="Kosongkan memori audio luar talian IndexedDB"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Kosongkan Cache Audio</span>
          </button>
        </div>
      </div>

      {/* ============================================================================================== */}
      {/* [MULA KOD BOLEH PADAM] : KAD LOG DIAGNOSTIK AZAN 24 JAM */}
      {/* Padam blok ini jika mahu membuang paparan log dari halaman Tetapan di kemudian hari */}
      {/* ============================================================================================== */}
      <AzanHistoryCard />
      {/* ============================================================================================== */}
      {/* [TAMAT KOD BOLEH PADAM] : KAD LOG DIAGNOSTIK AZAN 24 JAM */}
      {/* ============================================================================================== */}

      {/* 6. KAD WIDGET SKRIN UTAMA TELEFON */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/90 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              {t('home_widget_title', currentLang)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('home_widget_desc', currentLang)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/60 border border-slate-800 text-xs space-y-2 text-slate-300">
          <div className="font-bold text-white text-sm flex items-center gap-2">
            <span>Langkah Memasang Widget ke Desktop Telefon:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-xs">
            <li>Tekan dan tahan pada mana-mana ruang kosong di skrin utama (Home Screen) telefon anda.</li>
            <li>Pilih menu <strong>Widgets</strong> daripada senarai.</li>
            <li>Cari aplikasi <strong>SolatKini</strong> dan pilih saiz widget (4x2 atau 3x1).</li>
            <li>Tarik (*drag*) widget ke skrin utama anda untuk memaparkan jadual waktu solat 24 jam.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
