import { registerPlugin, Capacitor } from '@capacitor/core';
import { DayPrayerTimes, JakimZone } from '../types/prayer';
import { determineNextPrayer } from './prayerService';
import { formatDisplayTime } from '../utils/prayerCalculator';

interface SolatWidgetPluginInterface {
  updateWidget(options: {
    zone: string;
    next_label: string;
    next_time: string;
    imsak?: string;
    subuh: string;
    syuruk?: string;
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
    imsak: string;
    subuh: string;
    syuruk: string;
    zohor: string;
    asar: string;
    maghrib: string;
    isyak: string;
  }): Promise<{ success: boolean }>;
  cancelPersistentNotification(): Promise<{ success: boolean }>;
}

const SolatWidget = registerPlugin<SolatWidgetPluginInterface>('SolatWidget');

function parseTimeParts(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const isPM = cleaned.includes('PM');
  const isAM = cleaned.includes('AM');

  const timeOnly = cleaned.replace(/[A-Z\s]/g, '');
  const parts = timeOnly.split(':');
  if (parts.length < 2) return null;

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours < 12) hours += 12;
  else if (isAM && hours === 12) hours = 0;

  return { hours, minutes };
}

export class WidgetService {
  private lastSyncedWidgetPayload: string | null = null;
  private lastSyncedNotifPayload: string | null = null;
  private isUpdatingNotif: boolean = false;

  private isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  private formatZoneLabel(zone: JakimZone): string {
    const daerahNama = zone?.daerah ? zone.daerah.split(',')[0].trim() : '';
    return daerahNama ? `${zone.code || ''} (${daerahNama})`.trim() : zone?.code || 'WLY01';
  }

  public async syncWidget(
    prayerTimes: DayPrayerTimes,
    zone: JakimZone,
    force: boolean = false
  ): Promise<void> {
    try {
      if (!prayerTimes?.times) return;

      const now = new Date();
      const nextPrayer = determineNextPrayer(prayerTimes, now);
      const nextLabel = nextPrayer ? nextPrayer.nextLabel : 'Waktu Solat';
      const nextTime = nextPrayer ? nextPrayer.nextDisplayTime : '--:--';
      const zoneLabel = this.formatZoneLabel(zone);

      const payload = {
        zone: zoneLabel,
        next_label: nextLabel,
        next_time: nextTime,
        imsak: formatDisplayTime(prayerTimes.times.imsak),
        subuh: formatDisplayTime(prayerTimes.times.subuh),
        syuruk: formatDisplayTime(prayerTimes.times.syuruk),
        zohor: formatDisplayTime(prayerTimes.times.zohor),
        asar: formatDisplayTime(prayerTimes.times.asar),
        maghrib: formatDisplayTime(prayerTimes.times.maghrib),
        isyak: formatDisplayTime(prayerTimes.times.isyak),
      };

      const payloadStr = JSON.stringify(payload);
      if (!force && payloadStr === this.lastSyncedWidgetPayload) {
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_widget_latest', payloadStr);
      }

      if (this.isAndroid()) {
        await SolatWidget.updateWidget(payload);
        console.info('[WidgetService] Widget Android berjaya dikemaskini:', payload.zone);
      }

      this.lastSyncedWidgetPayload = payloadStr;
    } catch (err) {
      console.warn('[WidgetService] Tidak dapat mengemaskini widget natif Android:', err);
    }
  }

  public async syncPersistentNotification(
    prayerTimes: DayPrayerTimes,
    zone: JakimZone,
    hijriFormatted?: string,
    enabled: boolean = true,
    force: boolean = false
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

      // 1. Dapatkan nilai milisaat terus daripada targetTimestamp atau targetDate
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

        // Sandaran tambahan jika pengiraan masa terlepas (menyokong format 12j/24j)
        if (!nextTimestamp && nextPrayer.nextTime) {
          const parsedTime = parseTimeParts(nextPrayer.nextTime);
          if (parsedTime) {
            const target = new Date();
            target.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
            if (target.getTime() <= now.getTime()) {
              target.setDate(target.getDate() + 1); // Anjak ke hari esok
            }
            nextTimestamp = target.getTime();
          }
        }
      }

      // 2. Gunakan format zon yang konsisten dengan Widget Skrin Utama
      const zoneLabel = this.formatZoneLabel(zone);

      // 3. Bentuk payload lengkap merangkumi kesemua 7 waktu solat dan checkpoint
      const payload = {
        zone: zoneLabel,
        hijri: hijriFormatted || '',
        next_label: nextLabel,
        next_time: nextTime,
        countdown: countdown,
        next_timestamp: nextTimestamp,
        target_timestamp: nextTimestamp,
        imsak: formatDisplayTime(prayerTimes.times.imsak),
        subuh: formatDisplayTime(prayerTimes.times.subuh),
        syuruk: formatDisplayTime(prayerTimes.times.syuruk),
        zohor: formatDisplayTime(prayerTimes.times.zohor),
        asar: formatDisplayTime(prayerTimes.times.asar),
        maghrib: formatDisplayTime(prayerTimes.times.maghrib),
        isyak: formatDisplayTime(prayerTimes.times.isyak),
      };

      // Kunci semakan tanpa medan 'countdown' yang berubah setiap saat/minit
      const dedupeKey = JSON.stringify({ ...payload, countdown: '' });

      if ((!force && dedupeKey === this.lastSyncedNotifPayload) || this.isUpdatingNotif) {
        return;
      }

      this.isUpdatingNotif = true;

      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_persistent_notif_payload', JSON.stringify(payload));
      }

      if (this.isAndroid()) {
        await SolatWidget.updatePersistentNotification(payload);
        console.info('[WidgetService] Notifikasi tetap dihantar bersama 7 waktu & pemasa undur:', nextTimestamp);
      }

      this.lastSyncedNotifPayload = dedupeKey;
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
