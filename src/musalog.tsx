// src/musalog.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface LogEntry {
  id?: number;
  date: string;
  time: string;
  type: 'critical' | 'error' | 'warn';
  message: string;
  stack?: string;
  size: number; // Saiz dalam bytes
}

const CHEAT_CODE = './musalog';
const MAX_STORAGE_BYTES = 10 * 1024 * 1024; // Had siling 10 Megabytes (10,485,760 Bytes)
const DB_NAME = 'MusaLogDatabase';
const DB_VERSION = 1;
const STORE_LOGS = 'logs';
const STORE_META = 'metadata';

// Pembantu IndexedDB
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
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
  });
};

export const MusaLog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'error' | 'warn'>('all');
  const [totalBytesUsed, setTotalBytesUsed] = useState<number>(0);
  const isProcessingQueue = useRef(false);
  const logQueue = useRef<Omit<LogEntry, 'id' | 'size'>[]>([]);

  // Format bait kepada paparan mesra mata (KB / MB)
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Muat data dari IndexedDB ke skrin
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
        // Susun daripada yang paling baru ke lama
        allLogs.reverse();
        setLogs(allLogs);
        setTotalBytesUsed(metaReq.result?.value || 0);
      };
    } catch (e) {
      console.warn('Gagal memuatkan rekod MusaLog:', e);
    }
  }, []);

  // Simpan log ke IndexedDB & perlaksanaan F.I.F.O bila cecah 10MB
  const processLogQueue = async () => {
    if (isProcessingQueue.current || logQueue.current.length === 0) return;
    isProcessingQueue.current = true;

    try {
      const db = await getDB();
      const tx = db.transaction([STORE_LOGS, STORE_META], 'readwrite');
      const logStore = tx.objectStore(STORE_LOGS);
      const metaStore = tx.objectStore(STORE_META);

      // Ambil saiz semasa
      const metaReq = metaStore.get('total_size');

      metaReq.onsuccess = async () => {
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

        // F.I.F.O: Buang rekod paling lama jika melepasi had 10MB
        if (currentSize > MAX_STORAGE_BYTES) {
          const cursorReq = logStore.openCursor(); // Buka cursor daripada id paling kecil (paling awal disimpan)
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
        if (isOpen) {
          reloadLogsFromDB();
        }
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
    const dateStr = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false }); // HH:mm:ss

    logQueue.current.push({
      date: dateStr,
      time: timeStr,
      type,
      message,
      stack,
    });

    // Jalankan simpanan ke storan
    processLogQueue();
  };

  useEffect(() => {
    // 1. Muat rekod sesi lepas semasa app baru dibuka
    reloadLogsFromDB();

    // 2. Pintas console asal
    const origError = console.error;
    const origWarn = console.warn;

    console.error = (...args: any[]) => {
      origError(...args);
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      enqueueLog('error', msg);
    };

    console.warn = (...args: any[]) => {
      origWarn(...args);
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      enqueueLog('warn', msg);
    };

    // 3. Tangkap Crash Kritikal (Uncaught Runtime Error)
    const handleGlobalError = (event: ErrorEvent) => {
      enqueueLog('critical', event.message || 'Ralat Runtime Kritikal', event.error?.stack);
    };

    // 4. Tangkap Crash API/Promise (Unhandled Rejections)
    const handlePromiseError = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const stack = reason instanceof Error ? reason.stack : undefined;
      const message = reason instanceof Error ? reason.message : String(reason);
      enqueueLog('critical', `Promise Rejection: ${message}`, stack);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handlePromiseError);

    // 5. Tangkap Cheat Code ./musalog di mana-mana kotak carian
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (target.value.trim().toLowerCase() === CHEAT_CODE.toLowerCase()) {
          setIsOpen(true);
          reloadLogsFromDB();
          target.value = '';
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };

    document.addEventListener('input', handleInput);

    return () => {
      console.error = origError;
      console.warn = origWarn;
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handlePromiseError);
      document.removeEventListener('input', handleInput);
    };
  }, [reloadLogsFromDB]);

  const clearAllLogs = async () => {
    if (!window.confirm('Padam semua rekod log dalam storan kekal?')) return;
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_LOGS, STORE_META], 'readwrite');
      tx.objectStore(STORE_LOGS).clear();
      tx.objectStore(STORE_META).put({ key: 'total_size', value: 0 });
      tx.oncomplete = () => {
        setLogs([]);
        setTotalBytesUsed(0);
      };
    } catch (e) {
      alert('Gagal membersihkan storan.');
    }
  };

  const copyAllLogs = () => {
    if (logs.length === 0) return alert('Tiada rekod untuk disalin.');
    const fullText = logs
      .map(
        (l) =>
          `[${l.date} ${l.time}] [${l.type.toUpperCase()}]\n${l.message}${l.stack ? '\nStack: ' + l.stack : ''}`
      )
      .join('\n----------------------------------------\n');

    navigator.clipboard.writeText(fullText);
    alert(`Berjaya salin ${logs.length} entri log ke clipboard!`);
  };

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => (filter === 'all' ? true : l.type === filter));

  return (
    <div
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
      {/* Bar Atas / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <div style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚡ MusaLog Autosave Console</span>
          </div>
          <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>
            Saiz Storan: <strong style={{ color: '#38BDF8' }}>{formatBytes(totalBytesUsed)}</strong> / 10.00 MB (F.I.F.O Auto-Trim)
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

      {/* Butang Kawalan & Filter */}
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

      {/* Skrin Terminal Senarai Log */}
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
            Tiada log dalam rekod. Storan bersih mantap!
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

              <div style={{ color: '#E2E8F0', wordBreak: 'break-word', lineHeight: '1.4' }}>
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
