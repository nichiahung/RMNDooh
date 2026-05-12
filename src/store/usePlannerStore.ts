import { create } from 'zustand';
import { InventoryLocation, MediaPlanItem, VenueType, ScreenType, AudienceTag, FilterState } from '../types/inventory';
import { mockInventory } from '../lib/mockData';

interface PlannerState {
  // Inventory Data
  allInventory: InventoryLocation[];
  
  // UI State
  viewMode: 'list' | 'map';
  setViewMode: (mode: 'list' | 'map') => void;
  
  // Filter State
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  
  // Selection State (Media Plan)
  selectedItems: MediaPlanItem[];
  addToMediaPlan: (inventoryId: string, days?: number) => void;
  removeFromMediaPlan: (inventoryId: string) => void;
  updateMediaPlanDays: (inventoryId: string, days: number) => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  allInventory: mockInventory,
  
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),
  
  filters: {
    searchQuery: '',
    districts: [],
    venueTypes: [],
    screenTypes: [],
    audienceTags: [],
  },
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  
  selectedItems: [],
  addToMediaPlan: (inventoryId, days = 7) => set((state) => {
    const exists = state.selectedItems.some(item => item.inventoryId === inventoryId);
    if (exists) return state;
    return {
      selectedItems: [...state.selectedItems, { inventoryId, days }]
    };
  }),
  removeFromMediaPlan: (inventoryId) => set((state) => ({
    selectedItems: state.selectedItems.filter(item => item.inventoryId !== inventoryId)
  })),
  updateMediaPlanDays: (inventoryId, days) => set((state) => ({
    selectedItems: state.selectedItems.map(item => 
      item.inventoryId === inventoryId ? { ...item, days } : item
    )
  })),
}));
