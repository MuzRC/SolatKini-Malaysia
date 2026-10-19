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

export interface AzanAlarmPluginInterface {
  checkNotificationPermission(): Promise<PermissionStatusResult>;
  requestNotificationPermission(): Promise<{ granted: boolean; status: string }>;
  openExactAlarmSettings(): Promise<{ opened: boolean }>;
  openNotificationSettings(): Promise<{ opened: boolean }>;
  setActiveAzanVoice(options: { voice: string }): Promise<{ success: boolean; voice: string }>;
  schedulePrayerAlarms(options: { alarms: NativeAlarmItem[] }): Promise<{ success: boolean; scheduledCount: number }>;
  cancelAllAlarms(): Promise<{ success: boolean }>;
  testAlarmNow(options: { prayerName: string; prayerKey: string; voice: string; delaySeconds: number }): Promise<{ success: boolean }>;
  stopAzanAudio(): Promise<{ success: boolean }>;
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

  /**
   * Semak status kebenaran notifikasi dan penggera tepat peranti.
   */
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
      return await AzanAlarm.checkNotificationPermission();
    } catch (err) {
      console.warn('Gagal menyemak kebenaran AzanAlarm asli:', err);
      return { notificationsGranted: false, exactAlarmAllowed: false };
    }
  }

  /**
   * Minta kebenaran POST_NOTIFICATIONS (Android 13+ / TargetSDK 33) & Notifikasi Pelayar.
   */
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
      return !!result.granted;
    } catch (err) {
      console.warn('Gagal meminta kebenaran notifikasi asli:', err);
      return false;
    }
  }

  /**
   * Membuka tetapan penggera tepat (Android 12+) sekiranya dihadkan oleh pengeluar peranti.
   */
  public async openExactAlarmSettings(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.openExactAlarmSettings();
      return !!res.opened;
    } catch (err) {
      console.warn('Gagal membuka tetapan exact alarm:', err);
      return false;
    }
  }

  /**
   * Membuka halaman Tetapan Notifikasi Sistem Telefon Android (App Info -> Notifications).
   */
  public async openNotificationSettings(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.openNotificationSettings();
      return !!res.opened;
    } catch (err) {
      console.warn('Gagal membuka tetapan notifikasi:', err);
      return false;
    }
  }

  /**
   * Menyimpan pilihan suara azan ke dalam SharedPreferences perkakasan Android native.
   */
  public async setActiveVoice(voice: string): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await AzanAlarm.setActiveAzanVoice({ voice });
      return !!res.success;
    } catch (err) {
      console.warn('Gagal menetapkan nada azan aktif ke native plugin:', err);
      return false;
    }
  }

  /**
   * Menyegerakkan senarai jadual waktu solat harian terus ke dalam perkakasan AlarmManager Android.
   */
  public async schedulePrayers(
    prayerTimes: PrayerTimeItem[],
    voice: AzanVoice = 'jakim',
    enabledPrayers?: Record<PrayerKey, boolean>
  ): Promise<number> {
    if (!this.isNative) {
      console.info('Mod pelayar web: Menggunakan pemasa audio dalam talian.');
      return 0;
    }

    try {
      const now = new Date();
      const alarms: NativeAlarmItem[] = [];

      for (const item of prayerTimes) {
        // Abaikan imsak/syuruk daripada laungan azan penuh jika bukan solat fardhu
        if (item.key === 'imsak' || item.key === 'syuruk') continue;

        // Semak sekiranya pengguna mematikan suis solat berkenaan
        if (enabledPrayers && enabledPrayers[item.key] === false) continue;

        const [hoursStr, minutesStr] = item.time.split(':');
        const h = parseInt(hoursStr, 10);
        const m = parseInt(minutesStr, 10);

        if (isNaN(h) || isNaN(m)) continue;

        const targetDate = new Date();
        targetDate.setHours(h, m, 0, 0);

        // Jika waktu solat hari ini telah berlalu lebih 5 minit, jadualkan waktu tersebut untuk keesokan harinya
        if (targetDate.getTime() < now.getTime() - 5 * 60 * 1000) {
          targetDate.setDate(targetDate.getDate() + 1);
        }

        // Khas bagi Subuh, jika pengguna memilih 'jakim' tetapi mahukan laungan khas Subuh
        const resolvedVoice: AzanVoice = (item.key === 'subuh' && voice === 'jakim') ? 'subuh_special' : voice;

        alarms.push({
          prayerKey: item.key,
          prayerName: item.label,
          timestamp: targetDate.getTime(),
          voice: resolvedVoice,
        });
      }

      if (alarms.length > 0) {
        const result = await AzanAlarm.schedulePrayerAlarms({ alarms });
        console.info(`[AzanAlarm Native] Berjaya menjadualkan ${result.scheduledCount} waktu solat ke AlarmManager Android.`);
        return result.scheduledCount;
      }

      return 0;
    } catch (err) {
      console.error('Ralat menjadualkan waktu solat ke AzanAlarm asli:', err);
      return 0;
    }
  }

  /**
   * Batalkan semua penggera solat (cth. jika pengguna menutup suis notifikasi induk).
   */
  public async cancelAllAlarms(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      const res = await AzanAlarm.cancelAllAlarms();
      return !!res.success;
    } catch (err) {
      console.warn('Gagal membatalkan penggera azan asli:', err);
      return false;
    }
  }

  /**
   * Uji penggera azan secara langsung pada telefon pengguna.
   */
  public async testAlarm(prayerName: string = 'Zohor', voice: AzanVoice = 'jakim', delaySeconds: number = 2): Promise<boolean> {
    if (!this.isNative) {
      console.info('Ujian penggera di pelayar web...');
      return false;
    }
    try {
      const res = await AzanAlarm.testAlarmNow({
        prayerName,
        prayerKey: 'test',
        voice,
        delaySeconds,
      });
      return !!res.success;
    } catch (err) {
      console.error('Gagal menguji penggera azan asli:', err);
      return false;
    }
  }

  /**
   * Hentikan audio azan perkhidmatan latar depan.
   */
  public async stopNativeAzan(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      const res = await AzanAlarm.stopAzanAudio();
      return !!res.success;
    } catch {
      return false;
    }
  }
}

export const nativeAlarmService = new NativeAlarmService();
