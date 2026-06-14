'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/header';
import { useRouter } from 'next/navigation';
import type { Anomaly } from '@/types';

const SEVERITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  error:   { bg: 'rgba(251,113,133,0.12)', color: '#fb7185', label: 'Error' },
  warning: { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', label: 'Warning' },
  info:    { bg: 'rgba(96,165,250,0.12)',   color: '#60a5fa', label: 'Info' },
};

const TYPE_LABELS: Record<string, string> = {
  DUPLICATE_EXACT: '🔁 Exact Duplicate',
  DUPLICATE_CONFLICT: '⚔️ Conflicting Duplicate',
  SETTLEMENT_AS_EXPENSE: '🤝 Settlement as Expense',
  MISSING_PAID_BY: '❓ Missing Payer',
  MISSING_CURRENCY: '💱 Missing Currency',
  AMOUNT_FORMAT_ERROR: '🔢 Amount Format Error',
  AMOUNT_PRECISION_ERROR: '🎯 Precision Error',
  UNKNOWN_PERSON: '👤 Unknown Person',
  PERCENTAGE_SUM_ERROR: '📊 Percentage Sum Error',
  NEGATIVE_AMOUNT: '➖ Negative Amount',
  ZERO_AMOUNT: '0️⃣ Zero Amount',
  AMBIGUOUS_DATE: '📅 Ambiguous Date',
  NONMEMBER_IN_SPLIT: '🚫 Non-member in Split',
  MEMBER_INACTIVE_ON_DATE: '📆 Inactive Member',
  SPLIT_TYPE_MISMATCH: '🔀 Split Type Mismatch',
  MISSING_EXCHANGE_RATE: '💵 Missing Exchange Rate',
  DEPOSIT_AS_EXPENSE: '💳 Deposit as Expense',
};

export default function ReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    fetchAnomalies();
  }, [sessionId]);

  const fetchAnomalies = async () => {
    try {
      const res = await fetch(`/api/import/${sessionId}/anomalies`);
      const data = await res.json();
      if (data.success) {
        setAnomalies(data.data.anomalies);
        setPendingCount(data.data.pending);
      }
    } catch (err) {
      console.error('Failed to fetch anomalies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (anomalyId: string, resolution: string, action?: string) => {
    setResolving(anomalyId);
    try {
      const body: Record<string, unknown> = {
        anomaly_id: anomalyId,
        resolution,
      };
      if (action) {
        body.corrected_data = { action };
      }

      await fetch(`/api/import/${sessionId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Refresh anomalies
      await fetchAnomalies();
    } catch (err) {
      console.error('Failed to resolve:', err);
    } finally {
      setResolving(null);
    }
  };

  const handleCommit = async () => {
    setCommitting(true);
    try {
      const res = await fetch(`/api/import/${sessionId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/import/${sessionId}/report`);
      }
    } catch (err) {
      console.error('Failed to commit:', err);
    } finally {
      setCommitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Header title="Reviewing Import" subtitle="Loading anomalies..." />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card p-6">
              <div className="skeleton h-5 w-48 mb-3" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Group by type
  const grouped: Record<string, Anomaly[]> = {};
  for (const a of anomalies) {
    if (!grouped[a.anomaly_type]) grouped[a.anomaly_type] = [];
    grouped[a.anomaly_type].push(a);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Review Anomalies" subtitle={`${anomalies.length} anomalies found · ${pendingCount} pending`} />

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Resolution Progress
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            {anomalies.length - pendingCount}/{anomalies.length}
          </span>
        </div>
        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-2 rounded-full"
            style={{ background: 'var(--accent)' }}
            initial={{ width: 0 }}
            animate={{ width: `${((anomalies.length - pendingCount) / anomalies.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Commit button when all resolved */}
      {pendingCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-5 rounded-2xl flex items-center justify-between"
          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--positive)' }}>
              ✓ All anomalies resolved
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Ready to commit approved rows to the database
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={handleCommit}
            disabled={committing}
          >
            {committing ? 'Committing...' : '🚀 Commit Import'}
          </button>
        </motion.div>
      )}

      {/* Anomaly Groups */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([type, items], groupIdx) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.05 }}
          >
            {/* Group header */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-base font-semibold text-white">
                {TYPE_LABELS[type] || type}
              </h3>
              <span className="badge badge-warning">{items.length}</span>
            </div>

            {/* Anomaly cards */}
            <div className="space-y-3">
              <AnimatePresence>
                {items.map((anomaly) => {
                  const sev = SEVERITY_STYLES[anomaly.severity] || SEVERITY_STYLES.info;
                  const isPending = anomaly.resolution === 'pending';

                  return (
                    <motion.div
                      key={anomaly.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="glass-card p-5"
                      style={{
                        borderLeft: `3px solid ${sev.color}`,
                        opacity: isPending ? 1 : 0.6,
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="badge" style={{ background: sev.bg, color: sev.color }}>
                              {sev.label}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              Row {anomaly.row_number}
                            </span>
                          </div>
                          <p className="text-sm text-white mb-1">{anomaly.description}</p>
                          {anomaly.suggested_action && (
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              💡 Suggested: {anomaly.suggested_action}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        {isPending ? (
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              className="btn-primary text-xs px-3 py-2"
                              disabled={resolving === anomaly.id}
                              onClick={() => handleResolve(anomaly.id, 'approved',
                                anomaly.anomaly_type === 'SETTLEMENT_AS_EXPENSE' ? 'import_as_settlement'
                                : anomaly.anomaly_type === 'DEPOSIT_AS_EXPENSE' ? 'import_as_settlement'
                                : undefined
                              )}
                            >
                              {resolving === anomaly.id ? '...' : '✓ Accept'}
                            </button>
                            <button
                              className="btn-secondary text-xs px-3 py-2"
                              disabled={resolving === anomaly.id}
                              onClick={() => handleResolve(anomaly.id, 'rejected', 'skip')}
                            >
                              ✗ Skip
                            </button>
                          </div>
                        ) : (
                          <span className="badge badge-success text-xs">
                            {anomaly.resolution === 'approved' ? '✓ Accepted' : '✗ Skipped'}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
