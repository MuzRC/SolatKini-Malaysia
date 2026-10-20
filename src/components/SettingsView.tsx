import React, { useState, useEffect } from 'react';
import {
  Globe,
  Palette,
  BellRing,
  Volume2,
  Tv,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Trash2,
  Sliders,
  Maximize2
} from 'lucide-react';
import { DayPrayerTimes, JakimZone, AzanVoice } from '../types/prayer';
import { Language, LANGUAGE_OPTIONS, t, saveLanguage } from '../utils/i18n';
import { ThemeId, THEME_OPTIONS, applyTheme } from '../utils/theme';
import { AZAN_OPTIONS, audioNotificationService } from '../services/audioNotificationService';
import { audioStorageService } from '../services/audioStorageService';
import { nativeAlarmService } from '../services/nativeAlarmService';
import { widgetService } from '../services/widgetService';
import { formatDisplayTime } from '../utils/prayerCalculator';
import { determineNextPrayer } from '../services/prayerService';
import { getHijriDate } from '../utils/hijriCalendar';

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
  prayerTimes,
  currentZone,
  selectedVoice,
  onVoiceChange,
  persistentNotification,
  onTogglePersistentNotification,
  onOpenDndGuide,
  onTriggerTestAlarm,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cachedVoiceIds, setCachedVoiceIds] = useState<string[]>([]);
  const [activeDeviceVoice, setActiveDeviceVoice] = useState<string | null>(() => {
    return audioStorageService.getActiveDeviceVoice();
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    audioStorageService.getAllCachedVoiceIds().then(setCachedVoiceIds).catch(() => {});
    const devVoice = audioStorageService.getActiveDeviceVoice();
    if (devVoice) setActiveDeviceVoice(devVoice);
  }, []);

  const now = new Date();
  const nextPrayer = determineNextPrayer(prayerTimes, now);
  const hijri = getHijriDate(now);

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

  const handleManualSyncBar = async () => {
    if (prayerTimes && currentZone) {
      await widgetService.syncPersistentNotification(
        prayerTimes,
        currentZone,
        hijri.formatted,
        true
      );
      showToast(
        currentLang === 'ms'
          ? 'Bar notifikasi teratas berjaya disegarkan!'
          : currentLang === 'en'
          ? 'Notification bar updated successfully!'
          : '通知栏组件已成功更新！'
      );
    }
  };

  const handleClearAudioCache = async () => {
    try {
      audioNotificationService.stopAudio();
      await audioStorageService.clearAllAudioCache();
      setCachedVoiceIds([]);
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

      {/* 1. KAD PILIHAN BAHASA (LANGUAGE / 语言选择) */}
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
                onClick={() => handleSelectLanguage(lang.id)}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
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

      {/* 2. KAD TEMA WARNA APLIKASI (7 PILIHAN WARNA) */}
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
                onClick={() => handleSelectTheme(theme.id)}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-850 border-white/40 ring-2 ring-white/30 shadow-lg shadow-black/60'
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
                      <Check className="w-3 h-3 stroke-[3]" />
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

      {/* 3. KAD WIDGET BAR NOTIFIKASI TETAP (TOP PRIORITY) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/90 shadow-lg space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {t('notif_card_title', currentLang)}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-bold">
                  Top Priority (Silent)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {t('notif_card_desc', currentLang)}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={onTogglePersistentNotification}
            role="switch"
            aria-checked={persistentNotification}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              persistentNotification ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                persistentNotification ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Live Notification Mockup Preview */}
        {persistentNotification && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold">{t('notif_preview_label', currentLang)}</span>
              <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold">
                ONGOING · DI ATAS SEKALI
              </span>
            </div>

            <div className="rounded-2xl bg-black/75 border border-slate-800 p-3.5 text-xs space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span className="text-white">
                  SolatKini · Zon {currentZone.code} ({currentZone.daerah.split(',')[0]})
                </span>
                <span className="text-[10px] text-slate-400">{hijri.formatted}</span>
              </div>

              <div className="text-emerald-400 font-bold text-xs">
                ▶ {t('next_prayer', currentLang)}: {nextPrayer?.nextLabel} ({nextPrayer?.nextDisplayTime}){' '}
                {nextPrayer?.countdownFormatted && `· ${nextPrayer.countdownFormatted}`}
              </div>

              <div className="font-mono text-[11px] text-slate-200 bg-slate-900/90 py-1.5 px-3 rounded-xl border border-slate-800 flex items-center justify-between overflow-x-auto gap-1">
                <span>Subuh <strong className="text-emerald-300">{formatDisplayTime(prayerTimes.times.subuh)}</strong></span>
                <span className="text-slate-600">|</span>
                <span>Zohor <strong className="text-emerald-300">{formatDisplayTime(prayerTimes.times.zohor)}</strong></span>
                <span className="text-slate-600">|</span>
                <span>Asar <strong className="text-emerald-300">{formatDisplayTime(prayerTimes.times.asar)}</strong></span>
                <span className="text-slate-600">|</span>
                <span>Maghrib <strong className="text-emerald-300">{formatDisplayTime(prayerTimes.times.maghrib)}</strong></span>
                <span className="text-slate-600">|</span>
                <span>Isyak <strong className="text-emerald-300">{formatDisplayTime(prayerTimes.times.isyak)}</strong></span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                  [ {t('open_app', currentLang)} ]
                </span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                  [ ↻ {t('sync_prayer', currentLang)} ]
                </span>

                <button
                  onClick={handleManualSyncBar}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition active:scale-95"
                >
                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                  <span>{t('sync_now', currentLang)}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. KAD PENGGERA AZAN & MUADZIN TELEFON */}
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
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-[#0e241c] border border-emerald-500/40 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              {t('current_device_azan', currentLang)}
            </span>
            <h4 className="text-sm font-extrabold text-white mt-0.5">
              {AZAN_OPTIONS.find((v) => v.id === (activeDeviceVoice || selectedVoice))?.title}
            </h4>
            <p className="text-[11px] text-slate-300">
              {AZAN_OPTIONS.find((v) => v.id === (activeDeviceVoice || selectedVoice))?.reciter} · STREAM_ALARM
            </p>
          </div>

          <button
            onClick={onTriggerTestAlarm}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 shadow-md transition active:scale-95"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{t('btn_test_azan', currentLang)}</span>
          </button>
        </div>

        {/* Muazzin Voice Selector Grid */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-slate-300 mb-2">
            Pilihan Suara Laungan Azan:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AZAN_OPTIONS.map((opt) => {
              const isActive = (activeDeviceVoice || selectedVoice) === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    onVoiceChange(opt.id);
                    audioStorageService.setActiveDeviceVoice(opt.id);
                    setActiveDeviceVoice(opt.id);
                    nativeAlarmService.setActiveVoice(opt.id);
                    showToast(`Azan telefon ditetapkan kepada: ${opt.title}`);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-emerald-950/70 border-emerald-400/60 ring-1 ring-emerald-400/40'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div>
                    <h5 className="text-xs font-bold text-white">{opt.title}</h5>
                    <p className="text-[10px] text-emerald-400 mt-0.5">{opt.reciter}</p>
                  </div>
                  {isActive ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Pilih</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Android Hardware Settings & DND bypass */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
          <button
            onClick={async () => {
              await nativeAlarmService.openExactAlarmSettings();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('btn_exact_alarm_settings', currentLang)}</span>
          </button>

          <button
            onClick={onOpenDndGuide}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('btn_dnd_settings', currentLang)}</span>
          </button>

          <button
            onClick={handleClearAudioCache}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-red-950/40 text-slate-300 hover:text-red-300 text-xs font-medium border border-slate-700 transition ml-auto"
            title="Kosongkan memori audio luar talian IndexedDB"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Kosongkan Cache Audio</span>
          </button>
        </div>
      </div>

      {/* 5. KAD WIDGET SKRIN UTAMA TELEFON (HOME SCREEN) */}
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
