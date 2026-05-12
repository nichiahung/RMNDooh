import React, { useState } from 'react';
import { PlaylistItem, ProofOfPlayLog } from '@/types/inventory';
import { X, PlayCircle, Clock, List, FileText } from 'lucide-react';
import { ProofOfPlayLogPanel } from './ProofOfPlayLogPanel';

interface Props {
  playlist: PlaylistItem[];
  currentIndex: number;
  popLogs: ProofOfPlayLog[];
  onClose: () => void;
}

export function PlayerPlaylistDebugPanel({ playlist, currentIndex, popLogs, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'playlist' | 'logs'>('playlist');
  
  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 text-white font-mono flex flex-col shadow-2xl transition-transform animate-in slide-in-from-right duration-200">
      
      <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div>
          <h2 className="text-sm font-bold tracking-wider text-indigo-400">DEBUG CONSOLE</h2>
          <p className="text-xs text-white/50 mt-1">Playlist Queue ({playlist.length} items)</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-white/10 bg-black/40 text-xs font-semibold">
        <button 
          onClick={() => setActiveTab('playlist')}
          className={`flex-1 py-3 flex items-center justify-center transition-colors ${activeTab === 'playlist' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-white/50 hover:text-white/80'}`}
        >
          <List className="w-4 h-4 mr-2" /> Queue
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-3 flex items-center justify-center transition-colors ${activeTab === 'logs' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-white/50 hover:text-white/80'}`}
        >
          <FileText className="w-4 h-4 mr-2" /> PoP Logs
        </button>
      </div>

      {activeTab === 'playlist' ? (
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {playlist.length === 0 ? (
            <div className="text-center text-white/40 mt-10 text-xs">
              Playlist is empty.
            </div>
          ) : (
            <div className="space-y-3">
              {playlist.map((item, index) => {
                const isPlaying = index === currentIndex;
                
                return (
                  <div 
                    key={index} 
                    className={`p-3 rounded border transition-colors ${
                      isPlaying 
                        ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                        : 'bg-white/5 border-white/10 opacity-70'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center text-xs">
                        <span className={`w-5 h-5 rounded flex items-center justify-center mr-2 font-bold ${isPlaying ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/50'}`}>
                          {index + 1}
                        </span>
                        {isPlaying && <PlayCircle className="w-4 h-4 text-indigo-400 mr-1 animate-pulse" />}
                        <span className={isPlaying ? 'text-indigo-300 font-bold' : 'text-white/70'}>
                          {item.campaignId}
                        </span>
                      </div>
                      <span className="flex items-center text-[10px] text-white/40">
                        <Clock className="w-3 h-3 mr-1" /> {item.durationSeconds}s
                      </span>
                    </div>
                    
                    <div className="pl-7">
                      <div className="text-xs font-semibold text-white truncate mb-1" title={item.campaignName}>
                        {item.campaignName}
                      </div>
                      <div className="text-[10px] text-white/50 truncate flex justify-between">
                        <span>{item.creativeName}</span>
                        <span className="uppercase">{item.creativeType.split('/')[1]}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <ProofOfPlayLogPanel logs={popLogs} />
        </div>
      )}
      
      <div className="p-4 border-t border-white/10 bg-black/20 text-[10px] text-white/40 text-center">
        Mock Player Engine v1.0.0
      </div>
    </div>
  );
}
