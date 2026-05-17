import { vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { mapClientRow, mapBindingRow } from '@/lib/api/clientApi';

describe('mapClientRow', () => {
  it('maps snake_case DB row to camelCase Client', () => {
    const row = {
      id: 'abc',
      name: 'Test Co',
      contact_email: 'test@co.com',
      status: 'active',
      created_by_email: 'sales@demo.com',
      owner_email: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(mapClientRow(row)).toEqual({
      id: 'abc',
      name: 'Test Co',
      contactEmail: 'test@co.com',
      status: 'active',
      createdByEmail: 'sales@demo.com',
      ownerEmail: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
  });
});

describe('mapBindingRow', () => {
  it('maps snake_case DB row to camelCase SalesClientBinding', () => {
    const row = {
      id: 'bind-1',
      sales_email: 'sales@demo.com',
      client_id: 'abc',
      status: 'pending',
      confirm_token: 'tok-123',
      token_expires_at: '2026-01-08T00:00:00Z',
      invited_at: '2026-01-01T00:00:00Z',
      confirmed_at: null,
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(mapBindingRow(row)).toEqual({
      id: 'bind-1',
      salesEmail: 'sales@demo.com',
      clientId: 'abc',
      status: 'pending',
      confirmToken: 'tok-123',
      tokenExpiresAt: '2026-01-08T00:00:00Z',
      invitedAt: '2026-01-01T00:00:00Z',
      confirmedAt: null,
      updatedAt: '2026-01-01T00:00:00Z',
    });
  });
});
