import React from 'react';
import { DailyDeliveryData } from '@/types/inventory';
import { formatNumber } from '@/utils/formatters';

interface Props {
  data: DailyDeliveryData[];
}

export function CampaignDeliveryChart({ data }: Props) {
  
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">No delivery data available</div>;
  }

  // Calculate max value to scale the bars
  const maxPlays = Math.max(...data.map(d => d.plays));
  const maxImpressions = Math.max(...data.map(d => d.estimatedImpressions));

  return (
    <div className="w-full h-72 flex flex-col">
      {/* Chart Area */}
      <div className="flex-1 flex items-end justify-between space-x-2 pt-6 relative">
        
        {/* Y-Axis Grid Lines (Mock) */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          <div className="border-b border-slate-100 w-full h-0" />
          <div className="border-b border-slate-100 w-full h-0" />
          <div className="border-b border-slate-100 w-full h-0" />
          <div className="border-b border-slate-100 w-full h-0" />
          <div className="border-b border-slate-200 w-full h-0" />
        </div>

        {/* Bars */}
        {data.map((day, i) => {
          const playsHeight = maxPlays > 0 ? (day.plays / maxPlays) * 100 : 0;
          const impressionsHeight = maxImpressions > 0 ? (day.estimatedImpressions / maxImpressions) * 100 : 0;
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full z-10 group relative">
              
              {/* Tooltip */}
              <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs rounded py-1.5 px-3 whitespace-nowrap shadow-xl pointer-events-none z-20">
                <div className="font-semibold mb-0.5">{new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                <div>{formatNumber(day.plays)} Plays</div>
                <div className="text-indigo-300">{formatNumber(day.estimatedImpressions)} Est. Imp.</div>
                
                {/* Tooltip triangle */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
              </div>

              {/* Bar Container */}
              <div className="w-full max-w-[40px] flex items-end space-x-0.5 relative h-full">
                {/* Plays Bar */}
                <div 
                  className="flex-1 bg-slate-300 rounded-t-sm hover:bg-slate-400 transition-colors"
                  style={{ height: `${playsHeight}%` }}
                />
                {/* Impressions Bar */}
                <div 
                  className="flex-1 bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-colors"
                  style={{ height: `${impressionsHeight}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-between mt-3 text-[10px] font-medium text-slate-500">
        {data.map((day, i) => (
          <div key={i} className="flex-1 text-center truncate px-1">
            {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center items-center space-x-6 mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center text-xs text-slate-600 font-medium">
          <div className="w-3 h-3 rounded-sm bg-slate-300 mr-2" />
          Verified Plays (PoP)
        </div>
        <div className="flex items-center text-xs text-slate-600 font-medium">
          <div className="w-3 h-3 rounded-sm bg-indigo-500 mr-2" />
          Estimated Impressions
        </div>
      </div>
    </div>
  );
}
