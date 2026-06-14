'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/header';
import Link from 'next/link';

interface DashboardExpense {
  id: string;
  description: string;
  total_amount_inr: number;
  total_amount: number;
  currency: string;
  paid_by_name: string;
  expense_date: string;
  split_type: string;
  category: string | null;
  splits: Array<{ user_name: string; amount_owed_inr: number }>;
}

interface DashboardBalance {
  user_id: string;
  user_name: string;
  avatar_color: string;
  net_balance_inr: number;
}

interface DashboardSuggestion {
  from_name: string;
  to_name: string;
  amount_inr: number;
}

interface DashboardData {
  total_expenses: number;
  active_members: number;
  user_balance: number;
  settlements_due: number;
  recent_expenses: DashboardExpense[];
  settlement_suggestions: DashboardSuggestion[];
  balances: DashboardBalance[];
  has_completed_import: boolean;
  last_import_at: string | null;
  import_filename: string | null;
  import_row_count: number | null;
  is_sample: boolean;
  group_name: string | null;
  group_id: string | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Housing': '🏠', 'Groceries': '🛒', 'Utilities': '⚡', 'Internet': '📶',
  'Electronics': '📺', 'Cleaning': '🧹', 'Entertainment': '🍻', 'Travel': '🏖️',
  'Food': '🍕', 'Transport': '🚗', 'Shopping': '🛍️',
};

function getCategoryIcon(category: string | null): string {
  if (!category) return '💰';
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '💰';
}

