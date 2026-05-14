import { supabase } from '@/lib/supabase';
import { InventoryLocation, AudienceTag } from '@/types/inventory';

// Maps Supabase snake_case row → frontend camelCase type
function mapRow(row: Record<string, unknown>): InventoryLocation {
  const dnaData = row.dna as unknown as InventoryLocation['dna'];

  return {
    id: row.id as string,
    name: row.name as string,
    city: row.city as string,
    district: row.district as string,
    address: row.address as string,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    venueType: row.venue_type as InventoryLocation['venueType'],
    screenType: row.screen_type as InventoryLocation['screenType'],
    dailyImpressions: Number(row.daily_impressions),
    cpm: Number(row.cpm),
    pricePerDay: Number(row.price_per_day),
    availability: Number(row.availability),
    audienceTags: ((row.audience_tags as string[]) ?? []) as AudienceTag[],
    imageUrl: (row.image_url as string) ?? '',
    description: (row.description as string) ?? '',
    dna: dnaData ?? {
      ageBreakdown: [],
      genderSplit: { male: 50, female: 50 },
      audienceSegments: [],
      peakHours: Array(24).fill(0.5) as number[],
      weekdayPct: 60,
      nearbyPOIs: [],
      rankings: { cityRank: 0, cityTotal: 0, districtRank: 0, districtTotal: 0, typeRank: 0, typeTotal: 0 },
      baseMatchScore: 50,
    },
  };
}

export async function fetchInventoryLocations(): Promise<InventoryLocation[]> {
  const { data, error } = await supabase
    .from('inventory_locations')
    .select('*')
    .eq('is_active', true)
    .order('daily_impressions', { ascending: false });

  if (error) {
    console.error('Failed to fetch inventory:', error.message);
    return [];
  }

  return (data ?? []).map(mapRow);
}
