'use client';

import React, { useRef, useState } from 'react';
import { CreativeAsset, MediaPlanItem, InventoryLocation } from '@/types/inventory';
import { CreativePreviewCard } from './CreativePreviewCard';
import { CreativeRequirements } from './CreativeRequirements';
import { UploadCloud, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useI18n } from '@/i18n/I18nProvider';
import { uploadCreativeAsset } from '@/lib/api/creatives';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  creatives: CreativeAsset[];
  setCreatives: React.Dispatch<React.SetStateAction<CreativeAsset[]>>;
  onBack: () => void;
  onContinue: () => void;
}

export function CreativeUploadStep({ selectedItems, allInventory, creatives, setCreatives, onBack, onContinue }: Props) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  let exactTotalBudget = 0;
  selectedItems.forEach(item => {
    const inv = allInventory.find(i => i.id === item.inventoryId);
    if (inv) exactTotalBudget += inv.pricePerDay * item.days;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-selected
    setIsUploading(true);
    setUploadError(null);
    try {
      const creative = await uploadCreativeAsset(file);
      setCreatives(prev => [...prev, creative]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '上傳失敗，請再試一次');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveCreative = (id: string) => {
    setCreatives(creatives.filter(c => c.id !== id));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Step Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t('creative.title')}</h2>
            <p className="text-slate-500 mt-1">{t('creative.subtitle')}</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-right">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Media Plan Total</div>
            <div className="text-lg font-bold text-indigo-600">{formatCurrency(exactTotalBudget)} <span className="text-sm font-normal text-slate-500">({selectedItems.length} locations)</span></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload Area */}
          <div className="lg:col-span-2 space-y-6">
            <div
              className="bg-white border-2 border-dashed border-indigo-200 rounded-xl p-10 text-center hover:bg-indigo-50/50 hover:border-indigo-400 transition-all group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,video/mp4"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className={`w-8 h-8 ${isUploading ? 'text-slate-400 animate-pulse' : 'text-indigo-500'}`} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('creative.dropzone')}</h3>
              <p className="text-slate-500 text-sm mb-6">{t('creative.dropzoneDesc')}</p>
              <button
                disabled={isUploading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isUploading ? '上傳中...' : t('creative.browse')}
              </button>
            </div>

            {uploadError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            )}

            {/* Uploaded Assets List */}
            {creatives.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                  {t('creative.uploaded')} <span className="ml-2 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs">{creatives.length}</span>
                </h3>
                <div className="space-y-3">
                  {creatives.map(creative => (
                    <CreativePreviewCard 
                      key={creative.id} 
                      creative={creative} 
                      onRemove={handleRemoveCreative} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Requirements */}
          <div className="space-y-6">
            <CreativeRequirements 
              selectedItems={selectedItems} 
              allInventory={allInventory} 
            />
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('creative.backToInventory')}
          </button>
          
          <button 
            onClick={onContinue}
            disabled={creatives.length === 0}
            className="flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('creative.continueReview')} <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>

      </div>
    </div>
  );
}
