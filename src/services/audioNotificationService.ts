import { AzanAudioOption, AzanVoice, PrayerKey } from '../types/prayer';
import { audioStorageService } from './audioStorageService';
import { nativeAlarmService } from './nativeAlarmService';

export interface ExtendedAzanAudioOption extends AzanAudioOption {
  audioUrl: string;
  fallbackUrl?: string;
  filename: string;
}

export const AZAN_OPTIONS: ExtendedAzanAudioOption[] = [
  {
    id: 'makkah',
    title: 'Azan Masjidil Haram (Makkah)',
    reciter: 'Syeikh Ali Ahmed Mulla',
    description: 'Laungan vokal azan agung penuh syahdu dari tanah suci Makkah Al-Mukarramah.',
    durationSec: 195,
    filename: 'Azan_Makkah_Ali_Ahmed_Mulla.mp3',
    audioUrl: '/audio/azan/makkah.mp3',
    fallbackUrl: 'https://cdn.aladhan.com/audio/adhans/a1.mp3',
  },
  {
    id: 'madinah',
    title: 'Azan Masjid An-Nabawi (Madinah)',
    reciter: 'Syeikh Essam Bukhari',
    description: 'Laungan vokal azan merdu dan tenang dari Masjid Nabawi Madinah Munawwarah.',
    durationSec: 210,
    filename: 'Azan_Madinah_Essam_Bukhari.mp3',
    audioUrl: '/audio/azan/madinah.mp3',
    fallbackUrl: 'https://cdn.aladhan.com/audio/adhans/a2.mp3',
  },
  {
    id: 'jakim',
    title: 'Azan Rasmi Malaysia (JAKIM)',
    reciter: 'Ustaz Radzi Kamarul Hailan',
    description: 'Laungan vokal azan rasmi siaran Radio & Televisyen Malaysia (RTM/TV3).',
    durationSec: 180,
    filename: 'Azan_Malaysia_JAKIM_TV3.mp3',
    audioUrl: '/audio/azan/jakim.mp3',
    fallbackUrl: 'https://cdn.aladhan.com/audio/adhans/a7.mp3',
  },
  {
    id: 'al_aqsa',
    title: 'Azan Masjid Al-Aqsa (Palestin)',
    reciter: 'Syeikh Naji Qazzaz',
    description: 'Laungan vokal azan bersejarah penuh keinsafan dari kiblat pertama umat Islam di Baitulmaqdis.',
    durationSec: 220,
    filename: 'Azan_Al_Aqsa_Palestine.mp3',
    audioUrl: '/audio/azan/al_aqsa.mp3',
    fallbackUrl: 'https://cdn.aladhan.com/audio/adhans/a8.mp3',
  },
  {
    id: 'mishary',
    title: 'Azan Alunan Syeikh Mishary Al-Afasy',
    reciter: 'Syeikh Mishary Rashid Al-Afasy',
    description: 'Alunan vokal azan yang amat merdu dan digemari di seluruh dunia Islam.',
    durationSec: 205,
    filename: 'Azan_Mishary_Rashid_Al_Afasy.mp3',
    audioUrl: '/audio/azan/mishary.mp3',
    fallbackUrl: 'https://cdn.aladhan.com/audio/adhans/a9.mp3',
  },
  {
    id: 'subuh_special',
    title: 'Azan Subuh (As-Salatu Khairum Minan Naum)',
    reciter: 'Muadzin Masjid Negara',
    description: 'Dilengkapi seruan vokal Solat Itu Lebih Baik Daripada Tidur khas untuk waktu Subuh.',
    durationSec: 235,
    filename: 'Azan_Subuh_As_Salatu_Khair.mp3',
    audioUrl: '/audio/azan/subuh.mp3',
    fallbackUrl: 'https://cdn.aladhan.com/audio/adhans/a3.mp3',
  },
  {
    id: 'takbir_raya',
    title: 'Takbir Hari Raya (Aidilfitri & Adha)',
    reciter: 'Kumpulan Qari Malaysia',
    description: 'Laungan vokal takbir raya tradisi Nusantara yang meruntun jiwa sempena hari kebesaran.',
    durationSec: 240,
    filename: 'Takbir_Hari_Raya_Malaysia.mp3',
    audioUrl: '/audio/azan/takbir.mp3',
    fallbackUrl: 'https://cdn.aladhan.com/audio/adhans/a6.mp3',
  },
];

