// src/musalog.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface LogEntry {
  id?: number;
  date: string;
  time: string;
  type: 'critical' | 'error' | 'warn';
  message: string;
  stack?: string;
  size: number;
}

const CHEAT_CODE = './musalog';
const MAX_STORAGE_BYTES = 2 * 1024 * 1024; // Had siling 2 Megabytes (F.I.F.O)
const DB_NAME = 'MusaLogDatabase';
const DB_VERSION = 5; // Versi storan dikemas kini
const STORE_LOGS = 'logs';
const STORE_META = 'metadata';

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_LOGS)) {
          db.createObjectStore(STORE_LOGS, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
};

export const MusaLog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'error' | 'warn'>('all');
  const [totalBytesUsed, setTotalBytesUsed] = useState<number>(0);
  const isProcessingQueue = useRef(false);
  const logQueue = useRef<Omit<LogEntry, 'id' | 'size'>[]>([]);
  const logsRef = useRef<LogEntry[]>([]);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const reloadLogsFromDB = useCallback(async () => {
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_LOGS, STORE_META], 'readonly');
      const logStore = tx.objectStore(STORE_LOGS);
      const metaStore = tx.objectStore(STORE_META);

      const logsReq = logStore.getAll();
      const metaReq = metaStore.get('total_size');

      tx.oncomplete = () => {
        const allLogs: LogEntry[] = logsReq.result || [];
        allLogs.reverse();
        logsRef.current = allLogs;
        setLogs(allLogs);
        setTotalBytesUsed(metaReq.result?.value || 0);
      };
    } catch {
      // Guna memori sedia ada jika storan gagal dibaca
      setLogs([...logsRef.current]);
    }
  }, []);

  const processLogQueue = async () => {
    if (isProcessingQueue.current || logQueue.current.length === 0) return;
    isProcessingQueue.current = true;

    try {
      const db = await getDB();
      const tx = db.transaction([STORE_LOGS, STORE_META], 'readwrite');
      const logStore = tx.objectStore(STORE_LOGS);
      const metaStore = tx.objectStore(STORE_META);
      const metaReq = metaStore.get('total_size');

      metaReq.onsuccess = () => {
        let currentSize: number = metaReq.result ? metaReq.result.value : 0;
        const itemsToInsert = [...logQueue.current];
        logQueue.current = [];

        for (const item of itemsToInsert) {
          const rawString = JSON.stringify(item);
          const itemSize = new Blob([rawString]).size;
          const entryWithMeta: Omit<LogEntry, 'id'> = { ...item, size: itemSize };

          logStore.add(entryWithMeta);
          currentSize += itemSize;
        }

        // F.I.F.O Auto-Trim jika melebihi 2 MB
        if (currentSize > MAX_STORAGE_BYTES) {
          const cursorReq = logStore.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor && currentSize > MAX_STORAGE_BYTES) {
              const record = cursor.value as LogEntry;
              currentSize -= record.size || 400;
              cursor.delete();
              cursor.continue();
            } else {
              metaStore.put({ key: 'total_size', value: Math.max(0, currentSize) });
            }
          };
        } else {
          metaStore.put({ key: 'total_size', value: currentSize });
        }
      };

      tx.oncomplete = () => {
        isProcessingQueue.current = false;
        if (isOpen) reloadLogsFromDB();
      };

      tx.onerror = () => {
        isProcessingQueue.current = false;
      };
    } catch {
      isProcessingQueue.current = false;
    }
  };

  const enqueueLog = (type: LogEntry['type'], message: string, stack?: string) => {
    const now = new Date();
    const newEntry: LogEntry = {
      date: now.toLocaleDateString('en-GB'),
      time: now.toLocaleTimeString('en-GB', { hour12: false }),
      type,
      message,
      stack,
      size: 350,
    };

    // Kemas kini memori pantas serta-merta
    logsRef.current = [newEntry, ...logsRef.current].slice(0, 300);
    setLogs([...logsRef.current]);

    // Simpan ke IndexedDB
    logQueue.current.push(newEntry);
    processLogQueue();
  };

  useEffect(() => {
    reloadLogsFromDB();

    const origError = console.error;
    const origWarn = console.warn;
    const origInfo = console.info;

    // 1. Pintas console.error
    console.error = (...args: any[]) => {
      origError(...args);
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      const isAlarmIssue = /azan|alarm|audio|penggera|sound|permission/i.test(msg);
      enqueueLog(
        isAlarmIssue ? 'critical' : 'error',
        isAlarmIssue ? `⚠️ [ISU PENGGERA]: ${msg}` : msg
      );
    };

    // 2. Pintas console.warn
    console.warn = (...args: any[]) => {
      origWarn(...args);
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      const isAlarmIssue = /azan|alarm|audio|penggera|jadual|permission/i.test(msg);
      enqueueLog('warn', isAlarmIssue ? `🔔 [AMARAN AZAN]: ${msg}` : msg);
    };

    // 3. Pintas console.info (Fokus ralat berkaitan lokasi)
    console.info = (...args: any[]) => {
      origInfo(...args);
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      if (/lokasi|geolokasi|gps|geolocation/i.test(msg)) {
        enqueueLog('warn', `📍 [INFO LOKASI]: ${msg}`);
      }
    };

    // 4. Sensor Geolocation: Pintas bila GPS gagal berfungsi
    let origGetCurrentPosition: any = null;
    if (typeof window !== 'undefined' && navigator.geolocation) {
      origGetCurrentPosition = navigator.geolocation.getCurrentPosition;
      navigator.geolocation.getCurrentPosition = function (success, error, options) {
        const customErrorCallback: PositionErrorCallback = (err) => {
          let errorType = 'Ralat Tidak Diketahui';
          if (err.code === 1) errorType = 'Kebenaran GPS Ditolak (Permission Denied)';
          if (err.code === 2) errorType = 'GPS Mati / Tiada Signal (Position Unavailable)';
          if (err.code === 3) errorType = 'Masa Tamat Mencari GPS (Timeout)';

          enqueueLog(
            'error',
            `📍 [GAGAL KESAN LOKASI]: Kod ${err.code} - ${errorType} | Mesej: ${err.message || 'Tiada maklumat ralat'}`
          );

          if (error) error(err);
        };

        return origGetCurrentPosition.call(navigator.geolocation, success, customErrorCallback, options);
      };
    }

    // 5. Sensor Anjakan Masa / Tarikh Telefon Tidak Selaras
    const checkSystemTimeSanity = () => {
      try {
        const lastSavedEpoch = localStorage.getItem('musalog_last_known_time');
        const currentEpoch = Date.now();

        if (lastSavedEpoch) {
          const diff = currentEpoch - parseInt(lastSavedEpoch, 10);
          if (diff < -600000) {
            enqueueLog(
              'critical',
              `⏰ [AMARAN MASA PERANTI]: Jam telefon dikesan diundur ke masa lampau secara manual atau tetapan masa automatik dimatikan! (Perbezaan: ${Math.round(
                diff / 60000
              )} minit)`
            );
          }
        }
        localStorage.setItem('musalog_last_known_time', currentEpoch.toString());
      } catch {}
    };
    checkSystemTimeSanity();

    // 6. Sensor Audio Azan Disekat Android
    const origAudioPlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function (...args) {
      return origAudioPlay.apply(this, args).catch((err: any) => {
        const audioSrc = this.src || 'Fail Audio Azan';
        enqueueLog(
          'critical',
          `🚨 [ALARM GAGAL BERBUNYI]: Audio disekat atau gagal dimainkan (${err?.name || 'Error'}: ${err?.message || err}) | Sumber: ${audioSrc}`
        );
        throw err;
      });
    };

    // 7. Tangkap Uncaught Runtime Crash & Unhandled Promise
    const handleGlobalError = (event: ErrorEvent) => {
      enqueueLog('critical', event.message || 'Ralat Runtime Kritikal', event.error?.stack);
    };

    const handlePromiseError = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const stack = reason instanceof Error ? reason.stack : undefined;
      const message = reason instanceof Error ? reason.message : String(reason);
      enqueueLog('critical', `Promise Rejection: ${message}`, stack);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handlePromiseError);

    // Semakan Cheat Code ./musalog
    const handleCheatCheck = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return;

      const val = (target.value || '').trim().toLowerCase();
      if (val === CHEAT_CODE.toLowerCase() || val === 'musalog' || val.endsWith('musalog')) {
        setIsOpen(true);
        reloadLogsFromDB();
        target.value = '';
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        handleCheatCheck(e);
      }
    };

    // Sandaran ketuk logo 5 kali laju
    const handleSecretTap = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      if (clientY !== undefined && clientY < 80) {
        const now = Date.now();
        if (now - lastTapTimeRef.current < 500) {
          tapCountRef.current += 1;
        } else {
          tapCountRef.current = 1;
        }
        lastTapTimeRef.current = now;

        if (tapCountRef.current >= 5) {
          tapCountRef.current = 0;
          setIsOpen(true);
          reloadLogsFromDB();
        }
      }
    };

    document.addEventListener('input', handleCheatCheck);
    document.addEventListener('keyup', handleCheatCheck);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('change', handleCheatCheck);
    window.addEventListener('click', handleSecretTap);

    return () => {
      console.error = origError;
      console.warn = origWarn;
      console.info = origInfo;
      if (origGetCurrentPosition && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = origGetCurrentPosition;
      }
      HTMLAudioElement.prototype.play = origAudioPlay;
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handlePromiseError);
      document.removeEventListener('input', handleCheatCheck);
      document.removeEventListener('keyup', handleCheatCheck);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('change', handleCheatCheck);
      window.removeEventListener('click', handleSecretTap);
    };
  }, [reloadLogsFromDB]);

  // Fungsi Ujian Diagnostik Pantas
  const triggerSelfTest = () => {
    console.warn('Ujian Diagnostik: Pemantau sistem aktif & menapis amaran.');
    console.error('⚠️ [ISU PENGGERA]: Gagal memainkan audio azan (Simulasi Ujian).');
    enqueueLog(
      'critical',
      'Simulasi Crash: Ralat runtime berjaya ditangkap oleh MusaLog!',
      'at SelfTest (musalog.tsx:1)\n    at triggerSelfTest (musalog.tsx:285)'
    );
    alert('3 ralat ujian berjaya dihantar ke dalam MusaLog!');
  };

  const clearAllLogs = async () => {
    if (!window.confirm('Padam semua rekod log dalam storan?')) return;
    try {
      logsRef.current = [];
      setLogs([]);
      setTotalBytesUsed(0);
      const db = await getDB();
      const tx = db.transaction([STORE_LOGS, STORE_META], 'readwrite');
      tx.objectStore(STORE_LOGS).clear();
      tx.objectStore(STORE_META).put({ key: 'total_size', value: 0 });
    } catch {
      setLogs([]);
      setTotalBytesUsed(0);
    }
  };

  const copyAllLogs = () => {
    if (logs.length === 0) return alert('Tiada rekod untuk disalin.');
    const fullText = logs
      .map(
        (l) =>
          `[${l.date} ${l.time}] [${(l.type || 'LOG').toUpperCase()}]\n${l.message}${l.stack ? '\nStack: ' + l.stack : ''}`
      )
      .join('\n----------------------------------------\n');

    navigator.clipboard.writeText(fullText);
    alert(`Berjaya salin ${logs.length} entri log!`);
  };

  const exportAsTextFile = () => {
    if (logs.length === 0) return alert('Tiada log untuk dieksport.');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `MusaLog_SolatKini_${timestamp}.txt`;

    const content = [
      '=====================================================',
      ` MUSA LOG REPORT - SOLATKINI MALAYSIA`,
      ` Tarikh Eksport: ${new Date().toLocaleString('en-GB')}`,
      ` Jumlah Rekod : ${logs.length} entri`,
      ` Saiz Storan   : ${formatBytes(totalBytesUsed)} / 2.00 MB`,
      '=====================================================\n',
      ...logs.map(
        (l) =>
          `[${l.date} ${l.time}] [${(l.type || 'LOG').toUpperCase()}]\n${l.message}${l.stack ? '\nStack Trace:\n' + l.stack : ''}\n-----------------------------------------------------`
      ),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => (filter === 'all' ? true : l.type === filter));

  return (
    <div
      id="musalog-modal-root"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 12, 0.97)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        padding: '14px',
        fontFamily: 'monospace',
      }}
    >
      {/* Bahagian Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <div style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '15px' }}>
            ⚡ MusaLog System (Error & Alarm Monitor)
          </div>
          <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>
            Storan: <strong style={{ color: '#38BDF8' }}>{formatBytes(totalBytesUsed)}</strong> / 2.00 MB (F.I.F.O Auto-Trim)
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: '#EF4444',
            color: '#FFFFFF',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ✕ Tutup
        </button>
      </div>

      {/* Bar Butang Kawalan & Fungsi */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            background: filter === 'all' ? '#2563EB' : '#1E293B',
            color: '#FFFFFF',
            border: '1px solid #334155',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
          }}
        >
          Semua ({logs.length})
        </button>

        <button
          onClick={() => setFilter('critical')}
          style={{
            background: filter === 'critical' ? '#991B1B' : '#1E293B',
            color: '#FCA5A5',
            border: '1px solid #7F1D1D',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          Kritikal ({logs.filter((l) => l.type === 'critical').length})
        </button>

        <button
          onClick={() => setFilter('error')}
          style={{
            background: filter === 'error' ? '#B91C1C' : '#1E293B',
            color: '#F87171',
            border: '1px solid #334155',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
          }}
        >
          Error ({logs.filter((l) => l.type === 'error').length})
        </button>

        <button
          onClick={() => setFilter('warn')}
          style={{
            background: filter === 'warn' ? '#D97706' : '#1E293B',
            color: '#FDE68A',
            border: '1px solid #334155',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
          }}
        >
          Warning ({logs.filter((l) => l.type === 'warn').length})
        </button>

        {/* Butang Self-Test */}
        <button
          onClick={triggerSelfTest}
          style={{
            background: '#7C3AED',
            color: '#FFFFFF',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            marginLeft: 'auto',
            cursor: 'pointer',
          }}
        >
          🧪 Uji Ralat
        </button>

        {/* Butang Export .txt */}
        <button
          onClick={exportAsTextFile}
          style={{
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          💾 Muat Turun (.txt)
        </button>

        {/* Butang Salin */}
        <button
          onClick={copyAllLogs}
          style={{
            background: '#059669',
            color: '#FFFFFF',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          📋 Salin
        </button>

        {/* Butang Padam */}
        <button
          onClick={clearAllLogs}
          style={{
            background: '#334155',
            color: '#E2E8F0',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          🗑️ Padam
        </button>
      </div>

      {/* Paparan Terminal Log */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#070A0F',
          border: '1px solid #1E293B',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '11.5px',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ color: '#64748B', textAlign: 'center', marginTop: '60px' }}>
            Tiada ralat atau amaran dikesan. Tekan butang "🧪 Uji Ralat" untuk simulasi!
          </div>
        ) : (
          filteredLogs.slice(0, 150).map((item, idx) => (
            <div
              key={item.id || idx}
              style={{
                marginBottom: '8px',
                borderBottom: '1px solid #151D2A',
                paddingBottom: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ color: '#64748B', fontSize: '10px' }}>
                  {item.date} {item.time}
                </span>

                <span
                  style={{
                    fontSize: '9.5px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontWeight: 'bold',
                    backgroundColor:
                      item.type === 'critical'
                        ? '#7F1D1D'
                        : item.type === 'error'
                        ? '#450A0A'
                        : '#78350F',
                    color:
                      item.type === 'critical'
                        ? '#FECACA'
                        : item.type === 'error'
                        ? '#FCA5A5'
                        : '#FDE68A',
                  }}
                >
                  {item.type.toUpperCase()}
                </span>
              </div>

              <div
                style={{
                  color:
                    item.message.includes('ALARM') ||
                    item.message.includes('PENGGERA') ||
                    item.message.includes('LOKASI')
                      ? '#FCA5A5'
                      : '#E2E8F0',
                  wordBreak: 'break-word',
                  lineHeight: '1.4',
                  fontWeight:
                    item.message.includes('ALARM') ||
                    item.message.includes('PENGGERA') ||
                    item.message.includes('LOKASI')
                      ? 'bold'
                      : 'normal',
                }}
              >
                {item.message}
              </div>

              {item.stack && (
                <pre
                  style={{
                    color: '#94A3B8',
                    fontSize: '9.5px',
                    margin: '4px 0 0 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    backgroundColor: '#0F172A',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {item.stack}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MusaLog;
