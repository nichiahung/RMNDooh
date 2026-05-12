import React from 'react';
import { Campaign, InventoryLocation, Screen } from '@/types/inventory';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { Layers, Activity, DollarSign, CheckCircle, Clock } from 'lucide-react';

interface Props {
  campaigns: Campaign[];
  inventory: InventoryLocation[];
  screens: Screen[];
}

export function OverviewPanel({ campaigns, inventory, screens }: Props) {
  
  // Calculations
  const pendingCampaigns = campaigns.filter(c => c.status === 'pending_review').length;
  const approvedCampaigns = campaigns.filter(c => c.status === 'approved' || c.status === 'live' || c.status === 'scheduled').length;
  const totalBudget = campaigns.reduce((sum, c) => sum + c.estimatedBudget, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.estimatedImpressions, 0);
  const onlineScreens = screens.filter(s => s.status === 'online').length;

  return (
    <div className="space-y-6">
      
      {/* Top row cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start">
          <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mr-4">
            <Layers className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 mb-1">Total Campaigns</div>
            <div className="text-2xl font-bold text-slate-900">{campaigns.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start">
          <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center mr-4">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-slate-900">{pendingCampaigns}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start">
          <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mr-4">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 mb-1">Approved & Live</div>
            <div className="text-2xl font-bold text-slate-900">{approvedCampaigns}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mr-4">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 mb-1">Active Screens</div>
            <div className="text-2xl font-bold text-slate-900">{onlineScreens} <span className="text-sm font-medium text-slate-400">/ {screens.length}</span></div>
          </div>
        </div>

      </div>

      {/* Second row financial/metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-slate-900 rounded-xl shadow-lg p-8 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-white/10 rounded">
              <DollarSign className="w-5 h-5 text-indigo-300" />
            </div>
            <h3 className="text-indigo-200 font-medium">Pipeline Budget</h3>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatCurrency(totalBudget)}</div>
          <p className="text-sm text-slate-400 mt-2">Total budget across all campaigns</p>
        </div>

        <div className="bg-indigo-600 rounded-xl shadow-lg p-8 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-white/20 rounded">
              <Activity className="w-5 h-5 text-indigo-100" />
            </div>
            <h3 className="text-indigo-100 font-medium">Estimated Reach</h3>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(totalImpressions)}</div>
          <p className="text-sm text-indigo-200 mt-2">Total impressions across all campaigns</p>
        </div>

      </div>

    </div>
  );
}
