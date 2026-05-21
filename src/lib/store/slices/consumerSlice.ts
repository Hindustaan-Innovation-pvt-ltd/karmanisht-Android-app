import { StateCreator } from 'zustand';
import { Platform, NativeModules, Alert } from 'react-native';
import { AppStoreType, ConsumerSlice } from '../types';
import { insforge } from '../../insforge';

export const createConsumerSlice: StateCreator<AppStoreType, [], [], ConsumerSlice> = (set, get) => ({
    unlockedContacts: [],
    unlockedProviders: [],
    activePasses: [],

    isUnlocked: (id: string, categoryId?: string) => {
        if (get().unlockedContacts.includes(id)) return true;
        if (categoryId) {
            const passes = get().activePasses || [];
            const now = new Date().toISOString();
            return passes.some(p => p.profession_id === categoryId && p.expires_at > now && p.payment_status === 'paid');
        }
        return false;
    },

    fetchActivePasses: async () => {
        const userId = get().user.id;
        if (!userId) return;
        try {
            const now = new Date().toISOString();
            const { data, error } = await insforge.database
                .from('unlock_passes')
                .select('*')
                .eq('customer_id', userId)
                .eq('payment_status', 'paid')
                .gt('expires_at', now);
            if (data && !error) {
                set({ activePasses: data });
            } else {
                set({ activePasses: [] });
            }
        } catch (e) {
            console.error("fetchActivePasses failed:", e);
        }
    },

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

    handleRazorpayPayment: async (provider: any, amount?: number): Promise<boolean> => {
        const currentUser = get().user;
        const actualAmount = amount !== undefined ? amount : 50;
        const amountPaisa = actualAmount * 100;

        if (Platform.OS === 'web') {
            return new Promise((resolve) => {
                alert(`Web Mock Payment Successful (${actualAmount} INR)`);
                resolve(true);
            });
        }

        // Check if RNRazorpayCheckout native module is linked/available
        const isLinked = !!NativeModules.RNRazorpayCheckout;
        if (!isLinked) {
            console.warn("Razorpay native module (RNRazorpayCheckout) is not linked/available in this build.");
            return new Promise((resolve) => {
                Alert.alert(
                    "Development Mode",
                    "Razorpay Native SDK is not linked/compiled in this app build. Would you like to proceed with a Mock Payment for testing?",
                    [
                        { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
                        {
                            text: `Pay with Mock (${actualAmount} INR)`,
                            onPress: () => {
                                Alert.alert("Success", "Mock Payment Successful!");
                                resolve(true);
                            }
                        }
                    ]
                );
            });
        }

        return new Promise((resolve) => {
            try {
                const RazorpayCheckout = require('react-native-razorpay').default;
                const keyId = process.env.EXPO_PUBLIC_Test_Key_ID || 'rzp_test_SpC8XTKEi3eJGe';
                const options = {
                    description: `Unlock contact for ${provider.full_name}`,
                    image: provider.profile_image || 'https://i.imgur.com/3g7UR1G.png',
                    currency: 'INR',
                    key: keyId,
                    amount: amountPaisa,
                    name: 'Karmanisht',
                    prefill: {
                        email: 'customer@karmanisht.com',
                        contact: currentUser.phone || '',
                        name: currentUser.name || 'Customer'
                    },
                    theme: { color: '#3B82F6' }
                };

                RazorpayCheckout.open(options)
                    .then((data: any) => {
                        console.log("Razorpay payment success:", data);
                        resolve(true);
                    })
                    .catch((error: any) => {
                        console.error("Razorpay payment error:", error);
                        alert(error.description || "Payment failed or cancelled");
                        resolve(false);
                    });
            } catch (err) {
                console.error("Failed to load/open RazorpayCheckout:", err);
                alert("Razorpay checkout is unavailable.");
                resolve(false);
            }
        });
    },
});
