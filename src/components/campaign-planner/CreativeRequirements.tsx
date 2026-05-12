import React from 'react';
import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { Monitor, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
}

export function CreativeRequirements({ selectedItems, allInventory }: Props) {
  
  // Extract unique screen types from the selected media plan
  const selectedScreenTypes = new Set<string>();
  let hasOutdoor = false;
  let hasIndoor = false;

  selectedItems.forEach(item => {
    const inv = allInventory.find(i => i.id === item.inventoryId);
    if (inv) {
      selectedScreenTypes.add(inv.screenType);
      if (['Billboard', 'Street Furniture', 'Transit'].includes(inv.screenType)) hasOutdoor = true;
      if (['Indoor', 'Kiosk'].includes(inv.screenType) || inv.venueType === 'Mall' || inv.venueType === 'Station') hasIndoor = true;
    }
  });

  const uniqueScreens = Array.from(selectedScreenTypes);
  const needsMultipleFormats = hasOutdoor && hasIndoor;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center">
          <Monitor className="w-4 h-4 mr-2 text-indigo-600" />
          Screen Requirements
        </h3>
        <span className="text-xs font-medium text-slate-500">
          Based on {selectedItems.length} locations
        </span>
      </div>
      
      <div className="p-5">
        {/* Warning if multiple formats likely needed */}
        {needsMultipleFormats && (
          <div className="mb-5 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800">Multiple Formats Required</h4>
              <p className="text-xs text-amber-700 mt-1">
                Your selected inventory includes both indoor and outdoor screens. You may need to provide both landscape (16:9) and portrait (9:16) creatives.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Selected Screen Types</h4>
            <div className="flex flex-wrap gap-2">
              {uniqueScreens.map(type => (
                <span key={type} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1 rounded border border-indigo-100">
                  {type}
                </span>
              ))}
              {uniqueScreens.length === 0 && (
                <span className="text-sm text-slate-500">No locations selected</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Supported Formats</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> JPG / PNG</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> MP4 (H.264)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Recommended Specs</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li className="flex items-center">1920x1080 (Landscape)</li>
                <li className="flex items-center">1080x1920 (Portrait)</li>
                <li className="flex items-center">Max Video: 15s</li>
                <li className="flex items-center">Max Size: 100MB</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-5 p-3 bg-slate-50 rounded text-xs text-slate-500 text-center border border-slate-100">
          Creatives will be reviewed by our compliance team before campaign launch.
        </div>
      </div>
    </div>
  );
}
