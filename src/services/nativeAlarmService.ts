import { Capacitor, registerPlugin } from '@capacitor/core';
import { AzanVoice, PrayerKey, PrayerTimeItem } from '../types/prayer';

export interface NativeAlarmItem {
  prayerKey: PrayerKey;
  prayerName: string;
  timestamp: number;
  voice: AzanVoice;
}

export interface PermissionStatusResult {
  notificationsGranted: boolean;
  exactAlarmAllowed: boolean;
  sdkInt?: number;
}

export interface BatteryStatusResult {
  isIgnoringBatteryOptimizations: boolean;
}

export interface AutoTimeStatusResult {
  isAutoTimeEnabled: boolean;
  isAutoTimeZoneEnabled: boolean;
}

export interface AzanLogEntry {
  prayerName: string;
  prayerKey: string;
  timestamp: number;
  timeFormatted: string;
  dateFormatted: string;
  status: 'BERJAYA' | 'DICETUSKAN' | 'GAGAL' | string;
  details: string;
}

export interface AzanAlarmPluginInterface {
  checkNotificationPermission(): Promise<PermissionStatusResult>;
  requestNotificationPermission(): Promise<{ granted: boolean; status: string }>;
  openExactAlarmSettings(): Promise<{ opened: boolean }>;
  openNotificationSettings(): Promise<{ opened: boolean }>;
  setActiveAzanVoice(options: { voice: string }): Promise<{ success: boolean; voice: string }>;
  schedulePrayerAlarms(options: { alarms: NativeAlarmItem[] }): Promise<{ success: boolean; scheduledCount: number }>;
  cancelAllAlarms(): Promise<{ success: boolean }>;
  testAlarmNow(options: {
    prayerName: string;
    prayerKey: string;
    voice: string;
    delaySeconds: number;
    autoStopSeconds?: number;
  }): Promise<{ success: boolean }>;
  stopAzanAudio(): Promise<{ success: boolean }>;
  isBatteryOptimized(): Promise<BatteryStatusResult>;
  requestIgnoreBatteryOptimization(): Promise<{ opened: boolean }>;
  openAutostartSettings(): Promise<{ opened: boolean }>;
  checkAutoTime(): Promise<AutoTimeStatusResult>;
  openDateSettings(): Promise<{ opened: boolean }>;
  getAzanDiagnosticLogs(): Promise<{ logsJson: string }>;
  clearAzanDiagnosticLogs(): Promise<{ success: boolean }>;
}

const AzanAlarm = registerPlugin<AzanAlarmPluginInterface>('AzanAlarm');

class NativeAlarmService {
  private isNative: boolean;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  public getIsNative(): boolean {
    return this.isNative;
  }

