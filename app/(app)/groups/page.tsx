'use client';

import { motion } from 'framer-motion';
import Header from '@/components/layout/header';

const MEMBERS = [
  { name: 'Aisha', email: 'aisha@flat.io', role: 'Admin', joined: '2026-01-01', status: 'active', color: '#8b5cf6' },
  { name: 'Rohan', email: 'rohan@flat.io', role: 'Member', joined: '2026-01-01', status: 'active', color: '#06b6d4' },
  { name: 'Priya', email: 'priya@flat.io', role: 'Member', joined: '2026-01-01', status: 'active', color: '#f59e0b' },
  { name: 'Sam', email: 'sam@flat.io', role: 'Member', joined: '2026-02-15', status: 'active', color: '#f97316' },
  { name: 'Dev', email: 'dev@flat.io', role: 'Member', joined: '2026-01-01', left: '2026-03-31', status: 'left', color: '#ef4444' },
  { name: 'Neha', email: 'neha@flat.io', role: 'Member', joined: '2026-01-01', left: '2026-02-28', status: 'left', color: '#ec4899' },
];

export default function GroupsPage() {
  const active = MEMBERS.filter((m) => m.status === 'active');
  const left = MEMBERS.filter((m) => m.status === 'left');

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Groups" subtitle="Manage flatmates and membership" />

      {/* Active Members */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">
            Active Members <span className="badge badge-success ml-2">{active.length}</span>
          </h2>
          <button className="btn-primary text-sm">+ Add Member</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ background: m.color, color: 'white' }}>
                  {m.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{m.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.email}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Joined {new Date(m.joined).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`badge ${m.role === 'Admin' ? 'badge-info' : 'badge-success'}`}>
                  {m.role}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Former Members */}
      {left.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Former Members <span className="badge badge-error ml-2">{left.length}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {left.map((m, i) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="glass-card p-5 flex items-center justify-between"
                style={{ opacity: 0.7 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ background: m.color, color: 'white', filter: 'grayscale(50%)' }}>
                    {m.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{m.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.email}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {new Date(m.joined).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      {' → '}
                      {new Date(m.left!).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className="badge badge-error">Left</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
