'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/header';
import type { ImportReport } from '@/types';

export default function ReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/import/${sessionId}/report`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setReport(data.data);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const downloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-report-${sessionId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Header title="Import Report" subtitle="Loading..." />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="glass-card p-6"><div className="skeleton h-20 w-full" /></div>)}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-5xl mx-auto">
        <Header title="Import Report" subtitle="Report not found" />
      </div>
    );
  }

  const { summary } = report;

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Import Report" subtitle={`Session completed · ${report.session.filename}`} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Rows', value: summary.total_rows, color: 'var(--text-primary)', icon: '📋' },
          { label: 'Imported', value: summary.imported, color: 'var(--positive)', icon: '✅' },
          { label: 'Rejected', value: summary.rejected, color: 'var(--negative)', icon: '❌' },
          { label: 'Modified', value: summary.modified, color: 'var(--warning)', icon: '✏️' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5 text-center"
          >
            <span className="text-2xl">{s.icon}</span>
            <p className="text-2xl font-bold mt-2" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Anomalies breakdown */}
      {Object.keys(summary.anomalies_by_type).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 mb-8"
        >
          <h3 className="text-base font-semibold text-white mb-4">Anomalies Detected</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(summary.anomalies_by_type).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {type.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-bold" style={{ color: 'var(--warning)' }}>{count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Per-row log */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Row-by-Row Log</h3>
          <button className="btn-secondary text-xs" onClick={downloadJSON}>
            📥 Download JSON
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {report.rows.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.03 }}
              className="flex items-center gap-4 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <span className="text-xs font-mono w-12 flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}>
                R{row.row_number}
              </span>
              <span className="flex-1 text-white truncate">
                {row.raw_data?.description || '—'}
              </span>
              <span className={`badge text-xs ${
                row.status === 'approved' ? 'badge-success'
                : row.status === 'rejected' ? 'badge-error'
                : 'badge-warning'
              }`}>
                {row.action_taken}
              </span>
              {row.anomalies.length > 0 && (
                <span className="badge badge-warning text-xs">
                  {row.anomalies.length} anomal{row.anomalies.length > 1 ? 'ies' : 'y'}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
