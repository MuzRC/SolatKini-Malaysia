import React, { useState } from 'react';
import { DayPrayerTimes, JakimZone, PrayerKey, AzanVoice } from '../../types/prayer';
import { ZoneSelectModal } from '../ZoneSelectModal';
import { DndGuideModal } from '../DndGuideModal';
import { AudioSettingsModal } from '../AudioSettingsModal';
import { DailyFardChecklist } from '../DailyFardChecklist';
import { usePrayerDashboard } from './usePrayerDashboard';
import { DashboardHeader } from './DashboardHeader';
import { SystemStatusAlerts } from './SystemStatusAlerts';
import { NextPrayerHeroCard } from './NextPrayerHeroCard';
import { PrayerTimesGrid } from './PrayerTimesGrid';

interface PrayerDashboardProps {
  currentZone: JakimZone;
  onZoneChange: (zone: JakimZone) => void;
  prayerTimes: DayPrayerTimes;
  isOfflineCalculated: boolean;
  lastSyncTime?: string;
  isLiveSyncing?: boolean;
  onLiveSync?: () => void;
  onNavigateToTab?: (tab: 'kiblat' | 'puasa' | 'wirid' | 'doa' | 'widget' | 'tetapan' | string) => void;
  onTriggerTestAlarm: (key: PrayerKey, name: string, voice: AzanVoice) => void;
}

export const PrayerDashboard: React.FC<PrayerDashboardProps> = ({
  currentZone,
  onZoneChange,
  prayerTimes,
  isOfflineCalculated,
  lastSyncTime,
  isLiveSyncing,
  onLiveSync,
  onNavigateToTab: _onNavigateToTab,
  onTriggerTestAlarm,
}) => {
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isDndGuideOpen, setIsDndGuideOpen] = useState(false);

  const {
    currentTime,
    nextPrayerInfo,
    hijri,
    recommendation,
    isOnline,
    isLocating,
    locationError,
    setLocationError,
    notificationsGranted,
    setNotificationsGranted,
    isAutoTimeEnabled,
    setIsAutoTimeEnabled,
    selectedVoice,
    notificationSettings,
    isFastingActive,
    fastingCountdown,
    toggleUserFastingToday,
    prayerChecklist,
    handleTogglePrayerDone,
    handleResetChecklist,
    handleVoiceSelect,
    handleTogglePrayerNotif,
    handleDetectGPS,
  } = usePrayerDashboard({
    currentZone,
    onZoneChange,
    prayerTimes,
    isLiveSyncing,
    onLiveSync,
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 select-none">
      {/* 1. Header & Kawalan Zon */}
      <DashboardHeader
        currentZone={currentZone}
        currentTime={currentTime}
        hijriFormatted={hijri.formatted}
        isOnline={isOnline}
        isOfflineCalculated={isOfflineCalculated}
        lastSyncTime={lastSyncTime}
        isLiveSyncing={isLiveSyncing}
        onLiveSync={onLiveSync}
        onOpenZoneModal={() => setIsZoneModalOpen(true)}
        onDetectGPS={handleDetectGPS}
        isLocating={isLocating}
        locationError={locationError}
        onClearLocationError={() => setLocationError(null)}
      />

      {/* 2 & 3. Amaran Masa Automatik & Kebenaran Notifikasi */}
      <SystemStatusAlerts
        isAutoTimeEnabled={isAutoTimeEnabled}
        onAutoTimeChecked={setIsAutoTimeEnabled}
        notificationsGranted={notificationsGranted}
        onNotificationsChecked={setNotificationsGranted}
      />

      {/* 4. Kad Hero Waktu Solat Seterusnya & Pembilang Detik */}
      <NextPrayerHeroCard
        nextPrayerInfo={nextPrayerInfo}
        currentZone={currentZone}
        prayerTimes={prayerTimes}
        isRamadan={hijri.isRamadan}
        isFastingActive={isFastingActive}
        fastingCountdown={fastingCountdown}
        recommendation={recommendation}
        onToggleUserFasting={toggleUserFastingToday}
        selectedVoice={selectedVoice}
        onTriggerTestAlarm={onTriggerTestAlarm}
        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
        onOpenDndGuide={() => setIsDndGuideOpen(true)}
      />

      {/* 5. Komponen Checklist Solat Fardu Harian */}
      <DailyFardChecklist
        prayerTimes={prayerTimes}
        prayerChecklist={prayerChecklist}
        onTogglePrayerDone={handleTogglePrayerDone}
        onResetChecklist={handleResetChecklist}
        currentTime={currentTime}
      />

      {/* 6. Grid Jadual Waktu Solat Hari Ini */}
      <PrayerTimesGrid
        prayerTimes={prayerTimes}
        currentZone={currentZone}
        currentTime={currentTime}
        nextPrayerKey={nextPrayerInfo.nextKey}
        notificationSettings={notificationSettings}
        onTogglePrayerNotif={handleTogglePrayerNotif}
        prayerChecklist={prayerChecklist}
        onTogglePrayerDone={handleTogglePrayerDone}
      />

      {/* 7. Modal Pemilih Zon Solat JAKIM */}
      <ZoneSelectModal
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        currentZone={currentZone}
        onZoneChange={onZoneChange}
      />

      {/* 8. Modal Pilihan Suara Muadzin & Audio Azan */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        selectedVoice={selectedVoice}
        onVoiceSelect={handleVoiceSelect}
        nextPrayerKey={nextPrayerInfo.nextKey}
        nextPrayerLabel={nextPrayerInfo.nextLabel}
        onTriggerTestAlarm={onTriggerTestAlarm}
      />

      {/* 9. Modal Panduan Melepasi Mod Senyap (DND) */}
      <DndGuideModal
        isOpen={isDndGuideOpen}
        onClose={() => setIsDndGuideOpen(false)}
      />
    </div>
  );
};

export default PrayerDashboard;
