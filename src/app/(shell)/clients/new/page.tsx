'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClientWithBinding } from '@/lib/api/clientApi';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function NewClientPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser?.email || !name.trim() || !contactEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createClientWithBinding({
        name: name.trim(),
        contactEmail: contactEmail.trim(),
        salesEmail: currentUser.email,
      });
      const url = `${window.location.origin}${BASE_PATH}/confirm-client?token=${result.binding.confirmToken}`;
      setConfirmUrl(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '建立失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!confirmUrl) return;
    await navigator.clipboard.writeText(confirmUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (confirmUrl) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">客戶已建立！</h2>
          <p className="text-sm text-slate-500">
            請將以下確認連結傳送給客戶（Email、LINE 均可）。<br />
            客戶點擊確認後，即可為其建立提案。
          </p>
          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 break-all font-mono text-left">
            {confirmUrl}
          </div>
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            {copied ? <><Check className="w-4 h-4" /> 已複製</> : <><Copy className="w-4 h-4" /> 複製確認連結</>}
          </button>
          <button
            onClick={() => router.push('/clients')}
            className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700"
          >
            回到客戶清單
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <button
        onClick={() => router.push('/clients')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> 回到客戶清單
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h1 className="text-lg font-bold text-slate-800 mb-6">新增客戶</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">公司名稱</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：台灣大哥大"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">聯絡 Email</label>
            <input
              required
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="contact@company.com"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !name.trim() || !contactEmail.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {submitting ? '建立中…' : '建立客戶並取得確認連結'}
          </button>
        </form>
      </div>
    </div>
  );
}
