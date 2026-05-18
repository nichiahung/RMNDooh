'use client';

import { useRouter } from 'next/navigation';
import { X, TrendingUp, Clock, Star } from 'lucide-react';
import type { InventoryLocation } from '@/types/inventory';
import { buildCampaignPlannerExploreHref } from '@/utils/plannerRoutes';

interface VenueDetailPanelProps {
  venue: InventoryLocation | null;
  isUsed: boolean;
  onClose: () => void;
}

function availabilityLabel(a: number): { label: string; color: string } {
  if (a >= 0.7) return { label: '可用', color: '#6366f1' };
  if (a >= 0.3) return { label: '有限', color: '#f59e0b' };
  return { label: '不可用', color: '#94a3b8' };
}

function topPeakHours(peakHours: number[]): string {
  const indexed = peakHours.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => b.v - a.v);
  return indexed
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map(({ i }) => `${String(i).padStart(2, '0')}:00`)
    .join(' · ');
}

export function VenueDetailPanel({ venue, isUsed, onClose }: VenueDetailPanelProps) {
  const router = useRouter();
  const displayedVenue = venue;

  const avail = displayedVenue ? availabilityLabel(displayedVenue.availability) : { label: '', color: '' };

  return (
    <div
      className="absolute top-0 right-0 bottom-0 w-80 bg-white shadow-xl z-[1000] flex flex-col transition-transform duration-150 ease-out"
      style={{ transform: venue ? 'translateX(0)' : 'translateX(100%)' }}
    >
      {displayedVenue && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-slate-100">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">{displayedVenue.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{displayedVenue.district}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{displayedVenue.screenType}</span>
              </div>
            </div>
            <button onClick={onClose} aria-label="關閉" className="text-slate-400 hover:text-slate-600 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Availability */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: avail.color }} />
                <span className="text-sm text-slate-700">{avail.label}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${displayedVenue.availability * 100}%`, background: avail.color }} />
                </div>
                <span className="text-xs text-slate-400">{Math.round(displayedVenue.availability * 100)}%</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-0.5">日費用</div>
                <div className="text-sm font-semibold text-slate-800">NT${displayedVenue.pricePerDay.toLocaleString()}</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-0.5">日曝光</div>
                <div className="text-sm font-semibold text-slate-800">
                  {displayedVenue.dailyImpressions >= 10000
                    ? `${(displayedVenue.dailyImpressions / 10000).toFixed(0)}萬`
                    : displayedVenue.dailyImpressions.toLocaleString()}
                </div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-0.5">CPM</div>
                <div className="text-sm font-semibold text-slate-800">NT${displayedVenue.cpm.toFixed(0)}</div>
              </div>
            </div>

            {/* Audience tags */}
            <div>
              <div className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 受眾特徵
              </div>
              <div className="flex flex-wrap gap-1.5">
                {displayedVenue.audienceTags.map(tag => (
                  <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </div>

            {/* Peak hours */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>尖峰時段 {topPeakHours(displayedVenue.dna.peakHours)}</span>
            </div>

            {/* Used badge */}
            {isUsed && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                已使用於過去活動
              </div>
            )}

            {/* Description */}
            <p className="text-xs text-slate-500 leading-relaxed">{displayedVenue.description}</p>
          </div>

          {/* CTA */}
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => router.push(buildCampaignPlannerExploreHref({ inventoryId: displayedVenue.id }))}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              開始規劃此版位 <span>→</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
