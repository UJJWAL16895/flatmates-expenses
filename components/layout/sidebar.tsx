'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/expenses', label: 'Expenses', icon: '💰' },
  { href: '/balances', label: 'Balances', icon: '⚖️' },
  { href: '/settlements', label: 'Settlements', icon: '🤝' },
  { href: '/groups', label: 'Groups', icon: '👥' },
  { href: '/import', label: 'Import CSV', icon: '📥' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  const avatarColor = (session?.user as { avatarColor?: string } | undefined)?.avatarColor || 'var(--accent)';
  const avatarUrl = (session?.user as { avatarUrl?: string } | undefined)?.avatarUrl;
  const userInitial = userName[0]?.toUpperCase() || 'U';

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col"
        style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)' }}>

        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            F
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Flatmates</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Expense Tracker</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item, i) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, ease: 'easeOut', duration: 0.3 }}
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer relative ${
                    isActive ? 'text-white' : ''
                  }`}
                  style={{
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User section with logout */}
        <div className="p-4 mx-3 mb-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="User avatar"
                  className="w-9 h-9 rounded-full object-cover bg-zinc-800"
                />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: avatarColor, color: 'white' }}>
                  {userInitial}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>
                  {userEmail || 'Flatmate'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              title="Sign out"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-card p-8 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <span className="text-3xl">👋</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Sign out?</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  You&apos;ll need to sign in again to access your expenses.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="btn-secondary flex-1 py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 rounded-xl font-medium text-sm transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(239,68,68,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
