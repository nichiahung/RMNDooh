'use client';

import { useMemo, useState } from 'react';
import { Calendar, CheckCircle, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { generateAiMediaPlans } from '@/lib/googleAiMediaPlanner';
import {
  getUnselectedPlanLocations,
  validateAiPlannerInput,
  type AiMediaPlanOption,
  type AiMediaPlanResponse,
  type AiPlannerInput,
} from '@/lib/aiMediaPlanner';
import type { InventoryLocation, MediaPlanItem } from '@/types/inventory';

interface Props {
  allInventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onAdd: (item: InventoryLocation) => void;
}

const today = new Date().toISOString().slice(0, 10);

export function AiMediaPlannerView({ allInventory, selectedItems, onAdd }: Props) {
  const [input, setInput] = useState<AiPlannerInput>({
    goalText: '台北通勤族品牌曝光，兼顧預算效率',
    budget: 100000,
    startDate: today,
    days: 14,
  });
  const [result, setResult] = useState<AiMediaPlanResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedOptionId, setAppliedOptionId] = useState<string | null>(null);

  const inventoryById = useMemo(
    () => new Map(allInventory.map(item => [item.id, item])),
    [allInventory],
  );

  async function handleGenerate() {
    const nextErrors = validateAiPlannerInput(input);
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
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
    const locations = getUnselectedPlanLocations(option, selectedItems, allInventory);
    locations.forEach(onAdd);
    setAppliedOptionId(option.id);
  }

  return (
    <div className="p-6 space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">AI Media Planner</h2>
            <p className="text-xs text-slate-500">輸入目標後產生三個 Media Plan 草案，確認後再套用。</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 items-end">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Campaign 目標</span>
            <textarea
              value={input.goalText}
              onChange={event => setInput(prev => ({ ...prev, goalText: event.target.value }))}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
              placeholder="例如：台北通勤族，預算 10 萬，兩週曝光"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">總預算 NTD</span>
            <input
              type="number"
              value={input.budget}
              onChange={event => setInput(prev => ({ ...prev, budget: Number(event.target.value) }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">開始日期</span>
            <input
              type="date"
              value={input.startDate}
              onChange={event => setInput(prev => ({ ...prev, startDate: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">天數</span>
            <input
              type="number"
              min={1}
              value={input.days}
              onChange={event => setInput(prev => ({ ...prev, days: Number(event.target.value) }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />
          </label>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-slate-300 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
            產生 AI 規劃
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
        <div key={index} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
          <div className="h-3 bg-slate-100 rounded w-full mb-2" />
          <div className="h-3 bg-slate-100 rounded w-4/5 mb-5" />
          <div className="h-20 bg-slate-100 rounded-xl" />
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
