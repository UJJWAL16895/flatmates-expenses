'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [seeds, setSeeds] = useState<string[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Helper to generate 12 random avatar seeds
  const generateSeeds = () => {
    const defaultSeeds = ['Aisha', 'Dev', 'Meera', 'Rohan', 'Priya', 'Sam'];
    const randomSeeds = Array.from({ length: 6 }, () => 
      Math.random().toString(36).substring(2, 9)
    );
    const combined = [...defaultSeeds, ...randomSeeds];
    // Shuffle
    const shuffled = combined.sort(() => 0.5 - Math.random());
    setSeeds(shuffled);
    // Auto-select the first one if none selected or if refreshing
    setSelectedSeed(shuffled[0]);
  };

  useEffect(() => {
    generateSeeds();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedSeed}`;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          avatar_url,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(true);
      
      // Auto sign-in
      const { signIn } = await import('next-auth/react');
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.ok) {
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        setTimeout(() => {
          window.location.href = '/login?registered=true';
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12 px-4"
      style={{ background: 'var(--bg-primary)' }}>

      {/* Background floating cards */}
      {[
        { top: '8%', left: '7%', delay: 0, size: 120 },
        { top: '65%', left: '4%', delay: 1, size: 80 },
        { top: '15%', right: '6%', delay: 0.5, size: 100 },
        { top: '75%', right: '10%', delay: 1.5, size: 140 },
        { top: '45%', left: '15%', delay: 2, size: 60 },
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

      {/* Registration Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="glass-card p-8 w-full max-w-xl relative z-10"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
      >
        {/* Logo & Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            F
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Join Flatmates Expense Tracker</p>
          </div>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-3xl mb-4">
              ✓
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Registration Complete!</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Preparing your dashboard and seeding demo data...
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="john@flatmates.app"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Password
                  </label>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="showPassword"
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                    className="rounded border-zinc-700 bg-zinc-800 text-violet-500 focus:ring-violet-500/30"
                  />
                  <label htmlFor="showPassword" className="text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                    Show Passwords
                  </label>
                </div>
              </div>

              {/* Right Column: Avatar Selection */}
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Select Avatar
                  </label>
                  <button
                    type="button"
                    onClick={generateSeeds}
                    className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                  >
                    🔄 Refresh Grid
                  </button>
                </div>

                {/* Grid */}
                <div 
                  className="grid grid-cols-4 gap-2.5 p-3.5 rounded-xl flex-1 overflow-y-auto max-h-[260px] md:max-h-[280px]"
                  style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}
                >
                  {seeds.map((seed) => {
                    const isSelected = selectedSeed === seed;
                    const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                    
                    return (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => setSelectedSeed(seed)}
                        className={`aspect-square rounded-xl p-1 flex items-center justify-center transition-all outline-none relative ${
                          isSelected ? 'scale-105 border-2' : 'border border-transparent hover:bg-white/5'
                        }`}
                        style={{
                          borderColor: isSelected ? 'var(--accent)' : 'transparent',
                          background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                          boxShadow: isSelected ? '0 0 15px rgba(139, 92, 246, 0.25)' : 'none',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Avatar seed ${seed}`}
                          className="w-10 h-10 object-contain rounded-full bg-zinc-800"
                        />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-500 text-white text-[9px] flex items-center justify-center font-bold">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="text-center mt-3 p-2 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                  Selected seed: <span className="font-mono text-zinc-300">{selectedSeed}</span>
                </div>
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

            <div className="pt-2">
              <motion.button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base font-semibold"
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
                    Creating Account...
                  </span>
                ) : (
                  'Register & Login'
                )}
              </motion.button>
            </div>
          </form>
        )}

        {/* Link to login */}
        <div className="mt-6 text-center text-sm" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
