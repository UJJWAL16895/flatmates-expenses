'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md p-10"
      >
        <span className="text-7xl mb-6 block">🔍</span>
        <h1 className="text-4xl font-bold text-white mb-3">404</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          This page doesn&apos;t exist. Maybe the expense was deleted?
        </p>
        <Link href="/dashboard">
          <button className="btn-primary px-8 py-3 text-base">
            ← Back to Dashboard
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
