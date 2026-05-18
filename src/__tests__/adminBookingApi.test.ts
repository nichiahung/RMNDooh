import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => {
  type Response = { data?: unknown; error?: { message: string } | null };
  const queues = new Map<string, Response[]>();
  const updates: Array<{ table: string; payload: Record<string, unknown>; filters: Array<[string, unknown]> }> = [];
  const inserts: Array<{ table: string; payload: unknown; filters: Array<[string, unknown]> }> = [];

  function key(table: string, action: string, terminal: string) {
    return `${table}:${action}:${terminal}`;
  }

  function next(table: string, action: string, terminal: string): Response {
    const queueKey = key(table, action, terminal);
    const queue = queues.get(queueKey) ?? [];
    return queue.shift() ?? { data: null, error: null };
  }

  function makeBuilder(table: string) {
    const state: {
      action: string;
      payload?: unknown;
      filters: Array<[string, unknown]>;
    } = {
      action: 'select',
      filters: [],
    };

    const builder = {
      select() {
        if (state.action !== 'insert' && state.action !== 'update') {
          state.action = 'select';
        }
        return builder;
      },
      insert(payload: unknown) {
        state.action = 'insert';
        state.payload = payload;
        inserts.push({ table, payload, filters: state.filters });
        return builder;
      },
      update(payload: Record<string, unknown>) {
        state.action = 'update';
        state.payload = payload;
        updates.push({ table, payload, filters: state.filters });
        return builder;
      },
      eq(column: string, value: unknown) {
        state.filters.push([column, value]);
        return builder;
      },
      order() {
        return Promise.resolve(next(table, state.action, 'order'));
      },
      single() {
        return Promise.resolve(next(table, state.action, 'single'));
      },
      maybeSingle() {
        return Promise.resolve(next(table, state.action, 'maybeSingle'));
      },
      then(resolve: (value: Response) => void) {
        return Promise.resolve(next(table, state.action, 'then')).then(resolve);
      },
    };

    return builder;
  }

  return {
    inserts,
    updates,
    reset() {
      queues.clear();
      inserts.length = 0;
      updates.length = 0;
    },
    push(table: string, action: string, terminal: string, response: Response) {
      const queueKey = key(table, action, terminal);
      queues.set(queueKey, [...(queues.get(queueKey) ?? []), response]);
    },
    supabase: {
      from: vi.fn((table: string) => makeBuilder(table)),
    },
  };
});

vi.mock('@/lib/supabase', () => ({ supabase: supabaseMock.supabase }));

describe('admin booking API', () => {
  beforeEach(() => {
    supabaseMock.reset();
  });

  it('snapshots campaign flight dates into campaign bookings when confirming', async () => {
    const { confirmBooking } = await import('@/lib/api/admin');

    supabaseMock.push('campaigns', 'select', 'single', {
      data: {
        start_date: '2026-05-20',
        end_date: '2026-05-24',
        creative_status: 'approved',
      },
      error: null,
    });
    supabaseMock.push('campaign_inventory_items', 'select', 'then', {
      data: [{ days: 5, price_per_day: 14000 }],
      error: null,
    });
    supabaseMock.push('campaign_bookings', 'select', 'maybeSingle', { data: null, error: null });
    supabaseMock.push('campaigns', 'select', 'single', {
      data: { creative_status: 'approved' },
      error: null,
    });
    supabaseMock.push('creative_assets', 'select', 'then', {
      data: [{ approval_status: 'approved' }],
      error: null,
    });
    supabaseMock.push('campaign_bookings', 'insert', 'then', { data: null, error: null });
    supabaseMock.push('campaigns', 'update', 'then', { data: null, error: null });

    await confirmBooking('campaign-1');

    expect(supabaseMock.inserts).toContainEqual(
      expect.objectContaining({
        table: 'campaign_bookings',
        payload: expect.objectContaining({
          campaign_id: 'campaign-1',
          start_date: '2026-05-20',
          end_date: '2026-05-24',
          total_amount: 70000,
        }),
      }),
    );
  });

  it('falls back to a booking insert without date snapshot columns before migration is applied', async () => {
    const { confirmBooking } = await import('@/lib/api/admin');

    supabaseMock.push('campaigns', 'select', 'single', {
      data: {
        start_date: '2026-05-20',
        end_date: '2026-05-24',
        creative_status: 'approved',
      },
      error: null,
    });
    supabaseMock.push('campaign_inventory_items', 'select', 'then', {
      data: [{ days: 5, price_per_day: 14000 }],
      error: null,
    });
    supabaseMock.push('campaign_bookings', 'select', 'maybeSingle', { data: null, error: null });
    supabaseMock.push('campaigns', 'select', 'single', {
      data: { creative_status: 'approved' },
      error: null,
    });
    supabaseMock.push('creative_assets', 'select', 'then', {
      data: [{ approval_status: 'approved' }],
      error: null,
    });
    supabaseMock.push('campaign_bookings', 'insert', 'then', {
      data: null,
      error: { message: "Could not find the 'start_date' column of 'campaign_bookings' in the schema cache" },
    });
    supabaseMock.push('campaign_bookings', 'insert', 'then', { data: null, error: null });
    supabaseMock.push('campaigns', 'update', 'then', { data: null, error: null });

    await confirmBooking('campaign-1');

    const bookingInserts = supabaseMock.inserts.filter(row => row.table === 'campaign_bookings');
    expect(bookingInserts).toHaveLength(2);
    expect(bookingInserts[0].payload).toEqual(expect.objectContaining({ start_date: '2026-05-20' }));
    expect(bookingInserts[1].payload).not.toHaveProperty('start_date');
    expect(bookingInserts[1].payload).not.toHaveProperty('end_date');
  });

  it('falls back to admin campaign list without item flight dates before migration is applied', async () => {
    const { fetchAllCampaigns } = await import('@/lib/api/admin');

    supabaseMock.push('campaigns', 'select', 'order', {
      data: null,
      error: { message: "Could not find the 'start_date' column of 'campaign_inventory_items' in the schema cache" },
    });
    supabaseMock.push('campaigns', 'select', 'order', {
      data: [
        {
          id: 'campaign-1',
          name: 'Campaign_20260518_001',
          objective: 'awareness',
          status: 'pending_review',
          booking_status: 'pending_confirmation',
          creative_status: 'approved',
          launch_readiness: 'ready_for_confirmation',
          start_date: '2026-05-20',
          end_date: '2026-05-24',
          submitted_at: '2026-05-18T00:00:00.000Z',
          advertisers: { name: 'Demo Advertiser' },
          campaign_inventory_items: [
            {
              inventory_location_id: 'inventory-1',
              days: 5,
              price_per_day: 14000,
              daily_impressions: 950000,
            },
          ],
          creative_assets: [],
        },
      ],
      error: null,
    });

    const campaigns = await fetchAllCampaigns();

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].selectedItems).toEqual([
      expect.objectContaining({
        inventoryId: 'inventory-1',
        days: 5,
      }),
    ]);
  });
});
