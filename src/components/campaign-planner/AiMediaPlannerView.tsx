'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { Calendar, CheckCircle, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { generateAiMediaPlans } from '@/lib/googleAiMediaPlanner';
import { addDays, flightDays } from '@/utils/dates';
import {
  validateAiPlannerInput,
  type AiMediaPlanOption,
  type AiMediaPlanResponse,
  type AiPlannerInput,
} from '@/lib/aiMediaPlanner';
import type { InventoryLocation, MediaPlanAddOptions, MediaPlanItem } from '@/types/inventory';
import { AiPlanMiniMap } from './AiPlanMiniMap';

interface Props {
  allInventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onAdd: (item: InventoryLocation, options?: MediaPlanAddOptions) => void;
  flightStart: string | null;
  flightEnd: string | null;
  onFlightDateChange: (start: string | null, end: string | null) => void;
}

const today = new Date().toISOString().slice(0, 10);

export function AiMediaPlannerView({
  allInventory,
  selectedItems,
  onAdd,
  flightStart,
  flightEnd,
  onFlightDateChange,
}: Props) {
  const [input, setInput] = useState<AiPlannerInput>({
    goalText: '台北通勤族品牌曝光，兼顧預算效率',
    budget: 100000,
    startDate: today,
    days: 14,
  });
  const [syncedFlightKey, setSyncedFlightKey] = useState<string | null>(null);
  const [result, setResult] = useState<AiMediaPlanResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedOptionId, setAppliedOptionId] = useState<string | null>(null);

  const inventoryById = useMemo(
    () => new Map(allInventory.map(item => [item.id, item])),
    [allInventory],
  );

  const currentFlightKey = flightStart && flightEnd ? `${flightStart}|${flightEnd}` : null;
  if (flightStart && flightEnd && currentFlightKey !== syncedFlightKey) {
    const nextFlightStart = flightStart;
    const nextFlightEnd = flightEnd;
    setSyncedFlightKey(currentFlightKey);
    setInput(prev => ({
      ...prev,
      startDate: nextFlightStart,
      days: flightDays(nextFlightStart, nextFlightEnd),
    }));
  }

  async function handleGenerate() {
    const nextErrors = validateAiPlannerInput(input);
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    onFlightDateChange(input.startDate, addDays(input.startDate, input.days - 1));
    setIsLoading(true);
    setAppliedOptionId(null);
    try {
      const nextResult = await generateAiMediaPlans(input, allInventory);
      setResult(nextResult);
    } catch {
      setErrors(['AI 規劃暫時無法產生，請稍後再試。']);
    } finally {
      setIsLoading(false);
    }
  }

  function applyOption(option: AiMediaPlanOption) {
    const selectedIds = new Set(selectedItems.map(item => item.inventoryId));
    option.items.forEach(planItem => {
      if (selectedIds.has(planItem.inventoryId)) return;
      const location = inventoryById.get(planItem.inventoryId);
      if (!location) return;
      onAdd(location, {
        days: planItem.days,
        startDate: input.startDate,
        endDate: addDays(input.startDate, planItem.days - 1),
      });
    });
    setAppliedOptionId(option.id);
  }

  return (
    <div className="p-6 space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-400" />
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
              {isLoading && <span className="absolute inset-0 rounded-xl border border-indigo-300 animate-ping" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">AI Media Planner</h2>
              <p className="text-xs text-slate-500">Mockup 模式會依目前版位資料產生三個 Media Plan 草案。</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Mockup mode
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1.45fr)_minmax(140px,0.75fr)_minmax(150px,0.75fr)_minmax(110px,0.55fr)_auto] lg:items-end">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Campaign 目標</span>
            <textarea
              value={input.goalText}
              onChange={event => setInput(prev => ({ ...prev, goalText: event.target.value }))}
              rows={2}
              className="min-h-11 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
              placeholder="例如：台北通勤族，預算 10 萬，兩週曝光"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">總預算 NTD</span>
            <input
              type="number"
              value={input.budget}
              onChange={event => setInput(prev => ({ ...prev, budget: Number(event.target.value) }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">開始日期</span>
            <input
              type="date"
              value={input.startDate}
              onChange={event => setInput(prev => ({ ...prev, startDate: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">天數</span>
            <input
              type="number"
              min={1}
              value={input.days}
              onChange={event => setInput(prev => ({ ...prev, days: Number(event.target.value) }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />
          </label>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="group relative h-11 min-w-[142px] overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:shadow-md hover:shadow-indigo-200 disabled:cursor-wait disabled:opacity-90"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {isLoading && <span className="absolute inset-0 animate-pulse bg-white/10" />}
            <span className="relative flex items-center justify-center gap-2 whitespace-nowrap">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              {isLoading ? 'AI 正在規劃...' : '產生 AI 規劃'}
            </span>
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
            {errors.join('、')}
          </div>
        )}
      </section>

      {isLoading && <SkeletonOptions />}

      {result?.notice && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800">
          {result.notice}
        </div>
      )}

      {result && result.options.length === 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-500">
          目前沒有符合條件的版位，請調整條件後重新產生。
        </div>
      )}

      {result && result.options.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {result.options.map(option => (
            <PlanOptionCard
              key={option.id}
              option={option}
              inventoryById={inventoryById}
              isApplied={appliedOptionId === option.id}
              onApply={() => applyOption(option)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonOptions() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {[0, 1, 2].map(index => (
        <div
          key={index}
          className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"
          style={{ '--ai-shimmer-delay': `${index * 120}ms` } as CSSProperties}
        >
          <div className="ai-planner-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-indigo-100/70 to-transparent" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-indigo-100" />
              <div className="h-4 w-1/3 rounded bg-slate-200" />
            </div>
            <div className="mb-2 h-3 w-full rounded bg-slate-100" />
            <div className="mb-5 h-3 w-4/5 rounded bg-slate-100" />
            <div className="h-20 rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanOptionCard({
  option,
  inventoryById,
  isApplied,
  onApply,
}: {
  option: AiMediaPlanOption;
  inventoryById: Map<string, InventoryLocation>;
  isApplied: boolean;
  onApply: () => void;
}) {
  const mapLocations = option.items
    .map(item => inventoryById.get(item.inventoryId))
    .filter((location): location is InventoryLocation => Boolean(location));

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{option.title}</h3>
          {isApplied && <CheckCircle className="w-5 h-5 text-emerald-600" />}
        </div>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{option.summary}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Metric label="預算" value={`NT$${option.totalBudget.toLocaleString()}`} />
        <Metric label="曝光" value={option.estimatedImpressions.toLocaleString()} />
        <Metric label="CPM" value={`NT$${option.averageCpm.toFixed(1)}`} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-3 py-2">
          <span className="text-xs font-semibold text-slate-700">方案地圖</span>
          <span className="text-[11px] text-slate-500">{mapLocations.length} 個版位</span>
        </div>
        <div className="h-32">
          <AiPlanMiniMap locations={mapLocations} />
        </div>
      </div>

      <div className="space-y-2">
        {option.items.map(item => {
          const venue = inventoryById.get(item.inventoryId);
          return (
            <div key={item.inventoryId} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{venue?.name ?? item.inventoryId}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {venue ? `${venue.district} · ${venue.screenType}` : 'InventoryLocation'}
                  </p>
                </div>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {item.days} 天
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.reason}</p>
            </div>
          );
        })}
      </div>

      {option.creativeFormats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {option.creativeFormats.map(format => (
            <span key={format} className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700">
              {format}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={onApply}
        className="mt-auto rounded-xl bg-slate-900 text-white text-sm font-semibold py-2.5 hover:bg-slate-800"
      >
        {isApplied ? '已套用到 Media Plan' : '套用到 Media Plan'}
      </button>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{value}</div>
    </div>
  );
}
