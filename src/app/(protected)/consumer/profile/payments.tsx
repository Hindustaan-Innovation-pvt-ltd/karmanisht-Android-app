// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import SafeIcon from '@/components/safe-icon';

export default function PaymentHistoryScreen() {
    const router = useRouter();
    const { user, categories } = useAppStore();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTxs = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }
            try {
                const { data, error } = await insforge.database
                    .from('unlock_transactions')
                    .select('*')
                    .eq('user_id', user.id);
                
                if (data && !error) {
                    const providerIds = data.map(t => t.provider_id).filter(Boolean);
                    if (providerIds.length > 0) {
                        const { data: providers } = await insforge.database
                            .from('service_providers')
                            .select('id, full_name');
                        
                        // Get categories of these service providers via provider_services
                        const { data: pServices } = await insforge.database
                            .from('provider_services')
                            .select('provider_id, category_id')
                            .in('provider_id', providerIds);

                        const mapped = data.map(t => {
                            const p = providers?.find(provider => provider.id === t.provider_id);
                            const pSvc = pServices?.find(ps => ps.provider_id === t.provider_id);
                            const category = categories.find(c => c.id === pSvc?.category_id);
                            
                            return {
                                id: t.id,
                                title: p ? `Unlocked ${p.full_name}` : 'Contact Unlock',
                                amount: `₹${t.amount}`,
                                date: new Date(t.unlocked_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
                                status: t.payment_status || 'Completed',
                                icon: category ? category.icon : 'key'
                            };
                        });
                        setTransactions(mapped);
                    } else {
                        setTransactions([]);
                    }
                }
            } catch (err) {
                console.error("Failed to load transactions:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTxs();
    }, [user?.id, categories]);

    const totalSpent = transactions.reduce((acc, t) => {
        const num = parseInt(t.amount.replace('₹', ''), 10) || 0;
        return acc + num;
    }, 0);

    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            {/* Header */}
            <View className="pt-14 pb-6 px-6 flex-row items-center border-b border-gray-50 dark:border-slate-800">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-12 h-12 bg-gray-50 dark:bg-slate-900 rounded-2xl items-center justify-center"
                >
                    <Ionicons name="chevron-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="ml-4 text-2xl font-bold text-gray-900 dark:text-slate-100">Payment History</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                {/* Balance Card */}
                <View className="bg-black dark:bg-slate-900 rounded-[32px] p-8 mb-8 shadow-xl shadow-black/20">
                    <Text className="text-gray-400 font-medium mb-2 uppercase tracking-widest text-xs">Total Spent</Text>
                    <Text className="text-white text-4xl font-bold">₹{totalSpent}</Text>
                    <View className="flex-row mt-6 justify-between items-center">
                        <View className="flex-row -space-x-2">
                            {[1, 2, 3].map(i => (
                                <View key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 items-center justify-center">
                                    <Text className="text-[10px] text-white font-bold">{i}</Text>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity className="bg-white/10 px-4 py-2 rounded-xl">
                            <Text className="text-white text-xs font-bold">View Reports</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Transactions List */}
                <Text className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Recent Transactions</Text>
                
                {loading ? (
                    <ActivityIndicator size="large" color="#3B82F6" className="mt-8" />
                ) : transactions.length === 0 ? (
                    <View className="py-12 items-center justify-center">
                        <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
                        <Text className="text-slate-400 text-center font-medium mt-3">No recent transactions found.</Text>
                    </View>
                ) : (
                    transactions.map((item) => (
                        <TouchableOpacity 
                            key={item.id}
                            className="bg-gray-50 dark:bg-slate-900 rounded-3xl p-5 mb-4 flex-row items-center justify-between border border-gray-100/50 dark:border-slate-800"
                        >
                            <View className="flex-row items-center flex-1">
                                <View className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl items-center justify-center shadow-sm">
                                    <SafeIcon name={item.icon} size={28} color="#1E293B" />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-lg font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>{item.title}</Text>
                                    <Text className="text-sm text-gray-500 font-medium mt-1">{item.date}</Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Text className="text-lg font-bold text-gray-900 dark:text-slate-100">{item.amount}</Text>
                                <View className={`mt-1 px-2 py-0.5 rounded-lg ${item.status?.toLowerCase() === 'completed' ? 'bg-green-100' : 'bg-orange-100'}`}>
                                    <Text className={`text-[10px] font-bold ${item.status?.toLowerCase() === 'completed' ? 'text-green-700' : 'text-orange-700'}`}>
                                        {item.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <View className="h-10" />
            </ScrollView>
        </View>
    );
}
