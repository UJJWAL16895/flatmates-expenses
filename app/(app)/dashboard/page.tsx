'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { fadeInUp, staggerContainer, hoverLift, scaleIn } from '@/lib/animations';

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

interface CategoryDetails {
  icon: string;
  bgColor: string;
  textColor: string;
}

// Custom Toast component
function CustomToast({ 
  message, 
  type, 
  onClose 
}: { 
  message: string; 
  type: 'success' | 'error' | 'info'; 
  onClose: () => void; 
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgMap = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    info: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  };

  const iconMap = {
    success: '✅',
    error: '❌',
    info: '💡',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={`fixed bottom-5 right-5 z-50 max-w-sm p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 ${bgMap[type]}`}
    >
      <span className="text-lg">{iconMap[type]}</span>
      <p className="text-xs font-medium flex-grow pr-2">{message}</p>
      <button onClick={onClose} className="text-sm opacity-50 hover:opacity-100 transition-opacity">×</button>
    </motion.div>
  );
}

// Category Detail Helper
function getCategoryDetails(description: string, category: string | null): CategoryDetails {
  const normDesc = (description || '').toLowerCase();
  const normCat = (category || '').toLowerCase();
  
  if (normCat.includes('housing') || normCat.includes('rent') || normDesc.includes('rent')) {
    return { icon: '🏠', bgColor: 'rgba(139, 92, 246, 0.15)', textColor: '#8b5cf6' };
  }
  if (normCat.includes('grocery') || normCat.includes('groceries') || normDesc.includes('grocery') || normDesc.includes('groceries') || normDesc.includes('market') || normDesc.includes('supermarket')) {
    return { icon: '🛒', bgColor: 'rgba(96, 165, 250, 0.15)', textColor: '#60a5fa' };
  }
  if (normCat.includes('utility') || normCat.includes('utilities') || normDesc.includes('electricity') || normDesc.includes('water') || normDesc.includes('power')) {
    return { icon: '⚡', bgColor: 'rgba(251, 191, 36, 0.15)', textColor: '#fbbf24' };
  }
  if (normCat.includes('internet') || normCat.includes('wifi') || normDesc.includes('wifi') || normDesc.includes('broadband') || normDesc.includes('jio') || normDesc.includes('internet')) {
    return { icon: '📶', bgColor: 'rgba(59, 130, 246, 0.15)', textColor: '#3b82f6' };
  }
  if (normCat.includes('cleaning') || normDesc.includes('cleaning') || normDesc.includes('mop') || normDesc.includes('detergent') || normDesc.includes('wipe')) {
    return { icon: '🧹', bgColor: 'rgba(16, 185, 129, 0.15)', textColor: '#10b981' };
  }
  if (normCat.includes('food') || normCat.includes('restaurant') || normDesc.includes('pizza') || normDesc.includes('dominos') || normDesc.includes('food') || normDesc.includes('dinner') || normDesc.includes('lunch') || normDesc.includes('zomato') || normDesc.includes('swiggy')) {
    return { icon: '🍕', bgColor: 'rgba(244, 63, 94, 0.15)', textColor: '#f43f5e' };
  }
  if (normCat.includes('travel') || normDesc.includes('trip') || normDesc.includes('flight') || normDesc.includes('hotel') || normDesc.includes('cab') || normDesc.includes('uber') || normDesc.includes('ola')) {
    return { icon: '🏖️', bgColor: 'rgba(20, 184, 166, 0.15)', textColor: '#14b8a6' };
  }
  if (normCat.includes('entertainment') || normDesc.includes('movie') || normDesc.includes('show') || normDesc.includes('pvr') || normDesc.includes('netflix') || normDesc.includes('tickets') || normDesc.includes('party')) {
    return { icon: '🍻', bgColor: 'rgba(236, 72, 153, 0.15)', textColor: '#ec4899' };
  }
  if (normCat.includes('shopping') || normDesc.includes('shopping') || normDesc.includes('clothes') || normDesc.includes('amazon') || normDesc.includes('myntra')) {
    return { icon: '🛍️', bgColor: 'rgba(217, 70, 239, 0.15)', textColor: '#d946ef' };
  }
  if (normCat.includes('transport') || normDesc.includes('bus') || normDesc.includes('train') || normDesc.includes('fuel') || normDesc.includes('petrol')) {
    return { icon: '🚗', bgColor: 'rgba(107, 114, 128, 0.15)', textColor: '#9ca3af' };
  }
  
  return { icon: '💰', bgColor: 'rgba(139, 92, 246, 0.1)', textColor: '#8b5cf6' };
}

