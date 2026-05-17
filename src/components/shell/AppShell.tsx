// src/components/shell/AppShell.tsx
'use client';

import { AppSidebar } from './AppSidebar';

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
