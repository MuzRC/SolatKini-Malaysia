// 1. Tambah target_timestamp dalam interface
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
    target_timestamp?: number; // <--- TAMBAH INI (Unix epoch ms)
    subuh: string;
    zohor: string;
    asar: string;
    maghrib: string;
    isyak: string;
  }): Promise<{ success: boolean }>;
  cancelPersistentNotification(): Promise<{ success: boolean }>;
}

// ... kod lain kekal ...

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
      
      // Dapatkan timestamp waktu solat seterusnya dalam ms
      // (Pastikan nextPrayer ada pegang objek Date / timestamp sasaran)
      const targetTimestamp = nextPrayer?.targetDate 
        ? new Date(nextPrayer.targetDate).getTime() 
        : 0;

      const daerahNama = zone?.daerah ? zone.daerah.split(',')[0].trim() : '';
      const zoneLabel = daerahNama ? `${zone.code || ''} (${daerahNama})`.trim() : zone?.code || 'WLY01';

      const payload = {
        zone: zoneLabel,
        hijri: hijriFormatted || '',
        next_label: nextLabel,
        next_time: nextTime,
        countdown: countdown,
        target_timestamp: targetTimestamp, // <--- HANTAR KE ANDROID
        subuh: formatDisplayTime(prayerTimes.times.subuh),
        zohor: formatDisplayTime(prayerTimes.times.zohor),
        asar: formatDisplayTime(prayerTimes.times.asar),
        maghrib: formatDisplayTime(prayerTimes.times.maghrib),
        isyak: formatDisplayTime(prayerTimes.times.isyak),
      };

      const payloadStr = JSON.stringify(payload);

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
        console.info('[WidgetService] Notifikasi tetap dihantar:', payload.zone);
      }
    } catch (err) {
      console.warn('[WidgetService] Ralat mengemaskini notifikasi tetap:', err);
    } finally {
      this.isUpdatingNotif = false;
    }
  }
