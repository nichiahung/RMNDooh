'use client';

import React, { useState } from 'react';
import { CreativeAsset, MediaPlanItem, InventoryLocation } from '@/types/inventory';
import { ReviewSection } from './ReviewSection';
import { formatCurrency, formatNumber, formatCPM } from '@/utils/formatters';
import { 
  ArrowLeft, CheckCircle, MapPin, Image as ImageIcon, 
  Settings, Calculator, Send, AlertTriangle, Play 
} from 'lucide-react';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  creatives: CreativeAsset[];
  onBack: () => void;
}

export function CampaignReviewStep({ selectedItems, allInventory, creatives, onBack }: Props) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Derive selected inventory details
  const selectedDetails = selectedItems.map(item => {
    return { ...item, inventory: allInventory.find(i => i.id === item.inventoryId)! };
  }).filter(item => item.inventory !== undefined);

  // Calculate totals
  let exactTotalImpressions = 0;
  let exactTotalBudget = 0;
  let dailyImpressions = 0;
  let dailyBudget = 0;
  const uniqueScreenTypes = new Set<string>();
  const uniqueAudiences = new Set<string>();

  selectedDetails.forEach(({ days, inventory }) => {
    exactTotalImpressions += inventory.dailyImpressions * days;
    exactTotalBudget += inventory.pricePerDay * days;
    dailyImpressions += inventory.dailyImpressions;
    dailyBudget += inventory.pricePerDay;
    uniqueScreenTypes.add(inventory.screenType);
    inventory.audienceTags.forEach(tag => uniqueAudiences.add(tag));
  });

  const exactAvgCpm = exactTotalImpressions > 0 
    ? (exactTotalBudget / exactTotalImpressions) * 1000 
    : 0;

  const handleSubmit = () => {
    // Mock submission logic
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="bg-white p-10 rounded-2xl shadow-lg border border-slate-200 text-center max-w-lg animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Campaign Submitted!</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Your campaign has been successfully submitted for review. Our team will verify creative compliance and confirm inventory availability before launch.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 mb-8 text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500">Status</span>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Pending Review</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500">Total Budget</span>
              <span className="text-sm font-bold text-slate-900">{formatCurrency(exactTotalBudget)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Locations</span>
              <span className="text-sm font-bold text-slate-900">{selectedItems.length} locations</span>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors w-full"
          >
            Create New Campaign
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Step Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-3xl font-bold text-slate-900">Review Campaign</h2>
              <span className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider">
                Draft
              </span>
            </div>
            <p className="text-slate-500">Review your settings, creatives, and budget before submitting.</p>
          </div>
          
          <button 
            onClick={handleSubmit}
            className="flex items-center px-8 py-3 text-base font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-500/30"
          >
            Submit Campaign <Send className="w-5 h-5 ml-2" />
          </button>
        </div>

        {/* Settings Summary */}
        <ReviewSection title="Campaign Settings" icon={<Settings />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Objective</div>
              <div className="font-semibold text-slate-900">Awareness</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Time Slot</div>
              <div className="font-semibold text-slate-900">All Day</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date Range</div>
              <div className="font-semibold text-slate-900">Next 7 Days</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Coverage</div>
              <div className="font-semibold text-slate-900">Taipei Metro Area</div>
            </div>
          </div>
        </ReviewSection>

        {/* Budget & Performance */}
        <ReviewSection title="Estimated Performance & Budget" icon={<Calculator />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Est. Impressions</div>
              <div className="text-3xl font-bold text-slate-900">{formatNumber(exactTotalImpressions)}</div>
              <div className="text-sm text-slate-500 mt-1">{formatNumber(dailyImpressions)} / day</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Budget</div>
              <div className="text-3xl font-bold text-indigo-600">{formatCurrency(exactTotalBudget)}</div>
              <div className="text-sm text-slate-500 mt-1">{formatCurrency(dailyBudget)} / day</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Average CPM</div>
              <div className="text-3xl font-bold text-emerald-600">NT${formatCPM(exactAvgCpm)}</div>
              <div className="text-sm text-slate-500 mt-1">Highly efficient</div>
            </div>
          </div>

          <div className="flex items-start p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> The final pricing and delivery may depend on inventory availability at the time of launch. We will confirm your exact schedule after submission.
            </p>
          </div>
        </ReviewSection>

        {/* Selected Inventory */}
        <ReviewSection title={`Selected Locations (${selectedItems.length})`} icon={<MapPin />}>
          <div className="mb-4 flex flex-wrap gap-2">
            {Array.from(uniqueScreenTypes).map(t => (
              <span key={t} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold">{t}</span>
            ))}
            {Array.from(uniqueAudiences).slice(0, 3).map(a => (
              <span key={a} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold">{a}</span>
            ))}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-lg">Location</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold text-right">Daily Imp.</th>
                  <th className="px-4 py-3 font-semibold text-right">Duration</th>
                  <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedDetails.map(({ inventoryId, days, inventory }) => (
                  <tr key={inventoryId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{inventory.name}</div>
                      <div className="text-xs text-slate-500">{inventory.district}, {inventory.city}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{inventory.screenType}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{formatNumber(inventory.dailyImpressions)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{days} days</td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">{formatCurrency(inventory.pricePerDay * days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReviewSection>

        {/* Creatives Summary */}
        <ReviewSection title={`Creative Assets (${creatives.length})`} icon={<ImageIcon />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {creatives.map(creative => {
              const isVideo = creative.type.includes('video');
              const sizeMB = (creative.fileSize / (1024 * 1024)).toFixed(1);
              
              return (
                <div key={creative.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="h-32 bg-slate-100 relative group">
                    <img src={creative.previewUrl} alt={creative.name} className="w-full h-full object-cover" />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                        <Play className="w-8 h-8 text-white opacity-80" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-slate-900 text-sm truncate mb-1" title={creative.name}>
                      {creative.name}
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>{isVideo ? 'MP4' : 'Image'} • {sizeMB} MB</span>
                      <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">Pending</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ReviewSection>

        {/* Bottom Actions */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Upload
          </button>
        </div>

      </div>
    </div>
  );
}
