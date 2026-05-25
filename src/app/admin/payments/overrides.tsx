// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, Modal, Platform, Alert, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
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

export default function OverridesConfigScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // DB loaded references
    const [citiesList, setCitiesList] = useState<any[]>([]);
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [overridesList, setOverridesList] = useState<any[]>([]);

    // Form input states
    const [selectedOverrideCity, setSelectedOverrideCity] = useState<any | null>(null);
    const [selectedOverrideCategory, setSelectedOverrideCategory] = useState<any | null>(null);
    const [overrideUnlockPrice, setOverrideUnlockPrice] = useState('49');
    const [overrideBasicFee, setOverrideBasicFee] = useState('1999');
    const [overridePremiumFee, setOverridePremiumFee] = useState('15000');
    const [overrideDuration, setOverrideDuration] = useState('5');
    const [submittingOverride, setSubmittingOverride] = useState(false);

    // Modal selectors visibility states
    const [citySelectModalVisible, setCitySelectModalVisible] = useState(false);
    const [categorySelectModalVisible, setCategorySelectModalVisible] = useState(false);

    const loadData = async (isRef = false) => {
        if (isRef) setRefreshing(true);
        else setLoading(true);

        try {
            // 1. Fetch cities
            const { data: dbCities } = await insforge.database
                .from('cities')
                .select('*')
                .order('name', { ascending: true });
            setCitiesList(dbCities || []);

            // 2. Fetch categories
            const { data: catData } = await insforge.database
                .from('service_categories')
                .select('*')
                .order('name', { ascending: true });
            setCategoriesList(catData || []);

            // 3. Fetch overrides
            const { data: ovData } = await insforge.database
                .from('city_pricing_config')
                .select('*');
            setOverridesList(ovData || []);

        } catch (err) {
            console.error('[OverridesConfigScreen] Fetch error:', err);
            Alert.alert("Database Error", "Failed to retrieve configuration values.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveOverride = async () => {
        if (!selectedOverrideCity) {
            Alert.alert("Input Error", "Please select a city.");
            return;
        }
        if (!selectedOverrideCategory) {
            Alert.alert("Input Error", "Please select a category.");
            return;
        }

        setSubmittingOverride(true);
        try {
            const { data: existing } = await insforge.database
                .from('city_pricing_config')
                .select('id')
                .eq('city_id', selectedOverrideCity.id)
                .eq('profession_id', selectedOverrideCategory.id)
                .maybeSingle();

            if (existing && existing.id) {
                const { error } = await insforge.database
                    .from('city_pricing_config')
                    .update({
                        unlock_price: Number(overrideUnlockPrice),
                        provider_basic_fee: Number(overrideBasicFee),
                        provider_premium_fee: Number(overridePremiumFee),
                        unlock_duration_hours: Number(overrideDuration)
                    })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await insforge.database
                    .from('city_pricing_config')
                    .insert({
                        city_id: selectedOverrideCity.id,
                        profession_id: selectedOverrideCategory.id,
                        unlock_price: Number(overrideUnlockPrice),
                        provider_basic_fee: Number(overrideBasicFee),
                        provider_premium_fee: Number(overridePremiumFee),
                        unlock_duration_hours: Number(overrideDuration)
                    });
                if (error) throw error;
            }

            Alert.alert("Success", "Category pricing override saved successfully!");
            setSelectedOverrideCategory(null);
            await loadData();
        } catch (err: any) {
            console.error(err);
            Alert.alert("Database Error", err.message || "Failed to save category pricing override.");
        } finally {
            setSubmittingOverride(false);
        }
    };

    const handleDeleteOverride = (overrideId: string) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this pricing override?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await insforge.database
                                .from('city_pricing_config')
                                .delete()
                                .eq('id', overrideId);
                            if (error) throw error;
                            await loadData();
                        } catch (err: any) {
                            Alert.alert("Error", err.message || "Failed to delete override.");
                        }
                    }
                }
            ]
        );
    };

    const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';
    const borderClass = isDark ? 'border-slate-800' : 'border-slate-200';
    const inputBgClass = isDark ? 'bg-slate-905 text-slate-100 border-slate-800' : 'bg-slate-500/5 text-slate-800 border-slate-200';

    return (
        <View className={`flex-1 ${isDark ? 'bg-slate-950' : 'bg-slate-550/5'}`} style={{ paddingTop: insets.top }}>
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
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Category Overrides</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Regional Custom Overrides</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => loadData(true)}
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
                        <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#6366F1']} />
                    }
                >
                    <View className="gap-5 pb-10">
                        {/* Override Form */}
                        <View className={`p-5 rounded-3xl border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row items-center gap-2.5 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <View className="w-8 h-8 rounded-lg bg-indigo-500/10 items-center justify-center">
                                    <Feather name="plus-circle" size={15} color="#6366F1" />
                                </View>
                                <Text className={`text-base font-black tracking-tight ${textMainClass}`}>
                                    Set Pricing Override
                                </Text>
                            </View>

                            <View className="gap-4">
                                {/* Select City Modal Trigger */}
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Target City</Text>
                                    <TouchableOpacity
                                        onPress={() => setCitySelectModalVisible(true)}
                                        className={`px-4 py-3 rounded-2xl border flex-row justify-between items-center ${inputBgClass}`}
                                    >
                                        <View className="flex-row items-center gap-2.5">
                                            <Feather name="map-pin" size={14} color="#6366F1" />
                                            <Text className={`text-sm font-semibold ${selectedOverrideCity ? textMainClass : 'text-slate-400'}`}>
                                                {selectedOverrideCity ? selectedOverrideCity.name : 'Choose City...'}
                                            </Text>
                                        </View>
                                        <Feather name="chevron-down" size={16} color="#64748B" />
                                    </TouchableOpacity>
                                </View>

                                {/* Select Category Modal Trigger */}
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Target Category</Text>
                                    <TouchableOpacity
                                        onPress={() => setCategorySelectModalVisible(true)}
                                        className={`px-4 py-3 rounded-2xl border flex-row justify-between items-center ${inputBgClass}`}
                                    >
                                        <View className="flex-row items-center gap-2.5">
                                            <Feather name="grid" size={14} color="#6366F1" />
                                            <Text className={`text-sm font-semibold ${selectedOverrideCategory ? textMainClass : 'text-slate-400'}`}>
                                                {selectedOverrideCategory ? selectedOverrideCategory.name : 'Choose Category...'}
                                            </Text>
                                        </View>
                                        <Feather name="chevron-down" size={16} color="#64748B" />
                                    </TouchableOpacity>
                                </View>

                                {/* Price and Duration values */}
                                <View className="flex-row gap-3">
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Unlock Price (INR)</Text>
                                        <View className="flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                            <Text className="text-slate-400 font-bold mr-1 text-xs">₹</Text>
                                            <TextInput
                                                value={overrideUnlockPrice}
                                                onChangeText={setOverrideUnlockPrice}
                                                keyboardType="numeric"
                                                className={`flex-1 py-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                            />
                                        </View>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Duration</Text>
                                        <View className="flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                            <TextInput
                                                value={overrideDuration}
                                                onChangeText={setOverrideDuration}
                                                keyboardType="number-pad"
                                                className={`flex-1 py-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                            />
                                            <Text className="text-slate-400 font-bold ml-1 text-xs">h</Text>
                                        </View>
                                    </View>
                                </View>

                                <View className="flex-row gap-3">
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Basic Subscription</Text>
                                        <View className="flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                            <Text className="text-slate-400 font-bold mr-1 text-xs">₹</Text>
                                            <TextInput
                                                value={overrideBasicFee}
                                                onChangeText={setOverrideBasicFee}
                                                keyboardType="numeric"
                                                className={`flex-1 py-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                            />
                                        </View>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Premium Subscription</Text>
                                        <View className="flex-row items-center border rounded-2xl px-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                            <Text className="text-slate-400 font-bold mr-1 text-xs">₹</Text>
                                            <TextInput
                                                value={overridePremiumFee}
                                                onChangeText={setOverridePremiumFee}
                                                keyboardType="numeric"
                                                className={`flex-1 py-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={handleSaveOverride}
                                    disabled={submittingOverride || !selectedOverrideCity || !selectedOverrideCategory}
                                    style={{ borderRadius: 16, overflow: 'hidden', marginTop: 8 }}
                                >
                                    <LinearGradient
                                        colors={['#6366F1', '#4F46E5']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center', opacity: (!selectedOverrideCity || !selectedOverrideCategory) ? 0.6 : 1 }}
                                    >
                                        {submittingOverride ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Text className="text-xs font-black text-white uppercase tracking-wider">Save Specific Override</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Overrides list */}
                        <Text className={`text-xs font-black uppercase tracking-wider text-slate-400`}>Existing Regional Overrides ({overridesList.length})</Text>
                        {overridesList.length === 0 ? (
                            <View className="py-12 items-center justify-center">
                                <Feather name="layers" size={36} color="#64748B" style={{ opacity: 0.5 }} />
                                <Text className="text-xs font-bold text-slate-400 italic mt-2">No regional overrides configured yet.</Text>
                            </View>
                        ) : (
                            <View className="gap-3">
                                {overridesList.map((ov) => {
                                    const cObj = citiesList.find(c => c.id === ov.city_id);
                                    const catObj = categoriesList.find(cat => cat.id === ov.profession_id);

                                    return (
                                        <View
                                            key={ov.id}
                                            className={`p-4 rounded-3xl border ${cardBgClass} flex-row justify-between items-center`}
                                            style={shadowSm}
                                        >
                                            <View className="gap-1.5 flex-1 mr-2">
                                                <View className="flex-row items-center gap-1.5 flex-wrap">
                                                    <Text className={`text-sm font-medium ${textMainClass}`}>{cObj?.name || 'City'}</Text>
                                                    <Text className="text-xs text-slate-400">|</Text>
                                                    <Text className="text-xs font-bold text-indigo-500">{catObj?.name || 'Category'}</Text>
                                                </View>

                                                <View className="flex-row flex-wrap gap-2 mt-1.5">
                                                    <View className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-800">
                                                        <Text className={`text-[10px] font-semibold text-slate-400`}>
                                                            Unlock: <Text className="font-bold text-indigo-650 dark:text-indigo-400">₹{ov.unlock_price}</Text> ({ov.unlock_duration_hours}h)
                                                        </Text>
                                                    </View>
                                                    <View className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-800">
                                                        <Text className={`text-[10px] font-semibold text-slate-400`}>
                                                            Basic Sub: <Text className="font-bold text-indigo-650 dark:text-indigo-400">₹{ov.provider_basic_fee}</Text>
                                                        </Text>
                                                    </View>
                                                    <View className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-800">
                                                        <Text className={`text-[10px] font-semibold text-slate-400`}>
                                                            Premium Sub: <Text className="font-bold text-indigo-650 dark:text-indigo-400">₹{ov.provider_premium_fee}</Text>
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                onPress={() => handleDeleteOverride(ov.id)}
                                                className={`w-9 h-9 rounded-full items-center justify-center bg-red-500/10`}
                                            >
                                                <Ionicons name="trash" size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                        <View className="h-10" />
                    </View>
                </ScrollView>
            )}

            {/* Modal: Select Override City */}
            <Modal visible={citySelectModalVisible} transparent animationType="slide" onRequestClose={() => setCitySelectModalVisible(false)}>
                <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className={`h-[60%] p-6 rounded-t-[36px] border-t ${cardBgClass}`} style={shadow2xl}>
                        <View className="w-12 h-1.5 rounded-full self-center mb-6 bg-slate-200 dark:bg-slate-800" />
                        <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <Text className={`text-lg font-black tracking-tight ${textMainClass}`}>Select Target City</Text>
                            <TouchableOpacity onPress={() => setCitySelectModalVisible(false)} className="w-8 h-8 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="gap-2.5">
                                {citiesList.map((city) => (
                                    <TouchableOpacity
                                        key={city.id}
                                        onPress={() => {
                                            setSelectedOverrideCity(city);
                                            setCitySelectModalVisible(false);
                                        }}
                                        className={`p-4.5 rounded-2xl border ${selectedOverrideCity?.id === city.id ? 'border-indigo-500 bg-indigo-500/5' : borderClass
                                            }`}
                                    >
                                        <Text className={`text-sm font-bold ${textMainClass}`}>{city.name}</Text>
                                        <Text className="text-[10px] text-slate-400 mt-1">{city.state || 'India'} • {city.tier === 'tier_1' ? 'Tier 1' : city.tier === 'tier_2' ? 'Tier 2' : 'Tier 3'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal: Select Override Category */}
            <Modal visible={categorySelectModalVisible} transparent animationType="slide" onRequestClose={() => setCategorySelectModalVisible(false)}>
                <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className={`h-[60%] p-6 rounded-t-[36px] border-t ${cardBgClass}`} style={shadow2xl}>
                        <View className="w-12 h-1.5 rounded-full self-center mb-6 bg-slate-200 dark:bg-slate-800" />
                        <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <Text className={`text-lg font-black tracking-tight ${textMainClass}`}>Select Target Category</Text>
                            <TouchableOpacity onPress={() => setCategorySelectModalVisible(false)} className="w-8 h-8 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="gap-2.5">
                                {categoriesList.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => {
                                            setSelectedOverrideCategory(cat);
                                            setCategorySelectModalVisible(false);
                                        }}
                                        className={`p-4.5 rounded-2xl border ${selectedOverrideCategory?.id === cat.id ? 'border-indigo-500 bg-indigo-500/5' : borderClass
                                            }`}
                                    >
                                        <Text className={`text-sm font-bold ${textMainClass}`}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