  public async checkPermissions(): Promise<PermissionStatusResult> {
    if (!this.isNative) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        return {
          notificationsGranted: Notification.permission === 'granted',
          exactAlarmAllowed: true,
          sdkInt: 0,
        };
      }
      return { notificationsGranted: false, exactAlarmAllowed: true, sdkInt: 0 };
    }

    try {
      const res = await AzanAlarm.checkNotificationPermission();
      return {
        notificationsGranted: !!res.notificationsGranted,
        exactAlarmAllowed: res.exactAlarmAllowed ?? true,
        sdkInt: res.sdkInt ?? 33,
      };
    } catch {
      return { notificationsGranted: false, exactAlarmAllowed: true, sdkInt: 33 };
    }
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (!this.isNative) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const res = await Notification.requestPermission();
          return res === 'granted';
        } catch {
          return false;
        }
      }
      return false;
    }

    try {
      const result = await AzanAlarm.requestNotificationPermission();
      const granted = !!result.granted;
      if (granted && typeof window !== 'undefined') {
        localStorage.setItem('solatkini_notif_granted', 'true');
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('solatkini_notif_granted');
      }
      return granted;
    } catch {
      return false;
    }
  }

  public async openExactAlarmSettings(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.openExactAlarmSettings();
      return !!res.opened;
    } catch {
      return false;
    }
  }

  public async openNotificationSettings(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.openNotificationSettings();
      return !!res.opened;
    } catch {
      return false;
    }
  }

  public async isBatteryOptimized(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.isBatteryOptimized();
      return !!res.isIgnoringBatteryOptimizations;
    } catch {
      return false;
    }
  }

  public async requestIgnoreBatteryOptimization(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.requestIgnoreBatteryOptimization();
      return !!res.opened;
    } catch {
      return false;
    }
  }

  public async openAutostartSettings(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.openAutostartSettings();
      return !!res.opened;
    } catch {
      return false;
    }
  }

  public async checkAutoTime(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      const res = await AzanAlarm.checkAutoTime();
      return res.isAutoTimeEnabled;
    } catch {
      return true;
    }
  }

  public async openDateSettings(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.openDateSettings();
      return !!res.opened;
    } catch {
      return false;
    }
  }

  public async setActiveVoice(voice: string): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.setActiveAzanVoice({ voice });
      return !!res.success;
    } catch {
      return false;
    }
  }

  public async schedulePrayers(
    prayerTimes: (PrayerTimeItem & { voice?: AzanVoice })[],
    voice: AzanVoice = 'jakim',
    enabledPrayers?: Record<PrayerKey, boolean>
  ): Promise<number> {
    const now = new Date();
    const alarms: NativeAlarmItem[] = [];

    for (const item of prayerTimes) {
      // Imsak & Syuruk sentiasa dimasukkan untuk pusingan pemasa undur (Chronometer)
      const isTransitionOnly = item.key === 'imsak' || item.key === 'syuruk';

      // Solat fardhu mematuhi suis hidup/mati tetapan pengguna
      if (!isTransitionOnly && enabledPrayers && enabledPrayers[item.key] === false) {
        continue;
      }

      const [hoursStr, minutesStr] = item.time.split(':');
      const h = parseInt(hoursStr, 10);
      const m = parseInt(minutesStr, 10);

      if (isNaN(h) || isNaN(m)) continue;

      const targetDate = new Date();
      targetDate.setHours(h, m, 0, 0);

      // Jika waktu hari ini sudah lepas, anjak jadual ke esok secara automatik
      if (targetDate.getTime() <= now.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      // Imsak & Syuruk menggunakan mod suara 'none' (Peralihan senyap tanpa bunyi azan)
      const resolvedVoice: AzanVoice = isTransitionOnly
        ? ('none' as any)
        : (item.voice || (item.key === 'subuh' ? 'subuh_special' : voice));

      alarms.push({
        prayerKey: item.key,
        prayerName: item.label,
        timestamp: targetDate.getTime(),
        voice: resolvedVoice,
      });
    }

    // Susun jadual mengikut kronologi dari waktu terdekat ke waktu paling jauh
    alarms.sort((a, b) => a.timestamp - b.timestamp);

    // Simpan salinan di storan lokal sebagai rujukan diagnostik
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_scheduled_alarms_backup', JSON.stringify(alarms));
    }

    if (!this.isNative) {
      return alarms.length;
    }

    try {
      await this.cancelAllAlarms();

      if (alarms.length > 0) {
        const result = await AzanAlarm.schedulePrayerAlarms({ alarms });
        return result.scheduledCount;
      }

      return 0;
    } catch (e) {
      console.warn('Gagal menjadualkan penggera ke plugin natif:', e);
      return 0;
    }
  }

  public async cancelAllAlarms(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      const res = await AzanAlarm.cancelAllAlarms();
      return !!res.success;
    } catch {
      return true;
    }
  }

  public async testAlarm(
    prayerName: string = 'Zohor',
    voice: AzanVoice = 'jakim',
    delaySeconds: number = 0,
    autoStopSeconds: number = 20
  ): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.testAlarmNow({
        prayerName,
        prayerKey: 'test',
        voice,
        delaySeconds,
        autoStopSeconds,
      });
      return !!res.success;
    } catch {
      return false;
    }
  }

  public async stopNativeAzan(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      const res = await AzanAlarm.stopAzanAudio();
      return !!res.success;
    } catch {
      return false;
    }
  }

  // Alias fungsi pembantu agar sepadan dengan pemanggil audioNotificationService
  public async stopAudio(): Promise<boolean> {
    return this.stopNativeAzan();
  }

  public async stopAlarm(): Promise<boolean> {
    return this.stopNativeAzan();
  }
}

// Fungsi pembantu diagnostik azan yang dipadankan terus dengan AzanAlarmPlugin.java
export const getAzanHistoryLogs = async (): Promise<AzanLogEntry[]> => {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const res = await AzanAlarm.getAzanDiagnosticLogs();
    if (res && res.logsJson) {
      return JSON.parse(res.logsJson) as AzanLogEntry[];
    }
    return [];
  } catch {
    return [];
  }
};

export const clearAzanHistoryLogs = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await AzanAlarm.clearAzanDiagnosticLogs();
    return !!res?.success;
  } catch {
    return false;
  }
};

export const nativeAlarmService = new NativeAlarmService();
