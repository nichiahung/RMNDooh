'use client';

import { CreativeAsset } from '@/types/inventory';
import { Trash2, FileImage, FileVideo, Clock, FileWarning, CheckCircle } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  creative: CreativeAsset;
  onRemove: (id: string) => void;
}

export function CreativePreviewCard({ creative, onRemove }: Props) {
  const { t } = useI18n();
  const isVideo = creative.type.includes('video');
  const sizeMB = (creative.fileSize / (1024 * 1024)).toFixed(1);

  const getStatusDisplay = () => {
    switch (creative.status) {
      case 'uploaded':
        return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{t('creative.status.uploaded')}</span>;
      case 'pending_review':
        return <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-200"><Clock className="w-3 h-3 inline mr-1 -mt-0.5" />{t('creative.status.pendingReview')}</span>;
      case 'approved':
        return <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-200"><CheckCircle className="w-3 h-3 inline mr-1 -mt-0.5" />{t('creative.status.approved')}</span>;
      case 'rejected':
        return <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-200"><FileWarning className="w-3 h-3 inline mr-1 -mt-0.5" />{t('creative.status.rejected')}</span>;
      default: return null;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center space-x-4 shadow-sm hover:border-slate-300 transition-colors group">
      <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative border border-slate-200">
        <img src={creative.previewUrl} alt={creative.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-900/10" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <h4 className="text-sm font-semibold text-slate-900 truncate pr-4">{creative.name}</h4>
          {getStatusDisplay()}
        </div>
        <div className="flex items-center text-xs text-slate-500 space-x-3 mt-2">
          <div className="flex items-center">
            {isVideo ? <FileVideo className="w-3.5 h-3.5 mr-1 text-slate-400" /> : <FileImage className="w-3.5 h-3.5 mr-1 text-slate-400" />}
            {creative.type.split('/')[1].toUpperCase()}
          </div>
          <div>{sizeMB} MB</div>
          {isVideo && creative.durationSeconds && <div>{creative.durationSeconds}s</div>}
        </div>
      </div>
      <button onClick={() => onRemove(creative.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0" title={t('creative.removeAsset')}>
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}
