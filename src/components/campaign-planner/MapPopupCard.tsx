'use client';

import { InventoryLocation } from '@/types/inventory';
import { formatCurrency, formatCompact, formatCPM } from '@/utils/formatters';
import { availabilityLabel } from '@/utils/availabilityLabel';
import { imgSrc } from '@/utils/imgSrc';
import { X, Check, Minus } from 'lucide-react';

export interface MapPopupCardProps {
  item: InventoryLocation;
  isSelected: boolean;
  onAdd: () => void;
  onRemove?: () => void;
  onViewDetail: () => void;
  onClose: () => void;
}

export function MapPopupCard({ item, isSelected, onAdd, onRemove, onViewDetail, onClose }: MapPopupCardProps) {
  const avail = availabilityLabel(item.availability);
  const canAdd = item.availability >= 0.3;

  return (
    <div className="w-60 font-sans rounded-xl overflow-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Thumbnail */}
      <div className="relative h-28 bg-slate-200">
        <img
          src={imgSrc(item.imageUrl)}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1579548485295-e2336336e8b4?auto=format&fit=crop&q=80&w=400';
          }}
        />
        <span
          className={`absolute top-2 left-2 ${avail.colorClass} text-white text-[10px] font-bold px-2 py-0.5 rounded`}
        >
          {avail.text}
        </span>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors"
          aria-label="關閉"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 bg-white">
        {/* Tags */}
        <div className="flex gap-1.5 mb-1.5">
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide">
            {item.venueType}
          </span>
          <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide">
            {item.screenType}
          </span>
        </div>

        {/* Name + address */}
        <div className="font-bold text-slate-900 text-sm leading-tight mb-0.5 line-clamp-1">
          {item.name}
        </div>
        <div className="text-[10px] text-slate-400 mb-3 line-clamp-1">
          📍 {item.district}, {item.city}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-100">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">日費</div>
            <div className="text-xs font-bold text-indigo-600">{formatCurrency(item.pricePerDay)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">CPM</div>
            <div className="text-xs font-bold text-slate-800">NT${formatCPM(item.cpm)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">每日曝光</div>
            <div className="text-xs font-bold text-slate-800">{formatCompact(item.dailyImpressions)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">最低預訂</div>
            <div className="text-xs font-bold text-slate-800">7 天</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isSelected && onRemove ? (
            <button
              onClick={onRemove}
              className="flex-1 group flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors bg-emerald-50 hover:bg-red-50 text-emerald-700 hover:text-red-600 border border-emerald-200 hover:border-red-200"
            >
              <Check className="w-3.5 h-3.5 group-hover:hidden" />
              <Minus className="w-3.5 h-3.5 hidden group-hover:block" />
              <span className="group-hover:hidden">已加入</span>
              <span className="hidden group-hover:inline">移除</span>
            </button>
          ) : (
            <button
              onClick={onAdd}
              disabled={isSelected || !canAdd}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                !canAdd
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {!canAdd ? '無庫存' : '＋ 加入計畫'}
            </button>
          )}
          <button
            onClick={onViewDetail}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >
            詳情 →
          </button>
        </div>
      </div>
    </div>
  );
}
