'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function Logo() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.05, rotate: 5 }}
      className="cursor-default flex-shrink-0"
    >
      <svg viewBox="0 0 48 48" className="w-12 h-12 select-none">
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#logoGrad)" />
        <path 
          d="M16 14 H32 M16 14 V34 M16 22 H28" 
          stroke="white" 
          strokeWidth="3.5" 
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="34" cy="32" r="6" fill="white" fillOpacity="0.25" />
        <text 
          x="34" 
          y="35" 
          textAnchor="middle" 
          fill="white" 
          fontSize="9" 
          fontWeight="bold" 
          fontFamily="sans-serif"
        >
          ₹
        </text>
      </svg>
    </motion.div>
  );
}
