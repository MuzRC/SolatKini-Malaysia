// src/MusaLog.tsx
import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  time: string;
  type: 'error' | 'warn' | 'log';
  message: string;
  stack?: string;
}

const CHEAT_CODE = './musalog';
const MAX_LOGS = 150;

export const MusaLog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn'>('all');
  const logsRef = useRef<LogEntry[]>([]);

  const addLog = (type: LogEntry['type'], message: string, stack?: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      time,
      type,
      message,
      stack,
    };

    logsRef.current = [newEntry, ...logsRef.current].slice(0, MAX_LOGS);
    setLogs([...logsRef.current]);
  };

  useEffect(() => {
    // 1. Pintas console asal app
    const origError = console.error;
    const origWarn = console.warn;
    const origLog = console.log;

    console.error = (...args: any[]) => {
      origError(...args);
      addLog('error', args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };

    console.warn = (...args: any[]) => {
      origWarn(...args);
      addLog('warn', args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };

    console.log = (...args: any[]) => {
      origLog(...args);
      addLog('log', args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };

    // 2. Tangkap uncaught JavaScript error & API crash
    const handleWindowError = (event: ErrorEvent) => {
      addLog('error', event.message, event.error?.stack);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog('error', `Promise Gagal: ${event.reason}`);
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleRejection);

    // 3. Global Listener untuk tangkap cheat code di MANA-MANA kotak input
    const handleGlobalInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (target.value.trim().toLowerCase() === CHEAT_CODE.toLowerCase()) {
          // Buka konsol log
          setIsOpen(true);

          // Padam teks cheat code dari kotak carian supaya tidak tersangkut
          target.value = '';
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };

    document.addEventListener('input', handleGlobalInput);

    return () => {
      console.error = origError;
      console.warn = origWarn;
      console.log = origLog;
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleRejection);
      document.removeEventListener('input', handleGlobalInput);
    };
  }, []);

  const clearAll = () => {
    logsRef.current = [];
    setLogs([]);
  };

  const copyToClipboard = () => {
    if (logs.length === 0) return alert('Tiada log untuk disalin.');
    const fullText = logs
      .map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}${l.stack ? '\n' + l.stack : ''}`)
      .join('\n---\n');
    navigator.clipboard.writeText(fullText);
    alert('Semua log berjaya disalin!');
  };

  if (!isOpen) return null;

  const filteredLogs = logs.filter(l => (filter === 'all' ? true : l.type === filter));

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      fontFamily: 'monospace',
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <span style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '15px' }}>⚡ MusaLog Console</span>
          <span style={{ color: '#9CA3AF', fontSize: '12px', marginLeft: '8px' }}>({logs.length} entri)</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: '#EF4444',
            color: '#FFFFFF',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          ✕ Tutup
        </button>
      </div>

      {/* Button Controls */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            background: filter === 'all' ? '#2563EB' : '#1F2937',
            color: '#FFFFFF',
            border: '1px solid #374151',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '11px'
          }}
        >
          Semua
        </button>
        <button
          onClick={() => setFilter('error')}
          style={{
            background: filter === 'error' ? '#DC2626' : '#1F2937',
            color: '#FFFFFF',
            border: '1px solid #374151',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '11px'
          }}
        >
          Error Saja
        </button>
        <button
          onClick={copyToClipboard}
          style={{
            background: '#059669',
            color: '#FFFFFF',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            marginLeft: 'auto'
          }}
        >
          📋 Salin Semua
        </button>
        <button
          onClick={clearAll}
          style={{
            background: '#374151',
            color: '#FFFFFF',
            border: '1px solid #4B5563',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '11px'
          }}
        >
          🗑️ Bersihkan
        </button>
      </div>

      {/* Paparan Log Terminal */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: '#0B0F19',
        border: '1px solid #1F2937',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '12px'
      }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: '#6B7280', textAlign: 'center', marginTop: '40px' }}>
            Tiada sebarang log atau error dikesan. Bersih mantap!
          </div>
        ) : (
          filteredLogs.map(item => (
            <div key={item.id} style={{ marginBottom: '8px', borderBottom: '1px solid #1E293B', paddingBottom: '6px' }}>
              <span style={{ color: '#64748B' }}>[{item.time}] </span>
              <span style={{
                fontWeight: 'bold',
                color: item.type === 'error' ? '#EF4444' : item.type === 'warn' ? '#F59E0B' : '#38BDF8'
              }}>
                [{item.type.toUpperCase()}]
              </span>{' '}
              <span style={{ color: '#E2E8F0', wordBreak: 'break-all' }}>{item.message}</span>
              {item.stack && (
                <pre style={{
                  color: '#94A3B8',
                  fontSize: '10px',
                  marginTop: '4px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
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
