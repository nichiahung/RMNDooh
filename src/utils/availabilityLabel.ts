export function availabilityLabel(availability: number): {
  text: string;
  colorClass: string;
} {
  const pct = Math.round(availability * 100);
  if (availability >= 0.7) return { text: `${pct}% 可用`, colorClass: 'bg-emerald-500' };
  if (availability >= 0.3) return { text: `${pct}% 可用`, colorClass: 'bg-amber-500' };
  return { text: `${pct}% 可用`, colorClass: 'bg-slate-400' };
}
