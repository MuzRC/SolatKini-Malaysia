import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  Play,
  Square,
  Sparkles,
  X,
  Download,
  HardDrive,
  Trash2,
  Check,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { AzanVoice, PrayerKey } from '../types/prayer';
import { AZAN_OPTIONS, audioNotificationService, ExtendedAzanAudioOption } from '../services/audioNotificationService';
import { audioStorageService } from '../services/audioStorageService';
import { nativeAlarmService } from '../services/nativeAlarmService';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: AzanVoice;
  onVoiceSelect: (voice: AzanVoice) => void;
  nextPrayerKey?: PrayerKey;
  nextPrayerLabel?: string;
  onTriggerTestAlarm?: (key: PrayerKey, name: string, voice: AzanVoice) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onVoiceSelect,
  nextPrayerKey = 'subuh',
  nextPrayerLabel = 'Subuh',
  onTriggerTestAlarm,
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<AzanVoice | null>(null);
  const [cachedVoiceIds, setCachedVoiceIds] = useState<string[]>([]);
  const [downloadingVoiceId, setDownloadingVoiceId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [audioToast, setAudioToast] = useState<string | null>(null);
  const [activeDeviceVoice, setActiveDeviceVoice] = useState<string | null>(() => {
    return audioStorageService.getActiveDeviceVoice() || selectedVoice;
  });

  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customObjectUrlRef = useRef<string | null>(null);

  const handleStopAll = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    audioNotificationService.stopAudio();
    nativeAlarmService.stopNativeAzan();
    setIsPlayingPreview(false);
    setPreviewingVoiceId(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      audioStorageService.getAllCachedVoiceIds().then((ids) => {
        setCachedVoiceIds(ids);
      });
      const devVoice = audioStorageService.getActiveDeviceVoice();
      setActiveDeviceVoice(devVoice || selectedVoice);
    } else {
      handleStopAll();
    }
  }, [isOpen, selectedVoice, handleStopAll]);

  useEffect(() => {
    return () => {
      handleStopAll();
      if (customObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(customObjectUrlRef.current);
        } catch {}
        customObjectUrlRef.current = null;
      }
    };
  }, [handleStopAll]);

  if (!isOpen) return null;

  const handleClose = () => {
    handleStopAll();
    onClose();
  };

  const handlePlayPreview = (voice: AzanVoice) => {
    if (isPlayingPreview && previewingVoiceId === voice) {
      handleStopAll();
    } else {
      handleStopAll();
      setIsPlayingPreview(true);
      setPreviewingVoiceId(voice);

      if (nativeAlarmService.getIsNative()) {
        // Pada peranti Android Native, salurkan ujian azan terus melalui saluran STREAM_ALARM (henti automatik 20 saat)
        nativeAlarmService.testAlarm('Ujian Azan', voice, 0, 20);
        // Kekalkan suara aktif sebenar pilihan pengguna di dalam SharedPreferences
        const currentSavedVoice = (activeDeviceVoice || selectedVoice) as string;
        if (currentSavedVoice) {
          nativeAlarmService.setActiveVoice(currentSavedVoice);
        }
        previewTimerRef.current = setTimeout(() => {
          setIsPlayingPreview(false);
          setPreviewingVoiceId(null);
        }, 20000);
      } else {
        audioNotificationService.unlockAudio();
        audioNotificationService.playAzan(voice, () => {
          setIsPlayingPreview(false);
          setPreviewingVoiceId(null);
        });
      }
    }
  };

  const handleSetAsDeviceVoice = async (opt: ExtendedAzanAudioOption) => {
    handleStopAll();

    audioStorageService.setActiveDeviceVoice(opt.id);
    setActiveDeviceVoice(opt.id);
    onVoiceSelect(opt.id);

    setAudioToast(`Berjaya! ${opt.title} ditetapkan untuk solat harian.`);
    setTimeout(() => setAudioToast(null), 3500);

    if (!cachedVoiceIds.includes(opt.id) && opt.audioUrl) {
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
        console.warn('Pra-simpanan audio latar belakang gagal:', err);
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
        setCachedVoiceIds((prev) => Array.from(new Set([...prev, opt.id])));
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
      handleStopAll();
      await audioStorageService.clearAllAudioCache();
      setCachedVoiceIds([]);
      setAudioToast('Memori cache berjaya dikosongkan! Vokal azan MP3 rasmi sedia dimainkan secara lancar.');
      setTimeout(() => setAudioToast(null), 4000);
    } catch (err: any) {
      setAudioToast(`Ralat mengosongkan cache: ${err?.message || 'Sila cuba lagi'}`);
      setTimeout(() => setAudioToast(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0f1a16] border border-emerald-500/20 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-white">Pilihan Audio Azan</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih alunan muadzin kegemaran anda untuk laungan azan solat harian
            </p>
          </div>
          <button
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {audioToast && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-900/80 border border-emerald-400 text-xs text-white flex items-center justify-between animate-in fade-in">
            <span>{audioToast}</span>
            <button onClick={() => setAudioToast(null)} className="text-slate-300 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="mt-4 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1 text-left">
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Pilihan di bawah digunakan untuk Zohor, Asar, Maghrib & Isyak. Waktu Subuh menggunakan alunan Azan Subuh khas secara lalai.</span>
          </div>

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
              {isPlayingPreview && previewingVoiceId === (activeDeviceVoice || selectedVoice) ? 'Henti' : 'Uji Bunyi'}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1813] to-[#08120e] border border-emerald-500/30 text-left space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Sistem Penggera Azan Asli (Android AlarmManager)
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                TargetSDK 34
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Dikuasakan oleh perkakasan <code className="text-emerald-300 font-mono">AlarmManager.setAlarmClock</code> dan saluran audio <code className="text-emerald-300 font-mono">STREAM_ALARM</code> bagi menjamin laungan azan berkumandang tepat pada waktunya dan melepasi mod senyap serta skrin kunci.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                onClick={async () => {
                  handleStopAll();
                  const activeVoice = (activeDeviceVoice || selectedVoice) as AzanVoice;
                  const testVoice = (nextPrayerKey === 'subuh' && activeVoice === 'jakim' ? 'subuh_special' : activeVoice) as AzanVoice;
                  const res = await nativeAlarmService.testAlarm(nextPrayerLabel, testVoice, 3, 20);
                  if (res) {
                    // Kekalkan suara pilihan harian dalam SharedPreferences
                    await nativeAlarmService.setActiveVoice(activeVoice);
                    setAudioToast('Penggera azan asli dijadualkan (3 saat)! Kunci skrin telefon anda sekarang untuk menguji.');
                  } else if (onTriggerTestAlarm) {
                    onTriggerTestAlarm(nextPrayerKey, nextPrayerLabel, testVoice);
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
            const isThisPreviewing = isPlayingPreview && previewingVoiceId === opt.id;
            const isCached = cachedVoiceIds.includes(opt.id);
            const isDownloading = downloadingVoiceId === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => handleSetAsDeviceVoice(opt)}
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
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white shrink-0 transition shadow-md cursor-pointer ${
                      isThisPreviewing
                        ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                    }`}
                    title={isThisPreviewing ? 'Henti Pratonton' : 'Dengar Alunan Azan'}
                  >
                    {isThisPreviewing ? (
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
                      <HardDrive className="w-3.5 h-3.5" />
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
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Muat Turun .MP3</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                Muat Naik Fail Audio Azan Sendiri
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pilih fail .mp3 atau .wav dari peranti anda untuk pratonton azan tersuai
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
                    handleStopAll();
                    if (customObjectUrlRef.current) {
                      try {
                        URL.revokeObjectURL(customObjectUrlRef.current);
                      } catch {}
                    }
                    const url = URL.createObjectURL(file);
                    customObjectUrlRef.current = url;
                    audioNotificationService.setCustomAudio(url);
                    setIsPlayingPreview(true);
                    setPreviewingVoiceId('custom' as AzanVoice);
                    audioNotificationService.playAzan('custom' as AzanVoice, () => {
                      setIsPlayingPreview(false);
                      setPreviewingVoiceId(null);
                    });
                    setAudioToast(`Memainkan fail audio tersuai: ${file.name}`);
                    setTimeout(() => setAudioToast(null), 3500);
                  }
                }}
              />
            </label>
          </div>

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
            Tekan ikon main untuk mendengar pratonton atau pilih kad untuk menetapkan suara
          </div>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
