'use client';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminDashboardPage } from '@/components/admin/AdminDashboardPage';

export default function AdminPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminDashboardPage />
    </AuthGuard>
  );
}
