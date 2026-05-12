'use client';

import React, { useState, useEffect } from 'react';
import { mockScreens } from '@/data/mockScreens';
import { mockPlaylists } from '@/data/mockPlaylists';
import { ProofOfPlayLog } from '@/types/inventory';
import { createProofOfPlayLog } from '@/utils/proofOfPlay';
import { PlayerScreen } from './PlayerScreen';
import { PlayerStatusOverlay } from './PlayerStatusOverlay';
import { PlayerPlaylistDebugPanel } from './PlayerPlaylistDebugPanel';

interface Props {
  screenId: string;
}

export function WebPlayerPage({ screenId }: Props) {
  const [isReady, setIsReady] = useState(false);
  
  // Lookups
  const screen = mockScreens.find(s => s.screenId === screenId);
  const rawPlaylist = mockPlaylists[screenId] || [];
  const playlist = rawPlaylist.length > 0 ? rawPlaylist : [];

  // Playback State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<string>(new Date().toISOString());
  const [popLogs, setPopLogs] = useState<ProofOfPlayLog[]>([]);

  // Initialization
  useEffect(() => {
    setIsReady(true);
  }, []);

  // Heartbeat Loop (every 10 seconds)
  useEffect(() => {
    if (!screen) return;
    
    const interval = setInterval(() => {
      setLastHeartbeat(new Date().toISOString());
      console.log(`[Heartbeat] Screen ${screenId} is alive.`);
    }, 10000);

    return () => clearInterval(interval);
  }, [screenId, screen]);

  // Playback Loop
  useEffect(() => {
    if (!screen || playlist.length === 0) return;

    const currentItem = playlist[currentIndex];
    
    // Log 'started' when item begins
    setPopLogs(prev => {
      const newLog = createProofOfPlayLog(screen, currentItem, currentIndex, 'started', 'online');
      const updated = [...prev, newLog];
      return updated.slice(-20); // Keep last 20 logs
    });

    // Advance to next item after duration
    const timer = setTimeout(() => {
      // Log 'completed' when item finishes
      setPopLogs(prev => {
        const newLog = createProofOfPlayLog(screen, currentItem, currentIndex, 'completed', 'online');
        const updated = [...prev, newLog];
        return updated.slice(-20);
      });
      
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }, currentItem.durationSeconds * 1000);

    return () => clearTimeout(timer);
  }, [currentIndex, playlist, screen]);

  // Keyboard shortcut (Shift + D) to toggle debug
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        setShowDebug(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isReady) return null; // Avoid hydration mismatch on initial render

  if (!screen) {
    return (
      <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center font-mono">
        <h1 className="text-4xl text-red-500 mb-4">404</h1>
        <h2 className="text-xl">Screen Not Found</h2>
        <p className="text-slate-500 mt-4">Screen ID: {screenId}</p>
      </div>
    );
  }

  const currentItem = playlist.length > 0 ? playlist[currentIndex] : null;

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden select-none">
      
      {/* 1. Main Display Surface */}
      <PlayerScreen item={currentItem} screen={screen} />

      {/* 2. HUD / Debug Overlay */}
      <PlayerStatusOverlay 
        screen={screen} 
        currentItem={currentItem} 
        currentIndex={currentIndex} 
        totalItems={playlist.length} 
        lastHeartbeat={lastHeartbeat}
      />

      {/* 3. Debug Panel Sidebar */}
      {showDebug && (
        <PlayerPlaylistDebugPanel 
          playlist={playlist} 
          currentIndex={currentIndex} 
          popLogs={popLogs}
          onClose={() => setShowDebug(false)} 
        />
      )}

      {/* Debug Toggle Button (hidden but clickable bottom right) */}
      <button 
        onClick={() => setShowDebug(!showDebug)}
        className="absolute bottom-2 right-2 w-8 h-8 opacity-0 hover:opacity-20 bg-white rounded-full transition-opacity z-50 cursor-crosshair"
        title="Toggle Debug (Shift+D)"
      />

    </div>
  );
}
