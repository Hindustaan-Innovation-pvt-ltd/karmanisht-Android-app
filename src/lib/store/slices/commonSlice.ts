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
                    { id: '1', name: 'Electrician', icon: 'zap', color: '#fbbf24' },
                    { id: '2', name: 'Plumber', icon: 'droplets', color: '#3b82f6' },
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
