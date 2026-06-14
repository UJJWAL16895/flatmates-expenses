'use client';

import React from 'react';

const FLOATING_CARDS_DATA = [
  { label: "Dinner 🍕", amount: "₹2,400", color: "rgba(139, 92, 246, 0.4)", left: "8%", duration: "16s", delay: "-4s", scale: 0.9, opacity: 0.3 },
  { label: "Electricity ⚡", amount: "₹1,800", color: "rgba(251, 191, 36, 0.4)", left: "22%", duration: "22s", delay: "-12s", scale: 0.8, opacity: 0.25 },
  { label: "Trip ✈️", amount: "$540", color: "rgba(56, 189, 248, 0.4)", left: "36%", duration: "18s", delay: "-2s", scale: 1.0, opacity: 0.4 },
  { label: "Groceries 🛒", amount: "₹3,200", color: "rgba(52, 211, 153, 0.4)", left: "50%", duration: "25s", delay: "-18s", scale: 0.75, opacity: 0.2 },
  { label: "Rent 🏠", amount: "₹48,000", color: "rgba(99, 102, 241, 0.4)", left: "64%", duration: "20s", delay: "-8s", scale: 0.95, opacity: 0.35 },
  { label: "Wifi 📶", amount: "₹1,199", color: "rgba(59, 130, 246, 0.4)", left: "78%", duration: "15s", delay: "-5s", scale: 1.05, opacity: 0.45 },
  { label: "Movie 🎬", amount: "₹640", color: "rgba(236, 72, 153, 0.4)", left: "88%", duration: "23s", delay: "-15s", scale: 0.85, opacity: 0.3 },
  { label: "Cab 🚗", amount: "₹1,100", color: "rgba(249, 115, 22, 0.4)", left: "93%", duration: "17s", delay: "-9s", scale: 1.0, opacity: 0.4 },
];

export default function FloatingBackgroundCards() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {FLOATING_CARDS_DATA.map((card, i) => {
        // Hide 4 cards on mobile to prevent performance hit and clutter
        const isMobileHidden = i === 1 || i === 2 || i === 4 || i === 6;
        return (
          <div
            key={i}
            className={`floating-card flex flex-col justify-center px-4 py-2 bg-zinc-900/40 backdrop-blur-[2px] border border-white/5 rounded-xl ${
              isMobileHidden ? 'hidden md:flex' : 'flex'
            }`}
            style={{
              left: card.left,
              animationDuration: card.duration,
              animationDelay: card.delay,
              transform: `scale(${card.scale})`,
              opacity: card.opacity,
              width: '140px',
              height: '80px',
              borderLeft: `3px solid ${card.color}`,
              // Custom property used by CSS keyframes
              ['--float-opacity' as any]: card.opacity,
            }}
          >
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{card.label}</span>
            <span className="text-sm font-bold text-white mt-1">{card.amount}</span>
          </div>
        );
      })}
    </div>
  );
}
