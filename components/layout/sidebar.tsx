'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

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

  return (
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
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
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

      {/* User section */}
      <div className="p-4 mx-3 mb-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'var(--accent)', color: 'white' }}>
            U
          </div>
          <div>
            <p className="text-sm font-medium text-white">User</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Flatmate</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
