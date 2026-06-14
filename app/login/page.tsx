'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FloatingBackgroundCards from '@/components/ui/floating-background-cards';
import Logo from '@/components/ui/logo';

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

      {/* Background floating cards (2.1) */}
      <FloatingBackgroundCards />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="glass-card p-10 w-full max-w-md relative z-10"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
      >
        {/* Logo (2.2) */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Logo />
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="••••••••"
                required
                style={{ width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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

        <div className="mt-6 text-center text-sm">
          <span style={{ color: 'var(--text-muted)' }}>Don&apos;t have an account? </span>
          <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Register
          </Link>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
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