// Sparkline Component
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div className="h-6 flex items-center justify-start text-[10px] text-zinc-500 font-medium">
        Stable trend
      </div>
    );
  }
  const width = 120;
  const height = 24;
  const padding = 2;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
    const y = range === 0 
      ? height / 2 
      : height - ((val - min) / range) * (height - padding * 2) - padding;
    return { x, y };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-70"
      />
    </svg>
  );
}

// Avatar with Hover Tooltip
function AvatarWithTooltip({ 
  name, 
  url, 
  color, 
  balance 
}: { 
  name: string; 
  url: string; 
  color: string; 
  balance: number; 
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div 
      className="relative cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div 
        className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-xs font-bold transition-all relative overflow-hidden animate-avatar-pulse"
        style={{ 
          background: color, 
          color: 'white',
          '--pulse-color': `${color}33` // 20% opacity for shadow
        } as React.CSSProperties}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name} className="w-full h-full object-cover" />
        ) : (
          name[0]?.toUpperCase() || 'U'
        )}
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-zinc-900 border border-white/10 rounded-md text-[10px] text-white whitespace-nowrap z-50 shadow-xl"
          >
            <span className="font-semibold">{name}</span>: {' '}
            <span className={balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {balance >= 0 ? '+' : ''}₹{Math.round(balance).toLocaleString('en-IN')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Trend calculation
function calculateTrend(expenses: DashboardExpense[]) {
  if (expenses.length === 0) return null;
  // Get date of the newest expense
  const newestDate = new Date(expenses[0].expense_date);
  const currentYear = newestDate.getFullYear();
  const currentMonth = newestDate.getMonth(); // 0-indexed

  // Calculate previous month
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let currentSum = 0;
  let prevSum = 0;

  expenses.forEach(e => {
    const d = new Date(e.expense_date);
    const y = d.getFullYear();
    const m = d.getMonth();
    const val = parseFloat(e.total_amount_inr as any) || 0;
    if (y === currentYear && m === currentMonth) {
      currentSum += val;
    } else if (y === prevYear && m === prevMonth) {
      prevSum += val;
    }
  });

  if (prevSum === 0) return null;
  const diff = currentSum - prevSum;
  const percentage = Math.round((diff / prevSum) * 100);
  return {
    percentage: Math.abs(percentage),
    isIncrease: diff >= 0,
  };
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
  const { data: session } = useSession();
  const sessionUserId = (session?.user as any)?.id;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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

  // Lookups for user details from balances list
  const userDetails = new Map(
    data?.balances.map((b) => [
      b.user_name,
      {
        color: b.avatar_color,
        balance: b.net_balance_inr,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(b.user_name)}`
      }
    ]) || []
  );

  const getUserInfo = (name: string) => {
    return userDetails.get(name) || {
      color: '#8b5cf6',
      balance: 0,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    };
  };

  // Computations for sparklines
  const expenseAmounts = data?.recent_expenses
    .map(e => parseFloat(e.total_amount_inr as any))
    .reverse() || [];

  const userShareAmounts = data?.recent_expenses
    .map(e => {
      const mySplit = e.splits?.find(s => s.user_name === 'You' || s.user_name === session?.user?.name);
      return mySplit ? parseFloat(mySplit.amount_owed_inr as any) : 0;
    })
    .reverse() || [];

  const trend = data ? calculateTrend(data.recent_expenses) : null;
  const maxSettlement = data?.settlement_suggestions.length 
    ? Math.max(...data.settlement_suggestions.map(s => s.amount_inr), 1)
    : 1;

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

  const statCards = data ? [
    { 
      label: 'Total Expenses', 
      value: Math.round(data.total_expenses), 
      icon: '💰', 
      gradColor: 'rgba(139, 92, 246, 0.1)', 
      glowColor: 'rgba(139, 92, 246, 0.15)',
      sparklineData: expenseAmounts,
      trendElement: trend ? (
        <span className={trend.isIncrease ? "text-rose-400" : "text-emerald-400"}>
          {trend.isIncrease ? "↑" : "↓"} {trend.percentage}% <span className="text-zinc-500 font-normal">from last month</span>
        </span>
      ) : <span className="text-zinc-500 font-normal">Stable spending</span>
    },
    { 
      label: 'Active Members', 
      value: data.active_members, 
      icon: '👥', 
      prefix: '', 
      gradColor: 'rgba(96, 165, 250, 0.1)', 
      glowColor: 'rgba(96, 165, 250, 0.15)',
      sparklineData: [], // members is static
      trendElement: <span className="text-zinc-500 font-normal">All active flatmates</span>
    },
    { 
      label: 'Your Balance', 
      value: Math.round(data.user_balance), 
      icon: data.user_balance >= 0 ? '📈' : '📉', 
      gradColor: data.user_balance >= 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 113, 133, 0.1)',
      glowColor: data.user_balance >= 0 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 113, 133, 0.15)',
      sparklineData: userShareAmounts,
      trendElement: (
        <span className={data.user_balance >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {data.user_balance >= 0 ? "You are owed money" : "You owe money"}
        </span>
      )
    },
    { 
      label: 'Settlements Due', 
      value: data.settlements_due, 
      icon: '🤝', 
      prefix: '', 
      gradColor: 'rgba(251, 191, 36, 0.1)', 
      glowColor: 'rgba(251, 191, 36, 0.15)',
      sparklineData: [],
      trendElement: <span className="text-zinc-500 font-normal">{data.settlements_due === 0 ? "Everything balanced" : `${data.settlements_due} active suggestions`}</span>
    },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12">
      <Header title="Dashboard" subtitle="Overview of your shared expenses" />

      {/* Custom Toast Overlay */}
      <AnimatePresence>
        {toast && (
          <CustomToast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

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
        <div className="glass-card p-6 mb-8 text-center border border-rose-500/20">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ 
                y: -4, 
                borderColor: 'rgba(255,255,255,0.15)',
                boxShadow: `0 10px 30px -10px ${stat.glowColor}`
              }}
              className="glass-card p-6 transition-all duration-200 border border-white/5 relative overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${stat.gradColor} 0%, rgba(26,29,39,0.7) 100%)`
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  {stat.label}
                </span>
                <span className="text-xl opacity-80">{stat.icon}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                <AnimatedCounter value={stat.value} prefix={stat.prefix ?? '₹'} />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="text-[10px] font-semibold flex items-center gap-1">
                  {stat.trendElement}
                </div>
                {stat.sparklineData.length > 0 && (
                  <Sparkline data={stat.sparklineData} />
                )}
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
          
          {/* Recent Expenses List */}
          <div className="lg:col-span-2 glass-card p-6 border border-white/5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Recent Expenses</h2>
              <Link href="/expenses" className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
                View all →
              </Link>
            </div>
            
            <motion.div 
              variants={staggerContainer(0.06, 0.2)}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              <AnimatePresence>
                {data!.recent_expenses.map((expense, i) => {
                  const catDetails = getCategoryDetails(expense.description, expense.category);
                  const isExpanded = expandedId === expense.id;
                  
                  return (
                    <motion.div
                      key={expense.id}
                      variants={fadeInUp}
                      className="glass-card overflow-hidden transition-all duration-300 border border-white/5 relative group cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                    >
                      {/* Hover Slide-in Action Buttons (1.3) */}
                      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pl-8 pr-4 bg-gradient-to-l from-zinc-900 via-zinc-900/95 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-200 z-10">
                        <button 
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setToast({ message: "Editing is coming soon! To modify expenses, edit your CSV and re-import.", type: 'info' });
                          }}
                          title="Edit Expense"
                        >
                          ✏️
                        </button>
                        <button 
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this expense?")) {
                              try {
                                const res = await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' });
                                const json = await res.json();
                                if (json.success) {
                                  setToast({ message: "Expense deleted successfully", type: 'success' });
                                  fetchDashboard();
                                } else {
                                  setToast({ message: json.error || "Failed to delete expense", type: 'error' });
                                }
                              } catch {
                                setToast({ message: "Failed to delete expense", type: 'error' });
                              }
                            }
                          }}
                          title="Delete Expense"
                        >
                          🗑️
                        </button>
                      </div>

                      {/* Main expense row */}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-transform duration-200 group-hover:scale-105"
                            style={{ backgroundColor: catDetails.bgColor, color: catDetails.textColor }}
                          >
                            {catDetails.icon}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{expense.description}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              Paid by {expense.paid_by_name || 'Unknown'} · Split {expense.splits?.length || '?'} ways
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="text-sm font-bold text-white">
                              {expense.currency === 'USD' ? '$' : '₹'}
                              {Number(expense.total_amount).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </p>
                          </div>
                          <motion.span
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            className="text-zinc-500 text-xs"
                          >
                            ▼
                          </motion.span>
                        </div>
                      </div>

                      {/* Expanded Splits Breakdown (1.3 & Reuse logic) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-white/[0.01]"
                          >
                            <div className="px-4 pb-4 pt-2 border-t border-white/5">
                              <p className="text-[10px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                                Split Breakdown
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {expense.splits?.map((split) => (
                                  <div key={split.user_name} className="p-2.5 rounded-xl border border-white/5 bg-white/[0.01]">
                                    <p className="text-[10px] text-zinc-500 truncate">{split.user_name}</p>
                                    <p className="text-xs font-semibold text-white mt-0.5">
                                      ₹{Number(split.amount_owed_inr).toLocaleString('en-IN')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Settlement Map & Balances */}
          <div className="glass-card p-6 border border-white/5 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Settlement Map</h2>
              
              {data!.settlement_suggestions.length === 0 ? (
                <div className="text-center py-8 bg-white/[0.01] rounded-2xl border border-white/5">
                  <span className="text-4xl block mb-2">🎉</span>
                  <p className="text-sm font-medium text-white">All settled up!</p>
                  <p className="text-xs text-zinc-500 mt-1">No outstanding settlements due.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data!.settlement_suggestions.map((s, i) => {
                    const fromInfo = getUserInfo(s.from_name);
                    const toInfo = getUserInfo(s.to_name);

                    // Compute path color based on amount ratio (1.2)
                    const ratio = s.amount_inr / maxSettlement;
                    let pathColor = '#8b5cf6'; // default Violet
                    if (ratio >= 0.75) {
                      pathColor = '#fb7185'; // Rose
                    } else if (ratio >= 0.50) {
                      pathColor = '#fbbf24'; // Amber
                    } else if (ratio >= 0.25) {
                      pathColor = '#60a5fa'; // Blue
                    }

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className="p-3.5 rounded-xl border border-white/5 relative overflow-hidden transition-all duration-300 group hover:border-white/10"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.04)' }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* Sender Avatar */}
                          <AvatarWithTooltip 
                            name={s.from_name}
                            url={fromInfo.avatar_url}
                            color={fromInfo.color}
                            balance={fromInfo.balance}
                          />

                          {/* Flowing Connector Path (1.2) */}
                          <div className="flex-grow h-6 relative flex items-center">
                            <svg className="w-full h-6 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor={fromInfo.color} stopOpacity={0.6} />
                                  <stop offset="100%" stopColor={toInfo.color} stopOpacity={0.6} />
                                </linearGradient>
                              </defs>
                              <path 
                                d="M 5 12 L 95 12" 
                                fill="none" 
                                stroke={`url(#grad-${i})`} 
                                strokeWidth="2" 
                                className="animate-flow transition-all group-hover:stroke-[3px]"
                                strokeOpacity={0.6}
                                style={{ stroke: pathColor }}
                              />
                              <path 
                                d="M 90 8 L 95 12 L 90 16" 
                                fill="none" 
                                stroke={toInfo.color} 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>

                          {/* Receiver Avatar */}
                          <AvatarWithTooltip 
                            name={s.to_name}
                            url={toInfo.avatar_url}
                            color={toInfo.color}
                            balance={toInfo.balance}
                          />

                          {/* Settlement Amount */}
                          <div className="text-right min-w-[75px]">
                            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Amount</p>
                            <p className="text-xs font-bold text-white mt-0.5">
                              ₹{Math.round(s.amount_inr).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Balance Overview */}
            {data!.balances.length > 0 && (
              <div className="pt-5 border-t border-white/5">
                <h3 className="text-sm font-semibold text-white mb-4">Balances</h3>
                <div className="space-y-3">
                  {data!.balances.map((m, i) => {
                    const info = getUserInfo(m.user_name);
                    return (
                      <motion.div
                        key={m.user_id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.08 }}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-white/5 relative overflow-hidden"
                            style={{ background: m.avatar_color, color: 'white' }}>
                            {info.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={info.avatar_url} alt={m.user_name} className="w-full h-full object-cover" />
                            ) : (
                              m.user_name[0]?.toUpperCase() || 'U'
                            )}
                          </div>
                          <span className="text-sm font-medium text-zinc-200">{m.user_name}</span>
                        </div>
                        <span className="text-sm font-semibold"
                          style={{ color: m.net_balance_inr >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                          {m.net_balance_inr >= 0 ? '+' : ''}₹{Math.abs(Math.round(m.net_balance_inr)).toLocaleString('en-IN')}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
