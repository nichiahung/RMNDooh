'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Send, Sparkles } from 'lucide-react';
import type { InventoryLocation } from '@/types/inventory';
import { queryInventory, buildResponseText } from '@/lib/mockAI';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  venues?: InventoryLocation[];
}

interface AIAssistantProps {
  inventory: InventoryLocation[];
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
    timeoutId = setTimeout(next, 18);
  }
  next();
  return () => clearTimeout(timeoutId);
}

const WELCOME = '告訴我你的廣告目標，我來推薦最適合的版位。\n\n例如：「台北通勤族，預算每天5000以下」';

export function AIAssistant({ inventory }: AIAssistantProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pulseActive, setPulseActive] = useState(true);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'ai', text: WELCOME },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => { cancelStreamRef.current?.(); }, []);

  function handleOpen() {
    setIsOpen(true);
    setPulseActive(false);
  }

  function handleSubmit() {
    const userText = input.trim();
    if (!userText || isStreaming) return;
    setInput('');

    const userId = crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36).slice(2);
    setMessages(prev => [...prev, { id: userId, role: 'user', text: userText }]);

    let venues: InventoryLocation[];
    let fullText: string;
    try {
      venues = queryInventory(userText, inventory);
      fullText = buildResponseText(venues, userText);
    } catch {
      const errId = crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36).slice(2);
      setMessages(prev => [...prev, { id: errId, role: 'ai', text: '抱歉，處理您的請求時發生錯誤。請再試一次。' }]);
      setIsStreaming(false);
      return;
    }

    const aiId = crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36).slice(2);
    setIsStreaming(true);
    setMessages(prev => [...prev, { id: aiId, role: 'ai', text: '' }]);

    cancelStreamRef.current?.();
    cancelStreamRef.current = streamText(
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
    <>
      {/* FAB */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold shadow-lg transition-all ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
      >
        <Sparkles className={`w-4 h-4 ${pulseActive ? 'animate-pulse' : ''}`} />
        AI 規劃
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-slate-800">AI 規劃助手</span>
            </div>
            <button onClick={() => setIsOpen(false)} aria-label="最小化" className="text-slate-400 hover:text-slate-600">
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                    {msg.role === 'ai' && isStreaming && idx === messages.length - 1 && (
                      <span className="inline-block w-1 h-3.5 bg-slate-400 ml-0.5 animate-pulse rounded-sm" />
                    )}
                  </div>

                  {/* Venue cards after streaming completes */}
                  {msg.venues && msg.venues.length > 0 && (
                    <div className="space-y-2">
                      {msg.venues.map(v => (
                        <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{v.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                NT${v.pricePerDay.toLocaleString()}/天 · {v.district}
                              </p>
                            </div>
                            <button
                              onClick={() => router.push(`/campaign-planner?inventoryId=${v.id}`)}
                              className="flex-shrink-0 text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              規劃
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="描述你的廣告目標..."
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
              />
              <button
                onClick={handleSubmit}
                disabled={isStreaming || !input.trim()}
                aria-label="送出"
                className="text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
