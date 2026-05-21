// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, 
    TextInput, ActivityIndicator, Alert, Modal, Platform, RefreshControl 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';

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
        const userMobile = selectedUser.mobile;
        const userFullName = selectedUser.full_name;
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
                        className={`px-4 py-2 rounded-xl border ${
                            statusFilter === 'all' 
                                ? 'bg-indigo-600 border-indigo-600' 
                                : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                    >
                        <Text className={`text-xs font-bold ${statusFilter === 'all' ? 'text-white' : textSubClass}`}>All Requests</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setStatusFilter('pending')}
                        className={`px-4 py-2 rounded-xl border ${
                            statusFilter === 'pending' 
                                ? 'bg-amber-600 border-amber-600' 
                                : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                    >
                        <Text className={`text-xs font-bold ${statusFilter === 'pending' ? 'text-white' : textSubClass}`}>Pending ({deletionRequests.filter(r => (r.status || 'pending') === 'pending').length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setStatusFilter('processed')}
                        className={`px-4 py-2 rounded-xl border ${
                            statusFilter === 'processed' 
                                ? 'bg-slate-600 border-slate-600' 
                                : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                    >
                        <Text className={`text-xs font-bold ${statusFilter === 'processed' ? 'text-white' : textSubClass}`}>Processed</Text>
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
                            getFilteredRequests().map((req) => (
                                <View 
                                    key={req.id} 
                                    className={`p-5 rounded-[24px] mb-3 border ${cardBgClass}`}
                                    style={shadowSm}
                                >
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-1 pr-2">
                                            <Text className={`text-base font-bold ${textMainClass}`}>{req.full_name || 'Anonymous User'}</Text>
                                            <Text className={`text-xs font-medium mt-1 ${textSubClass}`}>Mobile: {req.mobile} ({req.user_type})</Text>
                                        </View>
                                        {(req.status || 'pending') === 'pending' ? (
                                            <TouchableOpacity 
                                                onPress={() => processDeletionRequest(req)}
                                                className="px-4 py-2 rounded-xl flex-row items-center bg-indigo-500/10 border border-indigo-500/20 active:scale-95"
                                            >
                                                <Feather name="settings" size={13} color="#6366F1" />
                                                <Text className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1.5">Action</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View className="px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/15">
                                                <Text className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Processed</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View 
                                        className="mt-4 p-4 rounded-2xl border"
                                        style={isDark 
                                            ? { backgroundColor: 'rgba(2, 6, 23, 0.4)', borderColor: 'rgba(30, 41, 59, 0.8)' } 
                                            : { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }
                                        }
                                    >
                                        <Text className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Reason / Telemetry Remarks</Text>
                                        <Text className={`text-xs font-semibold mt-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{req.reason || 'Self-deletion confirmed by client device.'}</Text>
                                    </View>
                                    <View className="mt-4 flex-row justify-between items-center text-[10px] text-slate-400 font-semibold">
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
                            ))
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
                    <View className={`w-full p-6 rounded-[32px] border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={shadow2xl}>
                        <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                            <Text className={`text-xl font-black tracking-tight ${textMainClass}`}>Confirm Cascaded Removal</Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setDeleteModalVisible(false);
                                    setSelectedUser(null);
                                }}
                                className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-slate-850' : 'bg-slate-100'}`}
                                style={shadowSm}
                            >
                                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>

                        {selectedUser && (
                            <View className="mb-4 p-4 rounded-2xl border" style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.2)', borderWidth: 1 }}>
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
                                    className={`flex-1 py-4 rounded-2xl items-center ${isDark ? 'bg-slate-850' : 'bg-slate-100'}`}
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
