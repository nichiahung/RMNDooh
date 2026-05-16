'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MapPin, Eye } from 'lucide-react';
import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { ListView } from './ListView';
import { MapWrapper } from './MapWrapper';
import { PlannerTopbar } from './PlannerTopbar';
import { ViewMode } from './ViewToggle';
import { queryInventory, buildResponseText } from '@/lib/mockAI';

interface Props {
  inventory: InventoryLocation[];
  allInventory: InventoryLocation[];
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
  objective?: string;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  venues?: InventoryLocation[];
}

function streamText(
  fullText: string,
  onChunk: (partial: string) => void,
  onDone: () => void,
): () => void {
  let i = 0;
  let timeoutId: ReturnType<typeof setTimeout>;
  function next() {
    if (i >= fullText.length) { onDone(); return; }
    onChunk(fullText.slice(0, i + 1));
    i++;
    timeoutId = setTimeout(next, 14);
  }
  next();
  return () => clearTimeout(timeoutId);
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'ai',
  text: '告訴我你的廣告目標，我來推薦最適合的版位，推薦結果可直接加入規劃。\n\n例如：「台北通勤族，預算每天5000以下」',
};

function AIView({
  allInventory,
  selectedItems,
  onAdd,
}: {
  allInventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onAdd: (item: InventoryLocation) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => { cancelRef.current?.(); }, []);

  function handleSubmit() {
    const userText = input.trim();
    if (!userText || isStreaming) return;
    setInput('');

    const uid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    setMessages(prev => [...prev, { id: uid, role: 'user', text: userText }]);

    let venues: InventoryLocation[];
    let fullText: string;
    try {
      venues = queryInventory(userText, allInventory);
      fullText = buildResponseText(venues, userText);
    } catch {
      const eid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}e`;
      setMessages(prev => [...prev, { id: eid, role: 'ai', text: '抱歉，發生錯誤，請再試一次。' }]);
      return;
    }

    const aid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}a`;
    setIsStreaming(true);
    setMessages(prev => [...prev, { id: aid, role: 'ai', text: '' }]);

    cancelRef.current?.();
    cancelRef.current = streamText(
      fullText,
      partial => setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], text: partial };
        return next;
      }),
      () => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], venues };
          return next;
        });
        setIsStreaming(false);
      },
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] space-y-3">
              {msg.role === 'ai' && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                  <Sparkles className="w-3 h-3" /> AI 建議
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
              }`}>
                {msg.text}
                {msg.role === 'ai' && isStreaming && idx === messages.length - 1 && (
                  <span className="inline-block w-0.5 h-3.5 bg-slate-400 ml-0.5 animate-pulse rounded-sm" />
                )}
              </div>

              {/* Venue recommendation cards */}
              {msg.venues && msg.venues.length > 0 && (
                <div className="space-y-2 mt-1">
                  {msg.venues.map(v => {
                    const isSelected = selectedItems.some(s => s.inventoryId === v.id);
                    return (
                      <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-200 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">{v.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {v.district} · {v.screenType}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                              <span className="font-medium text-slate-800">NT${v.pricePerDay.toLocaleString()}/天</span>
                              <span>{(v.dailyImpressions / 1000).toFixed(0)}K 日曝光</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => !isSelected && onAdd(v)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {isSelected ? '✓ 已加入' : '+ 加入規劃'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="描述你的廣告目標，例如：台北上班族，預算每天3000..."
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={isStreaming || !input.trim()}
            aria-label="送出"
            className="text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 text-center">
          可指定城市、受眾、預算、類型，例如「桃園機場旅客」或「購物族，看板類」
        </p>
      </div>
    </div>
  );
}

export function InventoryDiscovery({
  inventory,
  allInventory,
  sortOption,
  onSortChange,
  currentView,
  onViewChange,
  selectedItems,
  onViewDetails,
  onAdd,
  objective,
}: Props) {
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-slate-50 relative">
      <PlannerTopbar
        resultCount={inventory.length}
        sortOption={sortOption}
        onSortChange={onSortChange}
        currentView={currentView}
        onViewChange={onViewChange}
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {currentView === 'list' ? (
          <ListView
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
            objective={objective}
          />
        ) : currentView === 'map' ? (
          <MapWrapper
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
          />
        ) : (
          <AIView
            allInventory={allInventory}
            selectedItems={selectedItems}
            onAdd={onAdd}
          />
        )}
      </div>
    </div>
  );
}
