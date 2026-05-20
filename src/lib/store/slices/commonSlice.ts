import { StateCreator } from 'zustand';
import { AppStoreType, CommonSlice } from '../types';
import { insforge } from '../../insforge';

export const createCommonSlice: StateCreator<AppStoreType, [], [], CommonSlice> = (set, get) => ({
    categories: [],
    isCategoriesLoading: false,
    userLocation: null,

    fetchCategories: async (force = false) => {
        // Skip only if a fetch is already in-flight
        if (get().isCategoriesLoading) return;
        // Skip if we already have the full list (more than fallback length) and force is false
        const existing = get().categories;
        if (!force && existing && existing.length > 8) return;
        set({ isCategoriesLoading: true });
        const fallbacks = [
            { id: '3489b160-1ea8-42cb-808f-7279e35cc717', name: 'Electrician', icon: 'zap', color: '#fbbf24' },
            { id: '7e1f79f0-1820-4241-8ebb-a6595f1988b0', name: 'Plumber', icon: 'droplet', color: '#3b82f6' },
            { id: 'e791e458-ca7e-4d74-9b3f-4021f6af6f70', name: 'AC Technician', icon: 'wind', color: '#06b6d4' },
            { id: '9348cab2-acc3-4453-a62d-7c9dbe41ea37', name: 'Refrigerator Technician', icon: 'refrigerator', color: '#8b5cf6' },
            { id: 'a1f9f05d-4589-4fb6-b4d8-7818fbaff2cd', name: 'Washing Machine Technician', icon: 'washing-machine', color: '#10b981' },
            { id: '5f9c50e5-89e4-454b-80f0-85175f0d5ec2', name: 'TV & Electronics Technician', icon: 'tv', color: '#6366f1' },
            { id: '199e1408-f208-42a3-8408-3dacc11c5b41', name: 'Computer / IT Technician', icon: 'monitor', color: '#ec4899' },
            { id: 'a4448bb4-683e-45fa-8295-133444f262e5', name: 'Carpenter', icon: 'hammer', color: '#f59e0b' },
        ];
        try {
            const { data, error } = await insforge.database
                .from('service_categories')
                .select('*')
                .eq('is_active', true);
            if (data && !error && data.length > 0) {
                set({ categories: data, isCategoriesLoading: false });
            } else {
                set({ categories: fallbacks, isCategoriesLoading: false });
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
            set({ categories: fallbacks, isCategoriesLoading: false });
        }
    },

    updateProfile: async (data: any) => {
        await get().updateDatabaseProfile(data);
        return true;
    },
});
