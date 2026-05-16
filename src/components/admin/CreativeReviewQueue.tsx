'use client';

import { Campaign, CreativeAsset } from '@/types/inventory';
import { StandaloneCreative } from '@/lib/api/admin';
import { CheckCircle, XCircle, FileVideo, FileImage } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  campaigns: Campaign[];
  standaloneCreatives?: StandaloneCreative[];
  onUpdateStatus: (campaignId: string | null, creativeId: string, status: CreativeAsset['status']) => void;
}

// Unified item for the review queue
interface QueueItem {
  creativeId: string;
  campaignId: string | null;
  campaignName: string;
  advertiserName: string;
  name: string;
  type: string;
  fileSize: number;
  durationSeconds?: number;
  previewUrl: string;
}

export function CreativeReviewQueue({ campaigns, standaloneCreatives = [], onUpdateStatus }: Props) {
  const { t } = useI18n();

  const pendingItems: QueueItem[] = [];

  // Campaign-linked creatives
  campaigns.forEach(c => {
    c.creatives.forEach(cr => {
      if (cr.status === 'pending_review') {
        pendingItems.push({
          creativeId: cr.id,
          campaignId: c.id,
          campaignName: c.name,
          advertiserName: c.advertiserName,
          name: cr.name,
          type: cr.type,
          fileSize: cr.fileSize,
          durationSeconds: cr.durationSeconds,
          previewUrl: cr.previewUrl,
        });
      }
    });
  });

  // Standalone creatives (media-library uploads with no campaign)
  standaloneCreatives.forEach(sc => {
    if (sc.status === 'pending_review') {
      pendingItems.push({
        creativeId: sc.id,
        campaignId: null,
        campaignName: '素材庫上傳',
        advertiserName: '—',
        name: sc.name,
        type: sc.type,
        fileSize: sc.fileSize,
        durationSeconds: sc.durationSeconds,
        previewUrl: sc.previewUrl,
      });
    }
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t('admin.creative.title')}</h2>
          <p className="text-sm text-slate-500">{t('admin.creative.subtitle')}</p>
        </div>
        <div className="bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full text-sm">
          {pendingItems.length} {t('admin.creative.pending')}
        </div>
      </div>

      <div className="p-6 overflow-y-auto">
        {pendingItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-4" />
            <p className="text-lg font-medium text-slate-900">{t('admin.creative.allCaughtUp')}</p>
            <p>{t('admin.creative.noPending')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendingItems.map((item) => {
              const isVideo = item.type.includes('video');
              const sizeMB = (item.fileSize / 1000000).toFixed(1);
              return (
                <div key={item.creativeId} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="h-48 bg-slate-100 relative group border-b border-slate-200">
                    <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button className="bg-white/90 text-slate-900 font-semibold px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
                        {t('admin.creative.viewFullSize')}
                      </button>
                    </div>
                    {/* Badge for standalone uploads */}
                    {item.campaignId === null && (
                      <span className="absolute top-2 left-2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                        素材庫
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <div className="font-semibold text-slate-900 text-sm mb-1 truncate" title={item.name}>{item.name}</div>
                    <div className="flex items-center text-xs text-slate-500 mb-3 pb-3 border-b border-slate-100 space-x-3">
                      <span className="flex items-center">
                        {isVideo ? <FileVideo className="w-3.5 h-3.5 mr-1 text-slate-400" /> : <FileImage className="w-3.5 h-3.5 mr-1 text-slate-400" />}
                        {isVideo ? t('admin.creative.typeVideo') : t('admin.creative.typeImage')}
                      </span>
                      <span>{sizeMB} MB</span>
                      {isVideo && item.durationSeconds && <span>{item.durationSeconds}s</span>}
                    </div>

                    <div className="text-xs space-y-1.5 mb-4 flex-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('admin.creative.campaign')}</span>
                        <span className="font-medium text-slate-900 truncate max-w-[150px]">{item.campaignName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('admin.creative.advertiser')}</span>
                        <span className="font-medium text-slate-900">{item.advertiserName}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button
                        onClick={() => onUpdateStatus(item.campaignId, item.creativeId, 'rejected')}
                        className="flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 font-semibold rounded hover:bg-red-100 transition-colors text-sm"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" /> {t('admin.creative.reject')}
                      </button>
                      <button
                        onClick={() => onUpdateStatus(item.campaignId, item.creativeId, 'approved')}
                        className="flex items-center justify-center px-4 py-2 bg-emerald-500 text-white font-semibold rounded hover:bg-emerald-600 transition-colors text-sm shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" /> {t('admin.creative.approve')}
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
