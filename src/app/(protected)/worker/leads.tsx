// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { FlatList, Text, View, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { UserIcon, PhoneIcon, ClockIcon, MapPinIcon } from '@/svg/icons';
import { useAppContext } from '@/lib/context';
import { insforge } from '@/lib/insforge';

export default function WorkerLeads() {
    const { user } = useAppContext();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLeads() {
            if (!user?.id) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const { data, error } = await insforge.database
                    .from('unlock_transactions')
                    .select('id, user_id, amount, payment_status, unlocked_at, users(full_name, mobile)')
                    .eq('provider_id', user.id);
                
                if (data && !error) {
                    const formatted = data.map((item: any) => ({
                        id: item.id,
                        name: item.users?.full_name || 'Customer',
                        phone: item.users?.mobile || '',
                        location: 'Hyperlocal Customer',
                        date: item.unlocked_at ? new Date(item.unlocked_at).toLocaleString() : new Date().toLocaleString()
                    }));
                    setLeads(formatted);
                } else {
                    setLeads([]);
                }
            } catch (err) {
                console.error("Failed to fetch worker leads:", err);
                setLeads([]);
            } finally {
                setLoading(false);
            }
        }
        fetchLeads();
    }, [user?.id]);

    return (
        <SafeAreaProvider>
            <SafeAreaView className="flex-1 bg-slate-50">
                <View className="px-5 py-6 bg-white border-b border-slate-100">
                    <Text className="text-2xl font-black text-slate-900 tracking-tight">Recent Leads</Text>
                    <Text className="text-sm text-slate-500 font-medium mt-1">Customers who viewed your contact</Text>
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="black" />
                    </View>
                ) : (
                <FlatList
                    data={leads}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    renderItem={({ item }) => (
                        <View className="bg-white rounded-3xl p-5 mb-4 border border-slate-100 shadow-sm">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center gap-3">
                                    <View className="size-12 rounded-2xl bg-slate-100 items-center justify-center">
                                        <UserIcon size={20} color="#64748B" />
                                    </View>
                                    <View>
                                        <Text className="text-base font-bold text-slate-900">{item.name}</Text>
                                        <View className="flex-row items-center gap-1">
                                            <MapPinIcon size={10} color="#94A3B8" />
                                            <Text className="text-xs text-slate-400 font-medium">{item.location}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View className="items-end">
                                    <View className="flex-row items-center gap-1">
                                        <ClockIcon size={10} color="#94A3B8" />
                                        <Text className="text-[10px] text-slate-400 font-bold uppercase">{item.date}</Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={() => Linking.openURL(`tel:${item.phone}`)}
                                activeOpacity={0.8}
                                className="bg-slate-900 flex-row items-center justify-center py-3.5 rounded-2xl gap-2"
                            >
                                <PhoneIcon size={16} color="#fff" />
                                <Text className="text-white font-bold">Call Customer</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={() => (
                        <View className="flex-1 items-center justify-center py-20 px-10">
                            <View className="size-20 bg-slate-100 rounded-full items-center justify-center mb-6">
                                <UserIcon size={32} color="#CBD5E1" />
                            </View>
                            <Text className="text-xl font-bold text-slate-900 text-center">No leads yet</Text>
                            <Text className="text-sm text-slate-500 text-center mt-2 leading-relaxed">
                                Share your profile or improve your services to attract more customers!
                            </Text>
                        </View>
                    )}
                />
                )}
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
