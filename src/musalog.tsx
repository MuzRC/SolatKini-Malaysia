// src/musalog.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface LogEntry {
  id?: number;
  date: string;
  time: string;
  type: 'critical' | 'error' | 'warn' | 'action';
  message: string;
  stack?: string;
  size: number;
}

// Kod Cheat Code asal dikembalikan
const CHEAT_CODE = './musalog';
const MAX_STORAGE_BYTES = 10 * 1024 * 1024; // Had 10 MB
const DB_NAME = 'MusaLogDatabase';
const DB_VERSION = 2; // Dinaikkan versi agar storan sentiasa segar
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
  const [filter, setFilter] = useState<'all' | 'action' | 'critical' | 'error' | 'warn'>('all');
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
    } catch (e) {
      // Jika DB gagal, kekalkan log dalam memori
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

        if (currentSize > MAX_STORAGE_BYTES) {
          const cursorReq = logStore.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor && currentSize > MAX_STORAGE_BYTES) {
              const record = cursor.value as LogEntry;
              currentSize -= record.size || 500;
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
      size: 300,
    };

    // Sentiasa simpan serta-merta ke memori pantas
    logsRef.current = [newEntry, ...logsRef.current].slice(0, 300);
    setLogs([...logsRef.current]);

    // Simpan ke arkib storan kekal
    logQueue.current.push(newEntry);
    processLogQueue();
  };

  useEffect(() => {
    reloadLogsFromDB();

    const origError = console.error;
    const origWarn = console.warn;

    console.error = (...args: any[]) => {
      origError(...args);
      enqueueLog('error', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };

    console.warn = (...args: any[]) => {
      origWarn(...args);
      enqueueLog('warn', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };

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

    // ==========================================
    // MULA: LOG AKTIVITI PENGGUNA (SENSOR AUTO-KLIK)
    // ==========================================
    const handleUserInteraction = (e: MouseEvent) => {
      try {
        const rawTarget = e.target;
        if (!rawTarget || !(rawTarget instanceof Element)) return;

        const target = rawTarget.closest(
          'button, [role="button"], a, input, select, [class*="cursor-pointer"]'
        ) as HTMLElement | null;

        if (!target) return;
        if (target.closest('#musalog-modal-root')) return;

        let label =
          target.getAttribute('aria-label') ||
          target.getAttribute('title') ||
          target.innerText?.trim() ||
          (target as HTMLInputElement).value ||
          target.getAttribute('placeholder') ||
          target.tagName.toLowerCase();

        label = String(label).replace(/\s+/g, ' ').slice(0, 40);

        if (label && !label.includes('musalog')) {
          enqueueLog('action', `Aktiviti: Tekan "${label}"`);
        }
      } catch {}
    };

    document.addEventListener('click', handleUserInteraction, true);
    // ==========================================
    // AKHIR: LOG AKTIVITI PENGGUNA (SENSOR AUTO-KLIK)
    // ==========================================

    // ==========================================
    // MULA: PENGESAN CHEAT CODE (DIPULIHKAN SEPENUHNYA)
    // ==========================================
    const handleCheatCheck = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return;

      const val = (target.value || '').trim().toLowerCase();

      // Semak sama ada padan tepat ./musalog ATAU musalog
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

    document.addEventListener('input', handleCheatCheck);
    document.addEventListener('keyup', handleCheatCheck);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('change', handleCheatCheck);
    // ==========================================
    // AKHIR: PENGESAN CHEAT CODE
    // ==========================================

    // Sandaran kecemasan: Ketuk 5 kali pada bahagian logo atas skrin
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
    window.addEventListener('click', handleSecretTap);

    return () => {
      console.error = origError;
      console.warn = origWarn;
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handlePromiseError);

      // ==========================================
      // MULA: PEMBERSIHAN LISTENER AKTIVITI PENGGUNA
      // ==========================================
      document.removeEventListener('click', handleUserInteraction, true);
      // ==========================================
      // AKHIR: PEMBERSIHAN LISTENER AKTIVITI PENGGUNA
      // ==========================================

      document.removeEventListener('input', handleCheatCheck);
      document.removeEventListener('keyup', handleCheatCheck);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('change', handleCheatCheck);
      window.removeEventListener('click', handleSecretTap);
    };
  }, [reloadLogsFromDB]);

  const clearAllLogs = async () => {
    if (!window.confirm('Padam semua rekod log dalam storan kekal?')) return;
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

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => (filter === 'all' ? true : l.type === filter));

  return (
    <div
      id="musalog-modal-root"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 12, 0.96)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        padding: '14px',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <div style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '15px' }}>
            ⚡ MusaLog Autosave Console
          </div>
          <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>
            Saiz: <strong style={{ color: '#38BDF8' }}>{formatBytes(totalBytesUsed)}</strong> / 10.00 MB (F.I.F.O)
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

        {/* ========================================== */}
        {/* MULA: BUTANG FILTER AKTIVITI PENGGUNA      */}
        {/* ========================================== */}
        <button
          onClick={() => setFilter('action')}
          style={{
            background: filter === 'action' ? '#059669' : '#1E293B',
            color: '#A7F3D0',
            border: '1px solid #065F46',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          Aktiviti ({logs.filter((l) => l.type === 'action').length})
        </button>
        {/* ========================================== */}
        {/* AKHIR: BUTANG FILTER AKTIVITI PENGGUNA     */}
        {/* ========================================== */}

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

        <button
          onClick={copyAllLogs}
          style={{
            background: '#059669',
            color: '#FFFFFF',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            marginLeft: 'auto',
            cursor: 'pointer',
          }}
        >
          📋 Salin Semua
        </button>

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
          🗑️ Padam Storan
        </button>
      </div>

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
            Tiada log dikesan. Bersih mantap!
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
                      item.type === 'action'
                        ? '#064E3B'
                        : item.type === 'critical'
                        ? '#7F1D1D'
                        : item.type === 'error'
                        ? '#450A0A'
                        : '#78350F',
                    color:
                      item.type === 'action'
                        ? '#6EE7B7'
                        : item.type === 'critical'
                        ? '#FECACA'
                        : item.type === 'error'
                        ? '#FCA5A5'
                        : '#FDE68A',
                  }}
                >
                  {item.type === 'action' ? 'AKTIVITI' : (item.type || 'LOG').toUpperCase()}
                </span>
              </div>

              <div
                style={{
                  color: '#E2E8F0',
                  wordBreak: 'break-word',
                  lineHeight: '1.4',
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
