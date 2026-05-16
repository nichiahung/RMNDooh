'use client';
import { AuthGuard } from '@/components/AuthGuard';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';

export default function HomePage() {
  return (
    <AuthGuard>
      <WorkspacePage />
    </AuthGuard>
  );
}
