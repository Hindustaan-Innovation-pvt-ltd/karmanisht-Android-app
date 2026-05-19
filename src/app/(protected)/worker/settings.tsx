// @ts-nocheck
import { useAppStore } from '@/lib/store';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, Switch, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
    UserIcon, ShieldIcon, BellIcon, InfoIcon, 
    LogOutIcon, ChevronRightIcon, MapPinIcon, ZapIcon
} from '@/svg/icons';
import { insforge } from '@/lib/insforge';
import { Feather } from '@expo/vector-icons';

export default function WorkerSettings() {
    const user = useAppStore(state => state.user);
    const isOnline = useAppStore(state => state.isOnline);
    const toggleOnlineStatus = useAppStore(state => state.toggleOnlineStatus);
    const signOut = useAppStore(state => state.signOut);


    const router = useRouter();
    
    const handleLogout = async () => {
        await signOut();
        router.replace('/');
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to permanently delete your worker profile? This action cannot be undone and all your ratings, reviews, specialities, and active leads will be permanently deleted.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Permanent",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (user?.id) {
                                // 1. Delete reviews
                                await insforge.database.from('reviews').delete().eq('provider_id', user.id);
                                // 2. Delete unlock_transactions
                                await insforge.database.from('unlock_transactions').delete().eq('provider_id', user.id);
                                // 3. Delete provider_locations
                                await insforge.database.from('provider_locations').delete().eq('provider_id', user.id);
                                // 4. Delete provider_services
                                await insforge.database.from('provider_services').delete().eq('provider_id', user.id);
                                
                                // Create deletion audit request log
                                await insforge.database.from('account_deletion_requests').insert([{
                                    user_id: user.id,
                                    user_type: 'worker',
                                    mobile: user.phone || '',
                                    full_name: user.name || 'Anonymous',
                                    reason: 'Self-deleted from Worker Settings',
                                    status: 'processed',
                                    processed_at: new Date().toISOString(),
                                    processed_by: 'user',
                                    admin_notes: 'Self-deletion confirmed.'
                                }]);

                                // 5. Delete from service_providers table
                                const { error } = await insforge.database.from('service_providers').delete().eq('id', user.id);
                                if (error) {
                                    Alert.alert("Error", "Failed to delete account: " + error.message);
                                    return;
                                }
                            }
                            await signOut();
                            Alert.alert("Success", "Your worker account has been permanently deleted.");
                            router.replace('/');
                        } catch (err) {
                            console.error(err);
                            Alert.alert("Error", "Failed to complete account deletion.");
                        }
                    }
                }
            ]
        );
    };

    const SettingItem = ({ icon: Icon, label, value, onPress, color = "#64748B" }: any) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="flex-row items-center gap-4 bg-white p-4 rounded-2xl mb-2 border border-slate-50"
        >
            <View className="size-10 rounded-xl bg-slate-50 items-center justify-center">
                <Icon size={20} color={color} />
            </View>
            <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">{label}</Text>
                {value && <Text className="text-xs text-slate-400 font-medium mt-0.5">{value}</Text>}
            </View>
            <ChevronRightIcon size={16} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaProvider>
            <SafeAreaView className="flex-1 bg-slate-50">
                <View className="px-5 py-6 bg-white border-b border-slate-100">
                    <Text className="text-2xl font-black text-slate-900 tracking-tight">Account</Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    {/* Availability Toggle */}
                    <View className="bg-white p-5 rounded-3xl border border-slate-100 mb-6 shadow-sm">
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-lg font-bold text-slate-900">Work Availability</Text>
                                <Text className="text-sm text-slate-500 font-medium">Toggle to appear in search</Text>
                            </View>
                            <Switch
                                value={isOnline}
                                onValueChange={toggleOnlineStatus}
                                trackColor={{ false: '#CBD5E1', true: '#22C55E' }}
                                thumbColor="#fff"
                            />
                        </View>
                        <View className="mt-4 flex-row items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl">
                            <View className={`size-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
                            <Text className="text-xs font-bold text-slate-600">
                                {isOnline ? 'You are visible to customers' : 'You are currently hidden'}
                            </Text>
                        </View>
                    </View>

                    {/* Profile Section */}
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Profile</Text>
                    <SettingItem 
                        icon={UserIcon} 
                        label="Personal Details" 
                        value={user?.name || "Provider"}
                        onPress={() => router.push('/(protected)/worker/edit-profile')} 
                    />
                    <SettingItem 
                        icon={ZapIcon} 
                        label="Premium Subscription" 
                        value={user?.isPremium ? "Premium (Active)" : "Upgrade to Premium"}
                        color={user?.isPremium ? "#D97706" : "#475569"}
                        onPress={() => router.push('/(protected)/worker/premium-plans')} 
                    />
                    <SettingItem 
                        icon={MapPinIcon} 
                        label="Service Area" 
                        value={user.location}
                        onPress={() => router.push('/(location)/locationinfo')} 
                    />
                    <SettingItem 
                        icon={ShieldIcon} 
                        label="Identity Verification" 
                        value="Pending"
                        color="#D97706"
                        onPress={() => router.push('/(onboarding)/worker/verify-identity')} 
                    />

                    {/* App Settings */}
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 mt-4 ml-1">App Settings</Text>
                    <SettingItem icon={BellIcon} label="Notifications" onPress={() => {}} />
                    <SettingItem icon={InfoIcon} label="Help & Support" onPress={() => {}} />

                    {/* Logout */}
                    <TouchableOpacity
                        onPress={handleLogout}
                        activeOpacity={0.7}
                        className="mt-8 flex-row items-center justify-center gap-2 bg-slate-100 py-4 rounded-2xl border border-slate-200"
                    >
                        <LogOutIcon size={18} color="#475569" />
                        <Text className="text-slate-600 font-bold text-base">Logout</Text>
                    </TouchableOpacity>

                    {/* Delete Account */}
                    <TouchableOpacity
                        onPress={handleDeleteAccount}
                        activeOpacity={0.7}
                        className="mt-3 flex-row items-center justify-center gap-2 bg-red-50 py-4 rounded-2xl border border-red-100"
                    >
                        <Feather name="trash-2" size={18} color="#EF4444" />
                        <Text className="text-red-500 font-bold text-base">Delete Account</Text>
                    </TouchableOpacity>

                    <Text className="text-center text-slate-300 text-[10px] font-bold mt-8 tracking-widest">
                        HINDUSTAN INNOVATIONS • V1.0.4
                    </Text>
                </ScrollView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
