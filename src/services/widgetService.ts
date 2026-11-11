import { registerPlugin, Capacitor } from '@capacitor/core';
import { DayPrayerTimes, JakimZone } from '../types/prayer';
import { determineNextPrayer } from './prayerService';
import { formatDisplayTime } from '../utils/prayerCalculator';

interface SolatWidgetPluginInterface {
  updateWidget(options: {
    zone: string;
    next_label: string;
    next_time: string;
    subuh: string;
    zohor: string;
    asar: string;
    maghrib: string;
    isyak: string;
  }): Promise<{ success: boolean }>;
  updatePersistentNotification(options: {
    zone: string;
    hijri?: string;
    next_label: string;
    next_time: string;
    countdown?: string;
    next_timestamp: number;
    target_timestamp?: number;
    subuh: string;
    zohor: string;
    asar: string;
    maghrib: string;
    isyak: string;
  }): Promise<{ success: boolean }>;
  cancelPersistentNotification(): Promise<{ success: boolean }>;
}

const SolatWidget = registerPlugin<SolatWidgetPluginInterface>('SolatWidget');

export class WidgetService {
  private lastSyncedWidgetPayload: string | null = null;
  private lastSyncedNotifPayload: string | null = null;
  private isUpdatingNotif: boolean = false;

  private isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  public async syncWidget(prayerTimes: DayPrayerTimes, zone: JakimZone): Promise<void> {
    try {
      if (!prayerTimes?.times) return;

      const now = new Date();
      const nextPrayer = determineNextPrayer(prayerTimes, now);
      const nextLabel = nextPrayer ? nextPrayer.nextLabel : 'Waktu Solat';
      const nextTime = nextPrayer ? nextPrayer.nextDisplayTime : '--:--';

      const payload = {
        zone: zone?.code || 'WLY01',
        next_label: nextLabel,
        next_time: nextTime,
        subuh: formatDisplayTime(prayerTimes.times.subuh),
        zohor: formatDisplayTime(prayerTimes.times.zohor),
        asar: formatDisplayTime(prayerTimes.times.asar),
        maghrib: formatDisplayTime(prayerTimes.times.maghrib),
        isyak: formatDisplayTime(prayerTimes.times.isyak),
      };

      const payloadStr = JSON.stringify(payload);
      if (payloadStr === this.lastSyncedWidgetPayload) {
        return;
      }

      this.lastSyncedWidgetPayload = payloadStr;

      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_widget_latest', payloadStr);
      }

      if (this.isAndroid()) {
        await SolatWidget.updateWidget(payload);
        console.info('[WidgetService] Widget Android berjaya dikemaskini:', payload.zone);
      }
    } catch (err) {
      console.warn('[WidgetService] Tidak dapat mengemaskini widget natif Android:', err);
    }
  }

  public async syncPersistentNotification(
    prayerTimes: DayPrayerTimes,
    zone: JakimZone,
    hijriFormatted?: string,
    enabled: boolean = true
  ): Promise<void> {
    try {
      if (!enabled) {
        this.lastSyncedNotifPayload = null;
        await this.cancelPersistentNotification();
        return;
      }
      if (!prayerTimes?.times) return;

      const now = new Date();
      const nextPrayer = determineNextPrayer(prayerTimes, now);
      const nextLabel = nextPrayer ? nextPrayer.nextLabel : 'Waktu Solat';
      const nextTime = nextPrayer ? nextPrayer.nextDisplayTime : '--:--';
      const countdown = nextPrayer ? nextPrayer.countdownFormatted : '';

      // 1. Dapatkan nilai milisaat terus daripada targetTimestamp atau targetDate (bersih tanpa 'as any')
      let nextTimestamp = 0;
      if (nextPrayer) {
        if (nextPrayer.targetTimestamp && nextPrayer.targetTimestamp > now.getTime()) {
          nextTimestamp = nextPrayer.targetTimestamp;
        } else if (nextPrayer.targetDate) {
          const parsed = new Date(nextPrayer.targetDate).getTime();
          if (!isNaN(parsed) && parsed > now.getTime()) {
            nextTimestamp = parsed;
          }
        }

        // Sandaran tambahan jika pengiraan masa terlepas
        if (!nextTimestamp && nextPrayer.nextTime) {
          const parts = nextPrayer.nextTime.split(':');
          if (parts.length >= 2) {
            const target = new Date();
            target.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
            if (target.getTime() <= now.getTime()) {
              target.setDate(target.getDate() + 1); // Anjak ke Subuh esok
            }
            nextTimestamp = target.getTime();
          }
        }
      }

      // 2. Ekstrak nama daerah secara defensif
      const daerahNama = zone?.daerah ? zone.daerah.split(',')[0].trim() : '';
      const zoneLabel = daerahNama ? `${zone.code || ''} (${daerahNama})`.trim() : zone?.code || 'WLY01';

      // 3. Bentuk payload lengkap bersama dwi-kunci (next_timestamp & target_timestamp)
      const payload = {
        zone: zoneLabel,
        hijri: hijriFormatted || '',
        next_label: nextLabel,
        next_time: nextTime,
        countdown: countdown,
        next_timestamp: nextTimestamp,
        target_timestamp: nextTimestamp,
        subuh: formatDisplayTime(prayerTimes.times.subuh),
        zohor: formatDisplayTime(prayerTimes.times.zohor),
        asar: formatDisplayTime(prayerTimes.times.asar),
        maghrib: formatDisplayTime(prayerTimes.times.maghrib),
        isyak: formatDisplayTime(prayerTimes.times.isyak),
      };

      const payloadStr = JSON.stringify(payload);

      // Sekat jika payload sama atau masih dalam proses penghantaran
      if (payloadStr === this.lastSyncedNotifPayload || this.isUpdatingNotif) {
        return;
      }

      this.isUpdatingNotif = true;
      this.lastSyncedNotifPayload = payloadStr;

      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_persistent_notif_payload', payloadStr);
      }

      if (this.isAndroid()) {
        await SolatWidget.updatePersistentNotification(payload);
        console.info('[WidgetService] Notifikasi tetap dihantar bersama pemasa undur:', nextTimestamp);
      }
    } catch (err) {
      console.warn('[WidgetService] Ralat mengemaskini notifikasi tetap:', err);
    } finally {
      this.isUpdatingNotif = false;
    }
  }

  public async cancelPersistentNotification(): Promise<void> {
    try {
      this.lastSyncedNotifPayload = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('solatkini_persistent_notif_payload');
      }
      if (this.isAndroid()) {
        await SolatWidget.cancelPersistentNotification();
        console.info('[WidgetService] Notifikasi tetap dibatalkan.');
      }
    } catch (err) {
      console.warn('[WidgetService] Ralat membatalkan notifikasi tetap:', err);
    }
  }
}

export const widgetService = new WidgetService();
