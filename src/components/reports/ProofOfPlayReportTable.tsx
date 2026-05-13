'use client';

import { ProofOfPlayLog } from '@/types/inventory';
import { CheckCircle, XCircle, PlayCircle, SkipForward } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  logs: ProofOfPlayLog[];
}

export function ProofOfPlayReportTable({ logs }: Props) {
  const { t } = useI18n();

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
    <>
      {/* Desktop table (md and up) */}
      <table className="hidden md:table w-full text-sm text-left whitespace-nowrap">
        <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
          <tr>
            <th className="px-5 py-4 font-semibold">{t('reports.pop.col.timestamp')}</th>
            <th className="px-5 py-4 font-semibold">{t('reports.pop.col.screen')}</th>
            <th className="px-5 py-4 font-semibold">{t('reports.pop.col.creative')}</th>
            <th className="px-5 py-4 font-semibold text-center">{t('reports.pop.col.duration')}</th>
            <th className="px-5 py-4 font-semibold">{t('reports.pop.col.playbackStatus')}</th>
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
                {t('reports.pop.noData')}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Mobile cards (below md) */}
      <div className="md:hidden divide-y divide-slate-100 bg-white">
        {logs.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            {t('reports.pop.noData')}
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="px-4 py-3 space-y-2 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  {getPlaybackIcon(log.playbackStatus)}
                  <span className="capitalize font-medium text-slate-700 text-sm truncate">{log.playbackStatus}</span>
                </div>
                <span className="text-xs text-slate-500 font-mono flex-shrink-0">{log.durationSeconds}s</span>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 text-sm truncate">{log.screenName}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">{log.screenId}</div>
              </div>
              <div className="min-w-0">
                <div className="text-slate-900 text-sm truncate">{log.creativeName}</div>
                <div className="text-[10px] text-slate-500 uppercase">{log.creativeType.split('/')[1]}</div>
              </div>
              <div className="text-xs text-slate-600 font-mono">
                {new Date(log.playedAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
