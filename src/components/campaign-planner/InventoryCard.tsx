import { InventoryLocation } from '@/types/inventory';
import { formatCurrency, formatCompact, formatCPM } from '@/utils/formatters';
import { MapPin, Users, Monitor, Check, Plus, Info } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { imgSrc } from '@/utils/imgSrc';
import { AUDIENCE_KEY } from '@/i18n/filterLabels';
import { computeMatchScore } from '@/utils/matchScore';

interface Props {
  item: InventoryLocation;
  isSelected: boolean;
  onViewDetails: () => void;
  onAdd: () => void;
  objective?: string;
}

export function InventoryCard({ item, isSelected, onViewDetails, onAdd, objective }: Props) {
  const { t } = useI18n();
  return (
    <div className={`bg-white rounded-xl border flex flex-col overflow-hidden transition-all group ${
      isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
    }`}>
      {/* Image Header */}
      <div className="h-32 relative overflow-hidden bg-slate-100">
        <img 
          src={imgSrc(item.imageUrl)}
          alt={item.name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579548485295-e2336336e8b4?auto=format&fit=crop&q=80&w=800'; }}
        />
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur px-2 py-1 rounded shadow-sm text-xs font-bold text-slate-800 border border-slate-100/50">
          NT${formatCPM(item.cpm)} CPM
        </div>
        {item.availability > 0.8 && (
          <div className="absolute bottom-2 right-2 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">
            {t('card.highAvailability')}
          </div>
        )}
        {objective && (() => {
          const score = computeMatchScore(item, objective);
          const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#94a3b8';
          const circumference = 100;
          return (
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-full p-0.5 shadow-sm">
              <div className="relative w-9 h-9 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3"
                    strokeDasharray={`${circumference} ${circumference}`} />
                  <circle cx="18" cy="18" r="15.9155" fill="none"
                    stroke={color} strokeWidth="3"
                    strokeDasharray={`${score} ${circumference - score}`}
                    strokeLinecap="round" />
                </svg>
                <span className="text-[9px] font-bold text-slate-800 z-10 leading-none">{score}%</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-900 line-clamp-1 mb-0.5">{item.name}</h3>
        <p className="text-xs text-slate-500 flex items-center mb-2">
          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
          {item.district}, {item.city}
        </p>

        {/* Tags — single row, overflow hidden */}
        <div className="flex gap-1 mb-2 overflow-hidden">
          {item.audienceTags.slice(0, 2).map(tag => (
            <span key={tag} className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded whitespace-nowrap">
              {t(AUDIENCE_KEY[tag] ?? tag)}
            </span>
          ))}
          {item.audienceTags.length > 2 && (
            <span className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded whitespace-nowrap">
              +{item.audienceTags.length - 2}
            </span>
          )}
        </div>

        {/* Stats — single compact row */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 mb-3 text-xs text-slate-600">
          <span className="flex items-center gap-1 min-w-0">
            <Monitor className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="truncate">{item.screenType}</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 font-semibold text-slate-900">
            <Users className="w-3 h-3 text-slate-400" />
            {formatCompact(item.dailyImpressions)}
            <span className="font-normal text-slate-400">/day</span>
          </span>
        </div>

        {/* Footer — price row + full-width action button */}
        <div className="mt-auto pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-bold text-slate-900 text-sm">{formatCurrency(item.pricePerDay)}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t('card.pricePerDay')}</div>
            </div>
            <button
              onClick={onViewDetails}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="View Details"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onAdd}
            disabled={isSelected}
            className={`w-full flex items-center justify-center py-1.5 text-sm font-medium rounded transition-colors ${
              isSelected
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
            }`}
          >
            {isSelected ? (
              <><Check className="w-4 h-4 mr-1" />{t('planner.inPlan')}</>
            ) : (
              <><Plus className="w-4 h-4 mr-1" />{t('planner.addToPlan')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
