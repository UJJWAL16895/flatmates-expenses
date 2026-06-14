'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/header';
import { useRouter } from 'next/navigation';

type LogLine = {
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
};

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logLines, setLogLines] = useState<LogLine[]>([]);

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
    formData.append('group_id', 'g0000000-0000-0000-0000-000000000000');

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
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
