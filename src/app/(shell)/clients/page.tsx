// src/app/(shell)/clients/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, Copy, Check, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMyClients, findClientByEmail, requestBinding } from '@/lib/api/clientApi';
import { AuthGuard } from '@/components/AuthGuard';
import type { ClientWithBinding } from '@/types/client';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: '已綁定', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: '待確認', className: 'bg-amber-100 text-amber-700' },
  rejected: { label: '已拒絕', className: 'bg-red-100 text-red-600' },
};

function ClientsPageContent() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Bind-existing-client modal state
  const [showBindModal, setShowBindModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; name: string } | null | 'not_found'>(null);
  const [searching, setSearching] = useState(false);
  const [binding, setBinding] = useState(false);

  useEffect(() => {
    if (!currentUser?.email) return;
    getMyClients(currentUser.email)
      .then(setClients)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentUser?.email]);

  function confirmUrl(token: string): string {
    return `${window.location.origin}${BASE_PATH}/confirm-client?token=${token}`;
  }

  async function handleCopyLink(token: string) {
    await navigator.clipboard.writeText(confirmUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  async function handleSearch() {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const found = await findClientByEmail(searchEmail.trim());
      setSearchResult(found ? { id: found.id, name: found.name } : 'not_found');
    } finally {
      setSearching(false);
    }
  }

  async function handleRequestBinding() {
    if (!currentUser?.email || !searchResult || searchResult === 'not_found') return;
    setBinding(true);
    try {
      await requestBinding({ salesEmail: currentUser.email, clientId: searchResult.id });
      const updated = await getMyClients(currentUser.email);
      setClients(updated);
      setShowBindModal(false);
      setSearchEmail('');
      setSearchResult(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '綁定失敗');
    } finally {
      setBinding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-indigo-500" />
          <h1 className="text-xl font-bold text-slate-800">客戶管理</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBindModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Search className="w-4 h-4" /> 搜尋已有帳號
          </button>
          <Link
            href="/clients/new"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> 新增客戶
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {clients.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">尚無客戶。點「新增客戶」開始建立合作關係。</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">客戶名稱</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">聯絡 Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">狀態</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">確認連結</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clients.map(client => {
                const badge = STATUS_BADGE[client.binding.status] ?? STATUS_BADGE.pending;
                const isPending = client.binding.status === 'pending';
                return (
                  <tr key={client.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{client.name}</td>
                    <td className="px-4 py-3 text-slate-500">{client.contactEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isPending && client.binding.confirmToken && (
                        <button
                          onClick={() => handleCopyLink(client.binding.confirmToken)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {copiedToken === client.binding.confirmToken
                            ? <><Check className="w-3.5 h-3.5" /> 已複製</>
                            : <><Copy className="w-3.5 h-3.5" /> 複製確認連結</>}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {client.binding.status === 'active' && (
                        <button
                          onClick={() => router.push('/proposal-builder')}
                          className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
                        >
                          建立提案 →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bind existing client modal */}
      {showBindModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800">搜尋已有帳號並申請綁定</h2>
            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={e => { setSearchEmail(e.target.value); setSearchResult(null); }}
                placeholder="輸入客戶 Email"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchEmail.trim()}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
              >
                搜尋
              </button>
            </div>
            {searchResult === 'not_found' && (
              <p className="text-sm text-red-600">找不到該 Email 的客戶帳號。請確認 Email 是否正確，或改用「新增客戶」。</p>
            )}
            {searchResult && searchResult !== 'not_found' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800 font-medium">找到：{searchResult.name}</p>
                <p className="text-xs text-emerald-600 mt-0.5">送出申請後，客戶需確認才能建立提案。</p>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setShowBindModal(false); setSearchEmail(''); setSearchResult(null); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                取消
              </button>
              <button
                onClick={handleRequestBinding}
                disabled={!searchResult || searchResult === 'not_found' || binding}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {binding ? '送出中…' : '送出綁定申請'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  return (
    <AuthGuard requiredRole="sales">
      <ClientsPageContent />
    </AuthGuard>
  );
}
