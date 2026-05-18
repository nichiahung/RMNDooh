'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { confirmBinding, rejectBinding } from '@/lib/api/clientApi';

type PageState = 'confirm_prompt' | 'confirmed' | 'rejected' | 'invalid';

function ConfirmClientContent() {
  const params = useSearchParams();
  const token = params.get('token');

  const [actionState, setActionState] = useState<PageState | null>(null);
  const [details, setDetails] = useState<{ clientName: string; salesEmail: string } | null>(null);
  const [acting, setActing] = useState(false);
  const state: PageState = actionState ?? (token ? 'confirm_prompt' : 'invalid');

  async function handleConfirm() {
    if (!token) return;
    setActing(true);
    try {
      const result = await confirmBinding(token);
      if (result) {
        setDetails(result);
        setActionState('confirmed');
      } else {
        setActionState('invalid');
      }
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!token) return;
    setActing(true);
    try {
      await rejectBinding(token);
      setActionState('rejected');
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-md p-8 text-center space-y-5">
        {state === 'confirm_prompt' && (
          <>
            <div className="text-4xl">🔗</div>
            <h1 className="text-lg font-bold text-slate-800">確認與業務的合作關係</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              業務邀請您建立廣告合作關係。<br />
              確認後，業務即可為您的公司建立廣告提案。
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={handleConfirm}
                disabled={acting}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {acting ? '處理中…' : '確認合作'}
              </button>
              <button
                onClick={handleReject}
                disabled={acting}
                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                拒絕
              </button>
            </div>
          </>
        )}

        {state === 'confirmed' && (
          <>
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✓</span>
            </div>
            <h1 className="text-lg font-bold text-slate-800">合作關係已確認！</h1>
            <p className="text-sm text-slate-500">
              {details?.salesEmail} 現在可以為您建立廣告提案。
            </p>
          </>
        )}

        {state === 'rejected' && (
          <>
            <div className="text-4xl">👋</div>
            <h1 className="text-lg font-bold text-slate-800">已拒絕合作申請</h1>
            <p className="text-sm text-slate-500">您已拒絕此次綁定申請。如有疑問請聯絡業務。</p>
          </>
        )}

        {state === 'invalid' && (
          <>
            <div className="text-4xl">⚠️</div>
            <h1 className="text-lg font-bold text-slate-800">連結無效或已過期</h1>
            <p className="text-sm text-slate-500">此確認連結可能已使用過或已超過 7 天有效期。請聯絡您的業務重新發送。</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmClientPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmClientContent />
    </Suspense>
  );
}
