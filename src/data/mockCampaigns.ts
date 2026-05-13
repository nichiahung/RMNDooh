import { Campaign } from '@/types/inventory';
import { mockInventory } from '@/lib/mockData';

// Helper to get dates
const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const getPastDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const mockCampaigns: Campaign[] = [
  {
    id: 'camp-101',
    name: 'Summer Product Launch 2026',
    advertiserName: 'TechNova Solutions',
    status: 'pending_review', bookingStatus: 'pending_review', creativeStatus: 'pending_review', launchReadiness: 'not_ready',
    objective: 'Product launch',
    selectedItems: [
      { inventoryId: mockInventory[0].id, days: 14 },
      { inventoryId: mockInventory[2].id, days: 14 },
    ],
    creatives: [
      {
        id: 'cr-101-a',
        name: 'tech_nova_summer_main.mp4',
        type: 'video/mp4',
        fileSize: 24500000,
        durationSeconds: 15,
        previewUrl: 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?auto=format&fit=crop&q=80&w=300',
        status: 'pending_review',
        uploadedAt: getPastDate(1)
      }
    ],
    estimatedImpressions: (mockInventory[0].dailyImpressions + mockInventory[2].dailyImpressions) * 14,
    estimatedBudget: (mockInventory[0].pricePerDay + mockInventory[2].pricePerDay) * 14,
    startDate: getFutureDate(7),
    endDate: getFutureDate(21),
    submittedAt: getPastDate(1)
  },
  {
    id: 'camp-102',
    name: 'Q3 Brand Awareness',
    advertiserName: 'Luxe Retail Group',
    status: 'approved', bookingStatus: 'pending_confirmation', creativeStatus: 'approved', launchReadiness: 'ready_for_confirmation',
    objective: 'Awareness',
    selectedItems: [
      { inventoryId: mockInventory[1].id, days: 30 },
      { inventoryId: mockInventory[5].id, days: 30 },
      { inventoryId: mockInventory[8].id, days: 30 },
    ],
    creatives: [
      {
        id: 'cr-102-a',
        name: 'luxe_q3_brand_1920.jpg',
        type: 'image/jpeg',
        fileSize: 4500000,
        previewUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=300',
        status: 'approved',
        uploadedAt: getPastDate(5)
      }
    ],
    estimatedImpressions: (mockInventory[1].dailyImpressions + mockInventory[5].dailyImpressions + mockInventory[8].dailyImpressions) * 30,
    estimatedBudget: (mockInventory[1].pricePerDay + mockInventory[5].pricePerDay + mockInventory[8].pricePerDay) * 30,
    startDate: getFutureDate(2),
    endDate: getFutureDate(32),
    submittedAt: getPastDate(5)
  },
  {
    id: 'camp-103',
    name: 'Flash Sale Promo',
    advertiserName: 'Urban Outfitters Taiwan',
    status: 'rejected', bookingStatus: 'blocked', creativeStatus: 'rejected', launchReadiness: 'blocked_by_creative',
    objective: 'Store visits',
    selectedItems: [
      { inventoryId: mockInventory[3].id, days: 3 }
    ],
    creatives: [
      {
        id: 'cr-103-a',
        name: 'flash_sale_urban.png',
        type: 'image/png',
        fileSize: 8500000,
        previewUrl: 'https://images.unsplash.com/photo-1558769132-cb1fac08b784?auto=format&fit=crop&q=80&w=300',
        status: 'rejected',
        uploadedAt: getPastDate(2)
      }
    ],
    estimatedImpressions: mockInventory[3].dailyImpressions * 3,
    estimatedBudget: mockInventory[3].pricePerDay * 3,
    startDate: getFutureDate(1),
    endDate: getFutureDate(4),
    submittedAt: getPastDate(2),
    approvalNotes: 'Creative text contains unsupported promotional claims. Please revise.'
  },
  {
    id: 'camp-104',
    name: 'Game Expo 2026',
    advertiserName: 'NextGen Studios',
    status: 'live', bookingStatus: 'live', creativeStatus: 'approved', launchReadiness: 'ready_for_launch',
    objective: 'Event promotion',
    selectedItems: [
      { inventoryId: mockInventory[4].id, days: 7 },
      { inventoryId: mockInventory[6].id, days: 7 },
    ],
    creatives: [
      {
        id: 'cr-104-a',
        name: 'game_trailer_15s.mp4',
        type: 'video/mp4',
        fileSize: 45000000,
        durationSeconds: 15,
        previewUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=300',
        status: 'approved',
        uploadedAt: getPastDate(10)
      }
    ],
    estimatedImpressions: (mockInventory[4].dailyImpressions + mockInventory[6].dailyImpressions) * 7,
    estimatedBudget: (mockInventory[4].pricePerDay + mockInventory[6].pricePerDay) * 7,
    startDate: getPastDate(2),
    endDate: getFutureDate(5),
    submittedAt: getPastDate(10)
  }
];
