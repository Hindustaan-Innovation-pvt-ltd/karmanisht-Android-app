// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, Platform, RefreshControl, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';

const shadowSm = Platform.OS === 'web'
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

export default function TransactionsLedgerScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // References loaded from DB
    const [paymentsList, setPaymentsList] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);

    const [txSearchQuery, setTxSearchQuery] = useState('');
    const [txFilter, setTxFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

    const loadData = async (isRef = false) => {
        if (isRef) setRefreshing(true);
        else setLoading(true);

        try {
            // 1. Fetch users
            const { data: dbUsers } = await insforge.database
                .from('users')
                .select('id, full_name, mobile');
            setUsersList(dbUsers || []);

            // 2. Fetch payments
            const { data: dbPayments, error } = await insforge.database
                .from('payments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPaymentsList(dbPayments || []);
        } catch (err) {
            console.error('[TransactionsLedgerScreen] Fetch error:', err);
            Alert.alert("Database Error", "Failed to retrieve transaction ledger.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Calculate stats
    const stats = useMemo(() => {
        const paidTx = paymentsList.filter(p => p.payment_status === 'paid');
        const failedTx = paymentsList.filter(p => p.payment_status === 'failed');

        const totalVolume = paidTx.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const successCount = paidTx.length;
        const failedCount = failedTx.length;
        const totalCount = paymentsList.length;

        const successRate = totalCount > 0
            ? Math.round((successCount / (successCount + failedCount || 1)) * 100)
            : 100;

        return {
            totalVolume: totalVolume.toLocaleString('en-IN'),
            successCount,
            failedCount,
            totalCount,
            successRate
        };
    }, [paymentsList]);

    // Filter transactions
    const filteredTransactions = useMemo(() => {
        let list = paymentsList;

        // Status filter
        if (txFilter !== 'all') {
            list = list.filter(t => t.payment_status === txFilter);
        }

        // Search query
        const query = txSearchQuery.toLowerCase().trim();
        if (query) {
            list = list.filter(t => {
                const uObj = usersList.find(u => u.id === t.user_id);
                return (
                    (uObj?.full_name || '').toLowerCase().includes(query) ||
                    (uObj?.mobile || '').includes(query) ||
                    (t.gateway_payment_id || '').toLowerCase().includes(query) ||
                    (t.payment_type || '').toLowerCase().includes(query)
                );
            });
        }

        return list;
    }, [paymentsList, usersList, txFilter, txSearchQuery]);

    const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';
    const textSubClass = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <View className={`flex-1 ${isDark ? 'bg-slate-950' : 'bg-slate-500/5'}`} style={{ paddingTop: insets.top }}>
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
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Transactions Ledger</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global Ledger logs</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => loadData(true)}
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
                        <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#6366F1']} />
                    }
                >
                    <View className="gap-4 pb-10">
                        {/* Premium Financial Metrics summary widget */}
                        <View className="flex-row gap-3">
                            {/* Total Revenue */}
                            <View className={`flex-1 p-4 rounded-3xl border relative overflow-hidden ${cardBgClass}`} style={shadowSm}>
                                <View className="flex-row justify-between items-center mb-1.5">
                                    <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Volume</Text>
                                    <Feather name="trending-up" size={14} color="#10B981" />
                                </View>
                                <Text className={`text-xl font-black ${textMainClass}`}>₹{stats.totalVolume}</Text>
                                <Text className="text-[8px] font-semibold text-slate-400 mt-1">From {stats.successCount} sales</Text>
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
                                <Text className="text-[8px] font-semibold text-slate-400 mt-1">{stats.failedCount} failed tx</Text>
                                <View className="absolute -right-3 -bottom-3 opacity-5">
                                    <Feather name="shield" size={54} color={isDark ? '#FFF' : '#000'} />
                                </View>
                            </View>

                            {/* Total Counts */}
                            <View className={`flex-1 p-4 rounded-3xl border relative overflow-hidden ${cardBgClass}`} style={shadowSm}>
                                <View className="flex-row justify-between items-center mb-1.5">
                                    <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Orders</Text>
                                    <Feather name="shopping-bag" size={14} color="#F59E0B" />
                                </View>
                                <Text className={`text-xl font-black ${textMainClass}`}>{stats.totalCount}</Text>
                                <Text className="text-[8px] font-semibold text-slate-400 mt-1">Completed logs</Text>
                                <View className="absolute -right-3 -bottom-3 opacity-5">
                                    <Feather name="shopping-bag" size={54} color={isDark ? '#FFF' : '#000'} />
                                </View>
                            </View>
                        </View>

                        {/* Search bar */}
                        <View className={`flex-row items-center px-4 py-3 rounded-2xl border mt-1 ${cardBgClass}`} style={shadowSm}>
                            <Feather name="search" size={18} color="#64748B" />
                            <TextInput
                                value={txSearchQuery}
                                onChangeText={setTxSearchQuery}
                                placeholder="Search by user, mobile, status..."
                                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                className={`flex-1 ml-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                            />
                        </View>

                        {/* Filter badges */}
                        <View className="flex-row gap-2 flex-wrap">
                            {(['all', 'paid', 'pending', 'failed'] as const).map((status) => {
                                const isActive = txFilter === status;
                                let label = 'All';
                                let badgeColor = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
                                let activeColor = 'bg-indigo-600 border-indigo-650';

                                if (status === 'paid') {
                                    label = 'Success';
                                } else if (status === 'pending') {
                                    label = 'Pending';
                                } else if (status === 'failed') {
                                    label = 'Rejected';
                                }

                                return (
                                    <TouchableOpacity
                                        key={status}
                                        onPress={() => setTxFilter(status)}
                                        className={`px-3 py-2.5 rounded-xl border flex-1 min-w-[75px] items-center ${isActive ? activeColor : badgeColor
                                            }`}
                                        style={shadowSm}
                                    >
                                        <Text className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-white' : textSubClass}`}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Transactions List */}
                        {filteredTransactions.length === 0 ? (
                            <View className="py-20 items-center justify-center">
                                <MaterialCommunityIcons name="history" size={48} color="#64748B" />
                                <Text className="text-xs font-bold text-slate-400 mt-4 tracking-widest">NO TRANSACTIONS FOUND</Text>
                            </View>
                        ) : (
                            <View className="gap-3 mb-10">
                                {filteredTransactions.map((tx) => {
                                    const uObj = usersList.find(u => u.id === tx.user_id);

                                    let statusColor = 'text-amber-600 bg-amber-500/10 dark:text-amber-400';
                                    let statusText = 'Pending';
                                    let statusDot = 'bg-amber-500';
                                    if (tx.payment_status === 'paid') {
                                        statusColor = 'text-green-650 bg-green-500/10 dark:text-green-400';
                                        statusText = 'Successful';
                                        statusDot = 'bg-green-500';
                                    } else if (tx.payment_status === 'failed') {
                                        statusColor = 'text-red-600 bg-red-500/10 dark:text-red-400';
                                        statusText = 'Rejected';
                                        statusDot = 'bg-red-500';
                                    } else if (tx.payment_status === 'refunded') {
                                        statusColor = 'text-indigo-650 bg-indigo-500/10 dark:text-indigo-400';
                                        statusText = 'Refunded';
                                        statusDot = 'bg-indigo-500';
                                    }

                                    return (
                                        <View
                                            key={tx.id}
                                            className={`p-4 rounded-3xl border flex-row justify-between items-center ${cardBgClass}`}
                                            style={shadowSm}
                                        >
                                            <View className="flex-1 gap-1.5 mr-2">
                                                <Text className={`text-base font-medium ${textMainClass}`}>
                                                    {uObj?.full_name || 'Anonymous User'}
                                                </Text>
                                                <Text className="text-xs font-semibold text-slate-400">
                                                    {uObj?.mobile || 'No Mobile'} • ID: {tx.gateway_payment_id || tx.id.slice(0, 8)}
                                                </Text>

                                                <View className="flex-row gap-2 mt-2 flex-wrap items-center">
                                                    <View className="bg-slate-100 dark:bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-800">
                                                        <Text className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                                                            {tx.payment_type === 'unlock_pass' ? 'Unlock Pass' : 'Subscription'}
                                                        </Text>
                                                    </View>
                                                    <View className="bg-slate-100 dark:bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-800">
                                                        <Text className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                                                            {tx.gateway?.toUpperCase() || 'MOCK'}
                                                        </Text>
                                                    </View>
                                                    <Text className="text-[9px] text-slate-400 font-bold ml-1 uppercase tracking-wider">
                                                        {new Date(tx.created_at).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View className="items-end gap-2">
                                                <Text className={`text-lg font-black ${textMainClass}`}>
                                                    ₹{tx.amount}
                                                </Text>
                                                <View className={`px-2.5 py-0.5 rounded-md flex-row items-center gap-1.5 ${statusColor}`}>
                                                    <View className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                                                    <Text className="text-[9px] font-black uppercase tracking-wide">
                                                        {statusText}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}
