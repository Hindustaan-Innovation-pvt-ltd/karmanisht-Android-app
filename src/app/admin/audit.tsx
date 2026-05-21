// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, 
    TextInput, ActivityIndicator, Alert, Platform, RefreshControl 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';

interface AuditLog {
    id: string;
    action: string | null;
    user_id: string | null;
    user_type: string | null;
    mobile: string | null;
    full_name: string | null;
    performed_by: string | null;
    metadata: any;
    created_at: string;
}

const shadowSm = Platform.OS === 'web' 
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' } 
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

export default function AdminAuditConsole() {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState<'all' | 'created' | 'deleted'>('all');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

    const fetchAuditLogs = async (isRef = false) => {
        if (isRef) setRefreshing(true);
        else setLoading(true);

        try {
            const { data: auditData, error } = await insforge.database
                .from('account_audit_log')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setAuditLogs(auditData || []);
        } catch (err) {
            console.error(err);
            Alert.alert("Database Error", "Failed to retrieve the latest audit logs.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    // Filter audit logs based on search and pills
    const getFilteredAuditLogs = () => {
        let filtered = auditLogs;
        
        // Filter by action pill
        if (actionFilter === 'created') {
            filtered = filtered.filter(log => (log.action || '').toLowerCase() === 'created');
        } else if (actionFilter === 'deleted') {
            filtered = filtered.filter(log => (log.action || '').toLowerCase() === 'deleted');
        }

        // Filter by search query
        const query = searchQuery.toLowerCase();
        if (!query) return filtered;

        return filtered.filter(log => 
            (log.full_name || '').toLowerCase().includes(query) ||
            (log.mobile || '').includes(query) ||
            (log.action || '').toLowerCase().includes(query) ||
            (log.performed_by || '').toLowerCase().includes(query)
        );
    };

    const bgClass = isDark ? 'bg-slate-950' : 'bg-slate-50';
    const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';
    const textSubClass = isDark ? 'text-slate-400' : 'text-slate-500';
    const searchBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

    return (
        <View className={`flex-1 ${bgClass}`} style={{ paddingTop: insets.top }}>
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
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Audit Trail</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global Admin</Text>
                    </View>
                </View>
                <TouchableOpacity 
                    onPress={() => fetchAuditLogs(true)}
                    className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                >
                    <Feather name="refresh-cw" size={18} color="#6366F1" />
                </TouchableOpacity>
            </View>

            {/* Filter controls */}
            <View className="px-5 pt-5 pb-2">
                {/* Search Bar */}
                <View className={`flex-row items-center px-4 py-3 rounded-2xl mb-4 border ${searchBgClass}`}>
                    <Feather name="search" size={18} color="#64748B" />
                    <TextInput 
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search by operator, name, action or mobile..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        className={`flex-1 ml-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                    />
                </View>

                {/* Filter Pills */}
                <View className="flex-row gap-2 mb-2">
                    <TouchableOpacity 
                        onPress={() => setActionFilter('all')}
                        className={`px-4 py-2 rounded-xl border ${
                            actionFilter === 'all' 
                                ? 'bg-indigo-600 border-indigo-600' 
                                : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                    >
                        <Text className={`text-xs font-bold ${actionFilter === 'all' ? 'text-white' : textSubClass}`}>All Actions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setActionFilter('created')}
                        className={`px-4 py-2 rounded-xl border ${
                            actionFilter === 'created' 
                                ? 'bg-green-600 border-green-600' 
                                : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                    >
                        <Text className={`text-xs font-bold ${actionFilter === 'created' ? 'text-white' : textSubClass}`}>Created</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setActionFilter('deleted')}
                        className={`px-4 py-2 rounded-xl border ${
                            actionFilter === 'deleted' 
                                ? 'bg-red-600 border-red-600' 
                                : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                    >
                        <Text className={`text-xs font-bold ${actionFilter === 'deleted' ? 'text-white' : textSubClass}`}>Deleted</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View className="flex-1 px-5">
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text className="text-xs font-bold text-slate-500 mt-4 tracking-widest uppercase">Fetching logs...</Text>
                    </View>
                ) : (
                    <ScrollView 
                        className="flex-1" 
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAuditLogs(true)} colors={['#6366F1']} />
                        }
                    >
                        {getFilteredAuditLogs().length === 0 ? (
                            <View className="py-20 items-center justify-center">
                                <Feather name="database" size={48} color="#64748B" />
                                <Text className="text-xs font-bold text-slate-400 mt-4 tracking-widest">NO MATCHING AUDIT LOGS</Text>
                            </View>
                        ) : (
                            getFilteredAuditLogs().map((log) => {
                                const isDeletion = (log.action || '').toLowerCase() === 'deleted';
                                return (
                                    <View 
                                        key={log.id} 
                                        className={`flex-row mb-4 rounded-[24px] p-5 border ${cardBgClass}`}
                                        style={shadowSm}
                                    >
                                        <View className="mr-4 items-center">
                                            <View 
                                                className="w-10 h-10 rounded-2xl items-center justify-center border"
                                                style={{
                                                    backgroundColor: isDeletion ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                                    borderColor: isDeletion ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'
                                                }}
                                            >
                                                <Feather 
                                                    name={isDeletion ? "user-x" : "user-check"} 
                                                    size={16} 
                                                    color={isDeletion ? "#EF4444" : "#22C55E"} 
                                                />
                                            </View>
                                            <View className={`w-0.5 flex-1 my-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                        </View>
                                        <View className="flex-1">
                                            <View className="flex-row items-center justify-between">
                                                <View 
                                                    className="px-2.5 py-1 rounded-full"
                                                    style={{ backgroundColor: isDeletion ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }}
                                                >
                                                    <Text className={`text-[9px] font-black uppercase tracking-wider ${isDeletion ? 'text-red-500' : 'text-green-600'}`}>
                                                        {log.action}
                                                    </Text>
                                                </View>
                                                <Text className="text-[10px] font-bold text-slate-400">
                                                    {new Date(log.created_at).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <Text className={`text-base font-bold mt-2 ${textMainClass}`}>{log.full_name || 'Anonymous User'}</Text>
                                            <Text className={`text-xs font-semibold mt-0.5 ${textSubClass}`}>Mobile: {log.mobile} ({log.user_type})</Text>
                                            
                                            <View 
                                                className="mt-3 p-3 rounded-2xl border"
                                                style={isDark 
                                                    ? { backgroundColor: 'rgba(2, 6, 23, 0.4)', borderColor: 'rgba(30, 41, 59, 0.8)' } 
                                                    : { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }
                                                }
                                            >
                                                <Text className="text-[10px] font-bold text-slate-400">
                                                    Operator: <Text className="text-indigo-600 dark:text-indigo-400 font-black">{log.performed_by || 'system'}</Text>
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                        <View className="h-10" />
                    </ScrollView>
                )}
            </View>
        </View>
    );
}
