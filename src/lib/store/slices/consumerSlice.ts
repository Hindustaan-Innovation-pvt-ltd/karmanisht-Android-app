import { StateCreator } from 'zustand';
import { Platform, NativeModules, Alert } from 'react-native';
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
        const currentUser = get().user;
        const amountPaisa = 50 * 100; // 50 INR in paisa = 5000

        if (Platform.OS === 'web') {
            return new Promise((resolve) => {
                alert("Web Mock Payment Successful (50 INR)");
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
                            text: "Pay with Mock (50 INR)", 
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
                // Dynamic import to prevent bundler errors on web
                const RazorpayCheckout = require('react-native-razorpay').default;
                
                // Use Test_Key_ID from environment if available
                const keyId = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || process.env.Test_Key_ID || 'rzp_test_SpC8XTKEi3eJGe';
                
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
