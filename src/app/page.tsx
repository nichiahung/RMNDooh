'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Restore path encoded by public/404.html (GitHub Pages SPA redirect hack)
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get('p');
    const redirectHash = params.get('h') ?? '';
    if (redirectPath) {
      router.replace(redirectPath + redirectHash);
    } else {
      router.replace('/campaign-planner');
    }
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse text-slate-400 text-sm">Redirecting...</div>
    </div>
  );
}
