import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { DayPrayerTimes, JakimZone, AzanVoice } from '../types/prayer';
import { Language, LANGUAGE_OPTIONS, t, saveLanguage } from '../utils/i18n';
import { ThemeId, THEME_OPTIONS, applyTheme } from '../utils/theme';
import { AZAN_OPTIONS, audioNotificationService } from '../services/audioNotificationService';
import { audioStorageService } from '../services/audioStorageService';
import { nativeAlarmService } from '../services/nativeAlarmService';

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
  prayerTimes: _prayerTimes, // Ditanda _ jika disimpan untuk kegunaan versi akan datang
  currentZone: _currentZone,
  selectedVoice,
  onVoiceChange,
  persistentNotification,
  onTogglePersistentNotification,
  onOpenDndGuide,
  onTriggerTestAlarm,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeDeviceVoice, setActiveDeviceVoice] = useState<string | null>(() => {
    return audioStorageService.getActiveDeviceVoice();
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const devVoice = audioStorageService.getActiveDeviceVoice();
    if (devVoice) setActiveDeviceVoice(devVoice);
  }, []);

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
      audioNotificationService.stopAudio();
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

  const currentVoiceData = AZAN_OPTIONS.find(
    (v) => v.id === (activeDeviceVoice || selectedVoice)
  ) || AZAN_OPTIONS[0];

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
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
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
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 shrink-0 ${
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
              {currentVoiceData.title}
            </h4>
            <p className="text-[11px] text-slate-300">
              {currentVoiceData.reciter} · STREAM_ALARM
            </p>
          </div>

          <button
            type="button"
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
            type="button"
            onClick={async () => {
              await nativeAlarmService.openExactAlarmSettings();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('btn_exact_alarm_settings', currentLang)}</span>
          </button>

          <button
            type="button"
            onClick={onOpenDndGuide}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('btn_dnd_settings', currentLang)}</span>
          </button>

          <button
            type="button"
            onClick={handleClearAudioCache}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-red-950/40 text-slate-300 hover:text-red-300 text-xs font-medium border border-slate-700 transition ml-auto"
            title="Kosongkan memori audio luar talian IndexedDB"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Kosongkan Cache Audio</span>
          </button>
        </div>
      </div>

      {/* 5. KAD WIDGET SKRIN UTAMA TELEFON */}
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
