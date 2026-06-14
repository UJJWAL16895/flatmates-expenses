'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/header';
import CommitOverlay from '@/components/import/commit-overlay';
import { useRouter } from 'next/navigation';
import type { Anomaly } from '@/types';
import confetti from 'canvas-confetti';

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;
    const duration = 400; // ms
    const stepTime = Math.abs(Math.floor(duration / (end - start || 1)));
    const timer = setInterval(() => {
      if (start < end) {
        start++;
      } else {
        start--;
      }
      setDisplayValue(start);
      if (start === end) {
        clearInterval(timer);
      }
    }, Math.max(stepTime, 20));
    return () => clearInterval(timer);
  }, [value]);
  return <span>{displayValue}</span>;
}

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
  const [bulkResolving, setBulkResolving] = useState<string | null>(null);
  
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const confettiFiredRef = useRef(false);

  useEffect(() => {
    fetchAnomalies();
  }, [sessionId]);

  useEffect(() => {
    if (anomalies.length > 0 && pendingCount === 0 && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#8b5cf6', '#3b82f6', '#10b981', '#fbbf24', '#fb7185', '#06b6d4'],
      });
    } else if (pendingCount > 0) {
      confettiFiredRef.current = false;
    }
  }, [pendingCount, anomalies.length]);

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

  const [showOverlay, setShowOverlay] = useState(false);

  const handleCommit = () => {
    setShowOverlay(true);
  };

  const handleCommitComplete = useCallback(() => {
    setTimeout(() => {
      router.push(`/import/${sessionId}/report`);
    }, 2500);
  }, [router, sessionId]);

  const handleCommitError = useCallback((error: string) => {
    if (error === 'cancelled') {
      setShowOverlay(false);
      setCommitting(false);
    }
  }, []);

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

  const progressPercent = anomalies.length > 0 ? ((anomalies.length - pendingCount) / anomalies.length) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Review Anomalies" subtitle={`${anomalies.length} anomalies found · ${pendingCount} pending`} />

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Resolution Progress
          </span>
          <span className="text-sm font-semibold text-zinc-100 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            <span className="text-violet-400"><AnimatedCounter value={anomalies.length - pendingCount} /></span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400"><AnimatedCounter value={anomalies.length} /></span>
          </span>
        </div>
        <div className="h-3 rounded-full relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
          <motion.div
            className="h-3 rounded-full relative"
            style={{
              background: 'linear-gradient(to right, #8b5cf6, #3b82f6, #10b981)',
              boxShadow: progressPercent > 0 ? '0 0 8px rgba(59, 130, 246, 0.4)' : 'none'
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="absolute inset-0 shimmer-glow" />
          </motion.div>
        </div>
      </div>

      {/* Bulk Action Buttons */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-white">Bulk Actions</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Resolve multiple anomalies at once
              </p>
            </div>
            {bulkResolving && (
              <span className="text-xs animate-pulse" style={{ color: 'var(--accent)' }}>
                Processing...
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.25)',
                color: '#fbbf24',
              }}
              disabled={bulkResolving !== null}
              onClick={async () => {
                setBulkResolving('auto_fix_warnings');
                try {
                  await fetch(`/api/import/${sessionId}/resolve/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'auto_fix_warnings' }),
                  });
                  await fetchAnomalies();
                } finally {
                  setBulkResolving(null);
                }
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; }}
            >
              {bulkResolving === 'auto_fix_warnings' ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>⚡</span>
              )}
              Auto-Fix All Warnings
            </button>

            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'rgba(96,165,250,0.1)',
                border: '1px solid rgba(96,165,250,0.25)',
                color: '#60a5fa',
              }}
              disabled={bulkResolving !== null}
              onClick={async () => {
                setBulkResolving('skip_all_info');
                try {
                  await fetch(`/api/import/${sessionId}/resolve/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'skip_all_info' }),
                  });
                  await fetchAnomalies();
                } finally {
                  setBulkResolving(null);
                }
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.1)'; }}
            >
              {bulkResolving === 'skip_all_info' ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>💨</span>
              )}
              Skip All Info
            </button>

            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'rgba(52,211,153,0.1)',
                border: '1px solid rgba(52,211,153,0.25)',
                color: '#34d399',
              }}
              disabled={bulkResolving !== null}
              onClick={async () => {
                setBulkResolving('apply_recommended');
                try {
                  await fetch(`/api/import/${sessionId}/resolve/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'apply_recommended' }),
                  });
                  await fetchAnomalies();
                } finally {
                  setBulkResolving(null);
                }
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)'; }}
            >
              {bulkResolving === 'apply_recommended' ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>🎯</span>
              )}
              Apply Recommended Fix to All
            </button>
          </div>
        </motion.div>
      )}

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
            🚀 Confirm Import
          </button>
        </motion.div>
      )}

      {/* Commit Overlay */}
      <CommitOverlay
        sessionId={sessionId}
        isOpen={showOverlay}
        onComplete={handleCommitComplete}
        onError={handleCommitError}
      />

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
              <AnimatePresence initial={false}>
                {items.map((anomaly) => {
                  const sev = SEVERITY_STYLES[anomaly.severity] || SEVERITY_STYLES.info;
                  const isPending = anomaly.resolution === 'pending';
                  const isExpanded = !!expandedIds[anomaly.id];
                  
                  const ringColor = anomaly.severity === 'error' ? 'rgba(251,113,133,0.35)'
                                    : anomaly.severity === 'warning' ? 'rgba(251,191,36,0.35)'
                                    : 'rgba(96,165,250,0.35)';

                  return (
                    <motion.div
                      key={anomaly.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{
                        opacity: isPending ? 1 : 0.6,
                        y: 0,
                      }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="glass-card p-5 transition-all duration-300 border-l-[3px]"
                      style={{
                        borderColor: isPending ? sev.color : 'rgba(255, 255, 255, 0.1)',
                        background: isPending ? 'var(--card-bg)' : 'rgba(255, 255, 255, 0.01)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className="flex-1 cursor-pointer select-none"
                          onClick={() => toggleExpand(anomaly.id)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`badge ${isPending ? 'pulse-ring' : ''}`}
                              style={{
                                background: isPending ? sev.bg : 'rgba(255,255,255,0.05)',
                                color: isPending ? sev.color : '#a1a1aa',
                                ['--ring-color' as string]: ringColor
                              }}
                            >
                              {sev.label}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              Row {anomaly.row_number}
                            </span>
                            <span className="text-[10px] ml-auto flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                              {isExpanded ? 'Collapse ▲' : 'Details ▼'}
                            </span>
                          </div>
                          
                          <p className="text-sm text-white font-medium mb-1">{anomaly.description}</p>
                          {anomaly.suggested_action && isPending && (
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              💡 Suggested: {anomaly.suggested_action}
                            </p>
                          )}

                          {/* Detail panel with expansion toggle */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="overflow-hidden mt-3 pt-3 border-t border-white/5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-zinc-300">
                                  {anomaly.raw_data && (
                                    <>
                                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                                        <span className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Date</span>
                                        <span className="font-mono text-zinc-300">{anomaly.raw_data.date || '—'}</span>
                                      </div>
                                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                                        <span className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Description</span>
                                        <span className="truncate block text-zinc-300" title={anomaly.raw_data.description}>{anomaly.raw_data.description || '—'}</span>
                                      </div>
                                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                                        <span className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Paid By</span>
                                        <span className="text-zinc-300">{anomaly.raw_data.paid_by || '—'}</span>
                                      </div>
                                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                                        <span className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Amount</span>
                                        <span className="text-zinc-300 font-semibold">{anomaly.raw_data.currency || 'INR'} {anomaly.raw_data.amount || '0'}</span>
                                      </div>
                                      
                                      {anomaly.raw_data.split_with && (
                                        <div className="col-span-2 sm:col-span-4 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                                          <span className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Split With</span>
                                          <span className="text-zinc-400">{anomaly.raw_data.split_with}</span>
                                        </div>
                                      )}
                                      
                                      {anomaly.raw_data.split_details && (
                                        <div className="col-span-2 sm:col-span-4 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                                          <span className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Split Details</span>
                                          <span className="text-zinc-400 font-mono">{anomaly.raw_data.split_details}</span>
                                        </div>
                                      )}

                                      {anomaly.raw_data.notes && (
                                        <div className="col-span-2 sm:col-span-4 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                                          <span className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Notes</span>
                                          <span className="text-zinc-400 italic">"{anomaly.raw_data.notes}"</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Action buttons / Status Badge */}
                        {isPending ? (
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              className="btn-primary text-xs px-3.5 py-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                              disabled={resolving === anomaly.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolve(anomaly.id, 'approved',
                                  anomaly.anomaly_type === 'SETTLEMENT_AS_EXPENSE' ? 'import_as_settlement'
                                  : anomaly.anomaly_type === 'DEPOSIT_AS_EXPENSE' ? 'import_as_settlement'
                                  : undefined
                                );
                              }}
                            >
                              {resolving === anomaly.id ? '...' : '✓ Accept'}
                            </button>
                            <button
                              className="btn-secondary text-xs px-3.5 py-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                              disabled={resolving === anomaly.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolve(anomaly.id, 'rejected', 'skip');
                              }}
                            >
                              ✗ Skip
                            </button>
                          </div>
                        ) : (
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className={`badge text-xs px-3 py-1.5 rounded-lg font-medium border flex-shrink-0 ${
                              anomaly.resolution === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            }`}
                          >
                            {anomaly.resolution === 'approved' ? '✓ Accepted' : '✗ Skipped'}
                          </motion.span>
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
