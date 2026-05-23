// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, Platform, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

const shadowSm = Platform.OS === 'web'
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

export default function DefaultsConfigScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Config states
    const [durationHours, setDurationHours] = useState('5');
    const [priceTier1, setPriceTier1] = useState('99');
    const [priceTier2, setPriceTier2] = useState('49');
    const [priceTier3, setPriceTier3] = useState('49');
    const [basicTier1, setBasicTier1] = useState('2999');
    const [basicTier2, setBasicTier2] = useState('1999');
    const [basicTier3, setBasicTier3] = useState('499');
    const [premTier1, setPremTier1] = useState('20000');
    const [premTier2, setPremTier2] = useState('15000');
    const [premTier3, setPremTier3] = useState('5000');
    const [keyRazorpay, setKeyRazorpay] = useState('');
    const [keyStripe, setKeyStripe] = useState('');
    const [keyPaytm, setKeyPaytm] = useState('');

    const loadSettings = async (isRef = false) => {
        if (isRef) setRefreshing(true);
        else setLoading(true);

        try {
            const { data: settingsData, error } = await insforge.database
                .from('payment_settings')
                .select('*');

            if (error) throw error;

            if (settingsData) {
                settingsData.forEach((s: any) => {
                    switch (s.key) {
                        case 'default_unlock_duration_hours': setDurationHours(s.value || '5'); break;
                        case 'default_unlock_price_tier_1': setPriceTier1(s.value || '99'); break;
                        case 'default_unlock_price_tier_2': setPriceTier2(s.value || '49'); break;
                        case 'default_unlock_price_tier_3': setPriceTier3(s.value || '49'); break;
                        case 'default_provider_basic_fee_tier_1': setBasicTier1(s.value || '2999'); break;
                        case 'default_provider_basic_fee_tier_2': setBasicTier2(s.value || '1999'); break;
                        case 'default_provider_basic_fee_tier_3': setBasicTier3(s.value || '499'); break;
                        case 'default_provider_premium_fee_tier_1': setPremTier1(s.value || '20000'); break;
                        case 'default_provider_premium_fee_tier_2': setPremTier2(s.value || '15000'); break;
                        case 'default_provider_premium_fee_tier_3': setPremTier3(s.value || '5000'); break;
                        case 'gateway_key_razorpay': setKeyRazorpay(s.value || ''); break;
                        case 'gateway_key_stripe': setKeyStripe(s.value || ''); break;
                        case 'gateway_key_paytm': setKeyPaytm(s.value || ''); break;
                    }
                });
            }
        } catch (err) {
            console.error('[DefaultsConfigScreen] Load error:', err);
            Alert.alert("Database Error", "Failed to retrieve configurations.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const updates = [
                { key: 'default_unlock_duration_hours', value: durationHours },
                { key: 'default_unlock_price_tier_1', value: priceTier1 },
                { key: 'default_unlock_price_tier_2', value: priceTier2 },
                { key: 'default_unlock_price_tier_3', value: priceTier3 },
                { key: 'default_provider_basic_fee_tier_1', value: basicTier1 },
                { key: 'default_provider_basic_fee_tier_2', value: basicTier2 },
                { key: 'default_provider_basic_fee_tier_3', value: basicTier3 },
                { key: 'default_provider_premium_fee_tier_1', value: premTier1 },
                { key: 'default_provider_premium_fee_tier_2', value: premTier2 },
                { key: 'default_provider_premium_fee_tier_3', value: premTier3 },
                { key: 'gateway_key_razorpay', value: keyRazorpay },
                { key: 'gateway_key_stripe', value: keyStripe },
                { key: 'gateway_key_paytm', value: keyPaytm }
            ];

            for (const item of updates) {
                await insforge.database
                    .from('payment_settings')
                    .upsert(item);
            }

            Alert.alert("Success", "Global configurations saved successfully!");
        } catch (err: any) {
            console.error(err);
            Alert.alert("Save Error", err.message || "Failed to update configurations.");
        } finally {
            setSavingSettings(false);
        }
    };

    const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';
    const borderClass = isDark ? 'border-slate-800' : 'border-slate-200';

    return (
        <View className={`flex-1 ${isDark ? 'bg-slate-955' : 'bg-slate-50'}`} style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className={`pt-4 pb-5 px-6 flex-row items-center justify-between border-b ${isDark ? 'border-slate-900 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                    >
                        <Ionicons name="chevron-back" size={24} color="#6366F1" />
                    </TouchableOpacity>
                    <View>
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Defaults & Keys</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global Defaults Config</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => loadSettings(true)}
                    className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                >
                    <Feather name="refresh-cw" size={18} color="#6366F1" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-5 pt-4"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => loadSettings(true)} colors={['#6366F1']} />
                    }
                >
                    <View className="gap-5 pb-10">
                        {/* Default Pricing Metrics Card */}
                        <View className={`p-5 rounded-3xl border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row items-center gap-2.5 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <View className="w-8 h-8 rounded-lg bg-indigo-500/10 items-center justify-center">
                                    <Feather name="settings" size={15} color="#6366F1" />
                                </View>
                                <Text className={`text-base font-black tracking-tight ${textMainClass}`}>
                                    Default Pricing Metrics
                                </Text>
                            </View>

                            <View className="gap-4">
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Default Unlock Duration</Text>
                                    <View className="flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850">
                                        <TextInput
                                            value={durationHours}
                                            onChangeText={setDurationHours}
                                            keyboardType="number-pad"
                                            className={`flex-1 py-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                        />
                                        <Text className="text-slate-400 font-bold ml-2 text-xs uppercase tracking-wide">hours</Text>
                                    </View>
                                </View>

                                <View className={`border-t ${borderClass} pt-3 mt-1`}>
                                    <Text className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wider">Tier-Based Default Unlock Price</Text>
                                    <View className="flex-row gap-3">
                                        {[
                                            { label: 'Tier 1 Metro', value: priceTier1, setter: setPriceTier1, color: 'border-rose-500/30' },
                                            { label: 'Tier 2 City', value: priceTier2, setter: setPriceTier2, color: 'border-amber-500/30' },
                                            { label: 'Tier 3 Town', value: priceTier3, setter: setPriceTier3, color: 'border-emerald-500/30' }
                                        ].map((tier, idx) => (
                                            <View key={idx} className="flex-1">
                                                <Text className="text-[9px] font-bold text-slate-455 uppercase mb-1.5">{tier.label}</Text>
                                                <View className={`flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-850 ${tier.color}`}>
                                                    <Text className="text-slate-400 font-bold mr-1 text-xs">₹</Text>
                                                    <TextInput
                                                        value={tier.value}
                                                        onChangeText={tier.setter}
                                                        keyboardType="numeric"
                                                        className={`flex-1 py-2.5 text-xs font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                                    />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <View className={`border-t ${borderClass} pt-3`}>
                                    <Text className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wider">Tier-Based Provider Basic Subscription</Text>
                                    <View className="flex-row gap-3">
                                        {[
                                            { label: 'Tier 1 Metro', value: basicTier1, setter: setBasicTier1 },
                                            { label: 'Tier 2 City', value: basicTier2, setter: setBasicTier2 },
                                            { label: 'Tier 3 Town', value: basicTier3, setter: setBasicTier3 }
                                        ].map((tier, idx) => (
                                            <View key={idx} className="flex-1">
                                                <Text className="text-[9px] font-bold text-slate-455 uppercase mb-1.5">{tier.label}</Text>
                                                <View className="flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-850">
                                                    <Text className="text-slate-400 font-bold mr-1 text-xs">₹</Text>
                                                    <TextInput
                                                        value={tier.value}
                                                        onChangeText={tier.setter}
                                                        keyboardType="numeric"
                                                        className={`flex-1 py-2.5 text-xs font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                                    />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <View className={`border-t ${borderClass} pt-3`}>
                                    <Text className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wider">Tier-Based Provider Premium Subscription</Text>
                                    <View className="flex-row gap-3">
                                        {[
                                            { label: 'Tier 1 Metro', value: premTier1, setter: setPremTier1 },
                                            { label: 'Tier 2 City', value: premTier2, setter: setPremTier2 },
                                            { label: 'Tier 3 Town', value: premTier3, setter: setPremTier3 }
                                        ].map((tier, idx) => (
                                            <View key={idx} className="flex-1">
                                                <Text className="text-[9px] font-bold text-slate-455 uppercase mb-1.5">{tier.label}</Text>
                                                <View className="flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-850">
                                                    <Text className="text-slate-400 font-bold mr-1 text-xs">₹</Text>
                                                    <TextInput
                                                        value={tier.value}
                                                        onChangeText={tier.setter}
                                                        keyboardType="numeric"
                                                        className={`flex-1 py-2.5 text-xs font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                                    />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Credentials Card */}
                        <View className={`p-5 rounded-3xl border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row items-center gap-2.5 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <View className="w-8 h-8 rounded-lg bg-indigo-500/10 items-center justify-center">
                                    <Feather name="shield" size={15} color="#6366F1" />
                                </View>
                                <Text className={`text-base font-black tracking-tight ${textMainClass}`}>
                                    Gateway Credentials
                                </Text>
                            </View>
                            <Text className="text-[10px] font-medium text-slate-450 mb-4 leading-normal">
                                Enter active system keys for Razorpay, Stripe, and Paytm below. Active routing configurations will be set by corporate administration.
                            </Text>

                            <View className="gap-4">
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Razorpay Key ID</Text>
                                    <View className="flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-850">
                                        <MaterialCommunityIcons name="api" size={16} color="#64748B" className="mr-2" />
                                        <TextInput
                                            value={keyRazorpay}
                                            onChangeText={setKeyRazorpay}
                                            placeholder="rzp_test_..."
                                            placeholderTextColor="#94A3B8"
                                            className={`flex-1 py-3 text-xs font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                        />
                                    </View>
                                </View>
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Stripe Publishable Key</Text>
                                    <View className="flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-850">
                                        <MaterialCommunityIcons name="api" size={16} color="#64748B" className="mr-2" />
                                        <TextInput
                                            value={keyStripe}
                                            onChangeText={setKeyStripe}
                                            placeholder="pk_test_..."
                                            placeholderTextColor="#94A3B8"
                                            className={`flex-1 py-3 text-xs font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                        />
                                    </View>
                                </View>
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Paytm Merchant ID</Text>
                                    <View className="flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-850">
                                        <MaterialCommunityIcons name="api" size={16} color="#64748B" className="mr-2" />
                                        <TextInput
                                            value={keyPaytm}
                                            onChangeText={setKeyPaytm}
                                            placeholder="MID_..."
                                            placeholderTextColor="#94A3B8"
                                            className={`flex-1 py-3 text-xs font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleSaveSettings}
                            disabled={savingSettings}
                            style={{ borderRadius: 24, overflow: 'hidden' }}
                        >
                            <LinearGradient
                                colors={['#6366F1', '#4F46E5']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ paddingVertical: 16, alignItems: 'center', justify: 'center' }}
                            >
                                {savingSettings ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-sm font-bold text-white uppercase tracking-wider">Save All Configurations</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                        <View className="h-10" />
                    </View>
                </ScrollView>
            )}
        </View>
    );
}
