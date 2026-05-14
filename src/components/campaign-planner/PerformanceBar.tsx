'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MapPin, Eye, TrendingUp, DollarSign, Target, ChevronRight } from 'lucide-react';
import { MediaPlanItem, InventoryLocation } from '@/types/inventory';
import { computeMatchScore } from '@/utils/matchScore';
import { formatCPM, formatCurrency, formatCompact } from '@/utils/formatters';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  objective?: string;
  onOpenSummary: () => void;
}

function AnimatedValue({ value }: { value: string | number }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 250);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`transition-colors duration-150 ${flash ? 'text-indigo-300' : 'text-white'}`}>
      {value}
    </span>
  );
}

export function PerformanceBar({ selectedItems, allInventory, objective, onOpenSummary }: Props) {
  const visible = selectedItems.length > 0;

  // Compute metrics
  let totalImpressions = 0;
  let totalBudget = 0;
  let matchScoreSum = 0;

  for (const item of selectedItems) {
    const venue = allInventory.find(v => v.id === item.inventoryId);
    if (!venue) continue;
    totalImpressions += venue.dailyImpressions * item.days;
    totalBudget += venue.pricePerDay * item.days;
    matchScoreSum += computeMatchScore(venue, objective);
  }

  const avgCpm = totalImpressions > 0 ? (totalBudget / totalImpressions) * 1000 : 0;
  const avgMatchScore = selectedItems.length > 0 ? Math.round(matchScoreSum / selectedItems.length) : 0;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Desktop */}
      <div className="hidden lg:flex items-center justify-between bg-slate-900/95 backdrop-blur-md border-t border-slate-700 px-8 py-3">
        <div className="flex items-center gap-8">
          <Metric icon={<MapPin className="w-3.5 h-3.5" />} label="版位">
            <AnimatedValue value={`${selectedItems.length} 個`} />
          </Metric>
          <Metric icon={<Eye className="w-3.5 h-3.5" />} label="預估觸及">
            <AnimatedValue value={formatCompact(totalImpressions)} />
          </Metric>
          <Metric icon={<TrendingUp className="w-3.5 h-3.5" />} label="平均 CPM">
            <AnimatedValue value={`NT$${formatCPM(avgCpm)}`} />
          </Metric>
          <Metric icon={<DollarSign className="w-3.5 h-3.5" />} label="總費用">
            <AnimatedValue value={formatCurrency(totalBudget)} />
          </Metric>
          {objective && (
            <Metric icon={<Target className="w-3.5 h-3.5" />} label="DNA 吻合">
              <AnimatedValue value={`${avgMatchScore}%`} />
            </Metric>
          )}
        </div>
        <button
          onClick={onOpenSummary}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          查看媒體計劃 <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile */}
      <button
        onClick={onOpenSummary}
        className="lg:hidden w-full flex items-center justify-between bg-slate-900/95 backdrop-blur-md border-t border-slate-700 px-5 py-3"
      >
        <span className="text-sm text-slate-300">
          <span className="font-bold text-white">{selectedItems.length}</span> 個版位・
          <span className="font-bold text-white">{formatCurrency(totalBudget)}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}

function Metric({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{label}</div>
        <div className="text-sm font-bold leading-none">{children}</div>
      </div>
    </div>
  );
}
