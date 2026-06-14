'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/header';
import { useGroupId } from '@/lib/hooks/use-group';

interface Member {
  user_id: string;
  user_name: string;
  user_email: string;
  avatar_color: string;
  joined_at: string;
  left_at: string | null;
}

export default function GroupsPage() {
  const { groupId, loading: groupLoading } = useGroupId();
  const [members, setMembers] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    async function fetchGroup() {
      try {
        const res = await fetch(`/api/groups/${groupId}`);
        const json = await res.json();
        if (!cancelled && json.success) {
          setGroupName(json.data.name || 'Flatmates');
          setMembers(json.data.members || []);
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGroup();
    return () => { cancelled = true; };
  }, [groupId]);

  const isLoading = groupLoading || loading;
  const active = members.filter((m) => !m.left_at);
  const left = members.filter((m) => m.left_at);

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Groups" subtitle={`Manage flatmates and membership${groupName ? ` — ${groupName}` : ''}`} />

      {isLoading ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-9 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card p-5 flex items-center gap-4">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div>
                  <div className="skeleton h-4 w-24 mb-2" />
                  <div className="skeleton h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : members.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <span className="text-5xl mb-4 block">👥</span>
          <p className="text-lg font-medium text-white mb-2">No members found</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Add members to your group to start tracking shared expenses
          </p>
        </motion.div>
      ) : (
        <>
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
                  key={m.user_id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ background: m.avatar_color || '#8b5cf6', color: 'white' }}>
                      {m.user_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{m.user_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.user_email}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Joined {new Date(m.joined_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${i === 0 ? 'badge-info' : 'badge-success'}`}>
                      {i === 0 ? 'Admin' : 'Member'}
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
                    key={m.user_id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="glass-card p-5 flex items-center justify-between"
                    style={{ opacity: 0.7 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ background: m.avatar_color || '#666', color: 'white', filter: 'grayscale(50%)' }}>
                        {m.user_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{m.user_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.user_email}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {new Date(m.joined_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          {' → '}
                          {new Date(m.left_at!).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-error">Left</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
