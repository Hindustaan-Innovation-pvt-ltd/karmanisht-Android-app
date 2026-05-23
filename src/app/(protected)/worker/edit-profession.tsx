import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    Modal
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function EditProfession() {
    const { t } = useTranslation();
    const user = useAppStore(state => state.user);
    const categories = useAppStore(state => state.categories);
    const fetchCategories = useAppStore(state => state.fetchCategories);
    const updateProfile = useAppStore(state => state.updateProfile);
    const updateWorkerSpecialties = useAppStore(state => state.updateWorkerSpecialties);
    const refreshProfile = useAppStore(state => state.refreshProfile);

    const router = useRouter();
    const params = useLocalSearchParams();
    const fromSettings = params?.from === 'settings';

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // --- Profession state (saved) ---
    const [savedCategoryId, setSavedCategoryId] = useState('');
    const [savedTagIds, setSavedTagIds] = useState<string[]>([]);

    // --- Inline dropdown state ---
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [tagsLoading, setTagsLoading] = useState(false);

    // Fetch tags when editCategoryId changes inside modal
    const fetchTagsForCategory = useCallback(async (categoryId: string) => {
        if (!categoryId) return;
        setTagsLoading(true);
        try {
            const { data, error } = await insforge.database
                .from('service_tags')
                .select('*')
                .eq('category_id', categoryId);
            if (data && !error) {
                const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
                setAvailableTags(sorted);
            } else {
                setAvailableTags([]);
            }
        } catch (err) {
            console.error('Failed to fetch tags:', err);
            setAvailableTags([]);
        } finally {
            setTagsLoading(false);
        }
    }, []);

    // Fetch saved profession (category + tags) from DB
    useEffect(() => {
        async function fetchDetails() {
            setFetching(true);
            try {
                if (user?.id) {
                    const { data, error } = await insforge.database
                        .from('provider_services')
                        .select('category_id, tag_id')
                        .eq('provider_id', user.id);

                    if (data && data.length > 0 && !error) {
                        const catId = data[0].category_id;
                        const tagIds = data.map(r => r.tag_id).filter(Boolean);
                        setSavedCategoryId(catId);
                        setSavedTagIds(tagIds);



                        // Pre-load ALL available tags for the category so badges render without dropdown open
                        fetchTagsForCategory(catId);
                    } else if (categories.length > 0) {
                        setSavedCategoryId(categories[0].id);
                        fetchTagsForCategory(categories[0].id);
                    }
                } else if (categories.length > 0) {
                    setSavedCategoryId(categories[0].id);
                    fetchTagsForCategory(categories[0].id);
                }
            } catch (err) {
                console.error("Failed to load provider services:", err);
            } finally {
                setFetching(false);
            }
        }
        fetchDetails();
    }, [user?.id, categories, fetchTagsForCategory]);

    // Inline category select — clear tags & re-fetch
    const handleCategoryChange = (catId: string) => {
        setSavedCategoryId(catId);
        setSavedTagIds([]);
        setShowCategoryDropdown(false);
        fetchTagsForCategory(catId);
    };

    const toggleTag = (tagId: string) => {
        setSavedTagIds(prev => {
            if (prev.includes(tagId)) return prev.filter(id => id !== tagId);
            return [...prev, tagId];
        });
    };

    const handleSave = async () => {
        if (!savedCategoryId) {
            Alert.alert(t('error', 'Error'), t('pleaseSelectProfession', 'Please select a profession.'));
            return;
        }

        setLoading(true);
        try {
            const selectedCategory = categories.find(c => c.id === savedCategoryId);
            const profileSuccess = await updateProfile({
                profession: selectedCategory ? selectedCategory.name : undefined
            });

            let specialtySuccess = true;
            if (savedCategoryId) {
                specialtySuccess = await updateWorkerSpecialties([savedCategoryId], savedTagIds);
            }

            if (profileSuccess && specialtySuccess) {
                setShowSuccessModal(true);
            } else {
                Alert.alert(t('error', 'Error'), t('failedUpdateProfession', 'Failed to update profession details.'));
            }
        } catch {
            Alert.alert(t('error', 'Error'), t('unexpectedError', 'An unexpected error occurred.'));
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessOk = async () => {
        setShowSuccessModal(false);
        await refreshProfile();
        if (fromSettings) {
            router.replace('/(protected)/worker/settings');
        } else {
            router.back();
        }
    };

    return (
        <SafeAreaProvider>
            {/* ── Custom Success Modal ── */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => { }}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 32, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }}>
                        {/* Green circle with checkmark */}
                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <Ionicons name="checkmark" size={38} color="#16a34a" />
                        </View>

                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' }}>{t('professionServicesUpdated', 'Profession & Services Updated!')}</Text>
                        <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>{t('professionServicesUpdatedSuccess', 'Your profession and services have been updated successfully.')}</Text>

                        <TouchableOpacity
                            onPress={handleSuccessOk}
                            activeOpacity={0.85}
                            style={{ backgroundColor: '#000', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 48, width: '100%', alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('ok', 'OK')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-row items-center px-5 py-4 border-b border-slate-100">
                    <TouchableOpacity onPress={() => {
                        if (fromSettings) {
                            router.replace('/(protected)/worker/settings');
                        } else {
                            router.back();
                        }
                    }} className="p-2">
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold ml-4">{t('editProfessionAndServices', 'Edit Profession & Services')}</Text>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    {fetching ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="black" />
                            <Text className="mt-4 text-slate-500 font-medium">{t('loadingProfessionDetails', 'Loading profession details...')}</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {/* Profession Selection */}
                            <View className="mb-6">
                                <Text className="text-sm font-bold text-slate-500 uppercase mb-3">{t('selectProfession', 'Select Profession')}</Text>

                                {/* Category Dropdown Trigger */}
                                <TouchableOpacity
                                    onPress={() => setShowCategoryDropdown(v => !v)}
                                    className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 mb-1"
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center gap-2 flex-1">
                                        <Feather name="briefcase" size={16} color="#475569" />
                                        <Text className={`text-base font-semibold flex-1 ${savedCategoryId ? 'text-slate-900' : 'text-slate-400'
                                            }`}>
                                            {savedCategoryId
                                                ? t(categories.find(c => c.id === savedCategoryId)?.name || 'Select profession')
                                                : t('selectYourProfession', 'Select your profession')
                                            }
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
                                        size={18}
                                        color="#94a3b8"
                                    />
                                </TouchableOpacity>

                                {/* Dropdown List */}
                                {showCategoryDropdown && (
                                    <View
                                        className="border border-slate-200 rounded-2xl bg-white mb-4 overflow-hidden"
                                        style={{ maxHeight: 280 }}
                                    >
                                        <ScrollView
                                            nestedScrollEnabled
                                            showsVerticalScrollIndicator={false}
                                            keyboardShouldPersistTaps="handled"
                                        >
                                            {categories.map((cat, idx) => (
                                                <TouchableOpacity
                                                    key={cat.id}
                                                    onPress={() => handleCategoryChange(cat.id)}
                                                    className={`flex-row items-center px-4 py-3.5 ${idx !== categories.length - 1 ? 'border-b border-slate-100' : ''
                                                        } ${savedCategoryId === cat.id ? 'bg-slate-50' : 'bg-white'}`}
                                                    activeOpacity={0.6}
                                                >
                                                    <Text className={`flex-1 text-sm font-medium ${savedCategoryId === cat.id ? 'text-black font-bold' : 'text-slate-700'
                                                        }`}>
                                                        {t(cat.name)}
                                                    </Text>
                                                    {savedCategoryId === cat.id && (
                                                        <Ionicons name="checkmark-circle" size={18} color="#000" />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Tags — shown once a category is selected */}
                            {savedCategoryId ? (
                                <View className="mb-8">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-sm font-bold text-slate-500 uppercase">{t('servicesSpecialities', 'Services / Specialities')}</Text>
                                        {savedTagIds.length > 0 && (
                                            <TouchableOpacity onPress={() => { setSavedTagIds([]); }}>
                                                <Text className="text-xs text-red-400 font-semibold">{t('clearAll', 'Clear all')}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {tagsLoading ? (
                                        <ActivityIndicator color="#000" size="small" />
                                    ) : availableTags.length === 0 ? (
                                        <Text className="text-sm text-slate-400 italic">{t('noSubServices', 'No sub-services for this category yet.')}</Text>
                                    ) : (
                                        <View className="flex-row flex-wrap">
                                            {availableTags.map(tag => {
                                                const selected = savedTagIds.includes(tag.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={tag.id}
                                                        onPress={() => toggleTag(tag.id)}
                                                        activeOpacity={0.75}
                                                        className={`flex-row items-center px-3 py-1.5 rounded-full border mr-2 mb-2 ${selected
                                                                ? 'bg-black border-black'
                                                                : 'bg-white border-slate-300'
                                                            }`}
                                                    >
                                                        {selected && (
                                                            <Ionicons name="checkmark" size={12} color="#fff" style={{ marginRight: 4 }} />
                                                        )}
                                                        <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-slate-700'
                                                            }`}>
                                                            {t(tag.name)}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {!tagsLoading && (
                                        <Text className="text-xs text-slate-400 mt-2">
                                            {t('servicesSelectedCount', '{{count}} services selected', { count: savedTagIds.length })}
                                        </Text>
                                    )}
                                </View>
                            ) : null}

                            {/* Save Button */}
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={loading}
                                className={`py-4 rounded-2xl items-center shadow-lg ${loading ? 'bg-slate-400' : 'bg-black'}`}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">{t('saveChanges', 'Save Changes')}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
