'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/header';
import Link from 'next/link';
import type { ImportReport } from '@/types';

export default function ReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const handleGoToDashboard = async () => {
    if (!report?.session?.group_id) {
      window.location.href = '/dashboard';
      return;
    }
    setRedirecting(true);
    try {
      await fetch('/api/user/active-group', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: report.session.group_id }),
      });
    } catch {
      // ignore
    } finally {
      window.location.href = '/dashboard';
    }
  };

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
    const exportData = {
      _meta: {
        generated_at: new Date().toISOString(),
        app: 'Flatmates Expense Tracker',
        version: '1.0.0',
        session_id: sessionId,
        filename: report.session.filename,
      },
      summary: report.summary,
      rows: report.rows.map((row) => ({
        row_number: row.row_number,
        description: row.raw_data?.description || '',
        amount: row.raw_data?.amount || '',
        paid_by: row.raw_data?.paid_by || '',
        date: row.raw_data?.date || '',
        status: row.status,
        action_taken: row.action_taken,
        anomaly_count: row.anomalies.length,
        anomalies: row.anomalies.map((a) => ({
          type: a.anomaly_type,
          severity: a.severity,
          description: a.description,
          resolution: a.resolution,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-report-${sessionId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!report) return;
    const headers = ['Row', 'Description', 'Amount', 'Paid By', 'Date', 'Status', 'Action', 'Anomalies'];
    const csvRows = [headers.join(',')];
    for (const row of report.rows) {
      const desc = (row.raw_data?.description || '').replace(/"/g, '""');
      const anomalyList = row.anomalies.map((a) => a.anomaly_type).join('; ');
      csvRows.push([
        row.row_number,
        `"${desc}"`,
        row.raw_data?.amount || '',
        row.raw_data?.paid_by || '',
        row.raw_data?.date || '',
        row.status,
        row.action_taken,
        `"${anomalyList}"`,
      ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-report-${sessionId.slice(0, 8)}.csv`;
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

      {/* Download Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}
      >
        <div>
          <p className="text-sm font-medium text-white">Download Report</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Export this import report for your records
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadJSON}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.25)',
              color: '#a78bfa',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.18)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download JSON
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.25)',
              color: '#34d399',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </button>
        </div>
      </motion.div>

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
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {report.rows.length} rows
          </span>
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

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex items-center justify-between"
      >
        <Link href="/import">
          <button className="btn-secondary text-sm">← Back to Import</button>
        </Link>
        <button
          onClick={handleGoToDashboard}
          disabled={redirecting}
          className="btn-primary text-sm"
        >
          {redirecting ? 'Redirecting...' : 'Go to Dashboard →'}
        </button>
      </motion.div>
    </div>
  );
}

