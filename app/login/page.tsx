'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { signIn } = await import('next-auth/react');
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        window.location.href = '/dashboard';
      } else {
        setError('Invalid email or password');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}>

      {/* Background floating cards */}
      {[
        { top: '10%', left: '10%', delay: 0, size: 120 },
        { top: '60%', left: '5%', delay: 1, size: 80 },
        { top: '20%', right: '8%', delay: 0.5, size: 100 },
        { top: '70%', right: '12%', delay: 1.5, size: 140 },
        { top: '40%', left: '20%', delay: 2, size: 60 },
      ].map((card, i) => (
        <motion.div
          key={i}
          className="absolute rounded-2xl float-card opacity-[0.04]"
          style={{
            top: card.top,
            left: card.left,
            right: (card as Record<string, unknown>).right as string | undefined,
            width: card.size,
            height: card.size,
            background: 'linear-gradient(135deg, var(--accent), #06b6d4)',
            animationDelay: `${card.delay}s`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.04 }}
          transition={{ delay: card.delay * 0.3 }}
        />
      ))}

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="glass-card p-10 w-full max-w-md relative z-10"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            F
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Flatmates</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Expense Tracker</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="aisha@flatmates.app"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg text-sm"
              style={{ background: 'rgba(251,113,133,0.1)', color: 'var(--negative)', border: '1px solid rgba(251,113,133,0.2)' }}
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        {/* Demo accounts */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
          <p className="text-xs text-center mb-3" style={{ color: 'var(--text-muted)' }}>
            Demo accounts (click to log in)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {['aisha@flatmates.app', 'rohan@flatmates.app', 'priya@flatmates.app', 'sam@flatmates.app'].map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { setEmail(e); setPassword('password123'); }}
                className="text-xs p-2 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}
              >
                {e.split('@')[0]}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
