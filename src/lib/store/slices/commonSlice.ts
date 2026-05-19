import { StateCreator } from 'zustand';
import { AppStoreType, CommonSlice } from '../types';
import { insforge } from '../../insforge';

export const createCommonSlice: StateCreator<AppStoreType, [], [], CommonSlice> = (set, get) => ({
    categories: [],
    userLocation: null,

    fetchCategories: async () => {
        try {
            const { data, error } = await insforge.database
                .from('service_categories')
                .select('*');
            if (data && !error) {
                set({ categories: data });
            } else {
                set({ categories: [
                    { id: '3489b160-1ea8-42cb-808f-7279e35cc717', name: 'Electrician', icon: 'zap', color: '#fbbf24' },
                    { id: '7e1f79f0-1820-4241-8ebb-a6595f1988b0', name: 'Plumber', icon: 'droplets', color: '#3b82f6' },
                ] });
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    },

    updateProfile: async (data: any) => {
        await get().updateDatabaseProfile(data);
        return true;
    },
});
