'use client';

import React, { useState } from 'react';
import { mockReportData } from '@/data/mockReportData';
import { filterReportData, ReportFilters as FilterState } from '@/utils/reportCalculations';
import { ReportFilters } from './ReportFilters';
import { ReportKpiCards } from './ReportKpiCards';
import { CampaignDeliveryChart } from './CampaignDeliveryChart';
import { PlaysByLocationTable } from './PlaysByLocationTable';
import { PlaysByCreativeTable } from './PlaysByCreativeTable';
import { ProofOfPlayReportTable } from './ProofOfPlayReportTable';
import { BarChart3, Info } from 'lucide-react';

export function AdvertiserReportsPage() {
  
  const [filters, setFilters] = useState<FilterState>({
    campaignId: 'camp-rep-1', // Default to Taipei Retail Launch
    dateRange: 'last_30_days'
  });

  const activeReport = filterReportData(mockReportData, filters);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center mr-3">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Campaign Reports</h1>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {activeReport ? activeReport.advertiserName : 'Advertiser Dashboard'}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        
        {/* Controls */}
        <ReportFilters 
          campaigns={mockReportData} 
          filters={filters} 
          onFilterChange={setFilters} 
        />

        {/* Global Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start text-sm">
          <Info className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-blue-800">
            <strong>Data Disclosure:</strong> Impressions are mathematically estimated based on venue footfall data. 
            <strong> Proof-of-play (PoP) logs</strong> are device-verified playback events confirming your ad was actually rendered on screen.
          </p>
        </div>

        {activeReport ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* KPIs */}
            <ReportKpiCards report={activeReport} />

            {/* Charts Row */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Daily Delivery Trend</h2>
              <CampaignDeliveryChart data={activeReport.dailyDelivery} />
            </div>

            {/* Tables Row 1: Location & Creative */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-96">
                <div className="p-5 border-b border-slate-100 bg-white">
                  <h2 className="text-lg font-bold text-slate-900">Delivery by Location</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <PlaysByLocationTable data={activeReport.locationDelivery} />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-96">
                <div className="p-5 border-b border-slate-100 bg-white">
                  <h2 className="text-lg font-bold text-slate-900">Delivery by Creative</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <PlaysByCreativeTable data={activeReport.creativeDelivery} />
                </div>
              </div>
            </div>

            {/* Tables Row 2: PoP Logs */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Verified Proof-of-Play Logs</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Raw playback records from DOOH hardware.</p>
                </div>
                <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <ProofOfPlayReportTable logs={activeReport.recentPoPLogs} />
              </div>
            </div>

          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white">
            <h3 className="text-lg font-semibold text-slate-900">No Campaign Selected</h3>
            <p className="text-slate-500 mt-1">Please select a campaign from the filter above to view its report.</p>
          </div>
        )}

      </main>
    </div>
  );
}
