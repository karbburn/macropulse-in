'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface FilterTabsProps {
  active: string;
  onChange: (tab: string) => void;
}

const TABS = ['ALL', 'MPC', 'CPI', 'IIP'] as const;

export default function FilterTabs({ active, onChange }: FilterTabsProps) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-px scrollbar-none">
      {TABS.map((tab) => {
        const isActive = active.toUpperCase() === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`relative py-3 text-xs font-body tracking-widest uppercase font-medium focus:outline-none transition-colors duration-150 cursor-pointer ${
              isActive ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-primary"
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }} // 200ms ease-snap
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
