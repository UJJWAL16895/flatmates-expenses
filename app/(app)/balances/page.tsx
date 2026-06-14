'use client';

import { motion } from 'framer-motion';
import Header from '@/components/layout/header';

const MEMBERS = [
  { name: 'Kabir', color: '#8b5cf6', balance: 18500 },
  { name: 'Ananya', color: '#06b6d4', balance: -9200 },
  { name: 'Vikram', color: '#f59e0b', balance: -5800 },
  { name: 'Zara', color: '#f97316', balance: -3500 },
];

const SETTLEMENTS = [
  { from: 'Ananya', to: 'Kabir', amount: 9200 },
  { from: 'Vikram', to: 'Kabir', amount: 5800 },
  { from: 'Zara', to: 'Kabir', amount: 3500 },
];

export default function BalancesPage() {
  const maxBalance = Math.max(...MEMBERS.map((m) => Math.abs(m.balance)));

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Balances" subtitle="Who owes whom — simplified settlement view" />

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {MEMBERS.map((m, i) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold"
                style={{ background: m.color, color: 'white' }}>
                {m.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{m.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {m.balance >= 0 ? 'is owed' : 'owes'}
                </p>
              </div>
            </div>
            <p className="text-2xl font-bold"
              style={{ color: m.balance >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
              {m.balance >= 0 ? '+' : ''}₹{Math.abs(m.balance).toLocaleString('en-IN')}
            </p>
            {/* Balance bar */}
            <div className="mt-3 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(Math.abs(m.balance) / maxBalance) * 100}%` }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                className="h-1.5 rounded-full"
                style={{ background: m.balance >= 0 ? 'var(--positive)' : 'var(--negative)' }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Settlement Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-2">Minimum Settlements</h2>
        <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)' }}>
          Only {SETTLEMENTS.length} transactions needed to settle all debts
        </p>

        <div className="space-y-4">
          {SETTLEMENTS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              {/* From person */}
              <div className="flex items-center gap-2 min-w-[100px]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--negative)', color: 'white' }}>
                  {s.from[0]}
                </div>
                <span className="text-sm text-white">{s.from}</span>
              </div>

              {/* Arrow animation */}
              <div className="flex-1 flex items-center gap-1">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.7 + i * 0.15, duration: 0.5 }}
                  className="flex-1 h-0.5 rounded-full origin-left"
                  style={{ background: 'linear-gradient(90deg, var(--negative), var(--accent), var(--positive))' }}
                />
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.15 }}
                  style={{ color: 'var(--accent)' }}
                >
                  →
                </motion.span>
              </div>

              {/* To person */}
              <div className="flex items-center gap-2 min-w-[100px]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--positive)', color: 'white' }}>
                  {s.to[0]}
                </div>
                <span className="text-sm text-white">{s.to}</span>
              </div>

              {/* Amount */}
              <div className="ml-auto">
                <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                  ₹{s.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
