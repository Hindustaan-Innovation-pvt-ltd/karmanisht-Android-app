import { StateCreator } from 'zustand';
import { AppStoreType, WorkerSlice } from '../types';
import { insforge } from '../../insforge';

export const createWorkerSlice: StateCreator<AppStoreType, [], [], WorkerSlice> = (set, get) => ({
    workerStats: { rating: 0, jobsDone: 0, responseTime: 'Fast' },

    updateWorkerSpecialties: async (categoryIds: string[], tagIds: string[]) => {
        const userId = get().user.id;
        if (!userId || get().user.role !== 'worker') return false;
        
        try {
            await insforge.database
                .from('provider_services')
                .delete()
                .eq('provider_id', userId);
                
            const insertData = [];
            for (const catId of categoryIds) {
                if (tagIds && tagIds.length > 0) {
                    for (const tagId of tagIds) {
                        insertData.push({
                            provider_id: userId,
                            category_id: catId,
                            tag_id: tagId
                        });
                    }
                } else {
                    insertData.push({
                        provider_id: userId,
                        category_id: catId,
                    });
                }
            }
            
            if (insertData.length > 0) {
                await insforge.database.from('provider_services').insert(insertData);
            }

            get().setUser({ professionId: categoryIds[0] });
            return true;
        } catch (e) {
            console.error("Failed to update specialties:", e);
            return false;
        }
    },
});
