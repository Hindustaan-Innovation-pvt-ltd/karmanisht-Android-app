// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, 
    TextInput, ActivityIndicator, Alert, Modal 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useAppContext } from '@/lib/context';

type TabType = 'accounts' | 'audit' | 'requests';
type UserType = 'consumer' | 'worker';

export default function AdminConsole() {
    const router = useRouter();
    const { signOut } = useAppContext();
    const [activeTab, setActiveTab] = useState<TabType>('accounts');
    const [userType, setUserType] = useState<UserType>('consumer');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Data states
    const [loading, setLoading] = useState(false);
    const [consumers, setConsumers] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [deletionRequests, setDeletionRequests] = useState<any[]>([]);

    // Modal state for deletion
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [deletionReason, setDeletionReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch stats
    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Fetch consumers
            const { data: usersData } = await insforge.database
                .from('users')
                .select('*');
            setConsumers(usersData || []);

            // Fetch workers
            const { data: workersData } = await insforge.database
                .from('service_providers')
                .select('*');
            setWorkers(workersData || []);

            // Fetch audit logs
            const { data: auditData } = await insforge.database
                .from('account_audit_log')
                .select('*')
                .order('created_at', { ascending: false });
            setAuditLogs(auditData || []);

            // Fetch deletion requests
            const { data: requestData } = await insforge.database
                .from('account_deletion_requests')
                .select('*')
                .order('requested_at', { ascending: false });
            setDeletionRequests(requestData || []);

        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to load database records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Perform cascading deletion
    const performDeletion = async () => {
        if (!selectedUser) return;
        setIsDeleting(true);
        const userId = selectedUser.id;
        const targetType = selectedUser.type; // 'consumer' or 'worker'
        const userMobile = selectedUser.mobile;
        const userFullName = selectedUser.full_name;

        try {
            if (targetType === 'consumer') {
                // Delete reviews
                await insforge.database.from('reviews').delete().eq('user_id', userId);
                // Delete unlock_transactions
                await insforge.database.from('unlock_transactions').delete().eq('user_id', userId);
                
                // Insert request log
                await insforge.database.from('account_deletion_requests').insert([{
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

                // Delete from users table
                const { error } = await insforge.database.from('users').delete().eq('id', userId);
                if (error) throw error;

            } else {
                // Delete reviews
                await insforge.database.from('reviews').delete().eq('provider_id', userId);
                // Delete unlock_transactions
                await insforge.database.from('unlock_transactions').delete().eq('provider_id', userId);
                // Delete locations
                await insforge.database.from('provider_locations').delete().eq('provider_id', userId);
                // Delete services
                await insforge.database.from('provider_services').delete().eq('provider_id', userId);

                // Insert request log
                await insforge.database.from('account_deletion_requests').insert([{
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

                // Delete from service_providers table
                const { error } = await insforge.database.from('service_providers').delete().eq('id', userId);
                if (error) throw error;
            }

            Alert.alert("Success", "Account permanently deleted.");
            setDeleteModalVisible(false);
            setSelectedUser(null);
            setDeletionReason('');
            fetchAllData();

        } catch (err) {
            console.error(err);
            Alert.alert("Deletion Error", err.message || "Failed to delete account records.");
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
                (c.mobile || '').includes(query)
            );
        } else {
            return workers.filter(w => 
                (w.full_name || '').toLowerCase().includes(query) ||
                (w.business_name || '').toLowerCase().includes(query) ||
                (w.mobile || '').includes(query)
            );
        }
    };

    const processDeletionRequest = async (req: any) => {
        Alert.alert(
            "Process Deletion",
            `Are you sure you want to process deletion for ${req.full_name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete Now", 
                    style: "destructive",
                    onPress: () => {
                        setSelectedUser({
                            id: req.user_id,
                            type: req.user_type,
                            mobile: req.mobile,
                            full_name: req.full_name
                        });
                        setDeletionReason(req.reason);
                        setDeleteModalVisible(true);
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaProvider>
            <SafeAreaView className="flex-1 bg-slate-950">
                {/* Header */}
                <View className="pt-4 pb-5 px-6 flex-row items-center justify-between border-b border-slate-900 bg-slate-950">
                    <View className="flex-row items-center">
                        <TouchableOpacity 
                            onPress={() => router.back()}
                            className="w-10 h-10 bg-slate-900 rounded-xl items-center justify-center mr-3"
                        >
                            <Ionicons name="chevron-back" size={20} color="#6366F1" />
                        </TouchableOpacity>
                        <View>
                            <Text className="text-xl font-black text-slate-100 tracking-tight">Admin Console</Text>
                            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Overview</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity 
                            onPress={fetchAllData}
                            className="w-10 h-10 bg-slate-900 rounded-xl items-center justify-center"
                        >
                            <Feather name="refresh-cw" size={16} color="#A5B4FC" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={async () => {
                                Alert.alert(
                                    "Sign Out",
                                    "Are you sure you want to sign out of the Admin Console?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { 
                                            text: "Sign Out", 
                                            style: "destructive",
                                            onPress: async () => {
                                                await signOut();
                                                router.replace('/');
                                            }
                                        }
                                    ]
                                );
                            }}
                            className="w-10 h-10 bg-slate-900 rounded-xl items-center justify-center"
                        >
                            <Feather name="log-out" size={16} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats row */}
                <View className="flex-row justify-between px-5 py-4 gap-2">
                    <View className="flex-1 bg-slate-900 p-3.5 rounded-2xl border border-slate-800/40">
                        <Text className="text-xs font-bold text-slate-400">Consumers</Text>
                        <Text className="text-2xl font-black text-indigo-400 mt-1">{consumers.length}</Text>
                    </View>
                    <View className="flex-1 bg-slate-900 p-3.5 rounded-2xl border border-slate-800/40">
                        <Text className="text-xs font-bold text-slate-400">Workers</Text>
                        <Text className="text-2xl font-black text-sky-400 mt-1">{workers.length}</Text>
                    </View>
                    <View className="flex-1 bg-slate-900 p-3.5 rounded-2xl border border-slate-800/40">
                        <Text className="text-xs font-bold text-slate-400">Activity Logs</Text>
                        <Text className="text-2xl font-black text-violet-400 mt-1">{auditLogs.length}</Text>
                    </View>
                </View>

                {/* Tab selector */}
                <View className="flex-row mx-5 bg-slate-900 p-1.5 rounded-2xl mb-4 border border-slate-800/50">
                    <TouchableOpacity 
                        onPress={() => setActiveTab('accounts')}
                        className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'accounts' ? 'bg-slate-800 border border-slate-700/50' : ''}`}
                    >
                        <Text className={`text-xs font-bold ${activeTab === 'accounts' ? 'text-indigo-400' : 'text-slate-400'}`}>Active Accounts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('audit')}
                        className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'audit' ? 'bg-slate-800 border border-slate-700/50' : ''}`}
                    >
                        <Text className={`text-xs font-bold ${activeTab === 'audit' ? 'text-indigo-400' : 'text-slate-400'}`}>Audit Timeline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('requests')}
                        className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'requests' ? 'bg-slate-800 border border-slate-700/50' : ''}`}
                    >
                        <Text className={`text-xs font-bold ${activeTab === 'requests' ? 'text-indigo-400' : 'text-slate-400'}`}>Requests ({deletionRequests.length})</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text className="text-xs font-bold text-slate-500 mt-3 tracking-widest">SYNCING DATABASE...</Text>
                    </View>
                ) : (
                    <View className="flex-1 px-5">
                        {activeTab === 'accounts' && (
                            <View className="flex-1">
                                {/* Toggle Consumer / Worker */}
                                <View className="flex-row bg-slate-900/60 p-1 rounded-xl mb-4 gap-1">
                                    <TouchableOpacity 
                                        onPress={() => setUserType('consumer')}
                                        className={`flex-1 py-2 rounded-lg items-center ${userType === 'consumer' ? 'bg-indigo-600' : ''}`}
                                    >
                                        <Text className={`text-xs font-bold ${userType === 'consumer' ? 'text-white' : 'text-slate-400'}`}>Consumers</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => setUserType('worker')}
                                        className={`flex-1 py-2 rounded-lg items-center ${userType === 'worker' ? 'bg-indigo-600' : ''}`}
                                    >
                                        <Text className={`text-xs font-bold ${userType === 'worker' ? 'text-white' : 'text-slate-400'}`}>Workers</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Search Bar */}
                                <View className="flex-row items-center bg-slate-900 px-4 py-3 rounded-2xl mb-4 border border-slate-850">
                                    <Feather name="search" size={16} color="#64748B" />
                                    <TextInput 
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Search by name, business or phone..."
                                        placeholderTextColor="#475569"
                                        className="flex-1 ml-3 text-sm font-semibold text-slate-200"
                                    />
                                </View>

                                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                                    {getFilteredAccounts().length === 0 ? (
                                        <View className="py-20 items-center justify-center">
                                            <MaterialCommunityIcons name="account-search-outline" size={48} color="#475569" />
                                            <Text className="text-xs font-bold text-slate-500 mt-3 tracking-widest">NO ACCOUNTS FOUND</Text>
                                        </View>
                                    ) : (
                                        getFilteredAccounts().map((userObj) => (
                                            <View 
                                                key={userObj.id} 
                                                className="bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-800/40"
                                            >
                                                <View className="flex-row justify-between items-start">
                                                    <View className="flex-1 pr-2">
                                                        <Text className="text-base font-bold text-slate-100">{userObj.full_name || 'Anonymous'}</Text>
                                                        <Text className="text-xs font-bold text-slate-400 mt-0.5">{userObj.mobile}</Text>
                                                        {userType === 'worker' && userObj.business_name && (
                                                            <Text className="text-[11px] font-bold text-indigo-400 mt-1">{userObj.business_name}</Text>
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
                                                        className="px-3.5 py-2 bg-red-950 border border-red-900 rounded-xl flex-row items-center"
                                                    >
                                                        <Feather name="trash-2" size={13} color="#EF4444" className="mr-1" />
                                                        <Text className="text-[10px] font-black text-red-400 uppercase tracking-widest">Delete</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <View className="mt-3 flex-row items-center justify-between border-t border-slate-850 pt-2.5">
                                                    <Text className="text-[10px] font-bold text-slate-500">
                                                        Joined: {new Date(userObj.created_at).toLocaleDateString()}
                                                    </Text>
                                                    <View className={`px-2 py-0.5 rounded-full ${userObj.is_active ? 'bg-green-950' : 'bg-slate-800'}`}>
                                                        <Text className={`text-[9px] font-black uppercase ${userObj.is_active ? 'text-green-400' : 'text-slate-400'}`}>
                                                            {userObj.is_active ? 'Active' : 'Offline'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                    <View className="h-10" />
                                </ScrollView>
                            </View>
                        )}

                        {activeTab === 'audit' && (
                            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                                {auditLogs.length === 0 ? (
                                    <View className="py-20 items-center justify-center">
                                        <Feather name="database" size={48} color="#475569" />
                                        <Text className="text-xs font-bold text-slate-500 mt-3 tracking-widest">NO AUDIT LOGS RECORDED</Text>
                                    </View>
                                ) : (
                                    auditLogs.map((log) => {
                                        const isDeletion = log.action === 'deleted';
                                        return (
                                            <View 
                                                key={log.id} 
                                                className="flex-row mb-4 bg-slate-900/40 rounded-2xl p-4 border border-slate-900"
                                            >
                                                <View className="mr-3.5 items-center">
                                                    <View className={`w-8 h-8 rounded-full items-center justify-center ${isDeletion ? 'bg-red-950/70 border border-red-800' : 'bg-green-950/70 border border-green-800'}`}>
                                                        <Feather 
                                                            name={isDeletion ? "user-x" : "user-check"} 
                                                            size={14} 
                                                            color={isDeletion ? "#EF4444" : "#22C55E"} 
                                                        />
                                                    </View>
                                                    <View className="w-0.5 bg-slate-800 flex-1 my-1" />
                                                </View>
                                                <View className="flex-1">
                                                    <View className="flex-row items-center justify-between">
                                                        <View className={`px-2 py-0.5 rounded-full ${isDeletion ? 'bg-red-950' : 'bg-green-950'}`}>
                                                            <Text className={`text-[9px] font-black uppercase tracking-wider ${isDeletion ? 'text-red-400' : 'text-green-400'}`}>
                                                                {log.action}
                                                            </Text>
                                                        </View>
                                                        <Text className="text-[10px] font-bold text-slate-500">
                                                            {new Date(log.created_at).toLocaleString()}
                                                        </Text>
                                                    </View>
                                                    <Text className="text-sm font-bold text-slate-200 mt-1.5">{log.full_name || 'Anonymous'}</Text>
                                                    <Text className="text-[11px] font-bold text-slate-400 mt-0.5">Mobile: {log.mobile} ({log.user_type})</Text>
                                                    
                                                    <View className="mt-2.5 bg-slate-950/50 p-2 rounded-xl border border-slate-900/80">
                                                        <Text className="text-[10px] font-bold text-slate-500">
                                                            Operator: <Text className="text-slate-300">{log.performed_by || 'system'}</Text>
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

                        {activeTab === 'requests' && (
                            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                                {deletionRequests.length === 0 ? (
                                    <View className="py-20 items-center justify-center">
                                        <Feather name="inbox" size={48} color="#475569" />
                                        <Text className="text-xs font-bold text-slate-500 mt-3 tracking-widest">NO DELETION REQUESTS</Text>
                                    </View>
                                ) : (
                                    deletionRequests.map((req) => (
                                        <View 
                                            key={req.id} 
                                            className="bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-800/40"
                                        >
                                            <View className="flex-row justify-between items-start">
                                                <View className="flex-1 pr-2">
                                                    <Text className="text-base font-bold text-slate-100">{req.full_name || 'Anonymous'}</Text>
                                                    <Text className="text-xs font-bold text-slate-400 mt-0.5">Mobile: {req.mobile} ({req.user_type})</Text>
                                                </View>
                                                {req.status === 'pending' ? (
                                                    <TouchableOpacity 
                                                        onPress={() => processDeletionRequest(req)}
                                                        className="px-3.5 py-2 bg-indigo-950 border border-indigo-900 rounded-xl flex-row items-center"
                                                    >
                                                        <Feather name="settings" size={12} color="#818CF8" className="mr-1" />
                                                        <Text className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Process</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View className="px-2.5 py-1 bg-slate-800 rounded-xl">
                                                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Processed</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View className="mt-3 bg-slate-950/80 p-3 rounded-xl border border-slate-850">
                                                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason:</Text>
                                                <Text className="text-xs font-bold text-slate-300 mt-1">{req.reason || 'None provided'}</Text>
                                            </View>
                                            <View className="mt-2.5 flex-row justify-between items-center text-[10px] text-slate-500 font-bold">
                                                <Text className="text-[10px] font-bold text-slate-500">
                                                    Requested: {new Date(req.requested_at).toLocaleDateString()}
                                                </Text>
                                                {req.processed_by && (
                                                    <Text className="text-[10px] font-bold text-indigo-400">
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
                )}

                {/* Custom Inline Modal for deletion reason input */}
                <Modal
                    visible={deleteModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setDeleteModalVisible(false)}
                >
                    <View className="flex-1 bg-black/85 items-center justify-center p-6">
                        <View className="w-full bg-slate-900 p-6 rounded-3xl border border-slate-800">
                            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-800">
                                <Text className="text-lg font-black text-slate-100 tracking-tight">Confirm Removal</Text>
                                <TouchableOpacity 
                                    onPress={() => {
                                        setDeleteModalVisible(false);
                                        setSelectedUser(null);
                                    }}
                                    className="p-1"
                                >
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {selectedUser && (
                                <View className="mb-4 bg-red-950/30 p-3 rounded-2xl border border-red-900/30">
                                    <Text className="text-xs font-bold text-slate-400">Account details:</Text>
                                    <Text className="text-sm font-bold text-red-400 mt-1">{selectedUser.full_name || 'Anonymous'}</Text>
                                    <Text className="text-xs font-semibold text-red-500 mt-0.5">Mobile: {selectedUser.mobile}</Text>
                                    <Text className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-2 border-t border-red-900/10 pt-1.5">
                                        ⚠️ WARNING: CASCADING RECORD REMOVAL
                                    </Text>
                                </View>
                            )}

                            <Text className="text-xs font-bold text-slate-400 mb-2">Specify Deletion Reason / Notes:</Text>
                            <TextInput 
                                value={deletionReason}
                                onChangeText={setDeletionReason}
                                placeholder="Enter reason (e.g. Inappropriate content, User request)..."
                                placeholderTextColor="#475569"
                                multiline={true}
                                numberOfLines={3}
                                className="bg-slate-950 p-4 rounded-2xl text-slate-200 border border-slate-850 min-h-[80px] text-sm font-medium mb-6"
                            />

                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                                <View className="flex-row gap-3">
                                    <TouchableOpacity 
                                        onPress={() => {
                                            setDeleteModalVisible(false);
                                            setSelectedUser(null);
                                        }}
                                        className="flex-1 bg-slate-800 py-3.5 rounded-2xl items-center"
                                    >
                                        <Text className="text-sm font-bold text-slate-300">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={performDeletion}
                                        className="flex-1 bg-red-600 py-3.5 rounded-2xl items-center"
                                    >
                                        <Text className="text-sm font-bold text-white">Permanently Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
