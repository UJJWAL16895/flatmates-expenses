'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { useGroupId } from '@/lib/hooks/use-group';

interface UserBalance {
  user_id: string;
  user_name: string;
  avatar_color: string;
  net_balance_inr: number;
}

interface Settlement {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount_inr: number;
}

export default function BalancesPage() {
  const { groupId, loading: groupLoading } = useGroupId();
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    async function fetchBalances() {
      try {
        const res = await fetch(`/api/balances/${groupId}`);
        const json = await res.json();
        if (!cancelled && json.success) {
          setBalances(json.data.balances || []);
          setSettlements(json.data.suggestions || []);
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBalances();
    return () => { cancelled = true; };
  }, [groupId]);

  const isLoading = groupLoading || loading;
  const maxBalance = balances.length > 0
    ? Math.max(...balances.map((m) => Math.abs(m.net_balance_inr)))
    : 1;

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Balances" subtitle="Who owes whom — simplified settlement view" />

      {isLoading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="skeleton w-10 h-10 rounded-full" />
                  <div>
                    <div className="skeleton h-4 w-20 mb-1" />
                    <div className="skeleton h-3 w-12" />
                  </div>
                </div>
                <div className="skeleton h-7 w-24" />
              </div>
            ))}
          </div>
          <div className="glass-card p-6">
            <div className="skeleton h-6 w-48 mb-4" />
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-16 w-full mb-3 rounded-xl" />
            ))}
          </div>
        </>
      ) : balances.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <span className="text-5xl mb-4 block">⚖️</span>
          <p className="text-lg font-medium text-white mb-2">No balance data yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Import expenses to calculate who owes whom
          </p>
          <Link href="/import">
            <button className="btn-primary">Import CSV →</button>
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {balances.map((m, i) => (
              <motion.div
                key={m.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold"
                    style={{ background: m.avatar_color, color: 'white' }}>
                    {m.user_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{m.user_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {m.net_balance_inr >= 0 ? 'is owed' : 'owes'}
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold"
                  style={{ color: m.net_balance_inr >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                  {m.net_balance_inr >= 0 ? '+' : ''}₹{Math.abs(Math.round(m.net_balance_inr)).toLocaleString('en-IN')}
                </p>
                {/* Balance bar */}
                <div className="mt-3 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(Math.abs(m.net_balance_inr) / maxBalance) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                    className="h-1.5 rounded-full"
                    style={{ background: m.net_balance_inr >= 0 ? 'var(--positive)' : 'var(--negative)' }}
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
              {settlements.length === 0
                ? 'Everyone is settled up! 🎉'
                : `Only ${settlements.length} transaction${settlements.length !== 1 ? 's' : ''} needed to settle all debts`
              }
            </p>

            {settlements.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-4xl block mb-2">✅</span>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>All balanced!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {settlements.map((s, i) => (
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
                        {s.from_name[0]}
                      </div>
                      <span className="text-sm text-white">{s.from_name}</span>
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
                        {s.to_name[0]}
                      </div>
                      <span className="text-sm text-white">{s.to_name}</span>
                    </div>

                    {/* Amount */}
                    <div className="ml-auto">
                      <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                        ₹{Math.round(s.amount_inr).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
