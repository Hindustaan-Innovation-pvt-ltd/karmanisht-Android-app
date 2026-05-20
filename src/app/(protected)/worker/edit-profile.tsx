// @ts-nocheck
import { useAppStore } from '@/lib/store';
import { insforge, uploadToInsForge } from '@/lib/insforge';
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image,
    Modal
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MediaLibraryPicker from '@/components/media-library-picker';

export default function EditProfile() {
    const user = useAppStore(state => state.user);
    const categories = useAppStore(state => state.categories);
    const fetchCategories = useAppStore(state => state.fetchCategories);
    const updateProfile = useAppStore(state => state.updateProfile);
    const updateWorkerSpecialties = useAppStore(state => state.updateWorkerSpecialties);
    const refreshProfile = useAppStore(state => state.refreshProfile);

    const router = useRouter();

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const [fullName, setFullName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [selectedImage, setSelectedImage] = useState<{ uri: string; size?: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // --- Profession state (saved) ---
    const [savedCategoryId, setSavedCategoryId] = useState('');
    const [savedTagIds, setSavedTagIds] = useState<string[]>([]);
    // Full tag objects for view-mode display (so names show without opening modal)
    const [savedTagObjects, setSavedTagObjects] = useState<any[]>([]);

    // --- Inline dropdown state ---
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [tagsLoading, setTagsLoading] = useState(false);

    // Fetch saved profession (category + tags) from DB
    useEffect(() => {
        async function fetchDetails() {
            setFetching(true);
            setFullName(user?.name || '');
            setBio(user?.bio || '');
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

                        // Fetch full tag objects so view-mode names are shown immediately
                        if (tagIds.length > 0) {
                            try {
                                const { data: tagData } = await insforge.database
                                    .from('service_tags')
                                    .select('*')
                                    .in('id', tagIds);
                                if (tagData) setSavedTagObjects(tagData);
                            } catch (_) { }
                        }

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
    }, [user?.id, categories]);

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

    // Inline category select — clear tags & re-fetch
    const handleCategoryChange = (catId: string) => {
        setSavedCategoryId(catId);
        setSavedTagIds([]);
        setSavedTagObjects([]);
        setShowCategoryDropdown(false);
        fetchTagsForCategory(catId);
    };

    const toggleTag = (tagId: string) => {
        const tagObj = availableTags.find(t => t.id === tagId);
        setSavedTagIds(prev => {
            if (prev.includes(tagId)) return prev.filter(id => id !== tagId);
            return [...prev, tagId];
        });
        setSavedTagObjects(prev => {
            if (prev.find(t => t.id === tagId)) return prev.filter(t => t.id !== tagId);
            return tagObj ? [...prev, tagObj] : prev;
        });
    };

    // Photo handlers
    const takePhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Camera permission is required to take a photo.");
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedImage({ uri: asset.uri, size: asset.fileSize });
            }
        } catch (err: any) {
            Alert.alert("Error capturing photo", err.message);
        }
    };

    const handleSelectPhoto = () => {
        Alert.alert(
            "Profile Photo",
            "Select an option to add your photo",
            [
                { text: "Take Photo", onPress: takePhoto },
                { text: "Choose from Library", onPress: () => setShowMediaPicker(true) },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Full name is required.');
            return;
        }

        setLoading(true);
        try {
            let uploadedImageUrl = undefined;

            if (selectedImage && user?.id) {
                try {
                    const filename = `avatar_${user.id}_${Date.now()}.jpg`;
                    const uploadRes = await uploadToInsForge('avatars', filename, selectedImage);
                    if (uploadRes?.url) {
                        uploadedImageUrl = uploadRes.url;
                    }
                } catch (uploadErr) {
                    console.error('[handleSave] Failed converting/uploading photo:', uploadErr);
                }
            }

            const selectedCategory = categories.find(c => c.id === savedCategoryId);
            const profileSuccess = await updateProfile({
                name: fullName,
                bio: bio,
                profile_image: uploadedImageUrl !== undefined ? uploadedImageUrl : user?.profile_image,
                profession: selectedCategory ? selectedCategory.name : undefined
            });

            let specialtySuccess = true;
            if (savedCategoryId) {
                specialtySuccess = await updateWorkerSpecialties([savedCategoryId], savedTagIds);
            }

            if (profileSuccess && specialtySuccess) {
                setShowSuccessModal(true);
            } else {
                Alert.alert('Error', 'Failed to update some details.');
            }
        } catch (err) {
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    // Derive display names
    const savedCategoryName = categories.find(c => c.id === savedCategoryId)?.name;

    const handleSuccessOk = async () => {
        setShowSuccessModal(false);
        await refreshProfile();
        router.back();
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

                        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' }}>Profile Updated!</Text>
                        <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>Your profile has been saved successfully.</Text>

                        <TouchableOpacity
                            onPress={handleSuccessOk}
                            activeOpacity={0.85}
                            style={{ backgroundColor: '#000', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 48, width: '100%', alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-row items-center px-5 py-4 border-b border-slate-100">
                    <TouchableOpacity onPress={() => router.back()} className="p-2">
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold ml-4">Edit Profile</Text>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    {fetching ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="black" />
                            <Text className="mt-4 text-slate-500 font-medium">Loading details...</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {/* Profile Photo Section */}
                            <View className="items-center mb-8">
                                <View className="relative">
                                    <Image
                                        source={{ uri: selectedImage?.uri || user?.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'Worker')}&background=0D8ABC&color=fff` }}
                                        className="w-32 h-32 rounded-[32px] border-4 border-slate-100 bg-slate-50"
                                    />
                                    <TouchableOpacity
                                        onPress={handleSelectPhoto}
                                        activeOpacity={0.8}
                                        className="absolute bottom-0 right-0 w-10 h-10 bg-black rounded-xl items-center justify-center border-4 border-white"
                                    >
                                        <Feather name="camera" size={18} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Name */}
                            <View className="mb-6">
                                <Text className="text-sm font-bold text-slate-500 uppercase mb-2">Full Name</Text>
                                <TextInput
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Enter your full name"
                                />
                            </View>

                            {/* Bio */}
                            <View className="mb-6">
                                <Text className="text-sm font-bold text-slate-500 uppercase mb-2">Bio / Description</Text>
                                <TextInput
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base h-32"
                                    value={bio}
                                    onChangeText={setBio}
                                    placeholder="Describe your skills and experience"
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* ── Profession & Services — Inline Dropdown + Tags ── */}
                            <View className="mb-8">
                                <Text className="text-sm font-bold text-slate-500 uppercase mb-3">Profession & Services</Text>

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
                                                ? (categories.find(c => c.id === savedCategoryId)?.name || 'Select profession')
                                                : 'Select your profession'
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
                                                        {cat.name}
                                                    </Text>
                                                    {savedCategoryId === cat.id && (
                                                        <Ionicons name="checkmark-circle" size={18} color="#000" />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Tags — shown once a category is selected */}
                                {savedCategoryId ? (
                                    <View className="mt-4">
                                        <View className="flex-row items-center justify-between mb-3">
                                            <Text className="text-xs font-bold text-slate-500 uppercase">Services / Specialities</Text>
                                            {savedTagIds.length > 0 && (
                                                <TouchableOpacity onPress={() => { setSavedTagIds([]); setSavedTagObjects([]); }}>
                                                    <Text className="text-xs text-red-400 font-semibold">Clear all</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {tagsLoading ? (
                                            <ActivityIndicator color="#000" size="small" />
                                        ) : availableTags.length === 0 ? (
                                            <Text className="text-sm text-slate-400 italic">No sub-services for this category yet.</Text>
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
                                                                {tag.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        )}

                                        {!tagsLoading && (
                                            <Text className="text-xs text-slate-400 mt-2">
                                                {savedTagIds.length} service{savedTagIds.length !== 1 ? 's' : ''} selected
                                            </Text>
                                        )}
                                    </View>
                                ) : null}
                            </View>

                            {/* Save Button */}
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={loading}
                                className={`py-4 rounded-2xl items-center shadow-lg ${loading ? 'bg-slate-400' : 'bg-black'}`}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </KeyboardAvoidingView>

                {/* Modal removed — profession & tags are now inline on the page */}

                <MediaLibraryPicker
                    visible={showMediaPicker}
                    onClose={() => setShowMediaPicker(false)}
                    onSelect={(img) => setSelectedImage(img)}
                />
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
