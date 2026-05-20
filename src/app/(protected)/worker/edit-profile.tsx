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

    // --- Edit modal state ---
    const [showEditModal, setShowEditModal] = useState(false);
    const [editCategoryId, setEditCategoryId] = useState('');
    const [editTagIds, setEditTagIds] = useState<Set<string>>(new Set());
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
                            } catch (_) {}
                        }
                    } else if (categories.length > 0) {
                        setSavedCategoryId(categories[0].id);
                    }
                } else if (categories.length > 0) {
                    setSavedCategoryId(categories[0].id);
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

    // Open the edit modal — pre-fill with saved values
    const openEditModal = () => {
        setEditCategoryId(savedCategoryId);
        setEditTagIds(new Set(savedTagIds));
        fetchTagsForCategory(savedCategoryId);
        setShowEditModal(true);
    };

    // When category changes inside modal, clear tags & re-fetch
    const handleModalCategoryChange = (catId: string) => {
        setEditCategoryId(catId);
        setEditTagIds(new Set());
        fetchTagsForCategory(catId);
    };

    const toggleTag = (tagId: string) => {
        setEditTagIds(prev => {
            const next = new Set(prev);
            if (next.has(tagId)) {
                next.delete(tagId);
            } else {
                next.add(tagId);
            }
            return next;
        });
    };

    // Save changes from modal — also update savedTagObjects from availableTags so view shows names instantly
    const saveModalChanges = () => {
        const newTagIds = Array.from(editTagIds);
        setSavedCategoryId(editCategoryId);
        setSavedTagIds(newTagIds);
        // Pick matching tag objects from the already-loaded availableTags list
        setSavedTagObjects(availableTags.filter(t => editTagIds.has(t.id)));
        setShowEditModal(false);
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
                onRequestClose={() => {}}
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

                            {/* Profession – View Mode */}
                            <View className="mb-8">
                                <View className="flex-row items-center justify-between mb-3">
                                    <Text className="text-sm font-bold text-slate-500 uppercase">Professions & Services</Text>
                                    <TouchableOpacity
                                        onPress={openEditModal}
                                        className="flex-row items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full"
                                    >
                                        <Feather name="edit-2" size={12} color="#475569" />
                                        <Text className="text-xs font-semibold text-slate-600 ml-1">Edit</Text>
                                    </TouchableOpacity>
                                </View>

                                {savedCategoryId ? (
                                    <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                        {/* Selected Category */}
                                        <View className="mb-3">
                                            <Text className="text-xs font-semibold text-slate-400 uppercase mb-2">Category</Text>
                                            <View className="self-start px-4 py-2 rounded-full bg-black border border-black">
                                                <Text className="text-sm font-semibold text-white">{savedCategoryName || '—'}</Text>
                                            </View>
                                        </View>

                                        {/* Selected Tags — use savedTagObjects which are fetched on load & updated after modal save */}
                                        <View>
                                            <Text className="text-xs font-semibold text-slate-400 uppercase mb-2">Services / Tags</Text>
                                            {savedTagObjects.length > 0 ? (
                                                <View className="flex-row flex-wrap">
                                                    {savedTagObjects.map(tag => (
                                                        <View key={tag.id} className="px-3 py-1.5 rounded-full border border-slate-300 bg-white mr-2 mb-2">
                                                            <Text className="text-sm font-medium text-slate-700">{tag.name}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : savedTagIds.length > 0 ? (
                                                // Fallback: IDs present but objects not yet loaded
                                                <ActivityIndicator size="small" color="#94a3b8" />
                                            ) : (
                                                <Text className="text-sm text-slate-400 italic">No services selected — tap Edit to add</Text>
                                            )}
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity onPress={openEditModal} className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-5 items-center">
                                        <Feather name="plus-circle" size={20} color="#94a3b8" />
                                        <Text className="text-sm text-slate-400 mt-2 font-medium">Tap to select your profession & services</Text>
                                    </TouchableOpacity>
                                )}
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

                {/* ── Edit Profession Modal ── */}
                <Modal
                    visible={showEditModal}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setShowEditModal(false)}
                >
                    <SafeAreaView className="flex-1 bg-white">
                        {/* Modal Header */}
                        <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
                            <TouchableOpacity onPress={() => setShowEditModal(false)} className="p-2">
                                <Ionicons name="close" size={24} color="black" />
                            </TouchableOpacity>
                            <Text className="text-lg font-bold">Edit Profession</Text>
                            <TouchableOpacity
                                onPress={saveModalChanges}
                                className="bg-black px-4 py-2 rounded-full"
                            >
                                <Text className="text-white font-bold text-sm">Done</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {/* Category Selection */}
                            <View className="mb-6">
                                <Text className="text-sm font-bold text-slate-500 uppercase mb-3">Select Category</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => handleModalCategoryChange(cat.id)}
                                            className={`px-4 py-2 rounded-full border ${
                                                editCategoryId === cat.id
                                                    ? 'bg-black border-black'
                                                    : 'bg-white border-slate-200'
                                            }`}
                                        >
                                            <Text className={`text-sm font-medium ${
                                                editCategoryId === cat.id ? 'text-white' : 'text-slate-600'
                                            }`}>
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Tags Selection */}
                            {editCategoryId ? (
                                <View className="mb-6">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-sm font-bold text-slate-500 uppercase">Services / Tags</Text>
                                        {editTagIds.size > 0 && (
                                            <TouchableOpacity onPress={() => setEditTagIds(new Set())}>
                                                <Text className="text-xs text-red-400 font-medium">Clear all</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {tagsLoading ? (
                                        <ActivityIndicator color="#000" />
                                    ) : availableTags.length === 0 ? (
                                        <Text className="text-sm text-slate-400 italic">No services found for this category.</Text>
                                    ) : (
                                        <View className="flex-row flex-wrap">
                                            {availableTags.map(tag => (
                                                <TouchableOpacity
                                                    key={tag.id}
                                                    onPress={() => toggleTag(tag.id)}
                                                    className={`px-3 py-1.5 rounded-full border mr-2 mb-2 ${
                                                        editTagIds.has(tag.id)
                                                            ? 'bg-black border-black'
                                                            : 'bg-white border-slate-300'
                                                    }`}
                                                >
                                                    <Text className={`text-sm font-medium ${
                                                        editTagIds.has(tag.id) ? 'text-white' : 'text-slate-700'
                                                    }`}>
                                                        {tag.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    <Text className="text-xs text-slate-400 mt-3">
                                        {editTagIds.size} service{editTagIds.size !== 1 ? 's' : ''} selected
                                    </Text>
                                </View>
                            ) : null}
                        </ScrollView>
                    </SafeAreaView>
                </Modal>

                <MediaLibraryPicker
                    visible={showMediaPicker}
                    onClose={() => setShowMediaPicker(false)}
                    onSelect={(img) => setSelectedImage(img)}
                />
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
