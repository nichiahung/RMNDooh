import React from 'react';
import { PlaylistItem, Screen } from '@/types/inventory';
import { Wifi, Monitor, Activity } from 'lucide-react';

interface Props {
  screen: Screen;
  currentItem: PlaylistItem | null;
  currentIndex: number;
  totalItems: number;
  lastHeartbeat: string;
}

export function PlayerStatusOverlay({ screen, currentItem, currentIndex, totalItems, lastHeartbeat }: Props) {
  
  return (
    <div className="absolute top-4 left-4 pointer-events-none z-40 opacity-70">
      <div className="bg-black/60 backdrop-blur-md rounded-lg border border-white/10 p-4 text-white font-mono text-xs shadow-2xl w-80">
        
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Wifi className="w-4 h-4" />
            <span className="font-bold tracking-wider">{screen.screenId}</span>
          </div>
          <div className="text-white/50 text-[10px]">
            {screen.resolution} • {screen.orientation.toUpperCase()}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start">
            <Monitor className="w-4 h-4 mr-2 text-white/40 mt-0.5" />
            <div className="flex-1">
              <div className="text-white/40 uppercase tracking-widest text-[9px] mb-0.5">Location</div>
              <div className="truncate" title={screen.screenName}>{screen.screenName}</div>
            </div>
          </div>

          {currentItem ? (
            <div className="bg-white/5 rounded p-2 border border-white/5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-indigo-300 font-bold">PLAYING</span>
                <span className="text-white/50">[{currentIndex + 1}/{totalItems}]</span>
              </div>
              <div className="text-white truncate mb-0.5" title={currentItem.campaignName}>{currentItem.campaignName}</div>
              <div className="text-white/60 truncate text-[10px]" title={currentItem.creativeName}>{currentItem.creativeName}</div>
              <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 animate-[progress_linear_forwards]"
                  style={{ animationDuration: `${currentItem.durationSeconds}s` }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-red-500/10 text-red-400 p-2 rounded border border-red-500/20">
              IDLE: No Playlist
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-white/10 text-[10px] text-white/40">
            <div className="flex items-center">
              <Activity className="w-3 h-3 mr-1 text-emerald-500" /> 
              Heartbeat
            </div>
            <span>{new Date(lastHeartbeat).toLocaleTimeString()}</span>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}} />
    </div>
  );
}
