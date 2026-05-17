'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { AppShell } from '@/components/shell/AppShell';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
