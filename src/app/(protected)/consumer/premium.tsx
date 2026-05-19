// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ConsumerPremium() {
    const router = useRouter();
    const { user, refreshProfile } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<'upi' | 'card' | 'netbanking'>('upi');

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            const { error } = await insforge.database
                .from('users')
                .update({ is_premium: true })
                .eq('id', user.id);

            if (error) throw error;

            await refreshProfile();
            Alert.alert('Payment Successful!', 'Welcome to Premium! You now have priority matches and Rs. 0 booking fees.', [
                { text: 'Awesome', onPress: () => router.replace('/(protected)/consumer') }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update premium status.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 justify-between">
                <TouchableOpacity onPress={() => router.back()} className="p-1">
                    <Ionicons name="arrow-back" size={24} color="#64748B" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-slate-800 dark:text-white">Premium Upgrade</Text>
                <View className="w-8" />
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Promo Banner / Badge */}
                <View className="m-5 p-6 rounded-[24px] bg-gradient-to-tr from-indigo-600 to-purple-600 bg-indigo-600 shadow-md relative overflow-hidden">
                    <View className="absolute right-[-20px] top-[-20px] opacity-10">
                        <MaterialCommunityIcons name="crown" size={140} color="#FFF" />
                    </View>
                    <View className="flex-row items-center gap-2 mb-2">
                        <View className="bg-yellow-400 px-2 py-0.5 rounded-full">
                            <Text className="text-[10px] font-black text-slate-900">PRO</Text>
                        </View>
                        <Text className="text-white/80 font-bold uppercase text-xs tracking-wider">Antigravity Premium</Text>
                    </View>
                    <Text className="text-2xl font-black text-white mb-2 leading-tight">Elevate Your Service Experience</Text>
                    <Text className="text-indigo-100 text-xs font-semibold leading-relaxed">
                        Say goodbye to fees, delay times, and basic searches. Get VIP matches.
                    </Text>
                </View>

                {/* Benefits List */}
                <View className="px-5 mb-6">
                    <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                        Premium Benefits
                    </Text>

                    {/* Benefit 1 */}
                    <View className="flex-row gap-4 items-start bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-900">
                        <View className="size-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 items-center justify-center">
                            <MaterialCommunityIcons name="lightning-bolt" size={20} color="#D97706" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">Priority Service Booking</Text>
                            <Text className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                                Get matched with providers 3x faster. Your requests jump to the top of their queue.
                            </Text>
                        </View>
                    </View>

                    {/* Benefit 2 */}
                    <View className="flex-row gap-4 items-start bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-900">
                        <View className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 items-center justify-center">
                            <Feather name="percent" size={18} color="#059669" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">Rs.0 Booking Fees</Text>
                            <Text className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                                Enjoy absolute zero service fees or convenience charges on all bookings. Save every time.
                            </Text>
                        </View>
                    </View>

                    {/* Benefit 3 */}
                    <View className="flex-row gap-4 items-start bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-900">
                        <View className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 items-center justify-center">
                            <MaterialCommunityIcons name="shield-check" size={20} color="#2563EB" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">Verified Elite Professionals</Text>
                            <Text className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                                Access top-rated, police-verified workers exclusively matched for premium subscribers.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Pricing / Payment Mode */}
                <View className="px-5">
                    <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                        Select Payment Mode
                    </Text>

                    {/* Selected Plan Details */}
                    <View className="bg-white dark:bg-slate-900 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-900 flex-row justify-between items-center">
                        <View>
                            <Text className="text-sm font-bold text-slate-900 dark:text-white">Annual Premium Pass</Text>
                            <Text className="text-xs text-slate-400 dark:text-slate-500">Auto-renews next year</Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-lg font-black text-slate-900 dark:text-white">Rs. 299</Text>
                            <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">+ 18% GST (Rs. 53.82)</Text>
                        </View>
                    </View>

                    {/* Payment Mode Selector */}
                    <View className="flex-row gap-2 mb-6">
                        <TouchableOpacity
                            onPress={() => setSelectedPayment('upi')}
                            className={`flex-1 py-3 rounded-xl items-center border ${selectedPayment === 'upi' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900' : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800'}`}
                        >
                            <MaterialCommunityIcons name="flash-outline" size={18} color={selectedPayment === 'upi' ? '#4F46E5' : '#64748B'} />
                            <Text className={`text-xs font-bold mt-1 ${selectedPayment === 'upi' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>UPI</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setSelectedPayment('card')}
                            className={`flex-1 py-3 rounded-xl items-center border ${selectedPayment === 'card' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900' : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800'}`}
                        >
                            <MaterialCommunityIcons name="credit-card-outline" size={18} color={selectedPayment === 'card' ? '#4F46E5' : '#64748B'} />
                            <Text className={`text-xs font-bold mt-1 ${selectedPayment === 'card' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>Card</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setSelectedPayment('netbanking')}
                            className={`flex-1 py-3 rounded-xl items-center border ${selectedPayment === 'netbanking' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900' : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800'}`}
                        >
                            <MaterialCommunityIcons name="bank-outline" size={18} color={selectedPayment === 'netbanking' ? '#4F46E5' : '#64748B'} />
                            <Text className={`text-xs font-bold mt-1 ${selectedPayment === 'netbanking' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>Net</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Pay CTA */}
            <View className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-900">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-slate-400 dark:text-slate-500 text-sm font-semibold">Total Amount</Text>
                    <Text className="text-xl font-black text-slate-900 dark:text-white">Rs. 352.82</Text>
                </View>
                <TouchableOpacity
                    onPress={handleUpgrade}
                    disabled={loading}
                    activeOpacity={0.8}
                    className="w-full bg-[#18181B] dark:bg-indigo-600 py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-sm"
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <>
                            <Feather name="shield" size={16} color="#FFF" />
                            <Text className="text-white font-black text-base">Pay & Subscribe Securely</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
