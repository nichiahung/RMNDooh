import React from 'react';
import { InventoryLocation } from '@/types/inventory';
import { formatCurrency, formatNumber, formatCPM } from '@/utils/formatters';
import { X, MapPin, Users, Monitor, Building, Clock, Calendar, Check } from 'lucide-react';
import { imgSrc } from '@/utils/imgSrc';

interface Props {
  item: InventoryLocation;
  isSelected: boolean;
  onClose: () => void;
  onAdd: () => void;
}

export function InventoryDetailCard({ item, isSelected, onClose, onAdd }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Image */}
        <div className="h-64 relative bg-slate-100 flex-shrink-0">
          <img 
            src={imgSrc(item.imageUrl)}
            alt={item.name} 
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579548485295-e2336336e8b4?auto=format&fit=crop&q=80&w=800'; }}
          />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-slate-900/50 hover:bg-slate-900/80 text-white p-2 rounded-full backdrop-blur transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded text-xs font-semibold tracking-wide uppercase border border-indigo-100">
                  {item.venueType}
                </span>
                <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded text-xs font-semibold tracking-wide uppercase border border-slate-200">
                  {item.screenType}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{item.name}</h2>
              <p className="text-slate-500 flex items-center">
                <MapPin className="w-4 h-4 mr-1.5 text-slate-400" />
                {item.address}, {item.district}, {item.city}
              </p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:w-64 flex-shrink-0">
              <div className="mb-3">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pricing</div>
                <div className="text-xl font-bold text-slate-900">{formatCurrency(item.pricePerDay)} <span className="text-sm font-normal text-slate-500">/ day</span></div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Efficiency</div>
                <div className="text-sm font-semibold text-indigo-600">NT${formatCPM(item.cpm)} CPM</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Description</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Audience Demographics</h3>
                <div className="flex flex-wrap gap-2">
                  {item.audienceTags.map(tag => (
                    <span key={tag} className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-md border border-blue-100">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Location Specs</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Users className="w-4 h-4 text-slate-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{formatNumber(item.dailyImpressions)}</div>
                      <div className="text-xs text-slate-500">Estimated Daily Impressions</div>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Clock className="w-4 h-4 text-slate-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">06:00 - 24:00</div>
                      <div className="text-xs text-slate-500">Operating Hours</div>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Calendar className="w-4 h-4 text-slate-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">7 Days</div>
                      <div className="text-xs text-slate-500">Minimum Booking</div>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Monitor className="w-4 h-4 text-slate-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{(item.availability * 100).toFixed(0)}%</div>
                      <div className="text-xs text-slate-500">Current Availability</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button 
            onClick={onAdd}
            disabled={isSelected}
            className={`flex items-center px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors shadow-sm ${
              isSelected 
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isSelected ? (
              <><Check className="w-4 h-4 mr-2" /> Added to Plan</>
            ) : (
              'Add to Media Plan'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
