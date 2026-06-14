'use client';

import { motion } from 'framer-motion';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ background: '#0f1117', color: 'white', fontFamily: 'Inter, sans-serif' }}>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md p-10"
          >
            <span className="text-6xl mb-6 block">💥</span>
            <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
            <p className="text-sm mb-6" style={{ color: '#a1a1aa' }}>
              {error.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
            >
              Try Again
            </button>
          </motion.div>
        </div>
      </body>
    </html>
  );
}
