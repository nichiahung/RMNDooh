import { describe, expect, it } from 'vitest';
import { buildCampaignPlannerExploreHref } from '@/utils/plannerRoutes';

describe('buildCampaignPlannerExploreHref', () => {
  it('routes inventory exploration to the planner map rather than the campaign list', () => {
    expect(buildCampaignPlannerExploreHref()).toBe('/campaign-planner/new?view=map');
  });

  it('preserves a selected inventory location when starting from a venue card', () => {
    expect(buildCampaignPlannerExploreHref({ inventoryId: 'inv-001' })).toBe(
      '/campaign-planner/new?view=map&inventoryId=inv-001',
    );
  });
});
