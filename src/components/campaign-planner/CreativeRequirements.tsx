'use client';

import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { Monitor, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
}

export function CreativeRequirements({ selectedItems, allInventory }: Props) {
  const { t } = useI18n();

  const selectedScreenTypes = new Set<string>();
  let hasOutdoor = false, hasIndoor = false;

  selectedItems.forEach(item => {
    const inv = allInventory.find(i => i.id === item.inventoryId);
    if (inv) {
      selectedScreenTypes.add(inv.screenType);
      if (['Billboard', 'Street Furniture', 'Transit'].includes(inv.screenType)) hasOutdoor = true;
      if (['Indoor', 'Kiosk'].includes(inv.screenType) || inv.venueType === 'Mall' || inv.venueType === 'Station') hasIndoor = true;
    }
  });

  const uniqueScreens = Array.from(selectedScreenTypes);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center">
          <Monitor className="w-4 h-4 mr-2 text-indigo-600" />
          {t('creative.req.title')}
        </h3>
        <span className="text-xs font-medium text-slate-500">
          {t('creative.req.basedOn')} {selectedItems.length} {t('creative.req.basedOnSuffix')}
        </span>
      </div>
      <div className="p-5">
        {hasOutdoor && hasIndoor && (
          <div className="mb-5 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800">{t('creative.req.multipleFormats')}</h4>
              <p className="text-xs text-amber-700 mt-1">{t('creative.req.multipleFormatsDesc')}</p>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('creative.req.selectedScreenTypes')}</h4>
            <div className="flex flex-wrap gap-2">
              {uniqueScreens.map(type => (
                <span key={type} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1 rounded border border-indigo-100">{type}</span>
              ))}
              {uniqueScreens.length === 0 && <span className="text-sm text-slate-500">{t('creative.req.noLocations')}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('creative.req.supportedFormats')}</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> JPG / PNG</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> MP4 (H.264)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('creative.req.recommendedSpecs')}</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>1920x1080 (Landscape)</li>
                <li>1080x1920 (Portrait)</li>
                <li>{t('creative.req.maxVideo')}</li>
                <li>{t('creative.req.maxSize')}</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-5 p-3 bg-slate-50 rounded text-xs text-slate-500 text-center border border-slate-100">
          {t('creative.req.complianceNote')}
        </div>
      </div>
    </div>
  );
}
