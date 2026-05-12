import React from 'react';
import { PlaylistItem, Screen } from '@/types/inventory';
import { MonitorPlay } from 'lucide-react';

interface Props {
  item: PlaylistItem | null;
  screen: Screen;
}

export function PlayerScreen({ item, screen }: Props) {
  
  if (!item) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
        <MonitorPlay className="w-16 h-16 mb-6 opacity-20" />
        <h2 className="text-2xl font-semibold tracking-widest uppercase">DOOH Player</h2>
        <p className="text-sm mt-2 opacity-50">No active campaign scheduled</p>
      </div>
    );
  }

  const isVideo = item.creativeType.includes('video');

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
      {/* 
        In a real DOOH player, this might be a native WebView or customized Chromium instance. 
        Here we mock full-screen playback via CSS.
      */}
      {isVideo ? (
        <div className="relative w-full h-full">
          {/* Mock Video Player */}
          <video 
            src={item.creativeUrl} 
            className="w-full h-full object-contain"
            autoPlay 
            muted 
            loop 
            playsInline
          />
        </div>
      ) : (
        <div className="relative w-full h-full">
          {/* Mock Image Player */}
          <img 
            src={item.creativeUrl} 
            alt={item.creativeName} 
            className="w-full h-full object-contain animate-in fade-in duration-1000"
          />
        </div>
      )}
    </div>
  );
}
