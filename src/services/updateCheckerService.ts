export const CURRENT_APP_VERSION = '2.5.0';
export const CURRENT_VERSION_CODE = 25;

// Gantikan 'SolatKini-Malaysia' jika nama repo GitHub MuzRC ko berbeza
// (Workflow build-apk.yml akan automatik selaraskan URL ni masa build)
const GITHUB_REPO = 'MuzRC/SolatKini-Malaysia';
const VERSION_CHECK_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/version.json`;
const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export interface AppUpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  versionCode: number;
  releaseNotes: string;
  downloadUrl: string;
}

export interface UpdateCheckResult {
  status: 'update_available' | 'up_to_date' | 'error' | 'skipped';
  info?: AppUpdateInfo;
  message: string;
}

/**
 * Semak kemaskini aplikasi dari GitHub (version.json + sandaran GitHub Releases API).
 * @param forceCheck Set true apabila pengguna menekan butang manual di Tetapan
 */
export async function checkForAppUpdate(forceCheck: boolean = false): Promise<UpdateCheckResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      status: 'error',
      message: 'Tiada sambungan internet. Sila hidupkan data atau Wi-Fi untuk menyemak kemaskini.',
    };
  }

  // Semakan automatik dihadkan 6 jam sekali; butang manual di Tetapan akan langkau sekatan ini
  if (!forceCheck && typeof window !== 'undefined') {
    const lastCheck = localStorage.getItem('solatkini_last_update_check');
    const now = Date.now();
    if (lastCheck && now - parseInt(lastCheck, 10) < 6 * 3600 * 1000) {
      return { status: 'skipped', message: 'Semakan automatik baru sahaja dijalankan.' };
    }
  }

  const now = Date.now();

  // KAEDAH 1: Cuba baca fail version.json dari GitHub
  try {
    const res = await fetch(`${VERSION_CHECK_URL}?t=${now}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_last_update_check', now.toString());
      }

      const remoteCode = Number(data?.versionCode || 0);
      if (remoteCode > CURRENT_VERSION_CODE) {
        return {
          status: 'update_available',
          message: `Versi baharu v${data.latestVersion} sedia dimuat turun!`,
          info: {
            hasUpdate: true,
            latestVersion: data.latestVersion || 'Baharu',
            versionCode: remoteCode,
            releaseNotes: data.releaseNotes || 'Penambahbaikan prestasi dan pembetulan pepijat.',
            downloadUrl:
              data.downloadUrl ||
              `https://github.com/${GITHUB_REPO}/releases/latest`,
          },
        };
      } else if (remoteCode > 0) {
        return {
          status: 'up_to_date',
          message: `Aplikasi anda sudah menggunakan versi terkini (v${CURRENT_APP_VERSION}).`,
        };
      }
    }
  } catch {
    // Terus ke Kaedah 2 (GitHub Releases API) jika version.json gagal/404
  }

  // KAEDAH 2 (SANDARAN): Terus semak GitHub Releases API paling terkini
  try {
    const relRes = await fetch(GITHUB_RELEASES_API, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      cache: 'no-store',
    });

    if (relRes.ok) {
      const release = await relRes.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_last_update_check', now.toString());
      }

      const tagName: string = release.tag_name || ''; // cth: "v2.1.6"
      const cleanVer = tagName.replace(/^v/i, '');
      const numericCode = parseInt(cleanVer.replace(/\D/g, ''), 10) || 0;

      // Cari fail .apk dalam aset release
      const apkAsset = Array.isArray(release.assets)
        ? release.assets.find((a: any) => typeof a?.name === 'string' && a.name.endsWith('.apk'))
        : null;

      const downloadUrl =
        apkAsset?.browser_download_url ||
        release.html_url ||
        `https://github.com/${GITHUB_REPO}/releases/latest`;

      if (numericCode > CURRENT_VERSION_CODE) {
        return {
          status: 'update_available',
          message: `Versi baharu v${cleanVer} ditemui di GitHub Releases!`,
          info: {
            hasUpdate: true,
            latestVersion: cleanVer,
            versionCode: numericCode,
            releaseNotes: release.name || `Kemaskini SolatKini Malaysia v${cleanVer}`,
            downloadUrl,
          },
        };
      }

      return {
        status: 'up_to_date',
        message: `Aplikasi anda sudah menggunakan versi terkini (v${CURRENT_APP_VERSION}).`,
      };
    }
  } catch (err) {
    console.warn('Ralat menyemak GitHub Releases:', err);
  }

  return {
    status: 'error',
    message: 'Tidak dapat menyemak kemaskini buat masa ini. Sila pastikan nama repositori & internet aktif.',
  };
}
