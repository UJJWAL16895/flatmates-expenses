'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { data: session } = useSession();
  const [showMenu, setShowMenu] = useState(false);

  const userName = session?.user?.name || 'User';
  const avatarColor = (session?.user as { avatarColor?: string } | undefined)?.avatarColor || 'var(--accent)';

  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,0.03)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: avatarColor, color: 'white' }}>
            {userName[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{userName}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ color: 'var(--text-muted)', transform: showMenu ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div
              className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-50"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div className="p-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <p className="text-xs font-medium text-white">{userName}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {session?.user?.email || ''}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors"
                style={{ color: '#ef4444' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
