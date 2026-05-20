// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, 
    TextInput, ActivityIndicator, Alert, Modal, Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

type TabType = 'accounts' | 'audit' | 'requests' | 'categories';
type UserType = 'consumer' | 'worker';

interface ConsumerUser {
    id: string;
    mobile: string;
    full_name: string | null;
    email: string | null;
    profile_image: string | null;
    role: string | null;
    current_latitude: number | null;
    current_longitude: number | null;
    is_active: boolean | null;
    created_at: string;
    updated_at: string;
    search_radius_km: number | null;
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
    type: UserType;
    mobile: string | null;
    full_name: string | null;
    requestId?: string;
}

// Safe cross-platform shadow styles
const shadowSm = Platform.OS === 'web' 
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' } 
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

const shadowLg = Platform.OS === 'web' 
    ? { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' } 
    : { elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 };

const shadow2xl = Platform.OS === 'web' 
    ? { boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' } 
    : { elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 16 };

export default function AdminConsole() {
    const router = useRouter();
    const { signOut, fetchCategories } = useAppStore();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<TabType>('accounts');
    const [userType, setUserType] = useState<UserType>('consumer');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Data states
    const [loading, setLoading] = useState(false);
    const [consumers, setConsumers] = useState<ConsumerUser[]>([]);
    const [workers, setWorkers] = useState<WorkerUser[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [tagsList, setTagsList] = useState<any[]>([]);

    // Category and Tag management inputs
    const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('lightning-bolt');
    const [submittingCategory, setSubmittingCategory] = useState(false);

    const [activeAddTagCategoryId, setActiveAddTagCategoryId] = useState<string | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [submittingTag, setSubmittingTag] = useState(false);

    // Modal state for deletion
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SelectedUserType | null>(null);
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

            // Fetch categories
            const { data: catData } = await insforge.database
                .from('service_categories')
                .select('*')
                .order('name', { ascending: true });
            setCategoriesList(catData || []);

            // Fetch tags
            const { data: tagData } = await insforge.database
                .from('service_tags')
                .select('*')
                .order('name', { ascending: true });
            setTagsList(tagData || []);

        } catch (err) {
            console.error(err);
            Alert.alert("Database Error", "Failed to retrieve the latest administrative records.");
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
                if (requestId) {
                    const { error: reqErr } = await insforge.database.from('account_deletion_requests')
                        .update({
                            status: 'processed',
                            processed_at: new Date().toISOString(),
                            processed_by: 'admin',
                            admin_notes: deletionReason || 'Processed via Admin Panel.'
                        })
                        .eq('id', requestId);
                    if (reqErr) throw reqErr;
                } else {
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
                                admin_notes: 'Force deleted via Admin Panel.',
                                reason: deletionReason || 'Admin force deleted'
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

                // Update deletion requests table
                if (requestId) {
                    const { error: reqErr } = await insforge.database.from('account_deletion_requests')
                        .update({
                            status: 'processed',
                            processed_at: new Date().toISOString(),
                            processed_by: 'admin',
                            admin_notes: deletionReason || 'Processed via Admin Panel.'
                        })
                        .eq('id', requestId);
                    if (reqErr) throw reqErr;
                } else {
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
                                admin_notes: 'Force deleted via Admin Panel.',
                                reason: deletionReason || 'Admin force deleted'
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
                }

                // Delete from service_providers table
                const { error: deleteErr } = await insforge.database.from('service_providers').delete().eq('id', userId);
                if (deleteErr) throw deleteErr;
            }

            Alert.alert("Success", "Account records have been permanently expunged.");
            setDeleteModalVisible(false);
            setSelectedUser(null);
            setDeletionReason('');
            fetchAllData();

        } catch (err) {
            console.error(err);
            Alert.alert("Deletion Error", err.message || "Failed to complete cascading deletion.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert("Input Error", "Please enter a category name.");
            return;
        }
        setSubmittingCategory(true);
        try {
            const { error } = await insforge.database
                .from('service_categories')
                .insert([
                    {
                        name: newCategoryName.trim(),
                        icon: newCategoryIcon.trim() || 'lightning-bolt',
                        is_active: true
                    }
                ]);
            if (error) throw error;

            Alert.alert("Success", "Category created successfully!");
            setNewCategoryName('');
            setNewCategoryIcon('lightning-bolt');
            setShowAddCategoryForm(false);
            
            await fetchAllData();
            await fetchCategories(true);
        } catch (err: any) {
            console.error(err);
            Alert.alert("Database Error", err.message || "Failed to insert new category.");
        } finally {
            setSubmittingCategory(false);
        }
    };

    const handleCreateTag = async (categoryId: string) => {
        if (!newTagName.trim()) {
            Alert.alert("Input Error", "Please enter a tag name.");
            return;
        }
        setSubmittingTag(true);
        try {
            const { error } = await insforge.database
                .from('service_tags')
                .insert([
                    {
                        category_id: categoryId,
                        name: newTagName.trim()
                    }
                ]);
            if (error) throw error;

            Alert.alert("Success", "Tag created successfully!");
            setNewTagName('');
            setActiveAddTagCategoryId(null);

            await fetchAllData();
        } catch (err: any) {
            console.error(err);
            Alert.alert("Database Error", err.message || "Failed to insert new tag.");
        } finally {
            setSubmittingTag(false);
        }
    };

    const toggleCategoryActive = async (categoryId: string, currentStatus: boolean) => {
        try {
            const { error } = await insforge.database
                .from('service_categories')
                .update({ is_active: !currentStatus })
                .eq('id', categoryId);
            if (error) throw error;
            await fetchAllData();
            await fetchCategories(true);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to update category status.");
        }
    };

    const deleteTag = async (tagId: string) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this tag?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await insforge.database
                                .from('service_tags')
                                .delete()
                                .eq('id', tagId);
                            if (error) throw error;
                            await fetchAllData();
                        } catch (err: any) {
                            Alert.alert("Error", err.message || "Failed to delete tag.");
                        }
                    }
                }
            ]
        );
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

    // Filter categories based on search
    const getFilteredCategories = () => {
        const query = searchQuery.toLowerCase();
        if (!query) return categoriesList;
        return categoriesList.filter(c => 
            (c.name || '').toLowerCase().includes(query) ||
            tagsList.some(t => t.category_id === c.id && (t.name || '').toLowerCase().includes(query))
        );
    };

    // Filter audit logs based on search
    const getFilteredAuditLogs = () => {
        const query = searchQuery.toLowerCase();
        if (!query) return auditLogs;
        return auditLogs.filter(log => 
            (log.full_name || '').toLowerCase().includes(query) ||
            (log.mobile || '').includes(query) ||
            (log.action || '').toLowerCase().includes(query) ||
            (log.performed_by || '').toLowerCase().includes(query)
        );
    };

    // Filter deletion requests based on search
    const getFilteredRequests = () => {
        const query = searchQuery.toLowerCase();
        if (!query) return deletionRequests;
        return deletionRequests.filter(req => 
            (req.full_name || '').toLowerCase().includes(query) ||
            (req.mobile || '').includes(query) ||
            (req.reason || '').toLowerCase().includes(query) ||
            (req.status || '').toLowerCase().includes(query)
        );
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setSearchQuery('');
    };

    const processDeletionRequest = async (req: any) => {
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
                            type: req.user_type,
                            mobile: req.mobile,
                            full_name: req.full_name,
                            requestId: req.id
                        });
                        setDeletionReason(req.reason);
                        setDeleteModalVisible(true);
                    }
                }
            ]
        );
    };

    // Themes Mapping
    const bgClass = isDark ? 'bg-slate-950' : 'bg-slate-50';
    const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';
    const textSubClass = isDark ? 'text-slate-400' : 'text-slate-500';
    const borderClass = isDark ? 'border-slate-850' : 'border-slate-200';
    const pillBgClass = isDark ? 'bg-slate-800' : 'bg-slate-100';
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
                            <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Console</Text>
                            <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global Admin</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity 
                            onPress={fetchAllData}
                            className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                        >
                            <Feather name="refresh-cw" size={18} color="#6366F1" />
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
                            className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-red-50'}`}
                        >
                            <Feather name="log-out" size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Dashboard Stats */}
                <View className="flex-row justify-between px-5 py-5 gap-3">
                    <View className={`flex-1 p-4 rounded-3xl border ${cardBgClass}`} style={shadowSm}>
                        <View className="w-8 h-8 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                            <Feather name="users" size={16} color="#6366F1" />
                        </View>
                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Consumers</Text>
                        <Text className="text-2xl font-black text-indigo-500 mt-1">{consumers.length}</Text>
                    </View>
                    
                    <View className={`flex-1 p-4 rounded-3xl border ${cardBgClass}`} style={shadowSm}>
                        <View className="w-8 h-8 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                            <Feather name="tool" size={16} color="#0EA5E9" />
                        </View>
                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Workers</Text>
                        <Text className="text-2xl font-black text-sky-500 mt-1">{workers.length}</Text>
                    </View>

                    <View className={`flex-1 p-4 rounded-3xl border ${cardBgClass}`} style={shadowSm}>
                        <View className="w-8 h-8 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)' }}>
                            <Feather name="trash" size={16} color="#F43F5E" />
                        </View>
                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Requests</Text>
                        <Text className="text-2xl font-black text-rose-500 mt-1">{deletionRequests.filter(r => r.status === 'pending').length}</Text>
                    </View>
                </View>

                {/* Tab Navigator */}
                <View className={`flex-row mx-5 p-1.5 rounded-[22px] mb-4 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'}`} style={isDark ? {} : { backgroundColor: 'rgba(226, 232, 240, 0.6)', borderColor: 'rgba(203, 213, 225, 0.4)' }}>
                    <TouchableOpacity 
                        onPress={() => handleTabChange('accounts')}
                        className={`flex-1 py-3 rounded-2xl items-center ${activeTab === 'accounts' ? (isDark ? 'bg-slate-800 border' : 'bg-white') : ''}`}
                        style={activeTab === 'accounts' ? (isDark ? { ...shadowSm, borderColor: 'rgba(71, 85, 105, 0.4)' } : shadowSm) : {}}
                    >
                        <Text className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'accounts' ? 'text-indigo-600 dark:text-indigo-400' : textSubClass}`}>Accounts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => handleTabChange('audit')}
                        className={`flex-1 py-3 rounded-2xl items-center ${activeTab === 'audit' ? (isDark ? 'bg-slate-800 border' : 'bg-white') : ''}`}
                        style={activeTab === 'audit' ? (isDark ? { ...shadowSm, borderColor: 'rgba(71, 85, 105, 0.4)' } : shadowSm) : {}}
                    >
                        <Text className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'audit' ? 'text-indigo-600 dark:text-indigo-400' : textSubClass}`}>Audit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => handleTabChange('requests')}
                        className={`flex-1 py-3 rounded-2xl items-center ${activeTab === 'requests' ? (isDark ? 'bg-slate-800 border' : 'bg-white') : ''}`}
                        style={activeTab === 'requests' ? (isDark ? { ...shadowSm, borderColor: 'rgba(71, 85, 105, 0.4)' } : shadowSm) : {}}
                    >
                        <Text className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'requests' ? 'text-indigo-600 dark:text-indigo-400' : textSubClass}`}>Requests</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => handleTabChange('categories')}
                        className={`flex-1 py-3 rounded-2xl items-center ${activeTab === 'categories' ? (isDark ? 'bg-slate-800 border' : 'bg-white') : ''}`}
                        style={activeTab === 'categories' ? (isDark ? { ...shadowSm, borderColor: 'rgba(71, 85, 105, 0.4)' } : shadowSm) : {}}
                    >
                        <Text className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'categories' ? 'text-indigo-600 dark:text-indigo-400' : textSubClass}`}>Categories</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text className="text-xs font-bold text-slate-500 mt-4 tracking-widest uppercase">Fetching System Telemetry...</Text>
                    </View>
                ) : (
                    <View className="flex-1 px-5">
                        {activeTab === 'accounts' && (
                            <View className="flex-1">
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

                                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
                                                        className="px-4 py-2 rounded-xl flex-row items-center"
                                                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1 }}
                                                    >
                                                        <Feather name="trash-2" size={13} color="#EF4444" />
                                                        <Text className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1.5">Expunge</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <View className="mt-4 flex-row items-center justify-between border-t pt-3.5" style={isDark ? { borderTopColor: 'rgba(30, 41, 59, 0.8)' } : { borderTopColor: '#F1F5F9' }}>
                                                    <Text className="text-[10px] font-bold text-slate-400">
                                                        Joined: {new Date(userObj.created_at).toLocaleDateString()}
                                                    </Text>
                                                    <View className="px-3 py-1 rounded-full" style={userObj.is_active ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}>
                                                        <Text className={`text-[9px] font-black uppercase tracking-wider ${userObj.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
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
                            <View className="flex-1">
                                {/* Modernized Search Bar for Audit Trail */}
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

                                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                                    {getFilteredAuditLogs().length === 0 ? (
                                        <View className="py-20 items-center justify-center">
                                            <Feather name="database" size={48} color="#64748B" />
                                            <Text className="text-xs font-bold text-slate-400 mt-4 tracking-widest">NO MATCHING AUDIT LOGS</Text>
                                        </View>
                                    ) : (
                                        getFilteredAuditLogs().map((log) => {
                                            const isDeletion = log.action === 'deleted';
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
                            </View>
                        )}

                        {activeTab === 'requests' && (
                            <View className="flex-1">
                                {/* Modernized Search Bar for Deletion Requests */}
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

                                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
                                                    {req.status === 'pending' ? (
                                                        <TouchableOpacity 
                                                            onPress={() => processDeletionRequest(req)}
                                                            className="px-4 py-2 rounded-xl flex-row items-center"
                                                            style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)', borderWidth: 1 }}
                                                        >
                                                            <Feather name="settings" size={13} color="#6366F1" />
                                                            <Text className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1.5">Action</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}>
                                                            <Text className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Processed</Text>
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
                            </View>
                        )}

                        {activeTab === 'categories' && (
                            <View className="flex-1">
                                {/* Add New Category Header Trigger / Form */}
                                {showAddCategoryForm ? (
                                    <View className={`p-5 rounded-[24px] mb-4 border ${cardBgClass}`} style={shadowSm}>
                                        <Text className={`text-base font-bold mb-3 ${textMainClass}`}>Add New Category</Text>
                                        <View className="gap-3">
                                            <View>
                                                <Text className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Category Name</Text>
                                                <TextInput
                                                    value={newCategoryName}
                                                    onChangeText={setNewCategoryName}
                                                    placeholder="e.g. Painter, Beautician, Electrician..."
                                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                                    className={`px-4 py-2.5 text-sm font-semibold rounded-xl border ${
                                                        isDark ? 'bg-slate-950 text-slate-100 border-slate-850' : 'bg-slate-50 text-slate-800 border-slate-200'
                                                    }`}
                                                />
                                            </View>
                                            <View>
                                                <Text className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Icon Name (Feather icon)</Text>
                                                <TextInput
                                                    value={newCategoryIcon}
                                                    onChangeText={setNewCategoryIcon}
                                                    placeholder="e.g. tool, scissors, brush, car..."
                                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                                    className={`px-4 py-2.5 text-sm font-semibold rounded-xl border ${
                                                        isDark ? 'bg-slate-950 text-slate-100 border-slate-850' : 'bg-slate-50 text-slate-800 border-slate-200'
                                                    }`}
                                                />
                                            </View>
                                            <View className="flex-row gap-3 mt-2">
                                                <TouchableOpacity
                                                    onPress={handleCreateCategory}
                                                    className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                                                    disabled={submittingCategory}
                                                >
                                                    {submittingCategory ? (
                                                        <ActivityIndicator size="small" color="white" />
                                                    ) : (
                                                        <Text className="text-xs font-bold text-white uppercase tracking-wider">Create Category</Text>
                                                    )}
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setShowAddCategoryForm(false);
                                                        setNewCategoryName('');
                                                        setNewCategoryIcon('lightning-bolt');
                                                    }}
                                                    className={`flex-1 py-3 rounded-xl items-center border ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}
                                                >
                                                    <Text className={`text-xs font-bold uppercase tracking-wider ${textSubClass}`}>Cancel</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => setShowAddCategoryForm(true)}
                                        className="flex-row items-center justify-center py-3.5 rounded-[22px] border border-dashed border-indigo-500/50 bg-indigo-500/5 mb-4 active:scale-98"
                                    >
                                        <Feather name="plus-circle" size={18} color="#6366F1" />
                                        <Text className="text-sm font-black text-indigo-600 dark:text-indigo-400 ml-2 uppercase tracking-wider">Add New Category</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Search Bar for Categories & Tags */}
                                <View className={`flex-row items-center px-4 py-3 rounded-2xl mb-4 border ${searchBgClass}`}>
                                    <Feather name="search" size={18} color="#64748B" />
                                    <TextInput 
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Search categories or sub-tags..."
                                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                        className={`flex-1 ml-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                    />
                                </View>

                                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                                    {getFilteredCategories().length === 0 ? (
                                        <View className="py-20 items-center justify-center">
                                            <MaterialCommunityIcons name="tag-multiple-outline" size={48} color="#64748B" />
                                            <Text className="text-xs font-bold text-slate-400 mt-4 tracking-widest">NO MATCHING CATEGORIES</Text>
                                        </View>
                                    ) : (
                                        getFilteredCategories().map((cat) => {
                                            const categoryTags = tagsList.filter(t => t.category_id === cat.id);
                                            return (
                                                <View 
                                                    key={cat.id} 
                                                    className={`p-5 rounded-[24px] mb-3 border ${cardBgClass}`}
                                                    style={shadowSm}
                                                >
                                                    <View className="flex-row justify-between items-center">
                                                        <View className="flex-row items-center flex-1 pr-2">
                                                            <View 
                                                                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                                                                style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                                                            >
                                                                <Feather name={cat.icon || 'lightning-bolt'} size={18} color="#6366F1" />
                                                            </View>
                                                            <View className="flex-1">
                                                                <Text className={`text-base font-bold ${textMainClass}`}>{cat.name}</Text>
                                                                <Text className={`text-[10px] font-medium ${textSubClass}`}>Icon: {cat.icon || 'default'}</Text>
                                                            </View>
                                                        </View>
                                                        
                                                        {/* Active Status toggle */}
                                                        <TouchableOpacity 
                                                            onPress={() => toggleCategoryActive(cat.id, cat.is_active !== false)}
                                                            className="px-3 py-1.5 rounded-xl border"
                                                            style={{ 
                                                                backgroundColor: cat.is_active !== false ? 'rgba(34, 197, 94, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                                                                borderColor: cat.is_active !== false ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)'
                                                            }}
                                                        >
                                                            <Text className={`text-[9px] font-black uppercase tracking-wider ${
                                                                cat.is_active !== false ? 'text-green-600 dark:text-green-400' : 'text-slate-500'
                                                            }`}>
                                                                {cat.is_active !== false ? 'Active' : 'Disabled'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    {/* Sub-tags list */}
                                                    <View className="mt-4 pt-3.5 border-t" style={isDark ? { borderTopColor: 'rgba(30, 41, 59, 0.8)' } : { borderTopColor: '#F1F5F9' }}>
                                                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Sub-tags / Specialties</Text>
                                                        
                                                        <View className="flex-row flex-wrap gap-2">
                                                            {categoryTags.length === 0 ? (
                                                                <Text className="text-xs text-slate-400 italic">No sub-tags added yet.</Text>
                                                            ) : (
                                                                categoryTags.map((tag) => (
                                                                    <View 
                                                                        key={tag.id}
                                                                        className={`flex-row items-center pl-3 pr-2 py-1 rounded-full border ${
                                                                            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                                                                        }`}
                                                                    >
                                                                        <Text className={`text-xs font-semibold ${textMainClass}`}>{tag.name}</Text>
                                                                        <TouchableOpacity 
                                                                            onPress={() => deleteTag(tag.id)}
                                                                            className="ml-1.5 p-0.5 rounded-full"
                                                                        >
                                                                            <Ionicons name="close-circle" size={14} color="#EF4444" />
                                                                        </TouchableOpacity>
                                                                    </View>
                                                                ))
                                                            )}
                                                        </View>

                                                        {/* Add Tag Inline Form */}
                                                        {activeAddTagCategoryId === cat.id ? (
                                                            <View className="flex-row items-center mt-3 gap-2">
                                                                <TextInput
                                                                    value={newTagName}
                                                                    onChangeText={setNewTagName}
                                                                    placeholder="Enter new tag / specialty name..."
                                                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                                                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-xl border ${
                                                                        isDark ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                                                                    }`}
                                                                />
                                                                <TouchableOpacity
                                                                    onPress={() => handleCreateTag(cat.id)}
                                                                    className="bg-indigo-600 px-3 py-2 rounded-xl"
                                                                    disabled={submittingTag}
                                                                >
                                                                    {submittingTag ? (
                                                                        <ActivityIndicator size="small" color="white" />
                                                                    ) : (
                                                                        <Text className="text-[10px] font-black text-white uppercase tracking-wider">Save</Text>
                                                                    )}
                                                                </TouchableOpacity>
                                                                <TouchableOpacity
                                                                    onPress={() => {
                                                                        setActiveAddTagCategoryId(null);
                                                                        setNewTagName('');
                                                                    }}
                                                                    className={`px-3 py-2 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}
                                                                >
                                                                    <Text className={`text-[10px] font-black uppercase tracking-wider ${textSubClass}`}>Cancel</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        ) : (
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    setActiveAddTagCategoryId(cat.id);
                                                                    setNewTagName('');
                                                                }}
                                                                className="flex-row items-center mt-3.5 self-start px-3 py-1.5 rounded-xl border border-dashed border-indigo-500/40 bg-indigo-500/5 active:scale-95"
                                                            >
                                                                <Feather name="plus" size={12} color="#6366F1" />
                                                                <Text className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 ml-1.5 uppercase tracking-wider">Add Tag</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                    <View className="h-10" />
                                </ScrollView>
                            </View>
                        )}
                    </View>
                )}

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
