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
import { AdminWorkQueuesPanel } from './AdminWorkQueuesPanel';
import { AdminProposalsPanel } from './AdminProposalsPanel';
import { AdminCampaignDraftsPanel } from './AdminCampaignDraftsPanel';
import { AdminBookingsPanel } from './AdminBookingsPanel';
import { AdminPricingPanel } from './AdminPricingPanel';
import { AdminCreativeLibraryPanel } from './AdminCreativeLibraryPanel';
import { AdminCreativeCoveragePanel } from './AdminCreativeCoveragePanel';
import { AdminLaunchReadinessPanel } from './AdminLaunchReadinessPanel';

import { Campaign, InventoryLocation, Screen } from '@/types/inventory';
import { fetchAllCampaigns, fetchAllScreens, updateCampaignStatus, updateCreativeApprovalStatus, confirmBooking, fetchStandaloneCreatives, StandaloneCreative } from '@/lib/api/admin';
import { fetchInventoryLocations } from '@/lib/api/inventory';

const TAB_LABELS: Record<AdminTab, string> = {
  overview: 'Overview',
  proposals: 'Proposals',
  'campaign-drafts': 'Campaign Drafts',
  bookings: 'Bookings',
  campaigns: 'Campaigns',
  inventory: 'Inventory',
  pricing: 'Pricing & Rate Cards',
  'creative-library': 'Creative Library',
  creative: 'Creative Review',
  'creative-coverage': 'Creative Coverage',
  'launch-readiness': 'Launch Readiness',
  screens: 'Screens',
};

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Data from Supabase
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [inventory, setInventory] = useState<InventoryLocation[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [standaloneCreatives, setStandaloneCreatives] = useState<StandaloneCreative[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const refreshDashboardData = async () => {
    const [c, i, s, sc] = await Promise.all([
      fetchAllCampaigns(),
      fetchInventoryLocations(),
      fetchAllScreens(),
      fetchStandaloneCreatives(),
    ]);
    setCampaigns(c);
    setInventory(i);
    setScreens(s);
    setStandaloneCreatives(sc);
  };

  const syncSelectedCampaign = (updatedCampaigns: Campaign[]) => {
    if (selectedCampaign) {
      const next = updatedCampaigns.find(item => item.id === selectedCampaign.id);
      setSelectedCampaign(next ? { ...next } : null);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      await refreshDashboardData();
      if (mounted) setIsLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdateCampaignStatus = async (id: string, newStatus: Campaign['status'], notes?: string) => {
    await updateCampaignStatus(id, newStatus, notes);
    const updated = await fetchAllCampaigns();
    setCampaigns(updated);
    syncSelectedCampaign(updated);
  };

  const handleConfirmBooking = async (campaignId: string) => {
    await confirmBooking(campaignId);
    const updated = await fetchAllCampaigns();
    setCampaigns(updated);
    syncSelectedCampaign(updated);
  };

  const handleUpdateCreativeStatus = async (campaignId: string | null, creativeId: string, newStatus: string) => {
    await updateCreativeApprovalStatus(creativeId, newStatus as 'approved' | 'rejected');
    const [updatedCampaigns, updatedCreatives] = await Promise.all([
      fetchAllCampaigns(),
      fetchStandaloneCreatives(),
    ]);
    setCampaigns(updatedCampaigns);
    setStandaloneCreatives(updatedCreatives);
    syncSelectedCampaign(updatedCampaigns);
  };

  const handleWorkQueueNavigate = (tab: AdminTab, filter: string) => {
    setActiveTab(tab);
    setActiveFilter(filter);
  };

  // Determine which tabs use the legacy Supabase data vs the new trading iteration data
  const isLegacyTab = activeTab === 'overview' || activeTab === 'campaigns' || activeTab === 'creative' || activeTab === 'inventory' || activeTab === 'screens';

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
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 truncate">
            {TAB_LABELS[activeTab] ?? activeTab}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          {isLoading && isLegacyTab ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm animate-pulse">
              載入資料中...
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">

              {activeTab === 'overview' && (
                <>
                  <AdminWorkQueuesPanel onNavigate={handleWorkQueueNavigate} />
                  <OverviewPanel campaigns={campaigns} inventory={inventory} screens={screens} />
                </>
              )}

              {activeTab === 'proposals' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <AdminProposalsPanel />
                </div>
              )}

              {activeTab === 'campaign-drafts' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <AdminCampaignDraftsPanel />
                </div>
              )}

              {activeTab === 'bookings' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <AdminBookingsPanel />
                </div>
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
                  <CreativeReviewQueue campaigns={campaigns} standaloneCreatives={standaloneCreatives} onUpdateStatus={handleUpdateCreativeStatus} />
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <InventoryManagementTable inventory={inventory} />
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-5">
                  <AdminPricingPanel />
                </div>
              )}

              {activeTab === 'creative-library' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-5">
                  <AdminCreativeLibraryPanel />
                </div>
              )}

              {activeTab === 'creative-coverage' && (
                <AdminCreativeCoveragePanel />
              )}

              {activeTab === 'launch-readiness' && (
                <AdminLaunchReadinessPanel />
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
