'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get('p');
    const redirectHash = params.get('h') ?? '';
    if (redirectPath) {
      router.replace(redirectPath + redirectHash);
    } else {
      router.replace('/campaign-planner');
    }
  }, [router]);
  return null;
}
