'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type LogLine = {
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
};

interface ImportSessionHistory {
  id: string;
  group_id: string;
  filename: string;
  status: string;
  total_rows: number;
  imported_count: number | null;
  rejected_count: number | null;
  modified_count: number | null;
  uploaded_at: string;
  uploaded_by_name: string | null;
}

const STATUS_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  done:       { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', label: '✓ Completed' },
  review:     { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', label: '⏳ In Review' },
  processing: { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa', label: '⚙ Processing' },
  failed:     { bg: 'rgba(251,113,133,0.12)', color: '#fb7185', label: '✗ Failed' },
};

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [history, setHistory] = useState<ImportSessionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Fetch import history on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/import');
        const json = await res.json();
        if (json.success) {
          setHistory(json.data || []);
        }
      } catch {
        // silently handle
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const addLog = (text: string, type: LogLine['type'] = 'info') => {
    setLogLines((prev) => [
      ...prev,
      { text, type, time: new Date().toLocaleTimeString() },
    ]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setLogLines([]);

    addLog('Starting CSV import...', 'info');
    await delay(300);
    addLog(`File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
    await delay(200);
    addLog('Parsing CSV with PapaParse...', 'info');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('group_id', '00000000-0000-0000-0000-000000000000');

    try {
      await delay(300);
      addLog('Sending to server...', 'info');

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        addLog(`✓ Parsed ${result.data.total_rows} rows`, 'success');
        await delay(200);
        addLog('Running anomaly detectors...', 'info');
        await delay(400);

        const anomalyTypes = result.data.anomalies_by_type;
        for (const [type, count] of Object.entries(anomalyTypes)) {
          await delay(150);
          addLog(`⚠ Found ${count}× ${type.replace(/_/g, ' ')}`, 'warning');
        }

        await delay(300);
        addLog(`✓ Detection complete: ${result.data.anomalies_found} anomalies found`, 'success');
        addLog('Ready for review →', 'success');

        // Navigate to review page after a moment
        setTimeout(() => {
          router.push(`/import/${result.data.session_id}/review`);
        }, 1500);
      } else {
        addLog(`✗ Import failed: ${result.error}`, 'error');
        setIsUploading(false);
      }
    } catch (err) {
      addLog(`✗ Network error: ${(err as Error).message}`, 'error');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Header title="Import CSV" subtitle="Upload your expense CSV to detect anomalies and import data" />

      {/* Upload Zone */}
      {!isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className="rounded-2xl p-12 text-center cursor-pointer transition-all"
          style={{
            background: isDragging
              ? 'rgba(139, 92, 246, 0.1)'
              : 'rgba(255, 255, 255, 0.02)',
            border: `2px dashed ${isDragging ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
          }}
          onClick={() => document.getElementById('csv-input')?.click()}
        >
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <motion.div
            animate={{ y: isDragging ? -8 : 0 }}
            className="text-6xl mb-4"
          >
            {file ? '✅' : '📄'}
          </motion.div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {file ? file.name : 'Drop your CSV file here'}
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {file
              ? `${(file.size / 1024).toFixed(1)} KB — Ready to import`
              : 'or click to browse. Supports Expenses Export.csv format'}
          </p>

          {file && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary mt-6 text-base px-8 py-3"
              onClick={(e) => { e.stopPropagation(); handleUpload(); }}
            >
              🔍 Analyze & Import
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Terminal Log */}
      {logLines.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl overflow-hidden"
          style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
            <span className="ml-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              import-pipeline
            </span>
          </div>

          {/* Log lines */}
          <div className="p-4 font-mono text-sm max-h-96 overflow-y-auto space-y-1">
            <AnimatePresence>
              {logLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3"
                >
                  <span style={{ color: 'var(--text-muted)' }}>{line.time}</span>
                  <span style={{
                    color: line.type === 'success' ? 'var(--positive)'
                      : line.type === 'error' ? 'var(--negative)'
                      : line.type === 'warning' ? 'var(--warning)'
                      : 'var(--text-secondary)',
                  }}>
                    {line.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* How it works */}
      {!isUploading && logLines.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {[
            { step: '1', title: 'Upload', desc: 'Drop your CSV file', icon: '📤' },
            { step: '2', title: 'Detect', desc: '17 anomaly checks', icon: '🔍' },
            { step: '3', title: 'Review', desc: 'Approve each fix', icon: '✏️' },
            { step: '4', title: 'Import', desc: 'Commit to database', icon: '✅' },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass-card p-5 text-center"
            >
              <span className="text-3xl mb-3 block">{s.icon}</span>
              <div className="text-xs font-bold uppercase tracking-wider mb-1"
                style={{ color: 'var(--accent)' }}>
                Step {s.step}
              </div>
              <p className="text-sm font-medium text-white">{s.title}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ═══ Import History Accordion ═══ */}
      {!isUploading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">
              📋 Import History
            </h2>
            {!historyLoading && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {history.length} session{history.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="skeleton w-8 h-8 rounded-lg" />
                      <div>
                        <div className="skeleton h-4 w-40 mb-2" />
                        <div className="skeleton h-3 w-24" />
                      </div>
                    </div>
                    <div className="skeleton h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <span className="text-3xl mb-2 block">📭</span>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No imports yet. Upload a CSV above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((s, i) => {
                const badge = STATUS_BADGES[s.status] || STATUS_BADGES.processing;
                const isExpanded = expandedSession === s.id;

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card overflow-hidden"
                  >
                    {/* Accordion Header */}
                    <button
                      className="w-full p-5 flex items-center justify-between text-left transition-colors"
                      style={{ background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                      onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                          style={{ background: 'rgba(139,92,246,0.1)' }}>
                          📄
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{s.filename}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {new Date(s.uploaded_at).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                            {s.uploaded_by_name && ` · by ${s.uploaded_by_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="badge" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
                          style={{
                            color: 'var(--text-muted)',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s',
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>

                    {/* Accordion Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="px-5 pb-5 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <p className="text-lg font-bold text-white">{s.total_rows}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Rows</p>
                              </div>
                              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(52,211,153,0.05)' }}>
                                <p className="text-lg font-bold" style={{ color: 'var(--positive)' }}>
                                  {s.imported_count ?? '—'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Imported</p>
                              </div>
                              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.05)' }}>
                                <p className="text-lg font-bold" style={{ color: 'var(--warning)' }}>
                                  {s.modified_count ?? '—'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Modified</p>
                              </div>
                              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(251,113,133,0.05)' }}>
                                <p className="text-lg font-bold" style={{ color: 'var(--negative)' }}>
                                  {s.rejected_count ?? '—'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Rejected</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <span>Session: {s.id.slice(0, 8)}...</span>
                              <span>·</span>
                              <span>Status: {s.status}</span>
                            </div>

                            <div className="flex gap-3 mt-4">
                              {s.status === 'review' && (
                                <Link href={`/import/${s.id}/review`}>
                                  <button className="btn-primary text-xs px-4 py-2">
                                    ✏️ Continue Review
                                  </button>
                                </Link>
                              )}
                              {s.status === 'done' && (
                                <>
                                  <Link href={`/import/${s.id}/report`}>
                                    <button className="btn-primary text-xs px-4 py-2">
                                      📊 View Report
                                    </button>
                                  </Link>
                                  <button
                                    className="text-xs px-4 py-2 rounded-xl font-medium transition-all"
                                    style={{
                                      background: 'rgba(16,185,129,0.1)',
                                      border: '1px solid rgba(16,185,129,0.25)',
                                      color: '#34d399',
                                    }}
                                    disabled={switchingId === s.id}
                                    onClick={async () => {
                                      setSwitchingId(s.id);
                                      try {
                                        await fetch('/api/user/active-group', {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ group_id: s.group_id }),
                                        });
                                        router.push('/dashboard');
                                      } finally {
                                        setSwitchingId(null);
                                      }
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}
                                  >
                                    {switchingId === s.id ? 'Switching...' : '🔄 Switch to This Data'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
