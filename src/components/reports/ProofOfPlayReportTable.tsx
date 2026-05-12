import React from 'react';
import { ProofOfPlayLog } from '@/types/inventory';
import { CheckCircle, XCircle, PlayCircle, SkipForward } from 'lucide-react';

interface Props {
  logs: ProofOfPlayLog[];
}

export function ProofOfPlayReportTable({ logs }: Props) {
  
  const getPlaybackIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'started': return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'skipped': return <SkipForward className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <table className="w-full text-sm text-left whitespace-nowrap">
      <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
        <tr>
          <th className="px-5 py-4 font-semibold">Timestamp</th>
          <th className="px-5 py-4 font-semibold">Screen</th>
          <th className="px-5 py-4 font-semibold">Creative</th>
          <th className="px-5 py-4 font-semibold text-center">Duration</th>
          <th className="px-5 py-4 font-semibold">Playback Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {logs.map(log => (
          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
            <td className="px-5 py-3 text-slate-600 font-mono text-xs">
              {new Date(log.playedAt).toLocaleString()}
            </td>
            <td className="px-5 py-3">
              <div className="font-semibold text-slate-900">{log.screenName}</div>
              <div className="text-[10px] text-slate-500 font-mono">{log.screenId}</div>
            </td>
            <td className="px-5 py-3">
              <div className="text-slate-900">{log.creativeName}</div>
              <div className="text-[10px] text-slate-500 uppercase">{log.creativeType.split('/')[1]}</div>
            </td>
            <td className="px-5 py-3 text-center text-slate-600 font-mono">
              {log.durationSeconds}s
            </td>
            <td className="px-5 py-3">
              <div className="flex items-center space-x-2">
                {getPlaybackIcon(log.playbackStatus)}
                <span className="capitalize font-medium text-slate-700">{log.playbackStatus}</span>
              </div>
            </td>
          </tr>
        ))}
        {logs.length === 0 && (
          <tr>
            <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
              No proof-of-play logs available for this campaign yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