function AnimatedCounter({ value, prefix = '₹', duration = 1500 }: { value: number; prefix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  return (
    <span>{prefix}{display.toLocaleString('en-IN')}</span>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-6">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-32 mb-2" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-12 text-center col-span-full"
    >
      <span className="text-5xl mb-4 block">📊</span>
      <p className="text-lg font-medium text-white mb-2">No expense data yet</p>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Import your CSV file to see expenses, balances, and settlements here
      </p>
      <Link href="/import">
        <button className="btn-primary">Import CSV →</button>
      </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load dashboard');
      }
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const hasData = data && (data.recent_expenses.length > 0 || data.balances.length > 0);

  // Data source: 'live' = has completed import and NOT sample group, 'sample' = is_sample group, 'empty' = no data
  const dataSource: 'live' | 'sample' | 'empty' = data?.is_sample
    ? 'sample'
    : data?.has_completed_import
      ? 'live'
      : hasData
        ? 'sample'
        : 'empty';

  const switchGroup = async (targetGroupId: string) => {
    setSwitching(true);
    try {
      await fetch('/api/user/active-group', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: targetGroupId }),
      });
      setLoading(true);
      await fetchDashboard();
    } finally {
      setSwitching(false);
    }
  };

  const switchToSample = async () => {
    try {
      const res = await fetch('/api/groups');
      const json = await res.json();
      if (json.success) {
        const sampleGroup = json.data.find((g: { is_sample: boolean }) => g.is_sample);
        if (sampleGroup) {
          await switchGroup(sampleGroup.id);
        }
      }
    } catch {
      // silently handle
    }
  };

  const bannerConfig = {
    live: {
      bg: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))',
      border: '1px solid rgba(16,185,129,0.3)',
      icon: '✅',
      title: `Live Data — ${data?.import_filename || 'CSV Imported'}`,
      subtitle: data?.last_import_at
        ? `Imported ${new Date(data.last_import_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}${data.import_row_count ? ` • ${data.import_row_count} rows` : ''}`
        : 'Showing real data from your imported CSV',
      dotColor: '#10b981',
    },
    sample: {
      bg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))',
      border: '1px solid rgba(245,158,11,0.3)',
      icon: '🧪',
      title: 'Sample Data — Demo Mode',
      subtitle: 'This is example data to help you explore the app. Import your CSV to see your real expenses.',
      dotColor: '#f59e0b',
    },
    empty: {
      bg: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(124,58,237,0.08))',
      border: '1px solid rgba(139,92,246,0.2)',
      icon: '📥',
      title: 'Import your expense CSV',
      subtitle: 'Upload Expenses Export.csv to detect anomalies and import data',
      dotColor: '#8b5cf6',
    },
  };

  const banner = bannerConfig[dataSource];

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="Dashboard" subtitle="Overview of your shared expenses" />

      {/* Data Source Banner */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-2xl flex items-center justify-between"
          style={{ background: banner.bg, border: banner.border }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{banner.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{banner.title}</p>
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse"
                  style={{ background: banner.dotColor }}
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {banner.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {dataSource === 'live' && (
              <button
                className="text-xs px-3 py-2 rounded-xl transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)',
                }}
                onClick={switchToSample}
                disabled={switching}
              >
                {switching ? '...' : 'Switch to Sample'}
              </button>
            )}
            {dataSource === 'live' && (
              <Link href="/import">
                <button className="text-xs px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-secondary)',
                  }}>
                  Import History
                </button>
              </Link>
            )}
            <Link href="/import">
              <button className="btn-primary text-sm">
                {dataSource === 'sample' ? 'Import Your Data →' : dataSource === 'live' ? 'View Report' : 'Import CSV →'}
              </button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass-card p-6 mb-8 text-center">
          <p className="text-sm" style={{ color: 'var(--negative)' }}>{error}</p>
        </div>
      )}

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Expenses', value: Math.round(data.total_expenses), icon: '💰', color: 'var(--accent)' },
            { label: 'Active Members', value: data.active_members, icon: '👥', prefix: '', color: 'var(--info)' },
            { label: 'Your Balance', value: Math.round(data.user_balance), icon: data.user_balance >= 0 ? '📈' : '📉', color: data.user_balance >= 0 ? 'var(--positive)' : 'var(--negative)' },
            { label: 'Settlements Due', value: data.settlements_due, icon: '🤝', prefix: '', color: 'var(--warning)' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 glow-accent"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {stat.label}
                </span>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: stat.color }}>
                <AnimatedCounter value={stat.value} prefix={stat.prefix ?? '₹'} />
              </div>
            </motion.div>
          ))}
        </div>
      ) : null}

      {/* Main Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6">
            <div className="skeleton h-6 w-40 mb-4" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 w-full mb-3 rounded-xl" />
            ))}
          </div>
          <div className="glass-card p-6">
            <div className="skeleton h-6 w-32 mb-4" />
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-20 w-full mb-3 rounded-xl" />
            ))}
          </div>
        </div>
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Expenses */}
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Recent Expenses</h2>
              <Link href="/expenses" className="text-sm" style={{ color: 'var(--accent)' }}>
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {data!.recent_expenses.map((expense, i) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex items-center justify-between p-4 rounded-xl transition-colors cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getCategoryIcon(expense.category)}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{expense.description}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Paid by {expense.paid_by_name || 'Unknown'} · Split {expense.splits?.length || '?'} ways
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {expense.currency === 'USD' ? '$' : '₹'}
                        {Number(expense.total_amount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Settlement Suggestions */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-5">Settlement Map</h2>
            {data!.settlement_suggestions.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl block mb-3">✅</span>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>All settled up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data!.settlement_suggestions.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.15 }}
                    className="p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'var(--negative)', color: 'white' }}>
                          {s.from_name[0]}
                        </div>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: 32 }}
                          transition={{ delay: 0.8 + i * 0.15, duration: 0.4 }}
                          className="h-0.5 rounded-full"
                          style={{ background: 'var(--accent)' }}
                        />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: 32 }}
                          transition={{ delay: 1 + i * 0.15, duration: 0.4 }}
                          className="h-0.5 rounded-full"
                          style={{ background: 'var(--positive)' }}
                        />
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'var(--positive)', color: 'white' }}>
                          {s.to_name[0]}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {s.from_name} pays {s.to_name}
                      </p>
                      <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                        ₹{Math.round(s.amount_inr).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Balance Overview */}
            {data!.balances.length > 0 && (
              <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border-color)' }}>
                <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Balances</h3>
                <div className="space-y-3">
                  {data!.balances.map((m, i) => (
                    <motion.div
                      key={m.user_id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + i * 0.1 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: m.avatar_color, color: 'white' }}>
                          {m.user_name[0]}
                        </div>
                        <span className="text-sm text-white">{m.user_name}</span>
                      </div>
                      <span className="text-sm font-semibold"
                        style={{ color: m.net_balance_inr >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                        {m.net_balance_inr >= 0 ? '+' : ''}₹{Math.abs(Math.round(m.net_balance_inr)).toLocaleString('en-IN')}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
