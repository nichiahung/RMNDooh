'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { CampaignTable } from './CampaignTable';
import { CampaignDetailPanel } from './CampaignDetailPanel';
import { CreativeReviewQueue } from './CreativeReviewQueue';
import { InventoryManagementTable } from './InventoryManagementTable';
import { ScreenManagementTable } from './ScreenManagementTable';
import { OverviewPanel } from './OverviewPanel';

import { Campaign, InventoryLocation, Screen } from '@/types/inventory';
import { fetchAllCampaigns, fetchAllScreens, updateCampaignStatus, updateCreativeApprovalStatus, confirmBooking } from '@/lib/api/admin';
import { fetchInventoryLocations } from '@/lib/api/inventory';

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data from Supabase
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [inventory, setInventory] = useState<InventoryLocation[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    Promise.all([
      fetchAllCampaigns(),
      fetchInventoryLocations(),
      fetchAllScreens(),
    ]).then(([c, i, s]) => {
      setCampaigns(c);
      setInventory(i);
      setScreens(s);
      setIsLoading(false);
    });
  }, []);

  const handleUpdateCampaignStatus = async (id: string, newStatus: Campaign['status'], notes?: string) => {
    await updateCampaignStatus(id, newStatus, notes);
    setCampaigns(prev => prev.map(c =>
      c.id === id ? { ...c, status: newStatus, approvalNotes: notes || c.approvalNotes } : c
    ));
    if (selectedCampaign?.id === id) {
      setSelectedCampaign(prev => prev ? { ...prev, status: newStatus, approvalNotes: notes || prev.approvalNotes } : null);
    }
  };

  const handleConfirmBooking = async (campaignId: string) => {
    await confirmBooking(campaignId);
    // Re-fetch to get updated booking_status and launch_readiness from DB
    const updated = await fetchAllCampaigns();
    setCampaigns(updated);
  };

  const handleUpdateCreativeStatus = async (campaignId: string, creativeId: string, newStatus: string) => {
    await updateCreativeApprovalStatus(creativeId, newStatus as 'approved' | 'rejected');
    const updateCreatives = (c: Campaign) =>
      c.id === campaignId
        ? { ...c, creatives: c.creatives.map(cr => cr.id === creativeId ? { ...cr, status: newStatus as never } : cr) }
        : c;
    setCampaigns(prev => prev.map(updateCreatives));
    setSelectedCampaign(prev => prev ? updateCreatives(prev) : null);
  };

  return (
    <main className="h-screen flex bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans">

      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 lg:px-8 z-10 flex-shrink-0 shadow-sm gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 capitalize truncate">
            {activeTab.replace('-', ' ')}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm animate-pulse">
              載入資料中...
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">

              {activeTab === 'overview' && (
                <OverviewPanel campaigns={campaigns} inventory={inventory} screens={screens} />
              )}

              {activeTab === 'campaigns' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <CampaignTable
                    campaigns={campaigns}
                    onViewDetails={setSelectedCampaign}
                    onConfirmBooking={handleConfirmBooking}
                  />
                </div>
              )}

              {activeTab === 'creative' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <CreativeReviewQueue campaigns={campaigns} onUpdateStatus={handleUpdateCreativeStatus} />
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <InventoryManagementTable inventory={inventory} />
                </div>
              )}

              {activeTab === 'screens' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <ScreenManagementTable screens={screens} inventory={inventory} />
                </div>
              )}

            </div>
          )}
        </div>

        {selectedCampaign && (
          <CampaignDetailPanel
            campaign={selectedCampaign}
            inventory={inventory}
            onClose={() => setSelectedCampaign(null)}
            onUpdateStatus={handleUpdateCampaignStatus}
          />
        )}

      </div>
    </main>
  );
}
