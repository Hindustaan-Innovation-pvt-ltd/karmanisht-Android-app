// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
    FlatList, Text, View, TouchableOpacity, Linking,
    ActivityIndicator, RefreshControl, Alert, Image
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
 
type Lead = {
    id: string;
    name: string;
    phone: string;
    profileImage: string;
    amount: number;
    paymentStatus: string;
    unlockedAt: string;
    called: boolean;
};
 
 
 
function isNew(dateStr: string): boolean {
    if (!dateStr) return false;
    return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000; // < 24h
}
 
const FILTERS = ['All', 'New', 'Called'] as const;
type Filter = typeof FILTERS[number];
 
export default function WorkerLeads() {
    const { t } = useTranslation();
    const { user } = useAppStore();
    const { isDark } = useTheme();
 
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<Filter>('All');
    const [calledIds, setCalledIds] = useState<Set<string>>(new Set());
 
    const fetchLeads = useCallback(async (isRefresh = false) => {
        if (!user?.id) { setLoading(false); return; }
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const { data, error } = await insforge.database
                .from('unlock_transactions')
                .select('id, user_id, amount, payment_status, unlocked_at, users(full_name, mobile, profile_image)')
                .eq('provider_id', user.id)
                .order('unlocked_at', { ascending: false });
 
            if (data && !error) {
                const formatted: Lead[] = data.map((item: any) => ({
                    id: item.id,
                    name: item.users?.full_name || t('customer'),
                    phone: item.users?.mobile || '',
                    profileImage: item.users?.profile_image || '',
                    amount: Number(item.amount) || 0,
                    paymentStatus: item.payment_status || 'paid',
                    unlockedAt: item.unlocked_at || '',
                    called: false,
                }));
                setLeads(formatted);
            } else {
                setLeads([]);
            }
        } catch (err) {
            console.error('Failed to fetch leads:', err);
            setLeads([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id, t]);
 
    useEffect(() => { fetchLeads(); }, [fetchLeads]);
 
    const handleCall = (lead: Lead) => {
        if (!lead.phone) {
            Alert.alert(t('noNumber'), t('phoneNotAvailableLead'));
            return;
        }
        Linking.openURL(`tel:${lead.phone}`);
        setCalledIds(prev => new Set([...prev, lead.id]));
    };
 
 
 
    const filteredLeads = leads.filter(l => {
        const isCalled = calledIds.has(l.id);
        if (filter === 'New') return isNew(l.unlockedAt) && !isCalled;
        if (filter === 'Called') return isCalled;
        return true;
    });
 
    const newCount = leads.filter(l => isNew(l.unlockedAt) && !calledIds.has(l.id)).length;
 
    const FILTER_LABELS: Record<Filter, string> = {
        All: t('all'),
        New: t('new'),
        Called: t('called'),
    };
 
    return (
        <SafeAreaProvider>
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
 
                {/* ── Header ─────────────────────────────────────────── */}
                <View className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 pt-5 pb-4">
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t('leads')}</Text>
                            <Text className="text-xs font-semibold text-slate-400 dark:text-slate-550 uppercase tracking-wider mt-0.5">
                                {leads.length} {t('total')} • {newCount} {t('new')}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => fetchLeads(true)}
                            className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700"
                            activeOpacity={0.7}
                        >
                            <Feather name="refresh-cw" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                        </TouchableOpacity>
                    </View>
 
                    {/* Filter tabs - Simple pill design */}
                    <View className="flex-row gap-2 mt-4">
                        {FILTERS.map(f => {
                            const active = filter === f;
                            const count = f === 'New' ? newCount : f === 'Called' ? calledIds.size : leads.length;
                            return (
                                <TouchableOpacity
                                    key={f}
                                    onPress={() => setFilter(f)}
                                    className="px-4 py-2 rounded-full border"
                                    style={{
                                        backgroundColor: active ? (isDark ? '#334155' : '#0f172a') : 'transparent',
                                        borderColor: active ? (isDark ? '#475569' : '#0f172a') : (isDark ? '#1e293b' : '#e2e8f0'),
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        className="text-xs font-bold"
                                        style={{
                                            color: active ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')
                                        }}
                                    >
                                        {FILTER_LABELS[f]} ({count})
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
 
                {/* ── List ───────────────────────────────────────────── */}
                {loading ? (
                    <View className="flex-1 items-center justify-center gap-3">
                        <ActivityIndicator size="large" color="#6366f1" />
                        <Text className="text-sm text-slate-400 font-medium">{t('loadingLeads')}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredLeads}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => fetchLeads(true)}
                                tintColor="#6366f1"
                            />
                        }
                        renderItem={({ item }) => {
                            const called = calledIds.has(item.id);
                            const fresh = isNew(item.unlockedAt);
 
                            return (
                                <View
                                    className="bg-white dark:bg-slate-900 rounded-2xl mb-2.5 border p-4 flex-row items-center justify-between"
                                    style={{
                                        borderColor: called ? (isDark ? '#1e293b' : '#f1f5f9') : (isDark ? '#334155' : '#cbd5e1'),
                                    }}
                                >
                                    <View className="flex-row items-center flex-1 gap-3">
                                        {/* Avatar / Profile photo */}
                                        {item.profileImage ? (
                                            <Image
                                                source={{ uri: item.profileImage }}
                                                className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800"
                                            />
                                        ) : (
                                            <View
                                                className="w-11 h-11 rounded-full items-center justify-center"
                                                style={{
                                                    backgroundColor: called ? (isDark ? '#1e293b' : '#f1f5f9') : (isDark ? '#1e1b4b' : '#e0e7ff')
                                                }}
                                            >
                                                <Text
                                                    className="text-sm font-black"
                                                    style={{
                                                        color: called ? '#94a3b8' : (isDark ? '#818cf8' : '#4f46e5')
                                                    }}
                                                >
                                                    {item.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
 
                                        {/* Lead details */}
                                        <View className="flex-1">
                                            <View className="flex-row items-center gap-1.5 flex-wrap">
                                                <Text
                                                    className="text-sm font-bold"
                                                    style={{
                                                        color: called ? (isDark ? '#64748b' : '#94a3b8') : (isDark ? '#ffffff' : '#0f172a')
                                                    }}
                                                >
                                                    {item.name}
                                                </Text>
                                                {fresh && !called && (
                                                    <View className="bg-indigo-500/10 dark:bg-indigo-400/10 px-1.5 py-0.5 rounded-md">
                                                        <Text className="text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-wider">{t('new')}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                                {item.phone ? `+91 ${item.phone}` : t('noNumber')}
                                            </Text>
                                        </View>
                                    </View>
 
                                    {/* Action buttons */}
                                    <View className="flex-row gap-1.5 items-center ml-2">
                                        <TouchableOpacity
                                            onPress={() => handleCall(item)}
                                            className="w-10 h-10 rounded-xl items-center justify-center border"
                                            style={{
                                                backgroundColor: called ? (isDark ? '#0f172a' : '#f8fafc') : (isDark ? '#1e293b' : '#f1f5f9'),
                                                borderColor: isDark ? '#334155' : '#e2e8f0',
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name="call"
                                                size={16}
                                                color={called ? (isDark ? '#64748b' : '#94a3b8') : (isDark ? '#38bdf8' : '#0284c7')}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }}
                        ListEmptyComponent={() => (
                            <View className="items-center justify-center py-24 px-10">
                                <View className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
                                    <Ionicons name="people-outline" size={28} color={isDark ? '#94a3b8' : '#64748b'} />
                                </View>
                                <Text className="text-lg font-bold text-slate-900 dark:text-white text-center">
                                    {filter === 'New' ? t('noNewLeads') : filter === 'Called' ? t('noCalledLeads') : t('noLeadsYet')}
                                </Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2 leading-relaxed">
                                    {filter === 'All'
                                        ? t('noLeadsDescAll')
                                        : t('noLeadsDescFilter')
                                    }
                                </Text>
                            </View>
                        )}
                    />
                )}
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
