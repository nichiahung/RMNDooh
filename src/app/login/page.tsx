'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { currentUser, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      router.replace(currentUser.role === 'admin' ? '/admin' : '/');
    }
  }, [currentUser, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(email, password);
    if (ok) {
      try {
        const stored = localStorage.getItem('dooh_mock_user');
        const user = stored ? JSON.parse(stored) as { role: string } : null;
        router.push(user?.role === 'admin' ? '/admin' : '/');
      } catch {
        router.push('/');
      }
    } else {
      setError('帳號或密碼錯誤');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-sm">
        <Image src="/drmn-logo.png" alt="DRMN" height={36} width={130} className="object-contain mb-2 mx-auto" />
        <p className="text-sm text-slate-500 mb-8">請登入以繼續</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="advertiser@demo.com"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            登入
          </button>
        </form>

        <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 font-medium mb-1">Demo 帳號</p>
          <p className="text-xs text-slate-500">advertiser@demo.com / demo1234</p>
          <p className="text-xs text-slate-500">sales@demo.com / demo1234</p>
          <p className="text-xs text-slate-500">admin@demo.com / demo1234</p>
        </div>
      </div>
    </div>
  );
}
