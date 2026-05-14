import type { InventoryLocation, VenueType, AudienceTag } from '@/types/inventory';

interface ObjectiveBoost {
  venueTypes: VenueType[];
  audienceTags: AudienceTag[];
}

const BOOST_MAP: Record<string, ObjectiveBoost> = {
  'Brand Awareness': {
    venueTypes: ['Mall', 'Airport', 'Highway'],
    audienceTags: ['Tourists', 'Shoppers'],
  },
  'Foot Traffic': {
    venueTypes: ['Mall', 'Street', 'Night Market'],
    audienceTags: ['Shoppers', 'Foodies'],
  },
  'Direct Response': {
    venueTypes: ['Office Building', 'Subway', 'Station'],
    audienceTags: ['Professionals', 'Tech Workers', 'Commuters'],
  },
};

export function computeMatchScore(venue: InventoryLocation, objective?: string): number {
  let score = venue.dna?.baseMatchScore ?? 50;
  if (!objective) return score;

  const boost = BOOST_MAP[objective];
  if (!boost) return score;

  if (boost.venueTypes.includes(venue.venueType)) score += 15;
  for (const tag of venue.audienceTags) {
    if (boost.audienceTags.includes(tag as AudienceTag)) score += 8;
  }

  return Math.min(100, score);
}
