import React from 'react';
import { CampaignReport } from '@/types/inventory';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { calculateAverageCPM, calculateDeliveryProgress } from '@/utils/reportCalculations';
import { PlayCircle, Eye, DollarSign, Target, TrendingUp } from 'lucide-react';

interface Props {
  report: CampaignReport;
}

export function ReportKpiCards({ report }: Props) {
  
  const cpm = calculateAverageCPM(report.budgetSpent, report.estimatedImpressionsDelivered);
  const progressPercent = calculateDeliveryProgress(report.budgetSpent, report.totalBudget);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      
      {/* Total Plays (PoP Verified) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 relative overflow-hidden group hover:border-indigo-200 transition-colors">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors" />
        <div className="flex items-center space-x-2 text-slate-500 mb-2 relative">
          <PlayCircle className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Verified Plays</span>
        </div>
        <div className="text-2xl font-bold text-slate-900 relative">{formatNumber(report.completedPlays)}</div>
        <div className="text-xs text-emerald-600 font-medium mt-2 relative flex items-center">
          <TrendingUp className="w-3 h-3 mr-1" /> +12% vs last week
        </div>
      </div>

      {/* Estimated Impressions */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 relative overflow-hidden group hover:border-blue-200 transition-colors lg:col-span-2">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors" />
        <div className="flex items-center space-x-2 text-slate-500 mb-2 relative">
          <Eye className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Estimated Impressions</span>
        </div>
        <div className="flex items-end justify-between relative">
          <div className="text-3xl font-bold text-slate-900">{formatNumber(report.estimatedImpressionsDelivered)}</div>
          <div className="text-sm font-medium text-slate-500 mb-1">Delivered so far</div>
        </div>
      </div>

      {/* Budget Spent */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 relative overflow-hidden group hover:border-emerald-200 transition-colors">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:bg-emerald-100 transition-colors" />
        <div className="flex items-center justify-between text-slate-500 mb-2 relative">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Spend</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-900 relative">{formatCurrency(report.budgetSpent)}</div>
        
        {/* Progress Bar */}
        <div className="mt-3 relative">
          <div className="flex justify-between text-[10px] font-medium text-slate-500 mb-1">
            <span>{Math.round(progressPercent)}%</span>
            <span>{formatCurrency(report.totalBudget)}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${progressPercent > 95 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Average CPM */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 relative overflow-hidden group hover:border-amber-200 transition-colors">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full group-hover:bg-amber-100 transition-colors" />
        <div className="flex items-center space-x-2 text-slate-500 mb-2 relative">
          <Target className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Avg CPM</span>
        </div>
        <div className="text-2xl font-bold text-slate-900 relative">{formatCurrency(cpm)}</div>
        <div className="text-xs text-slate-500 font-medium mt-2 relative">
          Based on est. impressions
        </div>
      </div>

    </div>
  );
}
