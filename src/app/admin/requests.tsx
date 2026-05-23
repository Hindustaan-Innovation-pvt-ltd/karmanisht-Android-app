// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, 
    TextInput, ActivityIndicator, Alert, Modal, Platform, RefreshControl,
    Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

const avatarGradients = [
    ['#6366F1', '#4F46E5'], // Indigo
    ['#06B6D4', '#0891B2'], // Cyan
    ['#10B981', '#059669'], // Emerald
    ['#F43F5E', '#E11D48'], // Rose
    ['#F59E0B', '#D97706'], // Amber
    ['#8B5CF6', '#7C3AED'], // Violet
];

const getInitials = (name: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

interface DeletionRequest {
    id: string;
    user_id: string | null;
    user_type: string | null;
    mobile: string | null;
    full_name: string | null;
    reason: string;
    status: string | null;
    requested_at: string | null;
    processed_at: string | null;
    processed_by: string | null;
    admin_notes: string | null;
}

interface SelectedUserType {
    id: string;
    type: 'consumer' | 'worker';
    mobile: string | null;
    full_name: string | null;
    requestId: string;
}

const shadowSm = Platform.OS === 'web' 
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' } 
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

const shadow2xl = Platform.OS === 'web' 
    ? { boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' } 
    : { elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 16 };

export default function AdminRequestsConsole() {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processed'>('all');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);

    // Modal state for deletion
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SelectedUserType | null>(null);
    const [deletionReason, setDeletionReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchDeletionRequests = async (isRef = false) => {
        if (isRef) setRefreshing(true);
        else setLoading(true);

        try {
            const { data: requestData, error } = await insforge.database
                .from('account_deletion_requests')
                .select('*')
                .order('requested_at', { ascending: false });
            
            if (error) throw error;
            setDeletionRequests(requestData || []);
        } catch (err) {
            console.error(err);
            Alert.alert("Database Error", "Failed to retrieve deletion requests.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDeletionRequests();
    }, []);

    // Perform cascading deletion
    const performDeletion = async () => {
        if (!selectedUser) return;
        setIsDeleting(true);
        const userId = selectedUser.id;
        const targetType = selectedUser.type; // 'consumer' or 'worker'
        const requestId = selectedUser.requestId;

        try {
            if (targetType === 'consumer') {
                // Delete reviews
                const { error: reviewsErr } = await insforge.database.from('reviews').delete().eq('user_id', userId);
                if (reviewsErr) throw reviewsErr;

                // Delete unlock_transactions
                const { error: unlocksErr } = await insforge.database.from('unlock_transactions').delete().eq('user_id', userId);
                if (unlocksErr) throw unlocksErr;
                
                // Update deletion requests table
                const { error: reqErr } = await insforge.database.from('account_deletion_requests')
                    .update({
                        status: 'processed',
                        processed_at: new Date().toISOString(),
                        processed_by: 'admin',
                        admin_notes: deletionReason || 'Processed via Admin Panel.'
                    })
                    .eq('id', requestId);
                if (reqErr) throw reqErr;

                // Delete from users table
                const { error: deleteErr } = await insforge.database.from('users').delete().eq('id', userId);
                if (deleteErr) throw deleteErr;

            } else {
                // Delete reviews
                const { error: reviewsErr } = await insforge.database.from('reviews').delete().eq('provider_id', userId);
                if (reviewsErr) throw reviewsErr;

                // Delete unlock_transactions
                const { error: unlocksErr } = await insforge.database.from('unlock_transactions').delete().eq('provider_id', userId);
                if (unlocksErr) throw unlocksErr;

                // Delete locations
                const { error: locationsErr } = await insforge.database.from('provider_locations').delete().eq('provider_id', userId);
                if (locationsErr) throw locationsErr;

                // Delete services
                const { error: servicesErr } = await insforge.database.from('provider_services').delete().eq('provider_id', userId);
                if (servicesErr) throw servicesErr;

                // Update deletion requests table
                const { error: reqErr } = await insforge.database.from('account_deletion_requests')
                    .update({
                        status: 'processed',
                        processed_at: new Date().toISOString(),
                        processed_by: 'admin',
                        admin_notes: deletionReason || 'Processed via Admin Panel.'
                    })
                    .eq('id', requestId);
                if (reqErr) throw reqErr;

                // Delete from service_providers table
                const { error: deleteErr } = await insforge.database.from('service_providers').delete().eq('id', userId);
                if (deleteErr) throw deleteErr;
            }

            Alert.alert("Success", "Account records have been permanently expunged.");
            setDeleteModalVisible(false);
            setSelectedUser(null);
            setDeletionReason('');
            fetchDeletionRequests();

        } catch (err) {
            console.error(err);
            Alert.alert("Deletion Error", err.message || "Failed to complete cascading deletion.");
        } finally {
            setIsDeleting(false);
        }
    };

    const processDeletionRequest = (req: DeletionRequest) => {
        Alert.alert(
            "Process Request",
            `Do you wish to initiate the deletion workflow for ${req.full_name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Process Now", 
                    style: "destructive",
                    onPress: () => {
                        setSelectedUser({
                            id: req.user_id,
                            type: req.user_type === 'worker' ? 'worker' : 'consumer',
                            mobile: req.mobile,
                            full_name: req.full_name,
                            requestId: req.id
                        });
                        setDeletionReason(req.reason || '');
                        setDeleteModalVisible(true);
                    }
                }
            ]
        );
    };

    // Filter deletion requests based on search and pills
    const getFilteredRequests = () => {
        let filtered = deletionRequests;

        // Filter by status pill
        if (statusFilter === 'pending') {
            filtered = filtered.filter(req => (req.status || 'pending').toLowerCase() === 'pending');
        } else if (statusFilter === 'processed') {
            filtered = filtered.filter(req => (req.status || '').toLowerCase() === 'processed');
        }

        // Filter by search query
        const query = searchQuery.toLowerCase();
        if (!query) return filtered;

        return filtered.filter(req => 
            (req.full_name || '').toLowerCase().includes(query) ||
            (req.mobile || '').includes(query) ||
            (req.reason || '').toLowerCase().includes(query) ||
            (req.status || '').toLowerCase().includes(query)
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
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Deletion Requests</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global Admin</Text>
                    </View>
                </View>
                <TouchableOpacity 
                    onPress={() => fetchDeletionRequests(true)}
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
                        placeholder="Search by name, reason, status or mobile..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        className={`flex-1 ml-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                    />
                </View>

                {/* Filter Pills */}
                <View className="flex-row gap-2 mb-2">
                    <TouchableOpacity 
                        onPress={() => setStatusFilter('all')}
                        className="rounded-xl overflow-hidden active:scale-[0.97]"
                    >
                        {statusFilter === 'all' ? (
                            <LinearGradient
                                colors={['#4F46E5', '#6366F1']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="px-4 py-2.5"
                            >
                                <Text className="text-xs font-extrabold text-white">All Requests</Text>
                            </LinearGradient>
                        ) : (
                            <View className={`px-4 py-2.5 border rounded-xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                <Text className={`text-xs font-extrabold ${textSubClass}`}>All Requests</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => setStatusFilter('pending')}
                        className="rounded-xl overflow-hidden active:scale-[0.97]"
                    >
                        {statusFilter === 'pending' ? (
                            <LinearGradient
                                colors={['#D97706', '#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="px-4 py-2.5"
                            >
                                <Text className="text-xs font-extrabold text-white">Pending ({deletionRequests.filter(r => (r.status || 'pending') === 'pending').length})</Text>
                            </LinearGradient>
                        ) : (
                            <View className={`px-4 py-2.5 border rounded-xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                <Text className={`text-xs font-extrabold ${textSubClass}`}>Pending ({deletionRequests.filter(r => (r.status || 'pending') === 'pending').length})</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => setStatusFilter('processed')}
                        className="rounded-xl overflow-hidden active:scale-[0.97]"
                    >
                        {statusFilter === 'processed' ? (
                            <LinearGradient
                                colors={['#475569', '#64748B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="px-4 py-2.5"
                            >
                                <Text className="text-xs font-extrabold text-white">Processed</Text>
                            </LinearGradient>
                        ) : (
                            <View className={`px-4 py-2.5 border rounded-xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                <Text className={`text-xs font-extrabold ${textSubClass}`}>Processed</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View className="flex-1 px-5">
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text className="text-xs font-bold text-slate-500 mt-4 tracking-widest uppercase">Fetching requests...</Text>
                    </View>
                ) : (
                    <ScrollView 
                        className="flex-1" 
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => fetchDeletionRequests(true)} colors={['#6366F1']} />
                        }
                    >
                        {getFilteredRequests().length === 0 ? (
                            <View className="py-20 items-center justify-center">
                                <Feather name="inbox" size={48} color="#64748B" />
                                <Text className="text-xs font-bold text-slate-400 mt-4 tracking-widest">NO MATCHING REQUESTS</Text>
                            </View>
                        ) : (
                            getFilteredRequests().map((req) => {
                                const initials = getInitials(req.full_name);
                                const nameHash = req.full_name ? req.full_name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
                                const gradientColors = avatarGradients[nameHash % avatarGradients.length];

                                return (
                                    <View 
                                        key={req.id} 
                                        className={`p-5 rounded-[24px] mb-4 border ${cardBgClass}`}
                                        style={shadowSm}
                                    >
                                        <View className="flex-row items-center justify-between mb-3">
                                            <View className="flex-row items-center flex-1 pr-2">
                                                <LinearGradient
                                                    colors={gradientColors}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    className="w-12 h-12 rounded-full items-center justify-center mr-3.5"
                                                >
                                                    <Text className="text-white font-extrabold text-sm tracking-wider">{initials}</Text>
                                                </LinearGradient>
                                                
                                                <View className="flex-1">
                                                    <Text className={`text-base font-extrabold tracking-tight ${textMainClass}`}>
                                                        {req.full_name || 'Anonymous User'}
                                                    </Text>
                                                    <View className="flex-row items-center flex-wrap gap-2 mt-1">
                                                        <Text className={`text-xs font-semibold ${textSubClass}`}>
                                                            {req.mobile}
                                                        </Text>
                                                        <View className={`px-2 py-0.5 rounded-md ${req.user_type === 'worker' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-sky-500/10 border border-sky-500/20'}`}>
                                                            <Text className={`text-[9px] font-bold uppercase tracking-wider ${req.user_type === 'worker' ? 'text-indigo-500' : 'text-sky-500'}`}>
                                                                {req.user_type}
                                                            </Text>
                                                        </View>
                                                        {(req.status || 'pending') === 'pending' ? (
                                                            <View className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25">
                                                                <Text className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Pending</Text>
                                                            </View>
                                                        ) : (
                                                            <View className="px-2 py-0.5 rounded-md bg-slate-500/10 border border-slate-500/20">
                                                                <Text className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Processed</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>

                                            {(req.status || 'pending') === 'pending' ? (
                                                <TouchableOpacity 
                                                    onPress={() => processDeletionRequest(req)}
                                                    className="w-10 h-10 rounded-2xl items-center justify-center bg-indigo-500/10 border border-indigo-500/20 active:scale-95"
                                                >
                                                    <Feather name="settings" size={15} color="#6366F1" />
                                                </TouchableOpacity>
                                            ) : (
                                                <View className="w-10 h-10 rounded-2xl items-center justify-center bg-slate-500/10 border border-slate-500/15">
                                                    <Feather name="check" size={15} color="#64748B" />
                                                </View>
                                            )}
                                        </View>

                                        <View 
                                            className="mt-3 p-4 rounded-2xl border"
                                            style={isDark 
                                                ? { backgroundColor: 'rgba(2, 6, 23, 0.4)', borderColor: 'rgba(30, 41, 59, 0.8)' } 
                                                : { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }
                                            }
                                        >
                                            <Text className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Reason / Telemetry Remarks</Text>
                                            <Text className={`text-xs font-semibold mt-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {req.reason || 'Self-deletion confirmed by client device.'}
                                            </Text>
                                        </View>

                                        <View className="mt-3 flex-row justify-between items-center">
                                            <Text className="text-[10px] font-bold text-slate-400">
                                                Filed: {new Date(req.requested_at || req.processed_at).toLocaleDateString()}
                                            </Text>
                                            {req.processed_by && (
                                                <Text className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                                    By: {req.processed_by}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                        <View className="h-10" />
                    </ScrollView>
                )}
            </View>

            {/* Enhanced Cascading Deletion Modal Dialog */}
            <Modal
                visible={deleteModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
                    <View className={`w-full p-6 rounded-[32px] border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={shadow2xl}>
                        {/* Top Gradient Stripe */}
                        <LinearGradient
                            colors={['#EF4444', '#F43F5E']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ height: 4, position: 'absolute', top: 0, left: 0, right: 0 }}
                        />
                        <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 mt-2">
                            <Text className={`text-xl font-black tracking-tight ${textMainClass}`}>Confirm Removal</Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setDeleteModalVisible(false);
                                    setSelectedUser(null);
                                }}
                                className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                                style={shadowSm}
                            >
                                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>

                        {selectedUser && (
                            <View className="mb-4 p-4 rounded-2xl border" style={{ backgroundColor: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.2)', borderWidth: 1 }}>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Account Profile</Text>
                                <Text className="text-base font-bold text-red-500 mt-1">{selectedUser.full_name || 'Anonymous User'}</Text>
                                <Text className="text-xs font-semibold text-red-400 mt-0.5">Mobile ID: {selectedUser.mobile}</Text>
                                
                                <View className="mt-3 pt-3 border-t" style={{ borderTopColor: 'rgba(244, 63, 94, 0.1)' }}>
                                    <Text className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider">
                                        ⚠️ CRITICAL: Cascading removal deletes all service listings, reviews, unlocks, and telemetry.
                                    </Text>
                                </View>
                            </View>
                        )}

                        <Text className={`text-xs font-bold mb-2 ${textSubClass}`}>Audit Remarks / Reason:</Text>
                        <TextInput 
                            value={deletionReason}
                            onChangeText={setDeletionReason}
                            placeholder="State reason (e.g. Account Deletion Request, Violating Terms)..."
                            placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                            multiline={true}
                            numberOfLines={3}
                            className={`p-4 rounded-2xl min-h-[90px] text-sm font-semibold border ${isDark ? 'bg-slate-950 text-slate-100 border-slate-850' : 'bg-slate-50 text-slate-800 border-slate-200'}`}
                        />

                        <View className="h-6" />

                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                            <View className="flex-row gap-3">
                                <TouchableOpacity 
                                    onPress={() => {
                                        setDeleteModalVisible(false);
                                        setSelectedUser(null);
                                    }}
                                    className={`flex-1 py-4 rounded-2xl items-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                                >
                                    <Text className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={performDeletion}
                                    className="flex-1 bg-red-600 py-4 rounded-2xl items-center"
                                    style={Platform.OS === 'web' ? { boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.2)' } : { elevation: 6, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4 }}
                                >
                                    <Text className="text-sm font-bold text-white">Permanently Remove</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
