// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Platform, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';

const shadowSm = Platform.OS === 'web'
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

export default function PaymentsMenu() {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Financial calculations
    const [stats, setStats] = useState({
        totalVolume: '0',
        successCount: 0,
        failedCount: 0,
        totalCount: 0,
        successRate: 100
    });

    const fetchPaymentAnalytics = async (isRef = false) => {
        if (isRef) setRefreshing(true);
        else setLoading(true);

        try {
            const { data: dbPayments, error } = await insforge.database
                .from('payments')
                .select('*');

            if (error) throw error;

            const list = dbPayments || [];
            const paidTx = list.filter(p => p.payment_status === 'paid');
            const failedTx = list.filter(p => p.payment_status === 'failed');

            const totalVolume = paidTx.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
            const successCount = paidTx.length;
            const failedCount = failedTx.length;
            const totalCount = list.length;

            const successRate = totalCount > 0
                ? Math.round((successCount / (successCount + failedCount || 1)) * 100)
                : 100;

            setStats({
                totalVolume: totalVolume.toLocaleString('en-IN'),
                successCount,
                failedCount,
                totalCount,
                successRate
            });
        } catch (err) {
            console.error('[PaymentsMenu] Fetch error:', err);
            Alert.alert("Database Error", "Failed to retrieve ledger metrics.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPaymentAnalytics();
    }, []);

    const bgClass = isDark ? 'bg-slate-955' : 'bg-slate-50';
    const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';

    return (
        <View className={`flex-1 ${bgClass}`} style={{ paddingTop: insets.top }}>
            {/* Premium Header */}
            <View className={`pt-4 pb-5 px-6 flex-row items-center justify-between border-b ${isDark ? 'border-slate-900 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                    >
                        <Ionicons name="chevron-back" size={24} color="#6366F1" />
                    </TouchableOpacity>
                    <View>
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Payments</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global Admin Console</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => fetchPaymentAnalytics(true)}
                    className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                >
                    <Feather name="refresh-cw" size={18} color="#6366F1" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text className="text-xs font-bold text-slate-500 mt-4 tracking-widest uppercase">Calculating ledger...</Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-5 pt-5"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchPaymentAnalytics(true)} colors={['#6366F1']} />
                    }
                >
                    {/* Metrics Summary Widgets */}
                    <View className="flex-row gap-3 mb-5">
                        {/* Total Revenue */}
                        <View className={`flex-1 p-4 rounded-3xl border relative overflow-hidden ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row justify-between items-center mb-1.5">
                                <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Volume</Text>
                                <Feather name="trending-up" size={14} color="#10B981" />
                            </View>
                            <Text className={`text-xl font-black ${textMainClass}`}>₹{stats.totalVolume}</Text>
                            <Text className="text-[8px] font-semibold text-slate-455 mt-1">From {stats.successCount} sales</Text>
                            <View className="absolute -right-3 -bottom-3 opacity-5">
                                <MaterialCommunityIcons name="currency-inr" size={54} color={isDark ? '#FFF' : '#000'} />
                            </View>
                        </View>

                        {/* Success Rate */}
                        <View className={`flex-1 p-4 rounded-3xl border relative overflow-hidden ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row justify-between items-center mb-1.5">
                                <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Success Rate</Text>
                                <Feather name="shield" size={14} color="#6366F1" />
                            </View>
                            <Text className="text-xl font-black text-indigo-500">{stats.successRate}%</Text>
                            <Text className="text-[8px] font-semibold text-slate-455 mt-1">{stats.failedCount} failed tx</Text>
                            <View className="absolute -right-3 -bottom-3 opacity-5">
                                <Feather name="shield" size={54} color={isDark ? '#FFF' : '#000'} />
                            </View>
                        </View>
                    </View>

                    {/* Quick Routing Cards */}
                    <Text className={`text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1`}>Payments Modules</Text>

                    <View className="gap-3 mb-10">
                        {/* 1. Defaults & API Keys */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/payments/defaults')}
                            className={`p-5 rounded-2xl flex-row items-center justify-between border border-l-4 ${cardBgClass} border-l-indigo-500 active:scale-[0.97]`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center flex-1 mr-2">
                                <View className="w-11 h-11 rounded-xl items-center justify-center mr-3.5 bg-indigo-500/10">
                                    <Feather name="settings" size={18} color="#6366F1" />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-sm font-bold ${textMainClass}`}>Default Metrics & Keys</Text>
                                    <Text className="text-[10px] font-medium text-slate-400" numberOfLines={1}>Unlock duration, tier prices, API gateway switches</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={18} color="#94A3B8" />
                        </TouchableOpacity>

                        {/* 2. Cities & Regional Tiers */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/payments/cities')}
                            className={`p-5 rounded-2xl flex-row items-center justify-between border border-l-4 ${cardBgClass} border-l-sky-500 active:scale-[0.97]`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center flex-1 mr-2">
                                <View className="w-11 h-11 rounded-xl items-center justify-center mr-3.5 bg-sky-500/10">
                                    <Feather name="map-pin" size={18} color="#0EA5E9" />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-sm font-bold ${textMainClass}`}>Cities & Regional Tiers</Text>
                                    <Text className="text-[10px] font-medium text-slate-400" numberOfLines={1}>Manage cities list, configure tier classes & statuses</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={18} color="#94A3B8" />
                        </TouchableOpacity>

                        {/* 3. Category Pricing Overrides */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/payments/overrides')}
                            className={`p-5 rounded-2xl flex-row items-center justify-between border border-l-4 ${cardBgClass} border-l-purple-500 active:scale-[0.97]`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center flex-1 mr-2">
                                <View className="w-11 h-11 rounded-xl items-center justify-center mr-3.5 bg-purple-500/10">
                                    <Feather name="percent" size={18} color="#A855F7" />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-sm font-bold ${textMainClass}`}>Category Pricing Overrides</Text>
                                    <Text className="text-[10px] font-medium text-slate-400" numberOfLines={1}>Set custom prices and unlocks for specific cities</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={18} color="#94A3B8" />
                        </TouchableOpacity>

                        {/* 4. Transactions Ledger */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/payments/transactions')}
                            className={`p-5 rounded-2xl flex-row items-center justify-between border border-l-4 ${cardBgClass} border-l-emerald-500 active:scale-[0.97]`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center flex-1 mr-2">
                                <View className="w-11 h-11 rounded-xl items-center justify-center mr-3.5 bg-green-500/10">
                                    <Feather name="list" size={18} color="#22C55E" />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-sm font-bold ${textMainClass}`}>Transactions Ledger</Text>
                                    <Text className="text-[10px] font-medium text-slate-400" numberOfLines={1}>Audit customer unlocks and worker subscriptions ledger</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}
