export interface StatusBadgeProps {
  value: string;
  map: Record<string, string>;
  /** 'pill' rounds fully; 'tag' uses small rounded corners (default) */
  shape?: 'tag' | 'pill';
  label?: string;
}

export function StatusBadge({ value, map, shape = 'tag', label }: StatusBadgeProps) {
  const cls = map[value] ?? 'bg-slate-100 text-slate-500';
  const radius = shape === 'pill' ? 'rounded-full' : 'rounded';
  return (
    <span className={`inline-flex px-2 py-0.5 ${radius} text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label ?? value.replace(/_/g, ' ')}
    </span>
  );
}
