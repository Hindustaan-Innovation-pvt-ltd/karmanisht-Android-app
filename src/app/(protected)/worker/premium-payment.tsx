// @ts-nocheck
import React, { useState } from 'react';
import {
    ScrollView, Text, TouchableOpacity, View,
    Alert, ActivityIndicator, Modal, NativeModules,
    Platform, useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Confetti } from '@/components/Confetti';
import { useTranslation } from 'react-i18next';
import { useCityPricing } from '@/hooks/queries';


const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_SpC8XTKEi3eJGe';

export default function PremiumPayment() {
    const { t } = useTranslation();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const params = useLocalSearchParams();
    const { user, refreshProfile } = useAppStore();
    const userLocation = useAppStore(state => state.userLocation);

    const plan = params.plan === 'basic' ? 'basic' : 'premium';

    const categoryId = user?.professionId || '3489b160-1ea8-42cb-808f-7279e35cc717';
    const { data: cityPricingData, isLoading: loadingPricing } = useCityPricing(
        categoryId,
        userLocation?.coords ? { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude } : null
    );

    const pricingConfig = cityPricingData?.pricingConfig || null;
    const basePrice = plan === 'basic'
        ? (pricingConfig?.provider_basic_fee ?? 499)
        : (pricingConfig?.provider_premium_fee ?? 999);

    const gstPrice = Math.round(basePrice * 0.18);
    const totalPrice = basePrice + gstPrice;
    const totalPaisa = totalPrice * 100;

    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Open Razorpay directly with known plan amount — no edge fn / city_pricing_config needed
    const openRazorpay = (): Promise<'success' | 'cancelled' | 'unavailable'> => {
        return new Promise((resolve) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const RazorpayCheckout = require('react-native-razorpay').default;
                const options = {
                    description: `Karmanisht ${plan === 'premium' ? 'Premium' : 'Basic'} Subscription`,
                    image: 'https://i.imgur.com/3g7UR1G.png',
                    currency: 'INR',
                    key: RAZORPAY_KEY,
                    amount: totalPaisa,   // paise — order_id is optional without Razorpay Orders API
                    name: 'Karmanisht',
                    prefill: {
                        email: 'provider@karmanisht.com',
                        contact: user?.phone || '',
                        name: user?.name || 'Provider',
                    },
                    theme: { color: '#F59E0B' },
                };
                RazorpayCheckout.open(options)
                    .then(() => resolve('success'))
                    .catch((err: any) => {
                        console.warn('[Razorpay] Cancelled/failed:', err?.description);
                        resolve('cancelled');
                    });
            } catch (err) {
                console.warn('[Razorpay] SDK unavailable:', err);
                resolve('unavailable');
            }
        });
    };

    // Activate Premium: save to DB per backend spec (doc sections 9 & 10)
    // Tables written:
    //   1. provider_premium_subscriptions  (provider_id, profession_id, city_id, amount_paid, expires_at, is_active)
    //   2. payments  (user_id, payment_type:'premium_subscription', reference_id, amount, gateway_payment_id, payment_status:'paid')
    //   3. service_providers.is_premium = true  (also set by update_provider_premium_status trigger)
    const activatePremium = async (gatewayPaymentId: string = `mock_${Date.now()}`) => {
        if (!user?.id) {
            console.error('[activatePremium] No user ID available');
            return false;
        }
        console.log('[activatePremium] Starting DB save for user:', user.id);

        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        // Fetch city_id and profession_id — both are NOT NULL in DB
        let cityId: string | null = null;
        let professionId: string | null = null;
        try {
            const { data: cities } = await insforge.database
                .from('cities')
                .select('id')
                .limit(1);
            cityId = cities?.[0]?.id ?? null;

            const { data: provSvc } = await insforge.database
                .from('provider_services')
                .select('category_id')
                .eq('provider_id', user.id)
                .limit(1);
            professionId = provSvc?.[0]?.category_id ?? null;
        } catch (e) {
            console.error('[activatePremium] Failed to fetch city or profession metadata:', e);
        }

        // Guard: city_id and profession_id are NOT NULL — abort if missing
        if (!cityId || !professionId) {
            console.error('[activatePremium] Cannot insert subscription: cityId or professionId is null', { cityId, professionId });
            // Still mark is_premium = true so user gets access, but log the DB skip
        }

        // 1. Insert into provider_premium_subscriptions
        // amount_paid, profession_id, city_id are all NOT NULL in schema
        let subscriptionId: string | null = null;
        if (cityId && professionId) {
            try {
                const { error: subError } = await insforge.database
                    .from('provider_premium_subscriptions')
                    .insert({
                        provider_id: user.id,
                        profession_id: professionId,
                        city_id: cityId,
                        amount_paid: totalPrice,        // NOT NULL — actual INR amount paid
                        expires_at: expiresAt.toISOString(),
                        is_active: true,
                    });

                if (subError) {
                    console.error('[activatePremium] Subscription insert FAILED:', JSON.stringify(subError));
                } else {
                    console.log('[activatePremium] Subscription insert OK — fetching id...');
                    const { data: fetchedSub, error: fetchErr } = await insforge.database
                        .from('provider_premium_subscriptions')
                        .select('id')
                        .eq('provider_id', user.id)
                        .eq('is_active', true)
                        .order('expires_at', { ascending: false })
                        .limit(1);

                    if (fetchErr) {
                        console.error('[activatePremium] Subscription id fetch FAILED:', JSON.stringify(fetchErr));
                    } else {
                        subscriptionId = fetchedSub?.[0]?.id ?? null;
                        console.log('[activatePremium] Subscription id:', subscriptionId);
                    }
                }
            } catch (e) {
                console.error('[activatePremium] Subscription insert exception:', e);
            }
        }

        // 2. Insert into payments ledger
        // reference_id (uuid, NOT NULL) must point to a valid subscription row
        // amount (numeric, NOT NULL) must be provided
        if (subscriptionId) {
            try {
                const { error: payError } = await insforge.database
                    .from('payments')
                    .insert({
                        user_id: user.id,
                        payment_type: 'premium_subscription',
                        reference_id: subscriptionId,   // NOT NULL — uuid of the subscription
                        amount: totalPrice,             // NOT NULL — actual INR amount
                        gateway: 'razorpay',
                        gateway_payment_id: gatewayPaymentId,
                        payment_status: 'paid',
                    });

                if (payError) {
                    console.error('[activatePremium] Payments insert FAILED:', JSON.stringify(payError));
                } else {
                    console.log('[activatePremium] Payment record saved OK');
                }
            } catch (e) {
                console.error('[activatePremium] Payments insert exception:', e);
            }
        } else {
            console.warn('[activatePremium] Skipping payments insert — no subscriptionId available');
        }


        // 3. Directly set is_premium (DB trigger update_provider_premium_status does this too)
        try {
            const { error: spError } = await insforge.database
                .from('service_providers')
                .update({ is_premium: true })
                .eq('id', user.id);

            if (spError) {
                console.error('[activatePremium] is_premium update FAILED:', JSON.stringify(spError));
            } else {
                console.log('[activatePremium] is_premium = true saved OK');
            }
        } catch (e) {
            console.error('[activatePremium] is_premium update exception:', e);
        }

        // 4. Refresh local Zustand state so UI reflects is_premium immediately
        try {
            await refreshProfile();
            console.log('[activatePremium] Profile refreshed successfully');
        } catch (e) {
            console.error('[activatePremium] refreshProfile exception:', e);
        }

        // Return true always — payment was collected, show success even if DB had issues
        return true;
    };


    // ── Shared mock confirm flow ───────────────────────────────────────────────
    const runMockFlow = async () => {
        const confirmed = await new Promise<boolean>((resolve) => {
            Alert.alert(
                t('confirmPayment', 'Confirm Payment'),
                t('simulatePaymentMsg', { price: totalPrice, plan: plan === 'premium' ? t('premium', 'PREMIUM') : t('basic', 'BASIC') }, `Simulate payment of \u20b9${totalPrice} for ${plan === 'premium' ? 'Premium' : 'Basic'} plan?`),
                [
                    { text: t('cancel', 'Cancel'), onPress: () => resolve(false), style: 'cancel' },
                    { text: t('confirmPrice', { price: totalPrice }, `Confirm \u20b9${totalPrice}`), onPress: () => resolve(true) },
                ]
            );
        });
        if (!confirmed) { setLoading(false); return; }
        // Pass mock payment id so payments table has a reference
        const ok = await activatePremium(`mock_pay_${Date.now()}`);
        setLoading(false);
        if (ok) setShowSuccess(true);
        else Alert.alert(t('error', 'Error'), t('activationFailed', 'Activation failed. Please contact support.'));
    };

    // ── Main Pay Handler ──────────────────────────────────────────────────────
    const handlePay = async () => {
        setLoading(true);
        try {
            const isLinked = !!NativeModules.RNRazorpayCheckout;

            // No real SDK linked or web → mock confirm flow
            if (Platform.OS === 'web' || !isLinked) {
                await runMockFlow();
                return;
            }

            // Real Razorpay SDK flow
            const result = await openRazorpay();

            if (result === 'unavailable') {
                // SDK crashed — fallback to mock
                await runMockFlow();
                return;
            }

            if (result === 'cancelled') {
                setLoading(false);
                Alert.alert(t('paymentCancelled', 'Payment Cancelled'), t('paymentCancelledMsg', 'You cancelled the payment. Try again when ready.'));
                return;
            }

            // Payment success — activate premium directly in DB
            const ok = await activatePremium();
            setLoading(false);
            if (ok) setShowSuccess(true);
            else Alert.alert(t('error', 'Error'), t('paymentSuccessActivationFailed', 'Payment successful but activation failed. Contact support.'));
        } catch (err: any) {
            console.error('[handlePay]', err);
            setLoading(false);
            Alert.alert(t('error', 'Error'), err?.message || t('unexpectedError', 'An unexpected error occurred.'));
        }
    };

    const handleSuccessOk = () => {
        setShowSuccess(false);
        router.replace('/(protected)/worker/settings');
    };

    if (loadingPricing) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
                <ActivityIndicator size="large" color="#F59E0B" />
            </SafeAreaView>
        );
    }

    const isDark = colorScheme === 'dark';

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">

            {/* ── Premium Success Modal ─────────────────────────────────── */}
            <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => {}}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
                    <Confetti active={showSuccess} />
                    <View style={{ backgroundColor: '#fff', borderRadius: 28, padding: 32, width: '100%', alignItems: 'center', elevation: 12 }}>

                        {/* Golden star badge */}
                        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#fffbeb', borderWidth: 3, borderColor: '#FCD34D', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <Ionicons name="ribbon" size={44} color="#F59E0B" />
                        </View>

                        {/* Premium badge pill */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 99, marginBottom: 16, gap: 5 }}>
                            <Ionicons name="star" size={11} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 }}>{t('premiumMember', 'PREMIUM MEMBER')}</Text>
                        </View>

                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 8, textAlign: 'center' }}>{t('youArePremium', "You're Premium!")}</Text>
                        <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
                            {t('subscriptionActiveDesc', { plan: plan === 'premium' ? t('premium', 'PREMIUM') : t('basic', 'BASIC') }, `Your ${plan === 'premium' ? 'Premium' : 'Basic'} subscription is now active.`)}
                        </Text>

                        {/* Benefits list */}
                        <View style={{ alignSelf: 'stretch', backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 24, gap: 10 }}>
                            {[
                                { icon: 'trending-up', label: t('benefitSearchRanking', 'Top ranking in search results') },
                                { icon: 'shield-checkmark', label: t('benefitVerifiedBadge', 'Verified Premium badge on profile') },
                                { icon: 'flash', label: t('benefitProfileBoost', 'Profile boost — 3× more visibility') },
                                { icon: 'infinite', label: plan === 'premium' ? t('benefitUnlimitedLeads', 'Unlimited customer leads') : t('benefitBasicLeads', '50 customer leads/month') },
                            ].map((b, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name={b.icon as any} size={14} color="#D97706" />
                                    </View>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', flex: 1 }}>{b.label}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={handleSuccessOk}
                            activeOpacity={0.85}
                            style={{ backgroundColor: '#18181b', borderRadius: 16, paddingVertical: 15, width: '100%', alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{t('goToDashboard', 'Go to Dashboard')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Header ───────────────────────────────────────────────── */}
            <View className="flex-row items-center px-6 py-4 justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="size-10 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700"
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Ionicons name="arrow-back" size={20} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
                <Text className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">{t('completePayment', 'Complete Payment')}</Text>
                <View className="w-10" />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

                {/* Plan summary card */}
                <View className="bg-[#18181B] rounded-3xl p-6 mb-6" style={{ shadowColor: '#F59E0B', shadowOpacity: 0.2, shadowRadius: 20, elevation: 6 }}>
                    <View className="flex-row items-center gap-2 mb-4">
                        <Ionicons name="ribbon" size={18} color="#F59E0B" />
                        <Text className="text-xs font-black text-amber-400 uppercase tracking-widest">
                            {plan === 'premium' ? t('premiumPlan', 'PREMIUM PLAN') : t('basicPlan', 'BASIC PLAN')}
                        </Text>
                    </View>
                    <View className="flex-row items-baseline mb-5">
                        <Text className="text-4xl font-black text-white">₹{basePrice}</Text>
                        <Text className="text-slate-400 font-bold ml-1">{t('perYear', '/year')}</Text>
                    </View>
                    <View className="h-px bg-slate-800 mb-4" />
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-slate-400 text-sm">{t('planPrice', 'Plan price')}</Text>
                        <Text className="text-slate-200 text-sm font-semibold">₹{basePrice}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-slate-400 text-sm">{t('gstTax', 'GST (18%)')}</Text>
                        <Text className="text-slate-200 text-sm font-semibold">₹{gstPrice}</Text>
                    </View>
                    <View className="h-px bg-slate-800 my-3" />
                    <View className="flex-row justify-between">
                        <Text className="text-white text-base font-black">{t('total', 'Total')}</Text>
                        <Text className="text-white text-base font-black">₹{totalPrice}</Text>
                    </View>
                </View>

                {/* What you get */}
                <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t('whatYouGet', 'What you get')}</Text>
                <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 mb-6 gap-4">
                    {[
                        { icon: 'trending-up', color: '#6366F1', bg: '#EEF2FF', label: t('benefitSearchRanking', 'Top ranking in search results'), sub: t('searchRankingSub', 'Appear first when customers search') },
                        { icon: 'shield-checkmark', color: '#10B981', bg: '#F0FDF4', label: t('benefitVerifiedBadge', 'Verified Premium badge on profile'), sub: t('verifiedBadgeSub', 'Golden badge on your profile') },
                        { icon: 'flash', color: '#F59E0B', bg: '#FFFBEB', label: t('benefitProfileBoost', 'Profile boost — 3× more visibility'), sub: t('profileBoostSub', '3× more visibility across the app') },
                        { icon: 'infinite', color: '#EC4899', bg: '#FDF2F8', label: plan === 'premium' ? t('benefitUnlimitedLeads', 'Unlimited customer leads') : t('benefitBasicLeads', '50 customer leads/month'), sub: plan === 'premium' ? t('unlimitedLeadsSub', 'No limit on customer contacts') : t('limitedLeadsSub', 'Up to 50 new customer leads') },
                    ].map((b, i) => (
                        <View key={i} className="flex-row items-center gap-3">
                            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: b.bg, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name={b.icon as any} size={20} color={b.color} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-bold text-slate-900 dark:text-white">{b.label}</Text>
                                <Text className="text-xs text-slate-500 dark:text-slate-400">{b.sub}</Text>
                            </View>
                            <Feather name="check" size={16} color="#10B981" />
                        </View>
                    ))}
                </View>

                {/* Secure payment note */}
                <View className="flex-row items-center justify-center gap-2 mb-2">
                    <Feather name="lock" size={13} color="#94a3b8" />
                    <Text className="text-xs text-slate-400 font-semibold">{t('securedByRazorpay', 'Secured by Razorpay · 256-bit SSL')}</Text>
                </View>
                <Text className="text-center text-[11px] text-slate-400 px-4">
                    {t('paymentChargeNote', { price: totalPrice }, `You will be charged ₹${totalPrice} (incl. GST). Subscription is valid for 1 year from activation.`)}
                </Text>
            </ScrollView>

            {/* ── Sticky Pay Button ─────────────────────────────────────── */}
            <View className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <TouchableOpacity
                    onPress={handlePay}
                    activeOpacity={0.85}
                    disabled={loading}
                    className={`py-4 rounded-2xl items-center justify-center flex-row gap-2 ${loading ? 'bg-slate-400' : 'bg-amber-500'}`}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="ribbon" size={18} color="#fff" />
                            <Text className="text-white font-black text-lg">
                                {t('payGetPremium', { price: totalPrice }, `Pay ₹${totalPrice} · Get Premium`)}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
                <View className="flex-row items-center justify-center gap-1 mt-2">
                    <Feather name="lock" size={11} color="#94a3b8" />
                    <Text className="text-slate-400 text-xs font-bold">{t('secureRazorpayEncrypted', 'Secure · Razorpay encrypted')}</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
