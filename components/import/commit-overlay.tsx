'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommitOverlayProps {
  sessionId: string;
  isOpen: boolean;
  onComplete: (result: CommitResult) => void;
  onError: (error: string) => void;
}

interface CommitResult {
  imported: number;
  rejected: number;
  modified: number;
  settlements_created: number;
}

interface ProgressData {
  step: number;
  total_steps: number;
  message: string;
  status: string;
  rows_done: number;
  rows_total: number;
}

const STEPS = [
  { step: 1, label: 'Validating data' },
  { step: 2, label: 'Creating expenses' },
  { step: 3, label: 'Recording splits' },
  { step: 4, label: 'Processing settlements' },
  { step: 5, label: 'Finalizing' },
];

const ROTATING_MESSAGES = [
  'Crunching the numbers...',
  'Making sure every paisa adds up...',
  'Building your balance map...',
  'Linking expenses to splits...',
  'Recording who owes whom...',
  'Almost there...',
];

type OverlayState = 'committing' | 'success' | 'error';

export default function CommitOverlay({ sessionId, isOpen, onComplete, onError }: CommitOverlayProps) {
  const [state, setState] = useState<OverlayState>('committing');
  const [progress, setProgress] = useState<ProgressData>({
    step: 0, total_steps: 5, message: 'Starting...', status: 'processing',
    rows_done: 0, rows_total: 0,
  });
  const [result, setResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string>('');
  const [rotatingMsg, setRotatingMsg] = useState(0);
  const [startTime] = useState(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<string>('Calculating...');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Block ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Rotating messages
  useEffect(() => {
    if (!isOpen || state !== 'committing') return;
    msgRef.current = setInterval(() => {
      setRotatingMsg((prev) => (prev + 1) % ROTATING_MESSAGES.length);
    }, 3000);
    return () => { if (msgRef.current) clearInterval(msgRef.current); };
  }, [isOpen, state]);

  // Time estimation
  useEffect(() => {
    if (state !== 'committing') return;
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = progress.rows_total > 0
        ? progress.rows_done / progress.rows_total
        : progress.step / progress.total_steps;

      if (pct > 0.05) {
        const totalEstimated = elapsed / pct;
        const remaining = Math.max(0, totalEstimated - elapsed);
        if (remaining < 5) setTimeRemaining('Almost done...');
        else if (remaining < 60) setTimeRemaining(`~${Math.ceil(remaining)} seconds`);
        else setTimeRemaining(`~${Math.ceil(remaining / 60)} minutes`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [state, progress, startTime]);

  // Poll progress
  const pollProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/import/${sessionId}/progress`);
      const json = await res.json();
      if (json.success) {
        setProgress(json.data);
      }
    } catch {
      // ignore polling errors
    }
  }, [sessionId]);

  // Start commit + polling
  useEffect(() => {
    if (!isOpen || hasStartedRef.current) return;
    hasStartedRef.current = true;

    // Start polling every 500ms
    pollRef.current = setInterval(pollProgress, 500);

    // Fire the commit
    (async () => {
      try {
        const res = await fetch(`/api/import/${sessionId}/commit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();

        // Stop polling
        if (pollRef.current) clearInterval(pollRef.current);

        if (data.success) {
          setProgress((prev) => ({ ...prev, step: 5, message: 'Complete' }));
          setResult(data.data);
          setState('success');
          onComplete(data.data);
        } else {
          setError(data.error || 'Import failed');
          setState('error');
          onError(data.error || 'Import failed');
        }
      } catch (err) {
        if (pollRef.current) clearInterval(pollRef.current);
        const msg = (err as Error).message || 'Network error';
        setError(msg);
        setState('error');
        onError(msg);
      }
    })();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, sessionId, pollProgress, onComplete, onError]);

  if (!isOpen) return null;

  const progressPercent = Math.round(
    (progress.step / progress.total_steps) * 100
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.82)' }} />

        {/* Center Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-md mx-4 p-8 rounded-2xl"
          style={{
            background: 'rgba(24,24,27,0.97)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* ═══ COMMITTING STATE ═══ */}
          {state === 'committing' && (
            <>
              {/* Spinner */}
              <div className="flex justify-center mb-6">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 animate-spin" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)"
                      strokeWidth="4" />
                    <circle cx="32" cy="32" r="28" fill="none"
                      stroke="url(#spinner-gradient)" strokeWidth="4"
                      strokeLinecap="round" strokeDasharray="120 60"
                    />
                    <defs>
                      <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-white text-center mb-1">
                IMPORTING YOUR DATA
              </h2>
              <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
                Please don&apos;t close this tab
              </p>

              {/* Step List */}
              <div className="rounded-xl p-4 mb-6" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div className="space-y-3">
                  {STEPS.map((s) => {
                    const isPending = progress.step < s.step;
                    const isActive = progress.step === s.step;
                    const isDone = progress.step > s.step;

                    return (
                      <div key={s.step} className="flex items-center justify-between">
                        <span className="text-sm" style={{
                          color: isDone ? '#34d399'
                            : isActive ? '#a78bfa'
                            : 'rgba(255,255,255,0.3)',
                        }}>
                          Step {s.step}: {s.label}
                        </span>
                        <span>
                          {isDone && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-sm"
                              style={{ color: '#34d399' }}
                            >
                              ✓
                            </motion.span>
                          )}
                          {isActive && (
                            <span className="text-sm animate-pulse" style={{ color: '#a78bfa' }}>
                              ⏳
                            </span>
                          )}
                          {isPending && (
                            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
                              ⋯
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    Progress
                  </span>
                  <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(to right, #8b5cf6, #34d399)',
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {progress.rows_total > 0
                    ? `Processed: ${progress.rows_done} of ${progress.rows_total} rows`
                    : `Step ${progress.step} of ${progress.total_steps}`}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {timeRemaining}
                </span>
              </div>

              {/* Rotating Message */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={rotatingMsg}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs text-center italic"
                  style={{ color: 'rgba(167,139,250,0.6)' }}
                >
                  {ROTATING_MESSAGES[rotatingMsg]}
                </motion.p>
              </AnimatePresence>
            </>
          )}

          {/* ═══ SUCCESS STATE ═══ */}
          {state === 'success' && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              {/* Animated Checkmark */}
              <div className="flex justify-center mb-5">
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(52,211,153,0.1)' }}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                    <motion.path
                      d="M5 13l4 4L19 7"
                      stroke="#34d399"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                    />
                  </svg>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-2">
                Import Complete!
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {result.imported} expense{result.imported !== 1 ? 's' : ''} created
                {result.settlements_created > 0 && `, ${result.settlements_created} settlement${result.settlements_created !== 1 ? 's' : ''} recorded`}
              </p>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(52,211,153,0.06)' }}>
                  <p className="text-lg font-bold" style={{ color: '#34d399' }}>{result.imported}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Imported</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)' }}>
                  <p className="text-lg font-bold" style={{ color: '#fbbf24' }}>{result.modified}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Modified</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'rgba(251,113,133,0.06)' }}>
                  <p className="text-lg font-bold" style={{ color: '#fb7185' }}>{result.rejected}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Rejected</p>
                </div>
              </div>

              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                Redirecting to report...
              </p>
            </motion.div>
          )}

          {/* ═══ ERROR STATE ═══ */}
          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              {/* Red X */}
              <div className="flex justify-center mb-5">
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(251,113,133,0.1)' }}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                    <motion.path
                      d="M18 6L6 18"
                      stroke="#fb7185"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                    <motion.path
                      d="M6 6l12 12"
                      stroke="#fb7185"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    />
                  </svg>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-2">
                Import Failed
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {error}
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setState('committing');
                    hasStartedRef.current = false;
                    setProgress({ step: 0, total_steps: 5, message: 'Starting...', status: 'processing', rows_done: 0, rows_total: 0 });
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(139,92,246,0.12)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: '#a78bfa',
                  }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => onError('cancelled')}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Cancel Import
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
