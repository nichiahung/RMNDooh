'use client';

import React from 'react';
import { usePlannerStore } from '@/store/usePlannerStore';
import { Calculator, X, Calendar, MapPin, Eye, TrendingUp } from 'lucide-react';

export function MediaPlanSummary() {
  const { selectedItems, allInventory, removeFromMediaPlan, updateMediaPlanDays } = usePlannerStore();

  let totalDailyImpressions = 0;
  let totalCampaignImpressions = 0;
  let totalCampaignBudget = 0;

  const selectedDetails = selectedItems.map(item => {
    const inv = allInventory.find(i => i.id === item.inventoryId);
    return { ...item, inventory: inv };
  }).filter(item => item.inventory !== undefined);

  selectedDetails.forEach(({ days, inventory }) => {
    if (!inventory) return;
    totalDailyImpressions += inventory.dailyImpressions;
    totalCampaignImpressions += inventory.dailyImpressions * days;
    totalCampaignBudget += inventory.pricePerDay * days;
  });

  const averageCpm = totalCampaignImpressions > 0 
    ? (totalCampaignBudget / (totalCampaignImpressions / 1000))
    : 0;

  return (
    <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col h-full flex-shrink-0 z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 className="text-base font-semibold text-slate-900 flex items-center">
          <Calculator className="w-4 h-4 mr-2 text-indigo-600" /> Media Plan Summary
        </h2>
        <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs font-semibold">
          {selectedItems.length} locations
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/30">
        {selectedDetails.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">Your media plan is empty</p>
            <p className="text-xs text-slate-500">Select locations from the discovery area to start building your campaign estimate.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDetails.map(({ inventoryId, days, inventory }) => (
              <div key={inventoryId} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors group relative">
                <button 
                  onClick={() => removeFromMediaPlan(inventoryId)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="pr-6">
                  <h4 className="text-sm font-semibold text-slate-900 leading-tight mb-1">{inventory?.name}</h4>
                  <p className="text-xs text-slate-500 mb-3">{inventory?.district}, {inventory?.city}</p>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="number" 
                      min="1"
                      className="w-12 text-xs border-b border-slate-300 focus:border-indigo-500 focus:ring-0 p-0 text-center font-medium text-slate-700 bg-transparent"
                      value={days}
                      onChange={(e) => updateMediaPlanDays(inventoryId, parseInt(e.target.value) || 1)}
                    />
                    <span className="text-xs text-slate-500">days</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    ${((inventory?.pricePerDay || 0) * days).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 border-t border-slate-200 bg-white">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">Campaign Estimate</h3>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 flex items-center"><Eye className="w-4 h-4 mr-2 text-slate-400"/> Est. Impressions</span>
            <span className="font-semibold text-slate-900">{totalCampaignImpressions.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-slate-400"/> Avg. CPM</span>
            <span className="font-semibold text-slate-900">${averageCpm.toFixed(2)}</span>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="text-slate-700 font-medium">Total Budget</span>
            <span className="font-bold text-lg text-indigo-600">${totalCampaignBudget.toLocaleString()}</span>
          </div>
        </div>

        <button 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={selectedItems.length === 0}
        >
          Review & Finalize Plan
        </button>
      </div>
    </aside>
  );
}
