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
  private lastSyncedPayload: string | null = null;

  public async syncWidget(prayerTimes: DayPrayerTimes, zone: JakimZone): Promise<void> {
    try {
      if (!prayerTimes || !prayerTimes.times) return;

      const now = new Date();
      const nextPrayer = determineNextPrayer(prayerTimes, now);
      const nextLabel = nextPrayer ? nextPrayer.nextLabel : 'Waktu Solat';
      const nextTime = nextPrayer ? nextPrayer.nextDisplayTime : '--:--';

      const payload = {
        zone: zone.code || 'WLY01',
        next_label: nextLabel,
        next_time: nextTime,
        subuh: formatDisplayTime(prayerTimes.times.subuh),
        zohor: formatDisplayTime(prayerTimes.times.zohor),
        asar: formatDisplayTime(prayerTimes.times.asar),
        maghrib: formatDisplayTime(prayerTimes.times.maghrib),
        isyak: formatDisplayTime(prayerTimes.times.isyak),
      };

      const payloadStr = JSON.stringify(payload);
      if (payloadStr === this.lastSyncedPayload) {
        return; // Avoid unnecessary IPC broadcasts if values haven't changed
      }

      this.lastSyncedPayload = payloadStr;

      // Always save to localStorage so web preview or fallback reflects it
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_widget_latest', payloadStr);
      }

      // If running on native Android APK, dispatch to native SolatWidgetProvider
      if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android') {
        await SolatWidget.updateWidget(payload);
        console.info('[WidgetService] Widget Android berjaya dikemaskini dengan waktu solat terkini:', payload.zone);
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
        await this.cancelPersistentNotification();
        return;
      }
      if (!prayerTimes || !prayerTimes.times) return;

      const now = new Date();
      const nextPrayer = determineNextPrayer(prayerTimes, now);
      const nextLabel = nextPrayer ? nextPrayer.nextLabel : 'Waktu Solat';
      const nextTime = nextPrayer ? nextPrayer.nextDisplayTime : '--:--';
      const countdown = nextPrayer ? nextPrayer.countdownFormatted : '';

      const payload = {
        zone: `${zone.code} (${zone.daerah.split(',')[0].trim()})`,
        hijri: hijriFormatted || '',
        next_label: nextLabel,
        next_time: nextTime,
        countdown: countdown,
        subuh: formatDisplayTime(prayerTimes.times.subuh),
        zohor: formatDisplayTime(prayerTimes.times.zohor),
        asar: formatDisplayTime(prayerTimes.times.asar),
        maghrib: formatDisplayTime(prayerTimes.times.maghrib),
        isyak: formatDisplayTime(prayerTimes.times.isyak),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_persistent_notif_payload', JSON.stringify(payload));
      }

      if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android') {
        await SolatWidget.updatePersistentNotification(payload);
        console.info('[WidgetService] Notifikasi tetap 5 waktu solat berjaya dihantar ke sistem:', payload.zone);
      }
    } catch (err) {
      console.warn('[WidgetService] Ralat mengemaskini notifikasi tetap:', err);
    }
  }

  public async cancelPersistentNotification(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('solatkini_persistent_notif_payload');
      }
      if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android') {
        await SolatWidget.cancelPersistentNotification();
        console.info('[WidgetService] Notifikasi tetap 5 waktu solat dibatalkan.');
      }
    } catch (err) {
      console.warn('[WidgetService] Ralat membatalkan notifikasi tetap:', err);
    }
  }
}

export const widgetService = new WidgetService();
