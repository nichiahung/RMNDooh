import React from 'react';
import { CampaignReport } from '@/types/inventory';
import { ReportFilters as FilterState } from '@/utils/reportCalculations';
import { Filter, Calendar, MapPin, Search } from 'lucide-react';

interface Props {
  campaigns: CampaignReport[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function ReportFilters({ campaigns, filters, onFilterChange }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      
      <div className="flex items-center space-x-2 text-slate-700 font-semibold text-sm">
        <Filter className="w-4 h-4 text-slate-400" />
        <span>Filters</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1 md:ml-4">
        
        {/* Campaign Filter */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <select 
            value={filters.campaignId}
            onChange={(e) => onFilterChange({ ...filters, campaignId: e.target.value })}
            className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg appearance-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="">Select a campaign...</option>
            {campaigns.map(c => (
              <option key={c.campaignId} value={c.campaignId}>
                {c.campaignName} ({c.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="w-full md:w-48 relative">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <select 
            value={filters.dateRange}
            onChange={(e) => onFilterChange({ ...filters, dateRange: e.target.value })}
            className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg appearance-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="all_time">All Time</option>
          </select>
        </div>

        {/* Location Filter (Mock UI) */}
        <div className="w-full md:w-48 relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <select 
            className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg appearance-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer opacity-70"
            disabled
            title="Location filtering coming soon"
          >
            <option value="all">All Locations</option>
          </select>
        </div>

      </div>

    </div>
  );
}
