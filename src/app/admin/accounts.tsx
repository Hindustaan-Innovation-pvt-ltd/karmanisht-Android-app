// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, 
    TextInput, ActivityIndicator, Alert, Modal, Platform, RefreshControl 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

type UserType = 'consumer' | 'worker';

interface ConsumerUser {
    id: string;
    mobile: string;
    full_name: string | null;
    email: string | null;
    profile_image: string | null;
    role: string | null;
    is_active: boolean | null;
    created_at: string;
    updated_at: string;
}

interface WorkerUser {
    id: string;
    mobile: string;
    full_name: string;
    business_name: string | null;
    email: string | null;
    profile_image: string | null;
    cover_image: string | null;
    bio: string | null;
    experience_years: number | null;
    aadhaar_number: string | null;
    pan_number: string | null;
    is_kyc_verified: boolean | null;
    average_rating: number | null;
    total_jobs_completed: number | null;
    is_verified: boolean | null;
    is_active: boolean | null;
    created_at: string;
    updated_at: string;
}

interface SelectedUserType {
    id: string;
    type: UserType;
    mobile: string | null;
    full_name: string | null;
    requestId?: string;
}

// Safe cross-platform shadow styles
const shadowSm = Platform.OS === 'web' 
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' } 
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

const shadow2xl = Platform.OS === 'web' 
    ? { boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' } 
    : { elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 16 };

export default function AdminAccountsConsole() {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [userType, setUserType] = useState<UserType>('consumer');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Data states
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [consumers, setConsumers] = useState<ConsumerUser[]>([]);
    const [workers, setWorkers] = useState<WorkerUser[]>([]);

    // Modal state for deletion
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SelectedUserType | null>(null);
    const [deletionReason, setDeletionReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch accounts data
    const fetchAccountsData = async (isRef = false) => {
        if (isRef) setRefreshing(true);
        else setLoading(true);

        try {
            if (userType === 'consumer') {
                const { data: usersData, error } = await insforge.database
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setConsumers(usersData || []);
            } else {
                const { data: workersData, error } = await insforge.database
                    .from('service_providers')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setWorkers(workersData || []);
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Database Error", "Failed to retrieve user accounts records.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAccountsData();
    }, [userType]);

    // Handle toggling user boolean fields (is_active, is_verified, is_kyc_verified)
    const toggleUserField = async (userId: string, type: UserType, field: string, currentValue: boolean) => {
        const tableName = type === 'consumer' ? 'users' : 'service_providers';
        const newValue = !currentValue;
        
        try {
            const { error } = await insforge.database
                .from(tableName)
                .update({ [field]: newValue })
                .eq('id', userId);
            if (error) throw error;

            // Update local state directly
            if (type === 'consumer') {
                setConsumers(prev => prev.map(u => u.id === userId ? { ...u, [field]: newValue } : u));
            } else {
                setWorkers(prev => prev.map(w => w.id === userId ? { ...w, [field]: newValue } : w));
            }
        } catch (err: any) {
            console.error(err);
            Alert.alert("Update Error", err.message || `Failed to update field ${field}`);
        }
    };

    // Perform cascading deletion
    const performDeletion = async () => {
        if (!selectedUser) return;
        setIsDeleting(true);
        const userId = selectedUser.id;
        const targetType = selectedUser.type; 
        const userMobile = selectedUser.mobile;
        const userFullName = selectedUser.full_name;

        try {
            if (targetType === 'consumer') {
                // Delete reviews
                const { error: reviewsErr } = await insforge.database.from('reviews').delete().eq('user_id', userId);
                if (reviewsErr) throw reviewsErr;

                // Delete unlock_transactions
                const { error: unlocksErr } = await insforge.database.from('unlock_transactions').delete().eq('user_id', userId);
                if (unlocksErr) throw unlocksErr;
                
                // Update deletion requests table status if one is pending
                const { data: existingReqs, error: checkErr } = await insforge.database
                    .from('account_deletion_requests')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('status', 'pending');
                
                if (!checkErr && existingReqs && existingReqs.length > 0) {
                    const { error: reqErr } = await insforge.database.from('account_deletion_requests')
                        .update({
                            status: 'processed',
                            processed_at: new Date().toISOString(),
                            processed_by: 'admin',
                            admin_notes: deletionReason || 'Force deleted by admin.'
                        })
                        .eq('id', existingReqs[0].id);
                    if (reqErr) throw reqErr;
                } else {
                    const { error: reqErr } = await insforge.database.from('account_deletion_requests').insert([{
                        user_id: userId,
                        user_type: 'consumer',
                        mobile: userMobile || '',
                        full_name: userFullName || 'Anonymous',
                        reason: deletionReason || 'Admin force deleted',
                        status: 'processed',
                        processed_at: new Date().toISOString(),
                        processed_by: 'admin',
                        admin_notes: 'Force deleted via Admin Panel.'
                    }]);
                    if (reqErr) throw reqErr;
                }

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

                // Update deletion requests table status if one is pending
                const { data: existingReqs, error: checkErr } = await insforge.database
                    .from('account_deletion_requests')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('status', 'pending');
                
                if (!checkErr && existingReqs && existingReqs.length > 0) {
                    const { error: reqErr } = await insforge.database.from('account_deletion_requests')
                        .update({
                            status: 'processed',
                            processed_at: new Date().toISOString(),
                            processed_by: 'admin',
                            admin_notes: deletionReason || 'Force deleted by admin.'
                        })
                        .eq('id', existingReqs[0].id);
                    if (reqErr) throw reqErr;
                } else {
                    const { error: reqErr } = await insforge.database.from('account_deletion_requests').insert([{
                        user_id: userId,
                        user_type: 'worker',
                        mobile: userMobile || '',
                        full_name: userFullName || 'Anonymous',
                        reason: deletionReason || 'Admin force deleted',
                        status: 'processed',
                        processed_at: new Date().toISOString(),
                        processed_by: 'admin',
                        admin_notes: 'Force deleted via Admin Panel.'
                    }]);
                    if (reqErr) throw reqErr;
                }

                // Delete from service_providers table
                const { error: deleteErr } = await insforge.database.from('service_providers').delete().eq('id', userId);
                if (deleteErr) throw deleteErr;
            }

            Alert.alert("Success", "Account records have been permanently expunged.");
            setDeleteModalVisible(false);
            setSelectedUser(null);
            setDeletionReason('');
            fetchAccountsData();

        } catch (err: any) {
            console.error(err);
            Alert.alert("Deletion Error", err.message || "Failed to complete cascading deletion.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter accounts based on search
    const getFilteredAccounts = () => {
        const query = searchQuery.toLowerCase();
        if (userType === 'consumer') {
            return consumers.filter(c => 
                (c.full_name || '').toLowerCase().includes(query) ||
                (c.mobile || '').includes(query) ||
                (c.email || '').toLowerCase().includes(query)
            );
        } else {
            return workers.filter(w => 
                (w.full_name || '').toLowerCase().includes(query) ||
                (w.business_name || '').toLowerCase().includes(query) ||
                (w.mobile || '').includes(query) ||
                (w.email || '').toLowerCase().includes(query)
            );
        }
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
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Accounts</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global Admin</Text>
                    </View>
                </View>
                <TouchableOpacity 
                    onPress={() => fetchAccountsData(true)}
                    className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                >
                    <Feather name="refresh-cw" size={18} color="#6366F1" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 px-5 pt-5">
                {/* Toggle Segment Selector */}
                <View className="flex-row p-1 rounded-2xl mb-4 gap-1" style={isDark ? { backgroundColor: 'rgba(15, 23, 42, 0.6)' } : { backgroundColor: 'rgba(226, 232, 240, 0.4)' }}>
                    <TouchableOpacity 
                        onPress={() => setUserType('consumer')}
                        className={`flex-1 py-2.5 rounded-xl items-center ${userType === 'consumer' ? 'bg-indigo-600' : ''}`}
                        style={userType === 'consumer' ? shadowSm : {}}
                    >
                        <Text className={`text-xs font-bold uppercase tracking-wider ${userType === 'consumer' ? 'text-white' : textSubClass}`}>Consumers ({consumers.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setUserType('worker')}
                        className={`flex-1 py-2.5 rounded-xl items-center ${userType === 'worker' ? 'bg-indigo-600' : ''}`}
                        style={userType === 'worker' ? shadowSm : {}}
                    >
                        <Text className={`text-xs font-bold uppercase tracking-wider ${userType === 'worker' ? 'text-white' : textSubClass}`}>Workers ({workers.length})</Text>
                    </TouchableOpacity>
                </View>

                {/* Modernized Search Bar */}
                <View className={`flex-row items-center px-4 py-3 rounded-2xl mb-4 border ${searchBgClass}`}>
                    <Feather name="search" size={18} color="#64748B" />
                    <TextInput 
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search by name, business or mobile..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        className={`flex-1 ml-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                    />
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text className="text-xs font-bold text-slate-500 mt-4 tracking-widest uppercase">Loading accounts...</Text>
                    </View>
                ) : (
                    <ScrollView 
                        className="flex-1" 
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAccountsData(true)} colors={['#6366F1']} />
                        }
                    >
                        {getFilteredAccounts().length === 0 ? (
                            <View className="py-20 items-center justify-center">
                                <MaterialCommunityIcons name="account-search-outline" size={48} color="#64748B" />
                                <Text className="text-xs font-bold text-slate-400 mt-4 tracking-widest">NO MATCHING ACCOUNTS</Text>
                            </View>
                        ) : (
                            getFilteredAccounts().map((userObj) => (
                                <View 
                                    key={userObj.id} 
                                    className={`p-5 rounded-[24px] mb-3 border ${cardBgClass}`}
                                    style={shadowSm}
                                >
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-1 pr-2">
                                            <Text className={`text-base font-bold ${textMainClass}`}>{userObj.full_name || 'Anonymous User'}</Text>
                                            <Text className={`text-xs font-medium mt-1 ${textSubClass}`}>{userObj.mobile}</Text>
                                            {userType === 'worker' && userObj.business_name && (
                                                <View className="flex-row items-center mt-2">
                                                     <Feather name="briefcase" size={12} color="#6366F1" />
                                                     <Text className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 ml-1.5">{userObj.business_name}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <TouchableOpacity 
                                            onPress={() => {
                                                setSelectedUser({
                                                    id: userObj.id,
                                                    type: userType,
                                                    mobile: userObj.mobile,
                                                    full_name: userObj.full_name
                                                });
                                                setDeletionReason('');
                                                setDeleteModalVisible(true);
                                            }}
                                            className="px-4 py-2 rounded-xl flex-row items-center bg-rose-500/10 border border-rose-500/25 active:scale-95"
                                        >
                                            <Feather name="trash-2" size={13} color="#EF4444" />
                                            <Text className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1.5">Expunge</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Action Switches / Badges Row */}
                                    {userType === 'consumer' ? (
                                        <View className="mt-4 flex-row items-center justify-between border-t pt-3.5" style={isDark ? { borderTopColor: 'rgba(30, 41, 59, 0.8)' } : { borderTopColor: '#F1F5F9' }}>
                                            <Text className="text-[10px] font-bold text-slate-400">
                                                Joined: {new Date(userObj.created_at).toLocaleDateString()}
                                            </Text>
                                            
                                            <TouchableOpacity 
                                                onPress={() => toggleUserField(userObj.id, 'consumer', 'is_active', userObj.is_active !== false)}
                                                className="px-3 py-1.5 rounded-xl border flex-row items-center"
                                                style={{ 
                                                    backgroundColor: userObj.is_active !== false ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                    borderColor: userObj.is_active !== false ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                                                }}
                                            >
                                                <Feather name={userObj.is_active !== false ? "check-circle" : "slash"} size={11} color={userObj.is_active !== false ? "#16A34A" : "#EF4444"} />
                                                <Text className={`text-[9px] font-black uppercase tracking-wider ml-1.5 ${
                                                    userObj.is_active !== false ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                                                }`}>
                                                    {userObj.is_active !== false ? 'Active' : 'Suspended'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View className="mt-4 border-t pt-3.5" style={isDark ? { borderTopColor: 'rgba(30, 41, 59, 0.8)' } : { borderTopColor: '#F1F5F9' }}>
                                            <View className="flex-row justify-between items-center mb-3">
                                                <Text className="text-[10px] font-bold text-slate-400">
                                                    Joined: {new Date(userObj.created_at).toLocaleDateString()}
                                                </Text>
                                                <Text className="text-[10px] font-bold text-slate-400">
                                                    Jobs: {userObj.total_jobs_completed || 0}
                                                </Text>
                                            </View>

                                            <View className="flex-row flex-wrap items-center gap-2">
                                                {/* Active status */}
                                                <TouchableOpacity 
                                                    onPress={() => toggleUserField(userObj.id, 'worker', 'is_active', userObj.is_active !== false)}
                                                    className="px-2.5 py-1.5 rounded-xl border flex-row items-center"
                                                    style={{ 
                                                        backgroundColor: userObj.is_active !== false ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                        borderColor: userObj.is_active !== false ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                                                    }}
                                                >
                                                    <Feather name={userObj.is_active !== false ? "check-circle" : "slash"} size={11} color={userObj.is_active !== false ? "#16A34A" : "#EF4444"} />
                                                    <Text className={`text-[9px] font-black uppercase tracking-wider ml-1 ${
                                                        userObj.is_active !== false ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                                                    }`}>
                                                        {userObj.is_active !== false ? 'Active' : 'Suspended'}
                                                    </Text>
                                                </TouchableOpacity>

                                                {/* Verified status */}
                                                <TouchableOpacity 
                                                    onPress={() => toggleUserField(userObj.id, 'worker', 'is_verified', userObj.is_verified === true)}
                                                    className="px-2.5 py-1.5 rounded-xl border flex-row items-center"
                                                    style={{ 
                                                        backgroundColor: userObj.is_verified === true ? 'rgba(99, 102, 241, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                                                        borderColor: userObj.is_verified === true ? 'rgba(99, 102, 241, 0.15)' : 'rgba(100, 116, 139, 0.15)'
                                                    }}
                                                >
                                                    <Feather name="award" size={11} color={userObj.is_verified === true ? "#4F46E5" : "#64748B"} />
                                                    <Text className={`text-[9px] font-black uppercase tracking-wider ml-1 ${
                                                        userObj.is_verified === true ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                                                    }`}>
                                                        Verified
                                                    </Text>
                                                </TouchableOpacity>

                                                {/* KYC status */}
                                                <TouchableOpacity 
                                                    onPress={() => toggleUserField(userObj.id, 'worker', 'is_kyc_verified', userObj.is_kyc_verified === true)}
                                                    className="px-2.5 py-1.5 rounded-xl border flex-row items-center"
                                                    style={{ 
                                                        backgroundColor: userObj.is_kyc_verified === true ? 'rgba(14, 165, 233, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                                                        borderColor: userObj.is_kyc_verified === true ? 'rgba(14, 165, 233, 0.15)' : 'rgba(100, 116, 139, 0.15)'
                                                    }}
                                                >
                                                    <Feather name="shield" size={11} color={userObj.is_kyc_verified === true ? "#0284C7" : "#64748B"} />
                                                    <Text className={`text-[9px] font-black uppercase tracking-wider ml-1 ${
                                                        userObj.is_kyc_verified === true ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500'
                                                    }`}>
                                                        KYC
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
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
