// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function PremiumPlans() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const { user } = useAppStore();
    const [selectedPlan, setSelectedPlan] = useState<'premium' | 'basic'>('premium');

    // Subscription state — from DB only (schema: provider_id, expires_at, is_active)
    const [subLoading, setSubLoading] = useState(true);
    const [subscription, setSubscription] = useState<{ expires_at: string; is_active: boolean } | null>(null);

    useEffect(() => {
        async function fetchSubscription() {
            if (!user?.id || !user?.isPremium) {
                setSubLoading(false);
                return;
            }
            try {
                const { data } = await insforge.database
                    .from('provider_premium_subscriptions')
                    .select('expires_at, is_active')
                    .eq('provider_id', user.id)
                    .eq('is_active', true)
                    .order('expires_at', { ascending: false })
                    .limit(1);

                if (data && data.length > 0) {
                    setSubscription(data[0]);
                }
            } catch (err) {
                console.error('[PremiumPlans] Fetch sub error:', err);
            } finally {
                setSubLoading(false);
            }
        }
        fetchSubscription();
    }, [user?.id, user?.isPremium]);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const daysLeft = subscription
        ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    const handleContinue = () => {
        router.push({
            pathname: '/(protected)/worker/premium-payment',
            params: { plan: selectedPlan }
        });
    };

    const isDark = colorScheme === 'dark';

    // ── Loading ─────────────────────────────────────────────────────────────
    if (subLoading && user?.isPremium) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
                <ActivityIndicator size="large" color="#F59E0B" />
            </SafeAreaView>
        );
    }

    // ── Active Subscription View ─────────────────────────────────────────────
    if (user?.isPremium) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
                {/* Header */}
                <View className="flex-row items-center px-6 py-4 justify-between">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="size-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={20} color={isDark ? '#fff' : '#000'} />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-slate-800 dark:text-slate-200">My Subscription</Text>
                    <View className="w-10" />
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {/* Active Plan Hero Card */}
                    <View className="rounded-3xl p-6 mb-5 bg-[#18181B]" style={styles.premiumShadow}>

                        {/* Badge row */}
                        <View className="flex-row items-center justify-between mb-5">
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="ribbon" size={20} color="#F59E0B" />
                                <Text className="text-sm font-black text-amber-400 uppercase tracking-widest">
                                    PREMIUM MEMBER
                                </Text>
                            </View>
                            <View className="bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40 flex-row items-center gap-1">
                                <View className="size-1.5 rounded-full bg-emerald-400" />
                                <Text className="text-[10px] font-black text-emerald-400 uppercase">ACTIVE</Text>
                            </View>
                        </View>

                        {/* Expiry */}
                        {subscription ? (
                            <View className="mb-5">
                                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">VALID UNTIL</Text>
                                <Text className="text-white text-2xl font-black">{formatDate(subscription.expires_at)}</Text>
                                <Text className="text-slate-400 text-xs font-medium mt-1">{daysLeft} days remaining</Text>
                            </View>
                        ) : (
                            <View className="mb-5">
                                <Text className="text-slate-400 text-xs font-semibold">Subscription active</Text>
                            </View>
                        )}

                        {/* Divider */}
                        <View className="h-px bg-slate-700 mb-5" />

                        {/* Benefits */}
                        <View className="gap-3">
                            {[
                                { icon: 'trending-up', label: 'Top ranking in search results' },
                                { icon: 'ribbon', label: 'Verified Premium badge on profile' },
                                { icon: 'flash', label: 'Profile boost — 3× more visibility' },
                                { icon: 'infinite', label: 'Unlimited customer leads' },
                            ].map((b, i) => (
                                <View key={i} className="flex-row items-center gap-3">
                                    <View className="size-5 rounded-full bg-amber-500/20 items-center justify-center">
                                        <Ionicons name={b.icon as any} size={11} color="#F59E0B" />
                                    </View>
                                    <Text className="text-slate-200 text-sm font-semibold">{b.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Info note */}
                    <Text className="text-center text-xs text-slate-400 px-4">
                        Thank you for choosing Karmanisht Premium! Your subscription auto-renews annually.
                    </Text>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── Plan Selection View ──────────────────────────────────────────────────
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            {/* Top Bar */}
            <View className="flex-row items-center px-6 py-4 justify-between">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="size-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700"
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={20} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-slate-800 dark:text-slate-200">Subscription Plans</Text>
                <View className="w-10" />
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                <Text className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-2 mb-6">
                    Choose a plan
                </Text>

                {/* PREMIUM CARD */}
                <TouchableOpacity
                    onPress={() => setSelectedPlan('premium')}
                    activeOpacity={0.9}
                    className={`p-6 rounded-3xl mb-4 bg-[#18181B] dark:bg-slate-900 border-2 ${
                        selectedPlan === 'premium' ? 'border-amber-400' : 'border-transparent'
                    }`}
                    style={selectedPlan === 'premium' ? styles.premiumShadow : null}
                >
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-2">
                            <Ionicons name="ribbon-outline" size={20} color="#F59E0B" />
                            <Text className="text-sm font-black text-amber-500 uppercase tracking-widest">PREMIUM</Text>
                        </View>
                        <View className="bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                            <Text className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Most Popular</Text>
                        </View>
                        {selectedPlan === 'premium' && (
                            <View className="size-5 rounded-full bg-amber-400 items-center justify-center">
                                <Feather name="check" size={12} color="#000" />
                            </View>
                        )}
                    </View>
                    <View className="flex-row items-baseline mb-6">
                        <Text className="text-4xl font-black text-white">₹999</Text>
                        <Text className="text-slate-400 font-bold ml-1">/year</Text>
                    </View>
                    <View className="flex-col gap-3">
                        {[
                            'Top ranking in search results',
                            'Verified premium badge on profile',
                            'Unlimited leads',
                            'Profile boost (3× visibility)',
                        ].map((f, i) => (
                            <View key={i} className="flex-row items-center gap-3">
                                <View className="size-5 rounded-full bg-amber-500/10 items-center justify-center">
                                    <Feather name="check" size={12} color="#F59E0B" />
                                </View>
                                <Text className="text-slate-200 text-sm font-semibold">{f}</Text>
                            </View>
                        ))}
                    </View>
                </TouchableOpacity>

                {/* BASIC CARD */}
                <TouchableOpacity
                    onPress={() => setSelectedPlan('basic')}
                    activeOpacity={0.9}
                    className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 ${
                        selectedPlan === 'basic'
                            ? 'border-slate-900 dark:border-white'
                            : 'border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">BASIC</Text>
                        {selectedPlan === 'basic' && (
                            <View className="size-5 rounded-full bg-slate-900 dark:bg-white items-center justify-center">
                                <Feather name="check" size={12} color={isDark ? '#000' : '#fff'} />
                            </View>
                        )}
                    </View>
                    <View className="flex-row items-baseline mb-6">
                        <Text className="text-4xl font-black text-slate-900 dark:text-white">₹499</Text>
                        <Text className="text-slate-500 dark:text-slate-400 font-bold ml-1">/year</Text>
                    </View>
                    <View className="flex-col gap-3">
                        {[
                            'Standard listing in search',
                            '50 customer leads/month',
                            'Profile visible in your city',
                        ].map((f, i) => (
                            <View key={i} className="flex-row items-center gap-3">
                                <View className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                                    <Feather name="check" size={12} color={isDark ? '#fff' : '#000'} />
                                </View>
                                <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">{f}</Text>
                            </View>
                        ))}
                    </View>
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom CTA */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <TouchableOpacity
                    onPress={handleContinue}
                    activeOpacity={0.8}
                    className="bg-[#18181B] dark:bg-slate-100 py-4 rounded-2xl items-center justify-center flex-row gap-2"
                >
                    <Text className="text-white dark:text-slate-950 font-black text-lg">
                        Get {selectedPlan === 'premium' ? 'Premium — ₹999/yr' : 'Basic — ₹499/yr'}
                    </Text>
                    <Feather name="arrow-right" size={18} color={isDark ? '#000' : '#fff'} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    premiumShadow: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8
    },
});
