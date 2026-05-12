import React from 'react';
import { Campaign, CreativeAsset } from '@/types/inventory';
import { CheckCircle, XCircle, FileVideo, FileImage } from 'lucide-react';

interface Props {
  campaigns: Campaign[];
  onUpdateStatus: (campaignId: string, creativeId: string, status: CreativeAsset['status']) => void;
}

export function CreativeReviewQueue({ campaigns, onUpdateStatus }: Props) {
  
  // Flatten to get only pending creatives
  const pendingItems: { campaign: Campaign, creative: CreativeAsset }[] = [];
  
  campaigns.forEach(c => {
    c.creatives.forEach(cr => {
      if (cr.status === 'pending_review') {
        pendingItems.push({ campaign: c, creative: cr });
      }
    });
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Creative Review Queue</h2>
          <p className="text-sm text-slate-500">Review assets for compliance before campaign launch</p>
        </div>
        <div className="bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full text-sm">
          {pendingItems.length} Pending
        </div>
      </div>

      <div className="p-6 overflow-y-auto">
        {pendingItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-4" />
            <p className="text-lg font-medium text-slate-900">All caught up!</p>
            <p>There are no creatives pending review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendingItems.map(({ campaign, creative }) => {
              const isVideo = creative.type.includes('video');
              const sizeMB = (creative.fileSize / 1000000).toFixed(1);
              
              return (
                <div key={creative.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                  
                  {/* Preview Area */}
                  <div className="h-48 bg-slate-100 relative group border-b border-slate-200">
                    <img src={creative.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button className="bg-white/90 text-slate-900 font-semibold px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
                        View Full Size
                      </button>
                    </div>
                  </div>

                  {/* Details Area */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="font-semibold text-slate-900 text-sm mb-1 truncate" title={creative.name}>{creative.name}</div>
                    <div className="flex items-center text-xs text-slate-500 mb-3 pb-3 border-b border-slate-100 space-x-3">
                      <span className="flex items-center">
                        {isVideo ? <FileVideo className="w-3.5 h-3.5 mr-1 text-slate-400" /> : <FileImage className="w-3.5 h-3.5 mr-1 text-slate-400" />}
                        {isVideo ? 'MP4' : 'Image'}
                      </span>
                      <span>{sizeMB} MB</span>
                      {isVideo && creative.durationSeconds && <span>{creative.durationSeconds}s</span>}
                    </div>

                    <div className="text-xs space-y-1.5 mb-4 flex-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Campaign:</span>
                        <span className="font-medium text-slate-900 truncate max-w-[150px]">{campaign.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Advertiser:</span>
                        <span className="font-medium text-slate-900">{campaign.advertiserName}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button 
                        onClick={() => onUpdateStatus(campaign.id, creative.id, 'rejected')}
                        className="flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 font-semibold rounded hover:bg-red-100 transition-colors text-sm"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" /> Reject
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(campaign.id, creative.id, 'approved')}
                        className="flex items-center justify-center px-4 py-2 bg-emerald-500 text-white font-semibold rounded hover:bg-emerald-600 transition-colors text-sm shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
