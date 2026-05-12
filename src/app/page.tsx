'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/campaign-planner');
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse text-slate-400 text-sm">Redirecting...</div>
    </div>
  );
}
