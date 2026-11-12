import { Capacitor } from '@capacitor/core';

// Versi semasa yang terpasang dalam fail APK sekarang
export const CURRENT_APP_VERSION = '2.5.0';
export const CURRENT_VERSION_CODE = 25;

// Gantikan dengan URL raw GitHub repositori ko
const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/NAMA_GITHUB_KO/solatkini-malaysia/main/version.json';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
}

export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  // Hanya semak bila ada talian internet
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  // Hadkan semakan supaya nda spam network (contoh: 6 jam sekali sahaja)
  const lastCheck = localStorage.getItem('solatkini_last_update_check');
  const now = Date.now();
  if (lastCheck && now - parseInt(lastCheck, 10) < 6 * 3600 * 1000) {
    return null;
  }

  try {
    const res = await fetch(`${VERSION_CHECK_URL}?t=${now}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!res.ok) return null;

    const data = await res.json();
    localStorage.setItem('solatkini_last_update_check', now.toString());

    if (data && data.versionCode > CURRENT_VERSION_CODE) {
      // Tembak notifikasi Android untuk beritahu pengguna ada versi baru
      triggerUpdateNotification(data.latestVersion, data.releaseNotes, data.downloadUrl);

      return {
        hasUpdate: true,
        latestVersion: data.latestVersion,
        releaseNotes: data.releaseNotes,
        downloadUrl: data.downloadUrl,
      };
    }
  } catch (err) {
    console.warn('Gagal menyemak versi baru aplikasi:', err);
  }

  return null;
}

function triggerUpdateNotification(version: string, notes: string, url: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(`Kemaskini Baharu SolatKini v${version}!`, {
        body: notes || 'Versi baharu kini sedia untuk dimuat turun. Tekan untuk kemas kini.',
        icon: '/icon.svg',
        tag: 'app-update-alert',
      });

      notif.onclick = () => {
        window.open(url, '_blank');
        notif.close();
      };
    } catch (e) {
      console.warn('Ralat melancarkan notifikasi update:', e);
    }
  }
}
