'use client';

import React, { useState } from 'react';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { CampaignTable } from './CampaignTable';
import { CampaignDetailPanel } from './CampaignDetailPanel';
import { CreativeReviewQueue } from './CreativeReviewQueue';
import { InventoryManagementTable } from './InventoryManagementTable';
import { ScreenManagementTable } from './ScreenManagementTable';
import { OverviewPanel } from './OverviewPanel';

import { mockCampaigns } from '@/data/mockCampaigns';
import { mockScreens } from '@/data/mockScreens';
import { mockInventory } from '@/lib/mockData';
import { Campaign } from '@/types/inventory';

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  
  // High-level mock state for the dashboard to allow local updates
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Handlers for mock status updates
  const handleUpdateCampaignStatus = (id: string, newStatus: Campaign['status'], notes?: string) => {
    setCampaigns(prev => prev.map(c => 
      c.id === id ? { ...c, status: newStatus, approvalNotes: notes || c.approvalNotes } : c
    ));
    if (selectedCampaign?.id === id) {
      setSelectedCampaign(prev => prev ? { ...prev, status: newStatus, approvalNotes: notes || prev.approvalNotes } : null);
    }
  };

  const handleUpdateCreativeStatus = (campaignId: string, creativeId: string, newStatus: any) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        return {
          ...c,
          creatives: c.creatives.map(cr => cr.id === creativeId ? { ...cr, status: newStatus } : cr)
        };
      }
      return c;
    }));
    if (selectedCampaign?.id === campaignId) {
      setSelectedCampaign(prev => {
        if (!prev) return null;
        return {
          ...prev,
          creatives: prev.creatives.map(cr => cr.id === creativeId ? { ...cr, status: newStatus } : cr)
        };
      });
    }
  };

  return (
    <main className="h-screen flex bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans">
      
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 z-10 flex-shrink-0 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 capitalize">
            {activeTab.replace('-', ' ')}
          </h1>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {activeTab === 'overview' && (
              <OverviewPanel campaigns={campaigns} inventory={mockInventory} screens={mockScreens} />
            )}

            {activeTab === 'campaigns' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <CampaignTable 
                  campaigns={campaigns} 
                  onViewDetails={setSelectedCampaign} 
                />
              </div>
            )}

            {activeTab === 'creative' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <CreativeReviewQueue 
                  campaigns={campaigns}
                  onUpdateStatus={handleUpdateCreativeStatus}
                />
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <InventoryManagementTable inventory={mockInventory} />
              </div>
            )}

            {activeTab === 'screens' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <ScreenManagementTable screens={mockScreens} inventory={mockInventory} />
              </div>
            )}

          </div>
        </div>

        {/* Overlays */}
        {selectedCampaign && (
          <CampaignDetailPanel 
            campaign={selectedCampaign}
            inventory={mockInventory}
            onClose={() => setSelectedCampaign(null)}
            onUpdateStatus={handleUpdateCampaignStatus}
          />
        )}

      </div>
    </main>
  );
}
