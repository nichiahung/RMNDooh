'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getActiveClients } from '@/lib/api/clientApi';
import type { ClientWithBinding } from '@/types/client';

interface Props {
  value: string;              // selected client id
  onChange: (clientId: string, clientName: string) => void;
  className?: string;
}

export function ClientSelect({ value, onChange, className = '' }: Props) {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState<ClientWithBinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.email) return;
    getActiveClients(currentUser.email)
      .then(setClients)
      .finally(() => setLoading(false));
  }, [currentUser?.email]);

  if (loading) {
    return (
      <div className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-400 bg-slate-50 ${className}`}>
        載入客戶清單中…
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className={`w-full px-4 py-2.5 border border-amber-300 bg-amber-50 rounded-lg text-sm text-amber-700 ${className}`}>
        尚無已綁定客戶。請先至{' '}
        <a href="/clients" className="underline font-medium">客戶管理</a>{' '}
        建立合作關係。
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={e => {
        const selected = clients.find(c => c.id === e.target.value);
        onChange(e.target.value, selected?.name ?? '');
      }}
      className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none ${className}`}
    >
      <option value="">選擇客戶</option>
      {clients.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
