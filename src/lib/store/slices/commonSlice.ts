import { StateCreator } from 'zustand';
import { AppStoreType, CommonSlice } from '../types';
import { insforge } from '../../insforge';

export const createCommonSlice: StateCreator<AppStoreType, [], [], CommonSlice> = (set, get) => ({
    categories: [],
    userLocation: null,

    fetchCategories: async () => {
        const fallbacks = [
            { id: '3489b160-1ea8-42cb-808f-7279e35cc717', name: 'Electrician', icon: 'zap', color: '#fbbf24' },
            { id: '7e1f79f0-1820-4241-8ebb-a6595f1988b0', name: 'Plumber', icon: 'droplet', color: '#3b82f6' },
            { id: 'ac-tech-id-placeholder-uuid-value', name: 'AC Technician', icon: 'wind', color: '#06b6d4' },
            { id: 'fridge-tech-id-placeholder-uuid-value', name: 'Refrigerator Technician', icon: 'refrigerator', color: '#8b5cf6' },
            { id: 'washer-tech-id-placeholder-uuid-value', name: 'Washing Machine Technician', icon: 'washing-machine', color: '#10b981' },
            { id: 'tv-tech-id-placeholder-uuid-value', name: 'TV & Electronics Technician', icon: 'tv', color: '#6366f1' },
            { id: 'pc-tech-id-placeholder-uuid-value', name: 'Computer / IT Technician', icon: 'monitor', color: '#ec4899' },
            { id: 'carpenter-id-placeholder-uuid-value', name: 'Carpenter', icon: 'hammer', color: '#f59e0b' }
        ];
        try {
            const { data, error } = await insforge.database
                .from('service_categories')
                .select('*');
            if (data && !error) {
                set({ categories: data });
            } else {
                set({ categories: fallbacks });
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
            set({ categories: fallbacks });
        }
    },

    updateProfile: async (data: any) => {
        await get().updateDatabaseProfile(data);
        return true;
    },
});
