// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, Modal, Switch, Platform, Alert, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

const shadowSm = Platform.OS === 'web'
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

const shadow2xl = Platform.OS === 'web'
    ? { boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }
    : { elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 16 };

export default function CitiesConfigScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [citiesList, setCitiesList] = useState<any[]>([]);

    const [citySearchQuery, setCitySearchQuery] = useState('');
    
    // Create Modal states
    const [newCityModalVisible, setNewCityModalVisible] = useState(false);
    const [newCityName, setNewCityName] = useState('');
    const [newCityState, setNewCityState] = useState('');
    const [newCityTier, setNewCityTier] = useState('tier_2');
    const [submittingCity, setSubmittingCity] = useState(false);

    // Edit Modal states
    const [editCityModalVisible, setEditCityModalVisible] = useState(false);
    const [selectedCity, setSelectedCity] = useState<any | null>(null);
    const [editCityTier, setEditCityTier] = useState('tier_2');
    const [editCityActive, setEditCityActive] = useState(true);
    const [updatingCity, setUpdatingCity] = useState(false);

    const loadCities = async (isRef = false) => {
        if (isRef) setRefreshing(true);
        else setLoading(true);

        try {
            const { data, error } = await insforge.database
                .from('cities')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setCitiesList(data || []);
        } catch (err) {
            console.error('[CitiesConfigScreen] Fetch error:', err);
            Alert.alert("Database Error", "Failed to retrieve cities list.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCities();
    }, []);

    // Filter cities
    const filteredCities = useMemo(() => {
        const query = citySearchQuery.toLowerCase().trim();
        if (!query) return citiesList;
        return citiesList.filter(c =>
            (c.name || '').toLowerCase().includes(query) ||
            (c.state || '').toLowerCase().includes(query)
        );
    }, [citiesList, citySearchQuery]);

    // Handle open edit
    const handleOpenEditCity = (city: any) => {
        setSelectedCity(city);
        setEditCityTier(city.tier || 'tier_2');
        setEditCityActive(city.is_active !== false);
        setEditCityModalVisible(true);
    };

    // Submissions
    const handleCreateCity = async () => {
        if (!newCityName.trim()) return;
        setSubmittingCity(true);
        try {
            const { error } = await insforge.database
                .from('cities')
                .insert([
                    {
                        name: newCityName.trim(),
                        state: newCityState.trim() || 'Chhattisgarh',
                        tier: newCityTier,
                        is_active: true
                    }
                ]);
            if (error) throw error;

            Alert.alert("Success", "City added successfully!");
            setNewCityName('');
            setNewCityState('');
            setNewCityTier('tier_2');
            setNewCityModalVisible(false);
            await loadCities();
        } catch (err: any) {
            console.error(err);
            Alert.alert("Database Error", err.message || "Failed to insert city.");
        } finally {
            setSubmittingCity(false);
        }
    };

    const handleUpdateCity = async () => {
        if (!selectedCity) return;
        setUpdatingCity(true);
        try {
            const { error } = await insforge.database
                .from('cities')
                .update({
                    tier: editCityTier,
                    is_active: editCityActive
                })
                .eq('id', selectedCity.id);
            if (error) throw error;

            Alert.alert("Success", "City tier settings updated!");
            setEditCityModalVisible(false);
            setSelectedCity(null);
            await loadCities();
        } catch (err: any) {
            console.error(err);
            Alert.alert("Database Error", err.message || "Failed to update city.");
        } finally {
            setUpdatingCity(false);
        }
    };

    // Styling helpers
    const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';
    const borderClass = isDark ? 'border-slate-800' : 'border-slate-200';
    const inputBgClass = isDark ? 'bg-slate-955 text-slate-100 border-slate-850' : 'bg-slate-550/5 text-slate-800 border-slate-200';

    return (
        <View className={`flex-1 ${isDark ? 'bg-slate-955' : 'bg-slate-50'}`} style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className={`pt-4 pb-5 px-6 flex-row items-center justify-between border-b ${isDark ? 'border-slate-900 bg-slate-955' : 'border-slate-200 bg-white'}`}>
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                    >
                        <Ionicons name="chevron-back" size={24} color="#6366F1" />
                    </TouchableOpacity>
                    <View>
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Cities & Tiers</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Regional Tier Control</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => loadCities(true)}
                    className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                >
                    <Feather name="refresh-cw" size={18} color="#6366F1" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-5 pt-4"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => loadCities(true)} colors={['#6366F1']} />
                    }
                >
                    <View className="gap-4 pb-10">
                        {/* Create City Button */}
                        <TouchableOpacity
                            onPress={() => setNewCityModalVisible(true)}
                            className="flex-row items-center justify-center py-4 rounded-[22px] border border-dashed border-indigo-500/50 bg-indigo-500/5 mb-2 active:scale-98"
                        >
                            <Feather name="plus-circle" size={18} color="#6366F1" />
                            <Text className="text-sm font-black text-indigo-600 dark:text-indigo-400 ml-2 uppercase tracking-wider">Add New City</Text>
                        </TouchableOpacity>

                        {/* Search bar */}
                        <View className={`flex-row items-center px-4 py-3 rounded-2xl mb-2 border ${cardBgClass}`} style={shadowSm}>
                            <Feather name="search" size={18} color="#64748B" />
                            <TextInput
                                value={citySearchQuery}
                                onChangeText={setCitySearchQuery}
                                placeholder="Search cities or states..."
                                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                className={`flex-1 ml-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                            />
                        </View>

                        {/* Cities list */}
                        {filteredCities.length === 0 ? (
                            <View className="py-20 items-center justify-center">
                                <MaterialCommunityIcons name="city-variant-outline" size={48} color="#64748B" />
                                <Text className="text-xs font-bold text-slate-400 mt-4 tracking-widest">NO MATCHING CITIES FOUND</Text>
                            </View>
                        ) : (
                            <View className="gap-3">
                                {filteredCities.map((city) => {
                                    const active = city.is_active !== false;
                                    let tierLabel = 'Tier 2 (Standard)';
                                    let tierColor = 'text-amber-600 bg-amber-500/10 dark:text-amber-400';
                                    if (city.tier === 'tier_1') {
                                        tierLabel = 'Tier 1 (Metro)';
                                        tierColor = 'text-rose-600 bg-rose-500/10 dark:text-rose-455';
                                    } else if (city.tier === 'tier_3') {
                                        tierLabel = 'Tier 3 (Regional)';
                                        tierColor = 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400';
                                    }

                                    return (
                                        <TouchableOpacity
                                            key={city.id}
                                            onPress={() => handleOpenEditCity(city)}
                                            className={`p-4.5 rounded-3xl border flex-row justify-between items-center ${cardBgClass}`}
                                            style={shadowSm}
                                        >
                                            <View className="gap-1 flex-1">
                                                <Text className={`text-base font-black ${textMainClass}`}>{city.name}</Text>
                                                <Text className="text-xs font-semibold text-slate-400">{city.state || 'India'}</Text>
                                                
                                                <View className="flex-row gap-2 mt-2.5">
                                                    <View className={`px-2.5 py-0.5 rounded-md ${tierColor}`}>
                                                        <Text className="text-[9px] font-black uppercase tracking-wide">{tierLabel}</Text>
                                                    </View>
                                                    <View className={`px-2.5 py-0.5 rounded-md ${active ? 'bg-green-500/10 text-green-500' : 'bg-slate-550/10 text-slate-500'}`}>
                                                        <Text className={`text-[9px] font-black uppercase tracking-wide ${active ? 'text-green-600 dark:text-green-400' : 'text-slate-550'}`}>
                                                            {active ? 'Active' : 'Inactive'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View className="w-9 h-9 rounded-full bg-indigo-500/5 items-center justify-center">
                                                <Feather name="edit-3" size={14} color="#6366F1" />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}

            {/* Modal: Create City */}
            <Modal visible={newCityModalVisible} transparent animationType="slide" onRequestClose={() => setNewCityModalVisible(false)}>
                <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className={`p-6 rounded-t-[36px] border-t ${cardBgClass}`} style={shadow2xl}>
                        <View className="w-12 h-1.5 rounded-full self-center mb-6 bg-slate-200 dark:bg-slate-850" />
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-xl font-black tracking-tight ${textMainClass}`}>Add New City</Text>
                            <TouchableOpacity onPress={() => setNewCityModalVisible(false)} className="w-8 h-8 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-4">
                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">City Name</Text>
                                <TextInput
                                    value={newCityName}
                                    onChangeText={setNewCityName}
                                    placeholder="e.g. Raipur, Mumbai, Pune..."
                                    placeholderTextColor="#64748B"
                                    className={`px-4 py-3.5 text-sm font-semibold rounded-2xl border ${inputBgClass}`}
                                />
                            </View>

                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">State Name</Text>
                                <TextInput
                                    value={newCityState}
                                    onChangeText={setNewCityState}
                                    placeholder="e.g. Chhattisgarh, Maharashtra..."
                                    placeholderTextColor="#64748B"
                                    className={`px-4 py-3.5 text-sm font-semibold rounded-2xl border ${inputBgClass}`}
                                />
                            </View>

                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Tier</Text>
                                <View className="flex-row gap-2">
                                    {[
                                        { id: 'tier_1', label: 'Tier 1' },
                                        { id: 'tier_2', label: 'Tier 2' },
                                        { id: 'tier_3', label: 'Tier 3' }
                                    ].map((tOption) => {
                                        const selected = newCityTier === tOption.id;
                                        return (
                                            <TouchableOpacity
                                                key={tOption.id}
                                                onPress={() => setNewCityTier(tOption.id)}
                                                className={`flex-1 py-3.5 rounded-xl border items-center ${
                                                    selected ? 'bg-indigo-650 border-indigo-600' : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-850'
                                                }`}
                                            >
                                                <Text className={`text-xs font-bold ${selected ? 'text-white' : textMainClass}`}>{tOption.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleCreateCity}
                                disabled={submittingCity || !newCityName.trim()}
                                style={{ borderRadius: 18, overflow: 'hidden', marginTop: 12, marginBottom: 24 }}
                            >
                                <LinearGradient
                                    colors={['#6366F1', '#4F46E5']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center', opacity: !newCityName.trim() ? 0.6 : 1 }}
                                >
                                    {submittingCity ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-sm font-bold text-white uppercase tracking-wider">Save City</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal: Edit City */}
            <Modal visible={editCityModalVisible} transparent animationType="slide" onRequestClose={() => setEditCityModalVisible(false)}>
                <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className={`p-6 rounded-t-[36px] border-t ${cardBgClass}`} style={shadow2xl}>
                        <View className="w-12 h-1.5 rounded-full self-center mb-6 bg-slate-200 dark:bg-slate-850" />
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-xl font-black tracking-tight ${textMainClass}`}>Configure City: {selectedCity?.name}</Text>
                            <TouchableOpacity onPress={() => setEditCityModalVisible(false)} className="w-8 h-8 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>

                        {selectedCity && (
                            <View className="gap-4">
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Update Tier</Text>
                                    <View className="flex-row gap-2">
                                        {[
                                            { id: 'tier_1', label: 'Tier 1 (Metro)' },
                                            { id: 'tier_2', label: 'Tier 2 (Standard)' },
                                            { id: 'tier_3', label: 'Tier 3 (Regional)' }
                                        ].map((tOption) => {
                                            const selected = editCityTier === tOption.id;
                                            return (
                                                <TouchableOpacity
                                                    key={tOption.id}
                                                    onPress={() => setEditCityTier(tOption.id)}
                                                    className={`flex-1 py-3 rounded-xl border items-center ${
                                                        selected ? 'bg-indigo-650 border-indigo-600' : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-850'
                                                    }`}
                                                >
                                                    <Text className={`text-[10px] font-black ${selected ? 'text-white' : textMainClass}`}>{tOption.label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                <View className={`flex-row justify-between items-center py-3.5 border-t border-b ${borderClass}`}>
                                    <View className="flex-1 mr-4">
                                        <Text className={`text-sm font-bold ${textMainClass}`}>Is City Active</Text>
                                        <Text className="text-[10px] font-medium text-slate-450 leading-normal">Inactive cities are hidden from consumer pricing calculations.</Text>
                                    </View>
                                    <Switch
                                        value={editCityActive}
                                        onValueChange={setEditCityActive}
                                        trackColor={{ false: '#64748B', true: '#6366F1' }}
                                        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : '#6366F1'}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleUpdateCity}
                                    disabled={updatingCity}
                                    style={{ borderRadius: 18, overflow: 'hidden', marginTop: 12, marginBottom: 24 }}
                                >
                                    <LinearGradient
                                        colors={['#6366F1', '#4F46E5']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ paddingVertical: 14, alignItems: 'center', justify: 'center' }}
                                    >
                                        {updatingCity ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Text className="text-sm font-bold text-white uppercase tracking-wider">Save Changes</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
