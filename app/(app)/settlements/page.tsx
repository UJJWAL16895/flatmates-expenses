'use client';

import { motion } from 'framer-motion';
import Header from '@/components/layout/header';

const SAMPLE_SETTLEMENTS = [
  { id: '1', from: 'Rohan', to: 'Aisha', amount: 5000, date: '2026-02-25', notes: 'Rohan paid Aisha back' },
];

export default function SettlementsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Settlements" subtitle="Payment records between flatmates" />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Settlements are separate from expenses — they reduce balances
        </p>
        <button className="btn-primary text-sm">+ Record Settlement</button>
      </div>

      {SAMPLE_SETTLEMENTS.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <span className="text-5xl mb-4 block">🤝</span>
          <p className="text-lg font-medium text-white mb-2">No settlements yet</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Record a payment when someone pays back what they owe
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {SAMPLE_SETTLEMENTS.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: '#06b6d4', color: 'white' }}>{s.from[0]}</div>
                  <span className="text-sm text-white">{s.from}</span>
                </div>
                <span className="text-lg" style={{ color: 'var(--accent)' }}>→</span>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: '#8b5cf6', color: 'white' }}>{s.to[0]}</div>
                  <span className="text-sm text-white">{s.to}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: 'var(--positive)' }}>
                  ₹{s.amount.toLocaleString('en-IN')}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
