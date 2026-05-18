import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => {
  type Response = { data?: unknown; error?: { message: string } | null; count?: number | null };
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
    queues,
    updates,
    inserts,
    reset() {
      queues.clear();
      updates.length = 0;
      inserts.length = 0;
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

describe('campaign draft API self-service/admin data handoff', () => {
  beforeEach(() => {
    supabaseMock.reset();
  });

  it('persists flight dates when creating a draft campaign after dates are already selected', async () => {
    const { createDraftCampaign } = await import('@/lib/api/campaign-draft');

    supabaseMock.push('campaigns', 'select', 'then', { count: 22, error: null });
    supabaseMock.push('campaigns', 'insert', 'single', {
      data: {
        id: 'campaign-1',
        advertiser_id: 'advertiser-1',
        name: 'Campaign_20260518_023',
        objective: 'awareness',
        status: 'draft',
        start_date: '2026-05-19',
        end_date: '2026-05-25',
        created_at: '2026-05-18T00:00:00.000Z',
        updated_at: '2026-05-18T00:00:00.000Z',
      },
      error: null,
    });

    await createDraftCampaign({ startDate: '2026-05-19', endDate: '2026-05-25' });

    expect(supabaseMock.inserts).toContainEqual(
      expect.objectContaining({
        table: 'campaigns',
        payload: expect.objectContaining({
          start_date: '2026-05-19',
          end_date: '2026-05-25',
        }),
      }),
    );
  });

  it('derives campaign days from flight dates when creating a draft campaign', async () => {
    const { createDraftCampaign } = await import('@/lib/api/campaign-draft');

    supabaseMock.push('campaigns', 'select', 'then', { count: 22, error: null });
    supabaseMock.push('campaigns', 'insert', 'single', {
      data: {
        id: 'campaign-1',
        advertiser_id: 'advertiser-1',
        name: 'Campaign_20260518_023',
        objective: 'awareness',
        status: 'draft',
        start_date: '2026-05-20',
        end_date: '2026-05-23',
        campaign_days: 4,
        created_at: '2026-05-18T00:00:00.000Z',
        updated_at: '2026-05-18T00:00:00.000Z',
      },
      error: null,
    });

    await createDraftCampaign({ startDate: '2026-05-20', endDate: '2026-05-23' });

    expect(supabaseMock.inserts).toContainEqual(
      expect.objectContaining({
        table: 'campaigns',
        payload: expect.objectContaining({
          campaign_days: 4,
        }),
      }),
    );
  });

  it('updates flight dates and campaign days together on an existing draft', async () => {
    const { updateDraftCampaign } = await import('@/lib/api/campaign-draft');

    supabaseMock.push('campaigns', 'update', 'single', {
      data: {
        id: 'campaign-1',
        advertiser_id: 'advertiser-1',
        name: 'Campaign_20260518_023',
        objective: 'awareness',
        status: 'draft',
        start_date: '2026-05-20',
        end_date: '2026-05-23',
        campaign_days: 4,
        created_at: '2026-05-18T00:00:00.000Z',
        updated_at: '2026-05-18T00:00:00.000Z',
      },
      error: null,
    });

    await updateDraftCampaign('campaign-1', {
      startDate: '2026-05-20',
      endDate: '2026-05-23',
      campaignDays: 4,
    });

    expect(supabaseMock.updates).toContainEqual(
      expect.objectContaining({
        table: 'campaigns',
        payload: expect.objectContaining({
          start_date: '2026-05-20',
          end_date: '2026-05-23',
          campaign_days: 4,
        }),
      }),
    );
  });

  it('persists item flight dates when adding inventory to a media plan', async () => {
    const { addInventoryItem } = await import('@/lib/api/campaign-draft');

    supabaseMock.push('campaign_inventory_items', 'select', 'maybeSingle', { data: null, error: null });
    supabaseMock.push('campaign_inventory_items', 'insert', 'single', {
      data: {
        id: 'item-1',
        campaign_id: 'campaign-1',
        inventory_location_id: 'inventory-1',
        days: 5,
        price_per_day: 14000,
        start_date: '2026-05-20',
        end_date: '2026-05-24',
      },
      error: null,
    });

    await addInventoryItem(
      'campaign-1',
      'inventory-1',
      5,
      14000,
      950000,
      '2026-05-20',
      '2026-05-24',
    );

    expect(supabaseMock.inserts).toContainEqual(
      expect.objectContaining({
        table: 'campaign_inventory_items',
        payload: expect.objectContaining({
          start_date: '2026-05-20',
          end_date: '2026-05-24',
        }),
      }),
    );
  });

  it('falls back to days-only inventory insert when flight date columns are not migrated yet', async () => {
    const { addInventoryItem } = await import('@/lib/api/campaign-draft');

    supabaseMock.push('campaign_inventory_items', 'select', 'maybeSingle', { data: null, error: null });
    supabaseMock.push('campaign_inventory_items', 'insert', 'single', {
      data: null,
      error: { message: "Could not find the 'start_date' column of 'campaign_inventory_items' in the schema cache" },
    });
    supabaseMock.push('campaign_inventory_items', 'insert', 'single', {
      data: {
        id: 'item-1',
        campaign_id: 'campaign-1',
        inventory_location_id: 'inventory-1',
        days: 5,
        price_per_day: 14000,
      },
      error: null,
    });

    await addInventoryItem(
      'campaign-1',
      'inventory-1',
      5,
      14000,
      950000,
      '2026-05-20',
      '2026-05-24',
    );

    const itemInserts = supabaseMock.inserts.filter(row => row.table === 'campaign_inventory_items');
    expect(itemInserts).toHaveLength(2);
    expect(itemInserts[0].payload).toEqual(expect.objectContaining({ start_date: '2026-05-20' }));
    expect(itemInserts[1].payload).not.toHaveProperty('start_date');
    expect(itemInserts[1].payload).not.toHaveProperty('end_date');
  });

  it('updates item flight dates and days together on an existing inventory row', async () => {
    const { updateInventoryItemDays } = await import('@/lib/api/campaign-draft');

    supabaseMock.push('campaign_inventory_items', 'update', 'single', {
      data: {
        id: 'item-1',
        campaign_id: 'campaign-1',
        inventory_location_id: 'inventory-1',
        days: 5,
        price_per_day: 14000,
        start_date: '2026-05-20',
        end_date: '2026-05-24',
      },
      error: null,
    });

    await updateInventoryItemDays('item-1', 5, {
      startDate: '2026-05-20',
      endDate: '2026-05-24',
    });

    expect(supabaseMock.updates).toContainEqual(
      expect.objectContaining({
        table: 'campaign_inventory_items',
        payload: expect.objectContaining({
          days: 5,
          start_date: '2026-05-20',
          end_date: '2026-05-24',
        }),
      }),
    );
  });

  it('falls back to days-only inventory update when flight date columns are not migrated yet', async () => {
    const { updateInventoryItemDays } = await import('@/lib/api/campaign-draft');

    supabaseMock.push('campaign_inventory_items', 'update', 'single', {
      data: null,
      error: { message: "Could not find the 'start_date' column of 'campaign_inventory_items' in the schema cache" },
    });
    supabaseMock.push('campaign_inventory_items', 'update', 'single', {
      data: {
        id: 'item-1',
        campaign_id: 'campaign-1',
        inventory_location_id: 'inventory-1',
        days: 5,
        price_per_day: 14000,
      },
      error: null,
    });

    await updateInventoryItemDays('item-1', 5, {
      startDate: '2026-05-20',
      endDate: '2026-05-24',
    });

    const itemUpdates = supabaseMock.updates.filter(row => row.table === 'campaign_inventory_items');
    expect(itemUpdates).toHaveLength(2);
    expect(itemUpdates[0].payload).toEqual(expect.objectContaining({ start_date: '2026-05-20' }));
    expect(itemUpdates[1].payload).toEqual({ days: 5 });
  });

  it('persists pending confirmation booking state when advertiser submits a campaign', async () => {
    const { submitCampaignForConfirmation } = await import('@/lib/api/campaign-draft');

    supabaseMock.push('campaigns', 'select', 'single', {
      data: {
        id: 'campaign-1',
        advertiser_id: 'advertiser-1',
        name: 'Campaign_20260517_001',
        objective: 'awareness',
        status: 'pending_creative_review',
        created_at: '2026-05-17T00:00:00.000Z',
        updated_at: '2026-05-17T00:00:00.000Z',
      },
      error: null,
    });
    supabaseMock.push('campaigns', 'update', 'then', { data: null, error: null });

    await submitCampaignForConfirmation('campaign-1');

    expect(supabaseMock.updates).toContainEqual(
      expect.objectContaining({
        table: 'campaigns',
        payload: expect.objectContaining({
          status: 'pending_review',
          booking_status: 'pending_confirmation',
          creative_status: 'pending_review',
          launch_readiness: 'not_ready',
        }),
      }),
    );
  });

  it('creates a campaign-scoped creative asset when a media asset satisfies a requirement', async () => {
    const { uploadAssetToRequirement } = await import('@/lib/api/campaign-draft');

    supabaseMock.push('campaign_creative_requirements', 'select', 'single', {
      data: {
        id: 'requirement-1',
        campaign_id: 'campaign-1',
        canonical_format: 'landscape_16_9',
        status: 'pending_upload',
        media_asset_id: null,
      },
      error: null,
    });
    supabaseMock.push('campaign_creative_requirements', 'update', 'then', { data: null, error: null });
    supabaseMock.push('campaigns', 'select', 'single', {
      data: {
        id: 'campaign-1',
        advertiser_id: 'advertiser-1',
        name: 'Campaign_20260517_001',
        objective: 'awareness',
        status: 'pending_creative_review',
        created_at: '2026-05-17T00:00:00.000Z',
        updated_at: '2026-05-17T00:00:00.000Z',
      },
      error: null,
    });
    supabaseMock.push('campaign_creative_requirements', 'select', 'order', {
      data: [
        {
          id: 'requirement-1',
          campaign_id: 'campaign-1',
          canonical_format: 'landscape_16_9',
          status: 'uploaded',
          media_asset_id: 'media-1',
        },
      ],
      error: null,
    });

    await uploadAssetToRequirement('requirement-1', 'media-1');

    expect(supabaseMock.inserts).toContainEqual(
      expect.objectContaining({
        table: 'creative_assets',
        payload: expect.objectContaining({
          campaign_id: 'campaign-1',
          media_asset_id: 'media-1',
          source: 'platform',
          approval_status: 'pending_review',
        }),
      }),
    );
  });

  it('does not create duplicate campaign creative assets for the same campaign and media asset', async () => {
    const { uploadAssetToRequirement } = await import('@/lib/api/campaign-draft');

    supabaseMock.push('campaign_creative_requirements', 'select', 'single', {
      data: {
        id: 'requirement-1',
        campaign_id: 'campaign-1',
        canonical_format: 'landscape_16_9',
        status: 'uploaded',
        media_asset_id: 'media-1',
      },
      error: null,
    });
    supabaseMock.push('campaign_creative_requirements', 'update', 'then', { data: null, error: null });
    supabaseMock.push('creative_assets', 'select', 'maybeSingle', {
      data: { id: 'creative-1' },
      error: null,
    });
    supabaseMock.push('campaigns', 'select', 'single', {
      data: {
        id: 'campaign-1',
        advertiser_id: 'advertiser-1',
        name: 'Campaign_20260517_001',
        objective: 'awareness',
        status: 'pending_creative_review',
        created_at: '2026-05-17T00:00:00.000Z',
        updated_at: '2026-05-17T00:00:00.000Z',
      },
      error: null,
    });
    supabaseMock.push('campaign_creative_requirements', 'select', 'order', {
      data: [
        {
          id: 'requirement-1',
          campaign_id: 'campaign-1',
          canonical_format: 'landscape_16_9',
          status: 'uploaded',
          media_asset_id: 'media-1',
        },
      ],
      error: null,
    });

    await uploadAssetToRequirement('requirement-1', 'media-1');

    expect(supabaseMock.inserts.filter(row => row.table === 'creative_assets')).toHaveLength(0);
  });
});
