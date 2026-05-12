import React from 'react';
import { CreativeDeliveryData, DeliveryStatus } from '@/types/inventory';
import { formatNumber } from '@/utils/formatters';
import { FileVideo, FileImage } from 'lucide-react';

interface Props {
  data: CreativeDeliveryData[];
}

export function PlaysByCreativeTable({ data }: Props) {
  
  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'on_track':
        return <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">On Track</span>;
      case 'under_delivering':
        return <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-200">Under Delivering</span>;
      case 'completed':
        return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Completed</span>;
      case 'paused':
        return <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Paused</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <table className="w-full text-sm text-left whitespace-nowrap">
      <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 sticky top-0 border-b border-slate-100 z-10">
        <tr>
          <th className="px-5 py-3 font-semibold">Creative Asset</th>
          <th className="px-5 py-3 font-semibold text-right">Plays</th>
          <th className="px-5 py-3 font-semibold text-right">Completion Rate</th>
          <th className="px-5 py-3 font-semibold text-right">Est. Imp.</th>
          <th className="px-5 py-3 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {data.map((item, i) => {
          const isVideo = item.creativeType.includes('video');
          return (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              <td className="px-5 py-3">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 ${isVideo ? 'bg-indigo-50' : 'bg-blue-50'}`}>
                    {isVideo ? <FileVideo className="w-4 h-4 text-indigo-500" /> : <FileImage className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 truncate max-w-[150px]" title={item.creativeName}>{item.creativeName}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{item.creativeType.split('/')[1]}</div>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3 text-right font-medium text-slate-900">{formatNumber(item.plays)}</td>
              <td className="px-5 py-3 text-right">
                <span className={`font-semibold ${item.completionRate < 0.9 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {Math.round(item.completionRate * 100)}%
                </span>
              </td>
              <td className="px-5 py-3 text-right text-indigo-600 font-medium">{formatNumber(item.estimatedImpressions)}</td>
              <td className="px-5 py-3">{getStatusBadge(item.status)}</td>
            </tr>
          );
        })}
        {data.length === 0 && (
          <tr>
            <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No creative data available</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
