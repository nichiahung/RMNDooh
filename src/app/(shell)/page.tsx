'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { HomeView } from '@/components/shell/HomeView';

export default function HomePage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      router.replace('/admin');
    }
  }, [currentUser, router]);

  if (currentUser?.role === 'admin') return null;
  return <HomeView />;
}