type AudioStateCallback = (isPlaying: boolean, currentTime: number, duration: number) => void;

class AudioNotificationService {
  private audioCtx: AudioContext | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private isUnlocked: boolean = false;
  private isPlaying: boolean = false;
  private activeVoice: AzanVoice = 'jakim';
  private volume: number = 1.0;
  private customAudioUrl: string | null = null;
  private currentPlaySessionId: number = 0;
  private onAzanTriggerCallbacks: ((prayerKey: PrayerKey, prayerName: string, voice: AzanVoice) => void)[] = [];
  private audioStateListeners: AudioStateCallback[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  public unlockAudio(): boolean {
    if (typeof window === 'undefined') return false;
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.isUnlocked = true;
    return true;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  public initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    return this.audioCtx;
  }

  public registerAzanTriggerListener(
    cb: (prayerKey: PrayerKey, prayerName: string, voice: AzanVoice) => void
  ) {
    this.onAzanTriggerCallbacks.push(cb);
    return () => {
      this.onAzanTriggerCallbacks = this.onAzanTriggerCallbacks.filter((c) => c !== cb);
    };
  }

  public addAudioStateListener(cb: AudioStateCallback) {
    this.audioStateListeners.push(cb);
    return () => {
      this.audioStateListeners = this.audioStateListeners.filter((c) => c !== cb);
    };
  }

  private notifyState(currentTime: number = 0, duration: number = 0) {
    this.audioStateListeners.forEach((cb) => cb(this.isPlaying, currentTime, duration));
  }

  public setCustomAudio(url: string | null) {
    this.customAudioUrl = url;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentAudioElement) {
      this.currentAudioElement.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public triggerAzan(prayerKey: PrayerKey, prayerName: string, voice?: AzanVoice) {
    const activeDeviceVoice = (audioStorageService.getActiveDeviceVoice() as AzanVoice) || null;
    const resolvedVoice: AzanVoice = voice || activeDeviceVoice || this.activeVoice || 'jakim';
    this.activeVoice = resolvedVoice;
    this.unlockAudio();

    // 1. Beritahu modal skrin penuh untuk terpapar
    this.onAzanTriggerCallbacks.forEach((cb) => cb(prayerKey, prayerName, resolvedVoice));

    // 2. Mainkan Audio: Jika pada Android Native, guna AzanAudioService (STREAM_ALARM)
    if (nativeAlarmService.getIsNative()) {
      nativeAlarmService.testAlarm(prayerName, resolvedVoice, 0);
    } else {
      // Pelayar web: mainkan audio HTML5
      this.playAzan(resolvedVoice);
      this.sendNotification(prayerName);
    }

    // 3. Cetusan getaran haptik
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([600, 300, 600, 300, 1000]);
    }
  }

  public sendNotification(prayerName: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(`Masuk Waktu Solat: ${prayerName}`, {
          body: `Telah masuk waktu solat fardhu ${prayerName} bagi kawasan anda mengikut takwim rasmi JAKIM. Hayatilah seruan azan.`,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'prayer-time-alert',
          requireInteraction: true,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch {
        // Abaikan sandaran
      }
    }
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return 'default';
    }
  }

  /**
   * Mainkan Audio Azan dengan rantaian sandaran pintar:
   * 1. IndexedDB Blob (Luar talian sepantas kilat)
   * 2. Fail tempatan pelayan (/audio/azan/<id>.mp3)
   * 3. Pautan CDN Sandaran Luar (fallbackUrl)
   */
  public async playAzan(voice: AzanVoice = 'jakim', onEnded?: () => void) {
    this.stopAudio();
    const sessionId = this.currentPlaySessionId;

    this.isPlaying = true;
    this.activeVoice = voice;
    this.notifyState(0, 0);

    const voiceConfig = AZAN_OPTIONS.find((v) => v.id === voice) || AZAN_OPTIONS[2];

    // LANGKAH 1: Semak Blob IndexedDB
    let sourceUrl = this.customAudioUrl;

    if (!sourceUrl) {
      try {
        const cachedBlob = await audioStorageService.getAudioBlob(voice);

        if (this.currentPlaySessionId !== sessionId) return;

        if (cachedBlob && audioStorageService.isValidAudioBlob(cachedBlob)) {
          sourceUrl = URL.createObjectURL(cachedBlob);
          this.currentBlobUrl = sourceUrl;
        }
      } catch {
        // Teruskan ke fail tempatan
      }
    }

    if (this.currentPlaySessionId !== sessionId) {
      this.cleanupBlobUrl();
      return;
    }

    // LANGKAH 2: Guna fail tempatan atau fallback CDN
    if (!sourceUrl) {
      sourceUrl = voiceConfig.audioUrl;
    }

    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = sourceUrl;
        audio.volume = this.volume;
        this.currentAudioElement = audio;

        audio.ontimeupdate = () => {
          if (this.currentPlaySessionId === sessionId) {
            this.notifyState(audio.currentTime, audio.duration || voiceConfig.durationSec);
          }
        };

        audio.onended = () => {
          if (this.currentPlaySessionId === sessionId) {
            this.isPlaying = false;
            this.notifyState(0, 0);
            this.cleanupBlobUrl();
            if (onEnded) onEnded();
          }
        };

        // Pengendali Ralat Pintar 3 Peringkat
        audio.onerror = () => {
          if (this.currentPlaySessionId !== sessionId) return;
          console.warn(`Ralat memainkan sumber (${sourceUrl}). Mencuba sumber sandaran...`);

          this.cleanupBlobUrl();

          // Peringkat 1: Cuba fail tempatan jika sebelum ini guna blob yang gagal
          if (typeof sourceUrl === 'string' && sourceUrl.startsWith('blob:') && voiceConfig.audioUrl) {
            audio.src = voiceConfig.audioUrl;
            audio.play().catch(() => this.tryFallbackUrl(audio, voiceConfig, sessionId, onEnded));
            return;
          }

          // Peringkat 2: Cuba CDN rasmi jika fail tempatan tiada
          this.tryFallbackUrl(audio, voiceConfig, sessionId, onEnded);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Autoplay disekat oleh pelayar (perlu interaksi pengguna):', err);
          });
        }
      } catch (e) {
        console.warn('Ralat HTMLAudioElement:', e);
        if (this.currentPlaySessionId === sessionId) {
          this.isPlaying = false;
          this.notifyState(0, 0);
        }
      }
    }
  }

  private tryFallbackUrl(
    audio: HTMLAudioElement,
    voiceConfig: ExtendedAzanAudioOption,
    sessionId: number,
    onEnded?: () => void
  ) {
    if (voiceConfig.fallbackUrl && audio.src !== voiceConfig.fallbackUrl) {
      console.info('Beralih ke fail CDN sandaran:', voiceConfig.fallbackUrl);
      audio.src = voiceConfig.fallbackUrl;
      audio.play().catch((errCdn) => {
        console.warn('Pautan CDN sandaran turut gagal:', errCdn);
        this.handlePlaybackFailure(sessionId, onEnded);
      });
    } else {
      this.handlePlaybackFailure(sessionId, onEnded);
    }
  }

  private handlePlaybackFailure(sessionId: number, onEnded?: () => void) {
    if (this.currentPlaySessionId === sessionId) {
      this.isPlaying = false;
      this.notifyState(0, 0);
      if (onEnded) onEnded();
    }
  }

  private cleanupBlobUrl() {
    if (this.currentBlobUrl) {
      try {
        URL.revokeObjectURL(this.currentBlobUrl);
      } catch {}
      this.currentBlobUrl = null;
    }
  }

  public playGentleBeep() {
    const ctx = this.initAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  public playTasbihClick() {
    const ctx = this.initAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.18 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  public stopAudio() {
    this.currentPlaySessionId++;

    // 1. Matikan audio pelayar web
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.src = '';
        this.currentAudioElement.load();
      } catch {}
      this.currentAudioElement = null;
    }

    this.cleanupBlobUrl();
    this.isPlaying = false;
    this.notifyState(0, 0);

    // 2. Berhentikan servis audio native Android jika sedang berjalan
    if (nativeAlarmService.getIsNative()) {
      try {
        if (typeof (nativeAlarmService as any).stopAlarm === 'function') {
          (nativeAlarmService as any).stopAlarm();
        } else if (typeof (nativeAlarmService as any).stopAudio === 'function') {
          (nativeAlarmService as any).stopAudio();
        }
      } catch (err) {
        console.warn('Gagal mematikan audio native dari stopAudio:', err);
      }
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioNotificationService = new AudioNotificationService();
