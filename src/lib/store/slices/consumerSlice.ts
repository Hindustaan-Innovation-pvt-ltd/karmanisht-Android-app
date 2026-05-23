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

        let activeGateway = 'razorpay';
        let keyId = 'rzp_test_SpC8XTKEi3eJGe';
        let keyStripe = 'pk_test_stripe';
        let keyPaytm = 'paytm_test_key';

        try {
            const { data: settingsData } = await insforge.database
                .from('payment_settings')
                .select('*');

            if (settingsData) {
                settingsData.forEach((s: any) => {
                    if (s.key === 'active_gateway') activeGateway = s.value || 'razorpay';
                    if (s.key === 'gateway_key_razorpay') keyId = s.value || 'rzp_test_SpC8XTKEi3eJGe';
                    if (s.key === 'gateway_key_stripe') keyStripe = s.value || 'pk_test_stripe';
                    if (s.key === 'gateway_key_paytm') keyPaytm = s.value || 'paytm_test_key';
                });
            }
        } catch (e) {
            console.error("Failed to fetch payment gateway settings:", e);
        }

        if (Platform.OS === 'web' || activeGateway === 'mock') {
            return new Promise((resolve) => {
                Alert.alert(
                    activeGateway === 'mock' ? "Mock Payment" : "Web Mock Payment",
                    `Amount: ${actualAmount} INR\nGateway Mode: Mock/Sandbox`,
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

        if (activeGateway === 'stripe' || activeGateway === 'paytm') {
            return new Promise((resolve) => {
                Alert.alert(
                    activeGateway === 'stripe' ? "Stripe Checkout" : "Paytm Checkout",
                    `Amount: ${actualAmount} INR\nKey: ${activeGateway === 'stripe' ? keyStripe : keyPaytm}\n\n(Simulating premium checkout sheet since native modules are development-mocked)`,
                    [
                        { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
                        {
                            text: `Pay Now (₹${actualAmount})`,
                            onPress: () => {
                                Alert.alert("Success", "Payment processed successfully via simulated gateway!");
                                resolve(true);
                            }
                        }
                    ]
                );
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
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const RazorpayCheckout = require('react-native-razorpay').default;
                const options = {
                    description: `Unlock contact for ${provider.full_name || 'Service'}`,
                    image: provider.profile_image || 'https://i.imgur.com/3g7UR1G.png',
                    currency: 'INR',
                    key: keyId,
                    amount: amountPaisa,
                    name: 'Karmanisht',
                    prefill: {
                        email: 'customer@karmanisht.com',
                        contact: currentUser?.phone || '',
                        name: currentUser?.name || 'Customer'
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
