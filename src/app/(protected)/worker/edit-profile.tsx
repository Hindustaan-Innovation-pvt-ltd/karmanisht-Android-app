// @ts-nocheck
import { useAppStore } from '@/lib/store';
import { insforge, uploadToInsForge } from '@/lib/insforge';
import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, ScrollView, 
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image 
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
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedImage, setSelectedImage] = useState<{ uri: string; size?: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showMediaPicker, setShowMediaPicker] = useState(false);

    useEffect(() => {
        async function fetchDetails() {
            setFetching(true);
            setFullName(user?.name || '');
            setBio(user?.bio || '');
            try {
                if (user?.id) {
                    const { data, error } = await insforge.database
                        .from('provider_services')
                        .select('category_id')
                        .eq('provider_id', user.id);
                    
                    if (data && data.length > 0 && !error) {
                        setSelectedCategoryId(data[0].category_id);
                    } else if (categories.length > 0) {
                        setSelectedCategoryId(categories[0].id);
                    }
                } else if (categories.length > 0) {
                    setSelectedCategoryId(categories[0].id);
                }
            } catch (err) {
                console.error("Failed to load provider services:", err);
            } finally {
                setFetching(false);
            }
        }
        fetchDetails();
    }, [user?.id, categories]);

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
                setSelectedImage({
                    uri: asset.uri,
                    size: asset.fileSize,
                });
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

            const selectedCategory = categories.find(c => c.id === selectedCategoryId);
            const profileSuccess = await updateProfile({ 
                name: fullName,
                bio: bio,
                profile_image: uploadedImageUrl !== undefined ? uploadedImageUrl : user?.profile_image,
                profession: selectedCategory ? selectedCategory.name : undefined
            });

            let specialtySuccess = true;
            if (selectedCategoryId) {
                specialtySuccess = await updateWorkerSpecialties([selectedCategoryId], []);
            }

            if (profileSuccess && specialtySuccess) {
                Alert.alert(
                    'Success',
                    'Profile updated successfully!',
                    [{
                        text: 'OK',
                        onPress: async () => {
                            await refreshProfile();
                            router.back();
                        }
                    }]
                );
            } else {
                Alert.alert('Error', 'Failed to update some details.');
            }
        } catch (err) {
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaProvider>
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

                            {/* Profession */}
                            <View className="mb-8">
                                <Text className="text-sm font-bold text-slate-500 uppercase mb-3">Profession</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {categories.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => setSelectedCategoryId(cat.id)}
                                            className={`px-4 py-2 rounded-full border ${
                                                selectedCategoryId === cat.id 
                                                ? 'bg-black border-black' 
                                                : 'bg-white border-slate-200'
                                            }`}
                                        >
                                            <Text className={`text-sm font-medium ${
                                                selectedCategoryId === cat.id ? 'text-white' : 'text-slate-600'
                                            }`}>
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
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

                <MediaLibraryPicker
                    visible={showMediaPicker}
                    onClose={() => setShowMediaPicker(false)}
                    onSelect={(img) => setSelectedImage(img)}
                />
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
