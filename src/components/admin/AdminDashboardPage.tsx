'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { CreativeReviewPanel } from './CreativeReviewPanel';
import { InventoryManagementTable } from './InventoryManagementTable';
import { ScreenManagementTable } from './ScreenManagementTable';
import { OverviewPanel } from './OverviewPanel';
import { AdminWorkQueuesPanel } from './AdminWorkQueuesPanel';
import { AdminProposalsPanel } from './AdminProposalsPanel';
import { AdminCampaignDraftsPanel } from './AdminCampaignDraftsPanel';
import { AdminBookingsPanel } from './AdminBookingsPanel';
import { AdminPricingPanel } from './AdminPricingPanel';
import { AdminLaunchReadinessPanel } from './AdminLaunchReadinessPanel';

import { Campaign, InventoryLocation, Screen } from '@/types/inventory';
import { fetchAllCampaigns, fetchAllScreens, updateCreativeApprovalStatus, fetchStandaloneCreatives, StandaloneCreative } from '@/lib/api/admin';
import { fetchInventoryLocations } from '@/lib/api/inventory';

const TAB_LABELS: Record<AdminTab, string> = {
  overview: 'Dashboard',
  'campaign-drafts': 'Campaign Drafts',
  proposals: 'Proposals',
  bookings: 'Bookings',
  creative: 'Creative Review',
  'launch-readiness': 'Launch Readiness',
  inventory: 'Inventory',
  screens: 'Screens',
  pricing: 'Pricing',
};

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [inventory, setInventory] = useState<InventoryLocation[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [standaloneCreatives, setStandaloneCreatives] = useState<StandaloneCreative[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchAllCampaigns(),
      fetchInventoryLocations(),
      fetchAllScreens(),
      fetchStandaloneCreatives(),
    ]).then(([c, i, s, sc]) => {
      if (!mounted) return;
      setCampaigns(c);
      setInventory(i);
      setScreens(s);
      setStandaloneCreatives(sc);
      setIsLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const handleUpdateCreativeStatus = async (campaignId: string | null, creativeId: string, newStatus: string) => {
    await updateCreativeApprovalStatus(creativeId, newStatus as 'approved' | 'rejected');
    const [updatedCampaigns, updatedCreatives] = await Promise.all([
      fetchAllCampaigns(),
      fetchStandaloneCreatives(),
    ]);
    setCampaigns(updatedCampaigns);
    setStandaloneCreatives(updatedCreatives);
  };

  // TODO(P2): pass filter to destination panel when panels support pre-filtering
  const handleWorkQueueNavigate = (tab: AdminTab, _filter: string) => {
    setActiveTab(tab);
  };

  const isLegacyTab = activeTab === 'overview' || activeTab === 'creative' || activeTab === 'inventory' || activeTab === 'screens';

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

              {activeTab === 'campaign-drafts' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <AdminCampaignDraftsPanel />
                </div>
              )}

              {activeTab === 'proposals' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <AdminProposalsPanel />
                </div>
              )}

              {activeTab === 'bookings' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <AdminBookingsPanel />
                </div>
              )}

              {activeTab === 'creative' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <CreativeReviewPanel
                    campaigns={campaigns}
                    standaloneCreatives={standaloneCreatives}
                    onUpdateStatus={handleUpdateCreativeStatus}
                  />
                </div>
              )}

              {activeTab === 'launch-readiness' && (
                <AdminLaunchReadinessPanel />
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

              {activeTab === 'screens' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <ScreenManagementTable screens={screens} inventory={inventory} />
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </main>
  );
}
