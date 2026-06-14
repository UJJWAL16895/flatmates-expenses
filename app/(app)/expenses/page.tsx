'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/header';
import Link from 'next/link';

const SAMPLE_EXPENSES = [
  { id: '1', description: 'April Rent', amount: 48000, currency: 'INR', paid_by: 'Aisha', date: '2026-04-01', split_type: 'shares', split_count: 3, category: '🏠', splits: [
    { name: 'Aisha', amount: 24000 }, { name: 'Rohan', amount: 12000 }, { name: 'Priya', amount: 12000 }
  ]},
  { id: '2', description: 'Goa villa booking', amount: 540, currency: 'USD', paid_by: 'Dev', date: '2026-03-09', split_type: 'equal', split_count: 4, category: '🏖️', splits: [
    { name: 'Aisha', amount: 135 }, { name: 'Rohan', amount: 135 }, { name: 'Priya', amount: 135 }, { name: 'Dev', amount: 135 }
  ]},
  { id: '3', description: 'Groceries DMart', amount: 1990, currency: 'INR', paid_by: 'Sam', date: '2026-04-15', split_type: 'equal', split_count: 4, category: '🛒', splits: [
    { name: 'Aisha', amount: 498 }, { name: 'Rohan', amount: 498 }, { name: 'Priya', amount: 498 }, { name: 'Sam', amount: 496 }
  ]},
  { id: '4', description: 'Furniture for common room', amount: 12000, currency: 'INR', paid_by: 'Aisha', date: '2026-04-18', split_type: 'equal', split_count: 4, category: '🪑', splits: [
    { name: 'Aisha', amount: 3000 }, { name: 'Rohan', amount: 3000 }, { name: 'Priya', amount: 3000 }, { name: 'Sam', amount: 3000 }
  ]},
  { id: '5', description: 'Housewarming drinks', amount: 3100, currency: 'INR', paid_by: 'Sam', date: '2026-04-10', split_type: 'equal', split_count: 4, category: '🍻', splits: [
    { name: 'Aisha', amount: 775 }, { name: 'Rohan', amount: 775 }, { name: 'Priya', amount: 775 }, { name: 'Sam', amount: 775 }
  ]},
  { id: '6', description: 'Electricity Apr', amount: 1380, currency: 'INR', paid_by: 'Aisha', date: '2026-04-12', split_type: 'equal', split_count: 4, category: '⚡', splits: [
    { name: 'Aisha', amount: 345 }, { name: 'Rohan', amount: 345 }, { name: 'Priya', amount: 345 }, { name: 'Sam', amount: 345 }
  ]},
  { id: '7', description: 'Maid salary Apr', amount: 3000, currency: 'INR', paid_by: 'Priya', date: '2026-04-20', split_type: 'equal', split_count: 4, category: '🧹', splits: [
    { name: 'Aisha', amount: 750 }, { name: 'Rohan', amount: 750 }, { name: 'Priya', amount: 750 }, { name: 'Sam', amount: 750 }
  ]},
];

export default function ExpensesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

      <div className="space-y-3">
        {SAMPLE_EXPENSES.map((expense, i) => (
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
                <span className="text-2xl">{expense.category}</span>
                <div>
                  <p className="text-sm font-medium text-white">{expense.description}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}Paid by {expense.paid_by}
                    {' · '}{expense.split_type} split × {expense.split_count}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="text-base font-bold text-white">
                    {expense.currency === 'USD' ? '$' : '₹'}
                    {expense.amount.toLocaleString('en-IN')}
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
                      {expense.splits.map((split) => (
                        <div key={split.name} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{split.name}</p>
                          <p className="text-sm font-semibold text-white">
                            {expense.currency === 'USD' ? '$' : '₹'}{split.amount.toLocaleString('en-IN')}
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
    </div>
  );
}
