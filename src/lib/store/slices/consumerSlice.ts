import { StateCreator } from 'zustand';
import { AppStoreType, ConsumerSlice } from '../types';
import { insforge } from '../../insforge';

export const createConsumerSlice: StateCreator<AppStoreType, [], [], ConsumerSlice> = (set, get) => ({
    unlockedContacts: [],
    unlockedProviders: [],

    isUnlocked: (id: string) => get().unlockedContacts.includes(id),

    unlockWorker: async (providerId: string) => {
        const userId = get().user.id;
        if (!userId) return;
        try {
            await insforge.database.from('unlock_transactions').insert([{
                user_id: userId,
                provider_id: providerId,
                amount: 50,
                payment_status: 'completed',
                transaction_id: `tx_${Date.now()}`
            }]);
            set({ unlockedContacts: [...get().unlockedContacts, providerId] });
            await get().refreshProfile();
        } catch (e) {
            console.error("Unlock transaction failed:", e);
        }
    },

    handleRazorpayPayment: async (provider: any): Promise<boolean> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                alert(`Mock Payment Successful`);
                resolve(true);
            }, 1000);
        });
    },
});
