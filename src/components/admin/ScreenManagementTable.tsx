import React from 'react';
import { Screen, InventoryLocation } from '@/types/inventory';
import { Search, RotateCw, MonitorPlay, AlertCircle } from 'lucide-react';

interface Props {
  screens: Screen[];
  inventory: InventoryLocation[];
}

export function ScreenManagementTable({ screens, inventory }: Props) {
  
  const getStatusBadge = (status: Screen['status']) => {
    switch(status) {
      case 'online':
        return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200">ONLINE</span>;
      case 'offline':
        return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-bold border border-red-200">OFFLINE</span>;
      case 'maintenance':
        return <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold border border-amber-200">MAINTENANCE</span>;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const ms = new Date().getTime() - new Date(dateStr).getTime();
    if (ms < 60000) return 'Just now';
    if (ms < 3600000) return `${Math.floor(ms/60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms/3600000)}h ago`;
    return `${Math.floor(ms/86400000)}d ago`;
  };

  return (
    <div className="flex flex-col h-full">
      
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search screens by ID or Location..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg text-sm shadow-sm hover:bg-slate-50 transition-colors">
            <RotateCw className="w-4 h-4 mr-2" /> Refresh Status
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Screen ID / Name</th>
              <th className="px-6 py-4 font-semibold">Location</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Last Heartbeat</th>
              <th className="px-6 py-4 font-semibold">Current Playback</th>
              <th className="px-6 py-4 font-semibold">Specs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {screens.map(screen => {
              const loc = inventory.find(i => i.id === screen.inventoryLocationId);
              const isOffline = screen.status === 'offline';
              
              return (
                <tr key={screen.screenId} className={`transition-colors ${isOffline ? 'bg-red-50/30' : 'hover:bg-slate-50'}`}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 font-mono text-xs">{screen.screenId}</div>
                    <div className="text-slate-600 mt-0.5">{screen.screenName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900">{loc?.name || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{loc?.district}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(screen.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center ${isOffline ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                      {isOffline && <AlertCircle className="w-3.5 h-3.5 mr-1" />}
                      {getTimeAgo(screen.lastHeartbeatAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {screen.status === 'online' ? (
                      screen.currentCampaignId ? (
                        <div className="flex items-center text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded inline-flex">
                          <MonitorPlay className="w-3.5 h-3.5 mr-1.5" /> 
                          {screen.currentCampaignId}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Default Loop</span>
                      )
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900 text-xs">{screen.resolution}</div>
                    <div className="text-slate-500 text-[10px] uppercase">{screen.orientation}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
