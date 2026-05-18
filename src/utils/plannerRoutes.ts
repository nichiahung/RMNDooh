export function buildCampaignPlannerExploreHref(params: { inventoryId?: string } = {}) {
  const searchParams = new URLSearchParams({ view: 'map' });

  if (params.inventoryId) {
    searchParams.set('inventoryId', params.inventoryId);
  }

  return `/campaign-planner/new?${searchParams.toString()}`;
}
