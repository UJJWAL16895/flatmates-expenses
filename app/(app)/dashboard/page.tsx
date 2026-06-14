'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/header';
import Link from 'next/link';

// Sample data matching the CSV flatmates
const SAMPLE_MEMBERS = [
  { name: 'Kabir', color: '#8b5cf6', balance: 18500 },
  { name: 'Ananya', color: '#06b6d4', balance: -9200 },
  { name: 'Vikram', color: '#f59e0b', balance: -5800 },
  { name: 'Zara', color: '#f97316', balance: -3500 },
];

const SAMPLE_EXPENSES = [
  { id: 1, description: 'Rent & Maintenance', amount: 55000, paid_by: 'Kabir', date: '2026-05-01', split: 4, category: '🏠' },
  { id: 2, description: 'Gourmet Groceries', amount: 4500, paid_by: 'Zara', date: '2026-05-10', split: 4, category: '🛒' },
  { id: 3, description: 'Electricity Bill', amount: 3200, paid_by: 'Kabir', date: '2026-05-12', split: 4, category: '⚡' },
  { id: 4, description: 'High-Speed Internet', amount: 1800, paid_by: 'Ananya', date: '2026-05-05', split: 4, category: '📶' },
  { id: 5, description: 'Living Room Smart TV', amount: 24000, paid_by: 'Kabir', date: '2026-05-18', split: 4, category: '📺' },
  { id: 6, description: 'Weekly Cleaning Service', amount: 4000, paid_by: 'Vikram', date: '2026-05-20', split: 4, category: '🧹' },
  { id: 7, description: 'Weekend House Party', amount: 8500, paid_by: 'Zara', date: '2026-05-15', split: 4, category: '🍻' },
];

const SAMPLE_SETTLEMENTS = [
  { from: 'Ananya', to: 'Kabir', amount: 9200 },
  { from: 'Vikram', to: 'Kabir', amount: 5800 },
  { from: 'Zara', to: 'Kabir', amount: 3500 },
];

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

export default function DashboardPage() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const totalExpenses = SAMPLE_EXPENSES.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="Dashboard" subtitle="Overview of your shared expenses" />

      {/* Import CSV Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-4 rounded-2xl flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(124,58,237,0.08))',
          border: '1px solid rgba(139,92,246,0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📥</span>
          <div>
            <p className="text-sm font-medium text-white">Import your expense CSV</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Upload Expenses Export.csv to detect anomalies and import data
            </p>
          </div>
        </div>
        <Link href="/import">
          <button className="btn-primary text-sm">Import CSV →</button>
        </Link>
      </motion.div>

      {/* Stat Cards */}
      {!loaded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Expenses', value: totalExpenses, icon: '💰', color: 'var(--accent)' },
            { label: 'Active Members', value: 4, icon: '👥', prefix: '', color: 'var(--info)' },
            { label: 'Your Balance', value: 18500, icon: '📈', color: 'var(--positive)' },
            { label: 'Settlements Due', value: 3, icon: '🤝', prefix: '', color: 'var(--warning)' },
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
      )}

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
              {SAMPLE_EXPENSES.map((expense, i) => (
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
                    <span className="text-2xl">{expense.category}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{expense.description}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Paid by {expense.paid_by} · Split {expense.split} ways
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      ₹{expense.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
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
          <div className="space-y-4">
            {SAMPLE_SETTLEMENTS.map((s, i) => (
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
                      {s.from[0]}
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
                      {s.to[0]}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {s.from} pays {s.to}
                  </p>
                  <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                    ₹{s.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Balance Overview */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border-color)' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Balances</h3>
            <div className="space-y-3">
              {SAMPLE_MEMBERS.map((m, i) => (
                <motion.div
                  key={m.name}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: m.color, color: 'white' }}>
                      {m.name[0]}
                    </div>
                    <span className="text-sm text-white">{m.name}</span>
                  </div>
                  <span className="text-sm font-semibold"
                    style={{ color: m.balance >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                    {m.balance >= 0 ? '+' : ''}₹{Math.abs(m.balance).toLocaleString('en-IN')}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
