'use client';

import { useState } from 'react';
import { CreativeReviewQueue } from './CreativeReviewQueue';
import { AdminCreativeLibraryPanel } from './AdminCreativeLibraryPanel';
import type { Campaign } from '@/types/inventory';
import type { StandaloneCreative } from '@/lib/api/admin';

type SubTab = 'pending' | 'library';

interface Props {
  campaigns: Campaign[];
  standaloneCreatives: StandaloneCreative[];
  onUpdateStatus: (campaignId: string | null, creativeId: string, status: string) => void;
}

export function CreativeReviewPanel({ campaigns, standaloneCreatives, onUpdateStatus }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('pending');

  return (
    <div>
      <div className="flex border-b border-slate-200 px-4 pt-2">
        {(['pending', 'library'] as SubTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              subTab === tab
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'pending' ? '待審核 Pending Review' : '素材庫 Asset Library'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {subTab === 'pending' && (
          <CreativeReviewQueue
            campaigns={campaigns}
            standaloneCreatives={standaloneCreatives}
            onUpdateStatus={onUpdateStatus}
          />
        )}
        {subTab === 'library' && <AdminCreativeLibraryPanel />}
      </div>
    </div>
  );
}
