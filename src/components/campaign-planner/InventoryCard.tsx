import React from 'react';
import { InventoryLocation } from '@/types/inventory';
import { formatCurrency, formatNumber, formatCPM } from '@/utils/formatters';
import { MapPin, Users, Monitor, Building, Check, Plus, Info } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { imgSrc } from '@/utils/imgSrc';
import { AUDIENCE_KEY } from '@/i18n/filterLabels';

interface Props {
  item: InventoryLocation;
  isSelected: boolean;
  onViewDetails: () => void;
  onAdd: () => void;
}

export function InventoryCard({ item, isSelected, onViewDetails, onAdd }: Props) {
  const { t } = useI18n();
  return (
    <div className={`bg-white rounded-xl border flex flex-col overflow-hidden transition-all group ${
      isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
    }`}>
      {/* Image Header */}
      <div className="h-40 relative overflow-hidden bg-slate-100">
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
          <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">
            {t('card.highAvailability')}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-900 line-clamp-1 mb-1">{item.name}</h3>
        <p className="text-xs text-slate-500 flex items-center mb-3">
          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
          {item.district}, {item.city}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.audienceTags.slice(0, 3).map(tag => (
            <span key={tag} className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded">
              {t(AUDIENCE_KEY[tag] ?? tag)}
            </span>
          ))}
          {item.audienceTags.length > 3 && (
            <span className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded">
              +{item.audienceTags.length - 3}
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-2 border-t border-slate-100 pt-3 mb-4">
          <div className="flex items-center text-xs font-medium text-slate-600">
            <Monitor className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            {item.screenType}
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600">
            <Building className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            {item.venueType}
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600 col-span-2">
            <Users className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span className="text-slate-900 font-semibold mr-1">{formatNumber(item.dailyImpressions)}</span> {t('card.impPerDay')}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900">
              {formatCurrency(item.pricePerDay)}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t('card.pricePerDay')}</div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={onViewDetails}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="View Details"
            >
              <Info className="w-5 h-5" />
            </button>
            <button 
              onClick={onAdd}
              disabled={isSelected}
              className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                isSelected 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                  : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
              }`}
            >
              {isSelected ? (
                <><Check className="w-4 h-4 mr-1" /> {t('planner.inPlan')}</>
              ) : (
                <><Plus className="w-4 h-4 mr-1" /> {t('planner.addToPlan')}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
