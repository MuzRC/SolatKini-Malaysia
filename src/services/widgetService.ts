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
}

export const widgetService = new WidgetService();
