'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { useGroupId } from '@/lib/hooks/use-group';
import NetworkGraph from '@/components/settlements/network-graph';

interface Settlement {
  id: string;
  paid_by_name: string;
  paid_to_name: string;
  amount_inr: number;
  settled_at: string;
  notes: string | null;
}

export default function SettlementsPage() {
  const { groupId, loading: groupLoading } = useGroupId();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    async function fetchSettlements() {
      try {
        const res = await fetch(`/api/settlements?group_id=${groupId}`);
        const json = await res.json();
        if (!cancelled && json.success) {
          setSettlements(json.data || []);
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSettlements();
    return () => { cancelled = true; };
  }, [groupId]);

  const isLoading = groupLoading || loading;

  const filteredSettlements = selectedPerson
    ? settlements.filter(s => s.paid_by_name === selectedPerson || s.paid_to_name === selectedPerson)
    : settlements;

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Settlements" subtitle="Payment records between flatmates" />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Settlements are separate from expenses — they reduce balances
        </p>
        <button className="btn-primary text-sm">+ Record Settlement</button>
      </div>

      {/* Network Graph (5.2) */}
      {!isLoading && settlements.length > 0 && (
        <NetworkGraph 
          settlements={settlements} 
          selectedPerson={selectedPerson}
          onSelectPerson={setSelectedPerson}
        />
      )}

      {selectedPerson && (
        <div className="flex items-center justify-between mb-4 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
          <span className="text-sm text-zinc-300">
            Showing only settlements involving <span className="font-semibold text-white">{selectedPerson}</span>
          </span>
          <button 
            onClick={() => setSelectedPerson(null)}
            className="text-xs text-violet-400 hover:text-white transition-colors cursor-pointer font-medium"
          >
            Clear Filter ✕
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="skeleton w-9 h-9 rounded-full" />
                <div className="skeleton h-4 w-16" />
                <div className="skeleton w-6 h-4" />
                <div className="skeleton w-9 h-9 rounded-full" />
                <div className="skeleton h-4 w-16" />
              </div>
              <div>
                <div className="skeleton h-5 w-20 mb-1" />
                <div className="skeleton h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : settlements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <span className="text-5xl mb-4 block">🤝</span>
          <p className="text-lg font-medium text-white mb-2">No settlements yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Record a payment when someone pays back what they owe, or import settlements from your CSV
          </p>
          <Link href="/import">
            <button className="btn-primary">Import CSV →</button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredSettlements.map((s, i) => (
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
                    style={{ background: '#06b6d4', color: 'white' }}>{s.paid_by_name?.[0] || '?'}</div>
                  <span className="text-sm text-white">{s.paid_by_name}</span>
                </div>
                <span className="text-lg" style={{ color: 'var(--accent)' }}>→</span>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: '#8b5cf6', color: 'white' }}>{s.paid_to_name?.[0] || '?'}</div>
                  <span className="text-sm text-white">{s.paid_to_name}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: 'var(--positive)' }}>
                  ₹{Number(s.amount_inr).toLocaleString('en-IN')}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(s.settled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
