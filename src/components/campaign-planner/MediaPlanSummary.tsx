import React from 'react';
import { Calculator, Eye, TrendingUp, MapPin, X, Calendar, ChevronRight } from 'lucide-react';
import { MediaPlanItem, InventoryLocation } from '@/types/inventory';
import { calculateCampaignEstimate } from '@/utils/mediaPlanCalculations';
import { formatCurrency, formatCPM } from '@/utils/formatters';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  onRemove: (id: string) => void;
  onUpdateDays: (id: string, days: number) => void;
  onContinue: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaPlanSummary({ selectedItems, allInventory, onRemove, onUpdateDays, onContinue, isOpen, onClose }: Props) {
  const { t } = useI18n();
  
  // Use utility from Step 3 to calculate metrics
  // Defaulting to 1 campaign day for the overall estimate right now, 
  // but since each item has its own 'days', we sum them individually below for itemized display
  const estimate = calculateCampaignEstimate(selectedItems, allInventory, 1);
  
  // Because our mock setup allows different days per item, let's recalculate accurately based on individual days
  let exactTotalImpressions = 0;
  let exactTotalBudget = 0;

  const selectedDetails = selectedItems.map(item => {
    const inv = allInventory.find(i => i.id === item.inventoryId);
    return { ...item, inventory: inv };
  }).filter(item => item.inventory !== undefined);

  selectedDetails.forEach(({ days, inventory }) => {
    if (!inventory) return;
    exactTotalImpressions += inventory.dailyImpressions * days;
    exactTotalBudget += inventory.pricePerDay * days;
  });

  const exactAvgCpm = exactTotalImpressions > 0 
    ? (exactTotalBudget / exactTotalImpressions) * 1000 
    : 0;

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-[51]"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 right-0 w-full sm:w-[88vw] max-w-[340px] lg:w-[340px] bg-white border-l border-slate-200 flex flex-col h-full flex-shrink-0 z-[52] lg:z-40 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] transform transition-transform duration-200 lg:transform-none ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >

      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 className="text-base font-semibold text-slate-900 flex items-center">
          <Calculator className="w-4 h-4 mr-2 text-indigo-600" /> {t('mediaPlan.title')}
        </h2>
        <div className="flex items-center gap-3">
          <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs font-semibold">
            {selectedItems.length} {t('planner.locations')}
          </span>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close media plan"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Items Area */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/30">
        {selectedDetails.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">{t('mediaPlan.empty')}</p>
            <p className="text-xs text-slate-500 px-4">
              {t('mediaPlan.emptyDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDetails.map(({ inventoryId, days, inventory }) => (
              <div key={inventoryId} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors group relative">
                <button 
                  onClick={() => onRemove(inventoryId)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove from plan"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="pr-6">
                  <h4 className="text-sm font-semibold text-slate-900 leading-tight mb-1 line-clamp-1">{inventory?.name}</h4>
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
                      onChange={(e) => onUpdateDays(inventoryId, parseInt(e.target.value) || 1)}
                    />
                    <span className="text-xs text-slate-500">{t('mediaPlan.days')}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatCurrency((inventory?.pricePerDay || 0) * days)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Calculation Area */}
      <div className="p-5 border-t border-slate-200 bg-white">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('mediaPlan.campaignEstimate')}</h3>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 flex items-center"><Eye className="w-4 h-4 mr-2 text-slate-400"/> {t('mediaPlan.totalImpressions')}</span>
            <span className="font-semibold text-slate-900">{exactTotalImpressions.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-slate-400"/> {t('mediaPlan.avgCpm')}</span>
            <span className="font-semibold text-slate-900">NT${formatCPM(exactAvgCpm)}</span>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="text-slate-700 font-medium">{t('mediaPlan.totalBudget')}</span>
            <span className="font-bold text-lg text-indigo-600">{formatCurrency(exactTotalBudget)}</span>
          </div>
        </div>

        <button 
          onClick={onContinue}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={selectedItems.length === 0}
        >
          {t('mediaPlan.continueCreative')}
        </button>
      </div>

    </aside>
    </>
  );
}
