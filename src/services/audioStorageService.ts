import { Capacitor } from '@capacitor/core';

/**
 * IndexedDB audio caching and download manager for SolatKini Azan MP3 files.
 * Membolehkan pengguna memuat turun audio azan ke storan peranti untuk mainan 100% luar talian.
 */

const DB_NAME = 'solatkini_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'azan_cache';
const CACHE_VERSION = 'solatkini_audio_cache_v5';

class AudioStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.initCacheVersionCheck();
  }

  private initCacheVersionCheck() {
    if (typeof window !== 'undefined') {
      try {
        const currentVer = localStorage.getItem('solatkini_audio_cache_version');
        if (currentVer !== CACHE_VERSION) {
          console.info('[AudioStorage] Versi cache audio diperbaharui. Mengosongkan data lama...');
          this.clearAllAudioCache()
            .then(() => {
              localStorage.setItem('solatkini_audio_cache_version', CACHE_VERSION);
            })
            .catch(() => {
              localStorage.setItem('solatkini_audio_cache_version', CACHE_VERSION);
            });
        }
      } catch {
        // Abaikan ralat localStorage
      }
    }
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB tidak disokong di dalam persekitaran ini'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (e) => {
        resolve((e.target as IDBOpenDBRequest).result);
      };

      request.onerror = (e) => {
        this.dbPromise = null; // Tetapkan semula agar boleh dicuba semula
        reject((e.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  public isValidAudioBlob(blob: Blob | null | undefined): boolean {
    if (!blob) return false;
    // Rakaman vokal azan sah biasanya bersaiz antara 1.5MB hingga 5MB.
    // Jika blob kurang daripada 200KB atau jenis teks/html, ia adalah respon SPA fallback yang rosak.
    if (blob.size < 200_000) return false;
    if (blob.type && (blob.type.includes('text') || blob.type.includes('html'))) return false;
    return true;
  }

  public async saveAudioBlob(voiceId: string, blob: Blob): Promise<void> {
    if (!this.isValidAudioBlob(blob)) {
      throw new Error(`Fail audio tidak sah (${blob.size} bytes)`);
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, voiceId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getAudioBlob(voiceId: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(voiceId);

        req.onsuccess = () => {
          const blob = req.result as Blob | undefined;
          if (blob) {
            if (!this.isValidAudioBlob(blob)) {
              console.warn(`[AudioStorage] Blob rosak dikesan bagi '${voiceId}' (${blob.size} bytes). Memadamkan dari memori.`);
              this.removeAudioBlob(voiceId);
              resolve(null);
              return;
            }
            resolve(blob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async isAudioCached(voiceId: string): Promise<boolean> {
    try {
      const blob = await this.getAudioBlob(voiceId);
      return blob !== null;
    } catch {
      return false;
    }
  }

  public async removeAudioBlob(voiceId: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(voiceId);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Abaikan
    }
  }

  public async clearAllAudioCache(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => {
          console.info('[AudioStorage] Semua memori cache audio berjaya dikosongkan.');
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Gagal memadam cache audio:', err);
    }
  }

  public async getAllCachedVoiceIds(): Promise<string[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAllKeys();

        req.onsuccess = () => {
          resolve((req.result as string[]) || []);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public setActiveDeviceVoice(voiceId: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_active_device_voice', voiceId);
    }
  }

  public getActiveDeviceVoice(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('solatkini_active_device_voice');
    }
    return null;
  }

  /**
   * Pembantu muat turun blob audio dengan sokongan penjejakan peratusan
   * serta tapisan Content-Type untuk mengelak fail HTML tersimpan.
   */
  private async fetchAudioBlobWithFallback(
    url: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<Blob> {
    // 1. Cuba kaedah fetch standard
    try {
      const targetUrl = url.startsWith('/') && typeof window !== 'undefined'
        ? new URL(url, window.location.href).href
        : url;

      const response = await fetch(targetUrl);
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        // Sekat jika pelayan memulangkan HTML (SPA routing 404 fallback)
        if (contentType.includes('text/html') || contentType.includes('text/plain')) {
          throw new Error('Pelayan memulangkan format HTML dan bukannya audio MP3.');
        }

        const contentLength = +(response.headers.get('Content-Length') || 0);
        if (response.body && contentLength > 0 && onProgress) {
          const reader = response.body.getReader();
          let received = 0;
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            onProgress(Math.min(100, Math.round((received / contentLength) * 100)));
          }
          return new Blob(chunks, { type: 'audio/mpeg' });
        }
        return await response.blob();
      }
    } catch (err) {
      console.warn(`[AudioStorage] Fetch gagal bagi ${url}, mencuba XMLHttpRequest:`, err);
    }

    // 2. Sandaran: XMLHttpRequest dengan responseType = 'blob'
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';

        if (onProgress) {
          xhr.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 0) {
            const blob = xhr.response as Blob;
            if (blob && blob.size > 100_000 && !blob.type.includes('html')) {
              resolve(blob);
              return;
            }
          }
          reject(new Error(`XHR status ${xhr.status}: Format fail tidak sah`));
        };

        xhr.onerror = () => reject(new Error('Rangkaian terputus semasa memuat turun fail audio'));
        xhr.ontimeout = () => reject(new Error('Masa muat turun tamat (timeout)'));
        xhr.timeout = 30000;
        xhr.send();
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Memuat turun azan dan menyimpannya ke dalam IndexedDB.
   * Dilengkapi rantaian sandaran automatik ke pautan CDN jika fail tempatan gagal atau tidak sah.
   */
  public async downloadAndCacheAzan(
    voiceId: string,
    audioUrl: string,
    filename: string,
    saveToDisk: boolean = true,
    onProgress?: (progressPercent: number) => void,
    fallbackUrl?: string
  ): Promise<Blob> {
    // 1. Semak sekiranya sudah ada dalam simpanan cache IndexedDB
    const existing = await this.getAudioBlob(voiceId);
    if (existing && this.isValidAudioBlob(existing)) {
      if (onProgress) onProgress(100);
      if (saveToDisk && typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
        this.triggerFileDownload(existing, filename);
      }
      return existing;
    }

    let blob: Blob | null = null;

    // 2. Cuba pautan utama (fail tempatan)
    try {
      blob = await this.fetchAudioBlobWithFallback(audioUrl, onProgress);
    } catch (primaryErr) {
      console.warn(`[AudioStorage] Audio utama (${audioUrl}) tidak dapat dimuat turun.`, primaryErr);
    }

    // 3. Jika pautan utama gagal atau menghasilkan blob tidak sah, beralih ke fallback CDN
    if (!blob || !this.isValidAudioBlob(blob)) {
      if (fallbackUrl) {
        console.info(`[AudioStorage] Beralih ke fallback CDN bagi '${voiceId}': ${fallbackUrl}`);
        try {
          blob = await this.fetchAudioBlobWithFallback(fallbackUrl, onProgress);
        } catch (fallbackErr) {
          throw new Error(`Gagal memuat turun fail azan (${filename}). Sila pastikan sambungan internet aktif.`);
        }
      } else {
        throw new Error(`Fail audio yang dimuat turun tidak sah atau tidak dijumpai.`);
      }
    }

    if (!blob || !this.isValidAudioBlob(blob)) {
      throw new Error(`Fail audio yang dimuat turun tidak sah. Sila cuba sekali lagi.`);
    }

    // 4. Simpan ke dalam IndexedDB untuk mainan luar talian serta-merta
    await this.saveAudioBlob(voiceId, blob);

    // 5. Muat turun ke disk pelayar (hanya jika di pelayar web biasa, bukan APK Android)
    if (saveToDisk && typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
      this.triggerFileDownload(blob, filename);
    }

    return blob;
  }

  private triggerFileDownload(blob: Blob, filename: string) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.mp3') ? filename : `${filename}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.warn('Gagal memulakan muat turun ke disk fail:', e);
    }
  }
}

export const audioStorageService = new AudioStorageService();
