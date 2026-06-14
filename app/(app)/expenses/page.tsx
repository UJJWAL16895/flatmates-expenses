'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/header';
import Link from 'next/link';

const SAMPLE_EXPENSES = [
  { id: '1', description: 'Rent & Maintenance', amount: 55000, currency: 'INR', paid_by: 'Kabir', date: '2026-05-01', split_type: 'shares', split_count: 3, category: '🏠', splits: [
    { name: 'Kabir', amount: 27500 }, { name: 'Ananya', amount: 13750 }, { name: 'Vikram', amount: 13750 }
  ]},
  { id: '2', description: 'Singapore Trip booking', amount: 600, currency: 'USD', paid_by: 'Divya', date: '2026-03-09', split_type: 'equal', split_count: 4, category: '🏖️', splits: [
    { name: 'Kabir', amount: 150 }, { name: 'Ananya', amount: 150 }, { name: 'Vikram', amount: 150 }, { name: 'Divya', amount: 150 }
  ]},
  { id: '3', description: 'Gourmet Groceries', amount: 4500, currency: 'INR', paid_by: 'Zara', date: '2026-05-10', split_type: 'equal', split_count: 4, category: '🛒', splits: [
    { name: 'Kabir', amount: 1125 }, { name: 'Ananya', amount: 1125 }, { name: 'Vikram', amount: 1125 }, { name: 'Zara', amount: 1125 }
  ]},
  { id: '4', description: 'Living Room Smart TV', amount: 24000, currency: 'INR', paid_by: 'Kabir', date: '2026-05-18', split_type: 'equal', split_count: 4, category: '📺', splits: [
    { name: 'Kabir', amount: 6000 }, { name: 'Ananya', amount: 6000 }, { name: 'Vikram', amount: 6000 }, { name: 'Zara', amount: 6000 }
  ]},
  { id: '5', description: 'Weekend House Party', amount: 8500, currency: 'INR', paid_by: 'Zara', date: '2026-05-15', split_type: 'equal', split_count: 4, category: '🍻', splits: [
    { name: 'Kabir', amount: 2125 }, { name: 'Ananya', amount: 2125 }, { name: 'Vikram', amount: 2125 }, { name: 'Zara', amount: 2125 }
  ]},
  { id: '6', description: 'Electricity Bill', amount: 3200, currency: 'INR', paid_by: 'Kabir', date: '2026-05-12', split_type: 'equal', split_count: 4, category: '⚡', splits: [
    { name: 'Kabir', amount: 800 }, { name: 'Ananya', amount: 800 }, { name: 'Vikram', amount: 800 }, { name: 'Zara', amount: 800 }
  ]},
  { id: '7', description: 'Weekly Cleaning Service', amount: 4000, currency: 'INR', paid_by: 'Vikram', date: '2026-05-20', split_type: 'equal', split_count: 4, category: '🧹', splits: [
    { name: 'Kabir', amount: 1000 }, { name: 'Ananya', amount: 1000 }, { name: 'Vikram', amount: 1000 }, { name: 'Zara', amount: 1000 }
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
