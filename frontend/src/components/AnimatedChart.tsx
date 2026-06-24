'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { chartVariants, useSafeVariants } from '../lib/motion';

interface AnimatedChartProps {
  children: React.ReactNode;
}

export default function AnimatedChart({ children }: { children: React.ReactNode }) {
  const safeChartVariants = useSafeVariants(chartVariants);

  return (
    <motion.div
      variants={safeChartVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
