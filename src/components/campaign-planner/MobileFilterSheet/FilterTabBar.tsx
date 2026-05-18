'use client';

import { useEffect, useRef } from 'react';

export interface FilterTab {
  id: string;
  label: string;
  activeCount: number;
}

interface FilterTabBarProps {
  tabs: FilterTab[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function FilterTabBar({ tabs, activeIndex, onTabChange }: FilterTabBarProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIndex]);

  return (
    <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-white flex-shrink-0">
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          ref={i === activeIndex ? activeRef : null}
          type="button"
          onClick={() => onTabChange(i)}
          className={`relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 border-b-2 ${
            i === activeIndex
              ? 'text-indigo-600 border-indigo-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          {tab.label}
          {tab.activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
              {tab.activeCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
