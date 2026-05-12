'use client';

import React from 'react';
import { usePlannerStore } from '@/store/usePlannerStore';
import { Search, Map, List, ArrowDownUp } from 'lucide-react';

interface Props {
  sortBy: string;
  setSortBy: (sort: string) => void;
  resultCount: number;
}

export function SearchAndSortBar({ sortBy, setSortBy, resultCount }: Props) {
  const { filters, setFilters, viewMode, setViewMode } = usePlannerStore();

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
            placeholder="Search locations or districts..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
          />
        </div>
        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
          {resultCount} locations
        </span>
      </div>

      <div className="flex items-center space-x-5">
        {/* Sort Dropdown */}
        <div className="flex items-center space-x-2">
          <ArrowDownUp className="w-4 h-4 text-slate-400" />
          <select
            className="block w-full pl-2 pr-8 py-1.5 text-sm font-medium text-slate-700 bg-transparent border-transparent focus:outline-none focus:ring-0 cursor-pointer hover:text-slate-900 transition-colors"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="impressions_desc">Impressions (High to Low)</option>
            <option value="price_asc">Price (Low to High)</option>
            <option value="price_desc">Price (High to Low)</option>
            <option value="cpm_asc">CPM (Low to High)</option>
          </select>
        </div>

        <div className="h-5 w-px bg-slate-200"></div>

        {/* View Toggle */}
        <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'list' 
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="w-4 h-4 mr-2" />
            List
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'map' 
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Map className="w-4 h-4 mr-2" />
            Map
          </button>
        </div>
      </div>
    </div>
  );
}
