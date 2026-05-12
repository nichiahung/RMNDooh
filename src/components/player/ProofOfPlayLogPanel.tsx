import React from 'react';
import { ProofOfPlayLog } from '@/types/inventory';
import { summarizeProofOfPlayLogs } from '@/utils/proofOfPlay';
import { PlayCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  logs: ProofOfPlayLog[];
}

export function ProofOfPlayLogPanel({ logs }: Props) {
  const summary = summarizeProofOfPlayLogs(logs);

  const getStatusBadge = (status: ProofOfPlayLog['playbackStatus']) => {
    switch (status) {
      case 'started':
        return <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border border-blue-500/30">Started</span>;
      case 'completed':
        return <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border border-emerald-500/30">Completed</span>;
      case 'skipped':
        return <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border border-amber-500/30">Skipped</span>;
      case 'failed':
        return <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border border-red-500/30">Failed</span>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-white/10">
        <div className="bg-white/5 border border-white/10 rounded p-2">
          <div className="text-[10px] text-white/50 uppercase mb-1 flex items-center">
            <PlayCircle className="w-3 h-3 mr-1" /> Total Plays
          </div>
          <div className="text-lg font-bold text-white">{summary.totalPlays}</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2">
          <div className="text-[10px] text-emerald-400/70 uppercase mb-1 flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" /> Completed
          </div>
          <div className="text-lg font-bold text-emerald-400">{summary.completedPlays}</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
          <div className="text-[10px] text-red-400/70 uppercase mb-1 flex items-center">
            <XCircle className="w-3 h-3 mr-1" /> Failed
          </div>
          <div className="text-lg font-bold text-red-400">{summary.failedPlays}</div>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded p-2">
          <div className="text-[10px] text-indigo-400/70 uppercase mb-1 flex items-center">
            <Clock className="w-3 h-3 mr-1" /> Total Time
          </div>
          <div className="text-lg font-bold text-indigo-400">{summary.totalPlaybackSeconds}s</div>
        </div>
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-center text-white/40 mt-10 text-xs">
            No logs generated yet.
          </div>
        ) : (
          <div className="space-y-2">
            {[...logs].reverse().map(log => (
              <div key={log.id} className="bg-black/40 border border-white/5 rounded p-2 text-xs">
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-white/40 text-[9px] font-mono">{new Date(log.playedAt).toLocaleTimeString()}</span>
                  {getStatusBadge(log.playbackStatus)}
                </div>
                <div className="font-semibold text-white/90 truncate">{log.campaignName}</div>
                <div className="text-white/50 text-[10px] truncate flex justify-between mt-0.5">
                  <span>{log.creativeName}</span>
                  <span>{log.durationSeconds}s</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
