/**
 * IndexedDB audio caching and download manager for SolatKini Azan MP3 files.
 * Allows users to download audio to device storage and cache it locally for 100% offline playback.
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
          this.clearAllAudioCache().then(() => {
            localStorage.setItem('solatkini_audio_cache_version', CACHE_VERSION);
          }).catch(() => {
            localStorage.setItem('solatkini_audio_cache_version', CACHE_VERSION);
          });
        }
      } catch {
        // ignore localStorage errors
      }
    }
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
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
        reject((e.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  public isValidAudioBlob(blob: Blob | null | undefined): boolean {
    if (!blob) return false;
    // Valid MP3 vocal audio recordings are between 2.5MB and 4.5MB.
    // If a blob is under 200KB or has a text/html content type, it is a failed HTML response.
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
              console.warn(`[AudioStorage] Blob rosak/bukan audio dikesan bagi '${voiceId}' (${blob.size} bytes). Memadamkan dari memori.`);
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
      // ignore
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
          console.info('[AudioStorage] Semua memori cache audio telah berjaya dikosongkan.');
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
   * Helper to load audio blob reliably across modern browsers and Android WebViews.
   * Uses standard fetch first, with XMLHttpRequest blob fallback to guarantee local asset reading.
   */
  private async fetchAudioBlobWithFallback(
    url: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<Blob> {
    // 1. Try standard fetch with progress reader
    try {
      const targetUrl = url.startsWith('/') && typeof window !== 'undefined'
        ? new URL(url, window.location.href).href
        : url;

      const response = await fetch(targetUrl);
      if (response.ok) {
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
          return new Blob(chunks as any[], { type: 'audio/mpeg' });
        }
        return await response.blob();
      }
    } catch (err) {
      console.warn(`[AudioStorage] Standard fetch gagal bagi ${url}, mencuba XMLHttpRequest:`, err);
    }

    // 2. Fallback: XMLHttpRequest with responseType = 'blob' (Works 100% in Android WebView for assets)
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
          if (xhr.status === 200 || xhr.status === 0) { // status 0 is valid for local android_asset
            const blob = xhr.response as Blob;
            if (blob && blob.size > 100_000) {
              resolve(blob);
              return;
            }
          }
          reject(new Error(`XHR status ${xhr.status}: ${xhr.statusText || 'Gagal memuat turun fail'}`));
        };

        xhr.onerror = () => reject(new Error('Rangkaian terputus semasa memuat turun fail audio'));
        xhr.ontimeout = () => reject(new Error('Masa muat turun tamat (timeout)'));
        xhr.timeout = 25000;
        xhr.send();
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Fetches an MP3 from local app storage or remote URL, caches it in IndexedDB for offline play,
   * and optionally triggers a browser download dialog for the user.
   */
  public async downloadAndCacheAzan(
    voiceId: string,
    audioUrl: string,
    filename: string,
    saveToDisk: boolean = true,
    onProgress?: (progressPercent: number) => void,
    fallbackUrl?: string
  ): Promise<Blob> {
    // Check if already in cache
    const existing = await this.getAudioBlob(voiceId);
    if (existing && this.isValidAudioBlob(existing)) {
      if (onProgress) onProgress(100);
      if (saveToDisk && typeof window !== 'undefined') {
        this.triggerFileDownload(existing, filename);
      }
      return existing;
    }

    let blob: Blob | null = null;

    // Try primary URL
    try {
      blob = await this.fetchAudioBlobWithFallback(audioUrl, onProgress);
    } catch (primaryErr) {
      console.warn(`[AudioStorage] Audio utama (${audioUrl}) gagal dimuat turun:`, primaryErr);
      if (fallbackUrl) {
        try {
          blob = await this.fetchAudioBlobWithFallback(fallbackUrl, onProgress);
        } catch (fallbackErr) {
          throw new Error(`Gagal memuat turun fail azan (${filename}). Sila pastikan sambungan internet aktif.`);
        }
      } else {
        throw primaryErr;
      }
    }

    if (!blob || !this.isValidAudioBlob(blob)) {
      throw new Error(`Fail audio yang dimuat turun tidak sah. Sila cuba sekali lagi.`);
    }

    // 1. Cache into IndexedDB for instantaneous offline play
    await this.saveAudioBlob(voiceId, blob);

    // 2. Trigger disk download if requested
    if (saveToDisk && typeof window !== 'undefined') {
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
