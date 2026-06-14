'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { useGroupId } from '@/lib/hooks/use-group';

interface ExpenseSplit {
  user_name: string;
  amount_owed_inr: number;
}

interface Expense {
  id: string;
  description: string;
  total_amount: number;
  total_amount_inr: number;
  currency: string;
  paid_by_name: string;
  expense_date: string;
  split_type: string;
  category: string | null;
  splits: ExpenseSplit[];
}

const CATEGORY_ICONS: Record<string, string> = {
  'Housing': '🏠', 'Rent': '🏠', 'Groceries': '🛒', 'Utilities': '⚡',
  'Electricity': '⚡', 'Internet': '📶', 'WiFi': '📶', 'Electronics': '📺',
  'TV': '📺', 'Cleaning': '🧹', 'Entertainment': '🍻', 'Party': '🍻',
  'Travel': '🏖️', 'Trip': '🏖️', 'Food': '🍕', 'Transport': '🚗',
  'Shopping': '🛍️', 'Deposit': '🏦', 'Water': '💧',
};

function getCategoryIcon(category: string | null, description: string): string {
  if (category) {
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
      if (category.toLowerCase().includes(key.toLowerCase())) return icon;
    }
  }
  // Fallback: try matching description
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (description.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '💰';
}

function SkeletonRow() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="skeleton w-10 h-10 rounded-full" />
          <div>
            <div className="skeleton h-4 w-40 mb-2" />
            <div className="skeleton h-3 w-56" />
          </div>
        </div>
        <div className="skeleton h-5 w-20" />
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const { groupId, loading: groupLoading } = useGroupId();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    async function fetchExpenses() {
      try {
        const res = await fetch(`/api/expenses?group_id=${groupId}`);
        const json = await res.json();
        if (!cancelled && json.success) {
          setExpenses(json.data || []);
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchExpenses();
    return () => { cancelled = true; };
  }, [groupId]);

  const isLoading = groupLoading || loading;

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Expenses" subtitle="All shared expenses" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {['All', '🏠 Housing', '🛒 Groceries', '🏖️ Travel'].map((f) => (
            <button key={f} className="btn-secondary text-xs px-3 py-2">{f}</button>
          ))}
        </div>
        <Link href="/expenses/new">
          <button className="btn-primary text-sm">+ Add Expense</button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : expenses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <span className="text-5xl mb-4 block">📋</span>
          <p className="text-lg font-medium text-white mb-2">No expenses yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Import your CSV or add expenses manually to get started
          </p>
          <Link href="/import">
            <button className="btn-primary">Import CSV →</button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense, i) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card overflow-hidden cursor-pointer"
              onClick={() => setExpandedId(expandedId === expense.id ? null : expense.id)}
            >
              {/* Main row */}
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{getCategoryIcon(expense.category, expense.description)}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{expense.description}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}Paid by {expense.paid_by_name || 'Unknown'}
                      {' · '}{expense.split_type} split × {expense.splits?.length || '?'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-base font-bold text-white">
                      {expense.currency === 'USD' ? '$' : '₹'}
                      {Number(expense.total_amount).toLocaleString('en-IN')}
                    </p>
                    {expense.currency === 'USD' && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>USD</p>
                    )}
                  </div>
                  <motion.span
                    animate={{ rotate: expandedId === expense.id ? 180 : 0 }}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ▼
                  </motion.span>
                </div>
              </div>

              {/* Expandable split breakdown */}
              <AnimatePresence>
                {expandedId === expense.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Split Breakdown
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {expense.splits?.map((split) => (
                          <div key={split.user_name} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{split.user_name}</p>
                            <p className="text-sm font-semibold text-white">
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
          ))}
        </div>
      )}
    </div>
  );
}
