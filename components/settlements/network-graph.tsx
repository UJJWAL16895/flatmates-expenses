'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Settlement {
  id: string;
  paid_by_name: string;
  paid_to_name: string;
  amount_inr: number;
  settled_at: string;
  notes: string | null;
}

interface NetworkGraphProps {
  settlements: Settlement[];
  selectedPerson: string | null;
  onSelectPerson: (name: string | null) => void;
}

export default function NetworkGraph({
  settlements,
  selectedPerson,
  onSelectPerson,
}: NetworkGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Extract unique names
  const uniqueNames = Array.from(
    new Set(settlements.flatMap((s) => [s.paid_by_name, s.paid_to_name]))
  ).filter(Boolean);

  const names = uniqueNames.length > 0 ? uniqueNames : ['Aisha', 'Rohan', 'Priya', 'Sam'];

  // Dimensions
  const width = 600;
  const height = 300;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 95; // Radius of circular layout

  // Map names to angles & coordinates
  const nodes = names.map((name, i) => {
    const angle = (2 * Math.PI * i) / names.length - Math.PI / 2;
    return {
      name,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      color: ['#8b5cf6', '#3b82f6', '#10b981', '#fbbf24', '#fb7185', '#06b6d4'][i % 6],
    };
  });

  const nodeMap = new Map(nodes.map((n) => [n.name, n]));

  // Aggregate links
  const linksMap: Record<string, { amount: number; count: number }> = {};
  settlements.forEach((s) => {
    const k = `${s.paid_by_name}->${s.paid_to_name}`;
    if (!linksMap[k]) {
      linksMap[k] = { amount: 0, count: 0 };
    }
    linksMap[k].amount += Number(s.amount_inr);
    linksMap[k].count += 1;
  });

  const links = Object.entries(linksMap).map(([key, val]) => {
    const [from, to] = key.split('->');
    return {
      from,
      to,
      amount: val.amount,
      count: val.count,
    };
  });

  const maxAmount = links.length > 0 ? Math.max(...links.map((l) => l.amount), 1) : 1;

  const activeNode = selectedPerson || hoveredNode;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="hidden md:block glass-card p-6 mb-8 relative overflow-hidden"
      style={{ background: 'rgba(26,29,39,0.55)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Settlement Network</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {selectedPerson
              ? `Showing connections for ${selectedPerson} (click background to clear)`
              : 'Click a person to filter their cash flows; hover lines for details'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 border-t-2 border-dashed border-violet-500 animate-pulse"></span>{' '}
            Settlement Flow
          </span>
          {selectedPerson && (
            <button
              onClick={() => onSelectPerson(null)}
              className="text-xs text-violet-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear Filter ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center items-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[540px] h-auto overflow-visible select-none"
          onClick={() => onSelectPerson(null)}
        >
          {/* Arrow marker definition based on dynamic colors */}
          <defs>
            <marker
              id="arrow-violet"
              viewBox="0 0 10 10"
              refX="23"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#8b5cf6" opacity="0.85" />
            </marker>
            <marker
              id="arrow-blue"
              viewBox="0 0 10 10"
              refX="23"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#60a5fa" opacity="0.85" />
            </marker>
            <marker
              id="arrow-amber"
              viewBox="0 0 10 10"
              refX="23"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" opacity="0.85" />
            </marker>
            <marker
              id="arrow-rose"
              viewBox="0 0 10 10"
              refX="23"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#fb7185" opacity="0.85" />
            </marker>
          </defs>

          {/* Links / Curved Edges */}
          {links.map((link) => {
            const source = nodeMap.get(link.from);
            const target = nodeMap.get(link.to);
            if (!source || !target) return null;

            // Compute curved path logic
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;

            // Curved normal vectors
            const nx = -dy / len;
            const ny = dx / len;

            // Curvature intensity
            const curveFactor = 22;
            const cx = (source.x + target.x) / 2 + nx * curveFactor;
            const cy = (source.y + target.y) / 2 + ny * curveFactor;

            // Check if this link should be highlighted
            const isHighlighted =
              activeNode === null || link.from === activeNode || link.to === activeNode;

            const pathD = `M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}`;

            // Calculate thickness based on amount ratio
            const ratio = link.amount / maxAmount;
            const strokeWidth = 1.5 + ratio * 4.5; // ranges from 1.5px to 6px

            // Calculate color based on amount ratio
            let lineColor = '#8b5cf6'; // default Violet (<25%)
            let colorName = 'violet';
            if (ratio >= 0.75) {
              lineColor = '#fb7185'; // Rose (>=75%)
              colorName = 'rose';
            } else if (ratio >= 0.5) {
              lineColor = '#fbbf24'; // Amber (>=50%)
              colorName = 'amber';
            } else if (ratio >= 0.25) {
              lineColor = '#60a5fa'; // Blue (>=25%)
              colorName = 'blue';
            }

            return (
              <g
                key={`${link.from}-${link.to}`}
                className="transition-all duration-300"
                style={{ opacity: isHighlighted ? 1 : 0.08 }}
              >
                {/* SVG Native Tooltip */}
                <title>{`${link.from} settled ₹${link.amount.toLocaleString('en-IN')} to ${link.to}`}</title>

                {/* Thick background path for hover area */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={Math.max(10, strokeWidth + 6)}
                  className="cursor-pointer"
                />

                {/* Base curve */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity="0.25"
                  markerEnd={`url(#arrow-${colorName})`}
                />

                {/* Flowing dashes */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity="0.85"
                  className="animate-flow"
                />

                {/* Amount label */}
                <g
                  transform={`translate(${(source.x + target.x) / 2 + nx * 14}, ${(source.y + target.y) / 2 + ny * 14})`}
                >
                  <rect
                    x="-26"
                    y="-8"
                    width="52"
                    height="16"
                    rx="4"
                    fill="#151722"
                    stroke={lineColor}
                    strokeOpacity="0.5"
                    strokeWidth="1"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#e4e4e7"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    ₹
                    {link.amount >= 1000
                      ? `${(link.amount / 1000).toFixed(1)}k`
                      : Math.round(link.amount)}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Nodes / Member Avatars */}
          {nodes.map((node) => {
            const isNodeActive = selectedPerson === node.name || hoveredNode === node.name;
            const isHighlighted =
              activeNode === null ||
              node.name === activeNode ||
              links.some(
                (l) =>
                  (l.from === activeNode && l.to === node.name) ||
                  (l.to === activeNode && l.from === node.name)
              );

            return (
              <g
                key={node.name}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredNode(node.name)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPerson(selectedPerson === node.name ? null : node.name);
                }}
                style={{ opacity: isHighlighted ? 1 : 0.15 }}
              >
                {/* SVG Native Tooltip */}
                <title>{`${node.name} (${
                  selectedPerson === node.name ? 'Selected' : 'Click to filter'
                })`}</title>

                {/* Highlight outer ring glow */}
                <AnimatePresence>
                  {isNodeActive && (
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r="24"
                      fill="none"
                      stroke={node.color}
                      strokeWidth="1.5"
                      initial={{ scale: 0.85, opacity: 0.2 }}
                      animate={{
                        scale: [0.85, 1.15, 0.85],
                        opacity: [0.2, 0.7, 0.2],
                      }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Avatar outer border circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="18"
                  fill="#181a25"
                  stroke={isNodeActive ? node.color : isHighlighted ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth="2"
                  className="transition-colors duration-300"
                />

                {/* Avatar Image */}
                <image
                  href={node.avatarUrl}
                  x={node.x - 14}
                  y={node.y - 14}
                  width="28"
                  height="28"
                  className="rounded-full"
                />

                {/* Text Label Container */}
                <g transform={`translate(${node.x}, ${node.y + 30})`}>
                  <rect
                    x="-28"
                    y="-7"
                    width="56"
                    height="14"
                    rx="4"
                    fill="rgba(21, 23, 34, 0.8)"
                    stroke={isNodeActive ? node.color : 'transparent'}
                    strokeWidth="1"
                    className="backdrop-blur-sm"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isNodeActive ? 'white' : isHighlighted ? '#e4e4e7' : 'var(--text-secondary)'}
                    fontSize="9.5"
                    fontWeight="semibold"
                    className="transition-colors duration-300"
                  >
                    {node.name}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </motion.div>
  );
}
