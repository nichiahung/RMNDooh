const ADVERTISER_NAMES: Record<string, string> = {
  'adv-01': 'TechNova Solutions',
  'adv-02': 'Luxe Retail Group',
  'adv-03': 'Urban Outfitters Taiwan',
  'adv-04': 'NextGen Studios',
  'adv-05': 'Global Brands Inc',
  'adv-default': 'Demo Advertiser',
  'aaaaaaaa-0000-0000-0000-000000000001': 'Demo Advertiser',
};

export function resolveAdvertiserName(advertiserId: string): string {
  return ADVERTISER_NAMES[advertiserId] ?? `${advertiserId.slice(0, 8)}...`;
}

export function resolveCampaignName(
  campaignId: string,
  drafts: Array<{ id: string; name: string }>,
): string {
  const draft = drafts.find(d => d.id === campaignId);
  return draft?.name ?? `${campaignId.slice(0, 8)}...`;
}
