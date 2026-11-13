import { registerPlugin, Capacitor } from '@capacitor/core';
import { DayPrayerTimes, JakimZone } from '../types/prayer';
import { determineNextPrayer } from './prayerService';
import { formatDisplayTime } from '../utils/prayerCalculator';
import { getHijriDate } from '../utils/hijriCalendar';

interface SolatWidgetPluginInterface {
  updateWidget(options: {
    zone: string;
    hijri?: string;
    date?: string;
    next_label: string;
    next_time: string;
    imsak?: string;
    subuh: string;
    syuruk?: string;
    zohor: string;
    asar: string;
    maghrib: string;
    isyak: string;
    upcoming_days_json?: string;
  }): Promise<{ success: boolean }>;
  updatePersistentNotification(options: {
    zone: string;
    hijri?: string;
    date?: string;
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
    upcoming_days_json?: string;
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

/**
 * Kumpulkan jadual berbilang hari (jika tersimpan dalam cache tempatan JAKIM)
 * supaya widget skrin utama dapat bertukar hari secara automatik selepas tengah malam tanpa buka app.
 */
function collectUpcomingDaysScheduleJson(todayPrayerTimes: DayPrayerTimes): string {
  if (typeof window === 'undefined') return '[]';
  try {
    const map = new Map<string, Record<string, string>>();

    const addDayEntry = (day: Partial<DayPrayerTimes> | null | undefined) => {
      if (!day || !day.date || !day.times) return;
      const t = day.times;
      if (!t.subuh || !t.zohor || !t.maghrib) return;
      const parsedDate = new Date(`${day.date}T12:00:00`);
      const hijriText = !isNaN(parsedDate.getTime()) ? getHijriDate(parsedDate).formatted : '';
      map.set(day.date, {
        date: day.date,
        hijri: hijriText,
        imsak: formatDisplayTime(t.imsak || t.subuh),
        subuh: formatDisplayTime(t.subuh),
        syuruk: formatDisplayTime(t.syuruk || t.subuh),
        zohor: formatDisplayTime(t.zohor),
        asar: formatDisplayTime(t.asar),
        maghrib: formatDisplayTime(t.maghrib),
        isyak: formatDisplayTime(t.isyak),
      });
    };

    addDayEntry(todayPrayerTimes);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.toLowerCase().includes('solatkini')) continue;
      const raw = localStorage.getItem(key);
      if (!raw || (raw[0] !== '[' && raw[0] !== '{')) continue;

      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item === 'object' && item.date && item.times) {
              addDayEntry(item);
            }
          }
        } else if (parsed && typeof parsed === 'object') {
          if (parsed.date && parsed.times) {
            addDayEntry(parsed);
          } else if (Array.isArray(parsed.days)) {
            for (const item of parsed.days) {
              addDayEntry(item);
            }
          } else {
            for (const val of Object.values(parsed)) {
              if (val && typeof val === 'object' && 'date' in val && 'times' in val) {
                addDayEntry(val as DayPrayerTimes);
              }
            }
          }
        }
      } catch {}
    }

    const sorted = Array.from(map.values())
      .filter((d) => d.date >= (todayPrayerTimes.date || ''))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 14);

    return JSON.stringify(sorted);
  } catch {
    return '[]';
  }
}

export class WidgetService {
  private lastSyncedWidgetPayload: string | null = null;
  private lastSyncedNotifPayload: string | null = null;
  private isUpdatingNotif: boolean = false;
  private boundaryTimer: ReturnType<typeof setTimeout> | null = null;

  private isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  private formatZoneLabel(zone: JakimZone): string {
    const daerahNama = zone?.daerah ? zone.daerah.split(',')[0].trim() : '';
    return daerahNama ? `${zone.code || ''} (${daerahNama})`.trim() : zone?.code || 'WLY01';
  }

  private scheduleInMemoryBoundaryRefresh(
    prayerTimes: DayPrayerTimes,
    zone: JakimZone,
    nextTimestamp: number
  ): void {
    if (typeof window === 'undefined') return;
    if (this.boundaryTimer) {
      clearTimeout(this.boundaryTimer);
      this.boundaryTimer = null;
    }

    const now = Date.now();
    if (nextTimestamp > now) {
      const delay = Math.min(nextTimestamp - now + 1000, 6 * 3600 * 1000);
      this.boundaryTimer = setTimeout(() => {
        void this.syncWidget(prayerTimes, zone, true);
      }, delay);
    }
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
      const hijriFormatted = getHijriDate(now).formatted;
      const upcomingDaysJson = collectUpcomingDaysScheduleJson(prayerTimes);

      const payload = {
        zone: zoneLabel,
        hijri: hijriFormatted,
        date: prayerTimes.date || '',
        next_label: nextLabel,
        next_time: nextTime,
        imsak: formatDisplayTime(prayerTimes.times.imsak),
        subuh: formatDisplayTime(prayerTimes.times.subuh),
        syuruk: formatDisplayTime(prayerTimes.times.syuruk),
        zohor: formatDisplayTime(prayerTimes.times.zohor),
        asar: formatDisplayTime(prayerTimes.times.asar),
        maghrib: formatDisplayTime(prayerTimes.times.maghrib),
        isyak: formatDisplayTime(prayerTimes.times.isyak),
        upcoming_days_json: upcomingDaysJson,
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

      if (nextPrayer?.targetTimestamp) {
        this.scheduleInMemoryBoundaryRefresh(prayerTimes, zone, nextPrayer.targetTimestamp);
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

        if (!nextTimestamp && nextPrayer.nextTime) {
          const parsedTime = parseTimeParts(nextPrayer.nextTime);
          if (parsedTime) {
            const target = new Date();
            target.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
            if (target.getTime() <= now.getTime()) {
              target.setDate(target.getDate() + 1);
            }
            nextTimestamp = target.getTime();
          }
        }
      }

      const zoneLabel = this.formatZoneLabel(zone);
      const upcomingDaysJson = collectUpcomingDaysScheduleJson(prayerTimes);

      const payload = {
        zone: zoneLabel,
        hijri: hijriFormatted || getHijriDate(now).formatted,
        date: prayerTimes.date || '',
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
        upcoming_days_json: upcomingDaysJson,
      };

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
