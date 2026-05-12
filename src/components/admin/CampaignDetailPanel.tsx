import React from 'react';
import { Campaign, InventoryLocation } from '@/types/inventory';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { X, Check, AlertTriangle, FileVideo, FileImage } from 'lucide-react';

interface Props {
  campaign: Campaign;
  inventory: InventoryLocation[];
  onClose: () => void;
  onUpdateStatus: (id: string, status: Campaign['status'], notes?: string) => void;
}

export function CampaignDetailPanel({ campaign, inventory, onClose, onUpdateStatus }: Props) {
  
  const handleApprove = () => onUpdateStatus(campaign.id, 'approved');
  const handleReject = () => {
    const notes = window.prompt("Enter rejection reason:");
    if (notes) onUpdateStatus(campaign.id, 'rejected', notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{campaign.name}</h2>
            <p className="text-sm text-slate-500 mt-1">Advertiser: {campaign.advertiserName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            <div className="col-span-2 space-y-6">
              {/* Status Banner */}
              {campaign.approvalNotes && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800">Admin Notes</h4>
                    <p className="text-sm text-amber-700 mt-1">{campaign.approvalNotes}</p>
                  </div>
                </div>
              )}

              {/* Campaign Meta */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Campaign Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Status:</span> <span className="font-semibold text-slate-900 uppercase">{campaign.status}</span></div>
                  <div><span className="text-slate-500">Objective:</span> <span className="font-semibold text-slate-900">{campaign.objective}</span></div>
                  <div><span className="text-slate-500">Start Date:</span> <span className="font-semibold text-slate-900">{campaign.startDate}</span></div>
                  <div><span className="text-slate-500">End Date:</span> <span className="font-semibold text-slate-900">{campaign.endDate}</span></div>
                </div>
              </div>

              {/* Selected Inventory */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Selected Inventory ({campaign.selectedItems.length})</h3>
                <div className="space-y-3">
                  {campaign.selectedItems.map(item => {
                    const inv = inventory.find(i => i.id === item.inventoryId);
                    if (!inv) return null;
                    return (
                      <div key={item.inventoryId} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                        <div>
                          <div className="font-semibold text-sm text-slate-900">{inv.name}</div>
                          <div className="text-xs text-slate-500">{inv.screenType} • {inv.venueType}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900">{item.days} days</div>
                          <div className="text-xs text-indigo-600 font-semibold">{formatCurrency(inv.pricePerDay * item.days)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Financials */}
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Budget</div>
                <div className="text-2xl font-bold text-indigo-600 mb-4">{formatCurrency(campaign.estimatedBudget)}</div>
                
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Est. Impressions</div>
                <div className="text-xl font-bold text-slate-900">{formatNumber(campaign.estimatedImpressions)}</div>
              </div>

              {/* Creatives */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Creatives ({campaign.creatives.length})</h3>
                <div className="space-y-3">
                  {campaign.creatives.map(creative => (
                    <div key={creative.id} className="border border-slate-200 rounded overflow-hidden">
                      <div className="h-24 bg-slate-100">
                        <img src={creative.previewUrl} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                      <div className="p-2 text-xs">
                        <div className="font-semibold text-slate-900 truncate mb-1" title={creative.name}>{creative.name}</div>
                        <div className="flex justify-between text-slate-500">
                          <span className="flex items-center">
                            {creative.type.includes('video') ? <FileVideo className="w-3 h-3 mr-1"/> : <FileImage className="w-3 h-3 mr-1"/>}
                            {(creative.fileSize / 1000000).toFixed(1)} MB
                          </span>
                          <span className={`px-1 rounded font-semibold uppercase ${creative.status === 'approved' ? 'text-emerald-600 bg-emerald-50' : creative.status === 'rejected' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'}`}>{creative.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
          {campaign.status === 'pending_review' && (
            <>
              <button 
                onClick={handleReject}
                className="px-6 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Reject / Request Changes
              </button>
              <button 
                onClick={handleApprove}
                className="flex items-center px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Check className="w-4 h-4 mr-2" /> Approve Campaign
              </button>
            </>
          )}
          {campaign.status !== 'pending_review' && (
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors"
            >
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
