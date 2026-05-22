// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert,
    ActivityIndicator, KeyboardAvoidingView, Platform, Modal, StatusBar
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import * as ImagePicker from 'expo-image-picker';
import { uploadToInsForge } from '@/lib/insforge';
import MediaLibraryPicker from '@/components/media-library-picker';

export default function ProfileInfoScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { user, updateDatabaseProfile, refreshProfile } = useAppStore();

    const [name, setName] = useState(user.name || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [email, setEmail] = useState(user.email || '');
    const [location, setLocation] = useState(user.location || '');
    const [selectedImage, setSelectedImage] = useState<{ uri: string; size?: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    // Track focused input fields for highlighting
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Sync input fields when context user changes
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setPhone(user.phone || '');
            setEmail(user.email || '');
            setLocation(user.location || '');
        }
    }, [user]);

    // Photo selection helpers
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
        if (!name.trim()) {
            Alert.alert('Required Field', 'Please enter your name.');
            return;
        }
        const isGoogleUser = user.isGoogleUser === true || (user.email && !user.email.endsWith('@mock-mobile.local'));
        if (!isGoogleUser && !phone.trim()) {
            Alert.alert('Required Field', 'Please enter your phone number.');
            return;
        }

        setSaving(true);
        try {
            let uploadedImageUrl = undefined;

            if (selectedImage && user.id) {
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

            await updateDatabaseProfile({
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                location: location.trim(),
                profile_image: uploadedImageUrl !== undefined ? uploadedImageUrl : user.profile_image,
            });
            await refreshProfile();
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Save Profile Error:", error);
            Alert.alert('Error', 'Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleSuccessOk = () => {
        setShowSuccessModal(false);
        router.back();
    };

    return (
        <SafeAreaProvider>
            {/* Custom Premium Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => { }}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                    <View style={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 28, padding: 32, width: '100%', alignItems: 'center', borderOpacity: 0.1, borderWidth: isDark ? 1 : 0, borderColor: '#334155', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }}>
                        {/* Elegant success icon */}
                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? '#064e3b' : '#f0fdf4', borderWidth: 2, borderColor: isDark ? '#065f46' : '#bbf7d0', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <Ionicons name="checkmark" size={38} color={isDark ? '#34d399' : '#16a34a'} />
                        </View>

                        <Text style={{ fontSize: 22, fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 8, textAlign: 'center' }}>Profile Updated!</Text>
                        <Text style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>Your personal details have been updated successfully.</Text>

                        <TouchableOpacity
                            onPress={handleSuccessOk}
                            activeOpacity={0.85}
                            style={{ backgroundColor: isDark ? '#3b82f6' : '#000', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 48, width: '100%', alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                
                {/* Header */}
                <View className="pb-4 px-5 flex-row items-center border-b border-slate-50 dark:border-slate-900/60 justify-between">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-11 h-11 bg-slate-50 dark:bg-slate-900 rounded-xl items-center justify-center border border-slate-100/50 dark:border-slate-800/30 active:scale-95"
                    >
                        <Ionicons name="chevron-back" size={22} color={isDark ? '#94A3B8' : '#334155'} />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Edit Profile</Text>
                    <View className="w-11" /> {/* Spacer to align title centered */}
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView 
                        className="flex-1 px-5" 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
                    >
                        {/* Profile Image Section with Gradient Circular Mask */}
                        <View className="items-center mb-8">
                            <View className="relative">
                                <View className="p-1 rounded-[36px] bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 shadow-sm">
                                    <Image
                                        source={{ uri: selectedImage?.uri || user.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0D8ABC&color=fff` }}
                                        className="w-28 h-28 rounded-[32px] bg-slate-200"
                                    />
                                </View>
                                <TouchableOpacity 
                                    onPress={handleSelectPhoto}
                                    activeOpacity={0.85}
                                    className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 dark:bg-blue-500 rounded-xl items-center justify-center border-2 border-white dark:border-slate-950 shadow-md active:scale-90"
                                >
                                    <Feather name="camera" size={15} color="white" />
                                </TouchableOpacity>
                            </View>
                            <Text className="text-xs text-slate-400 dark:text-slate-550 mt-3 font-semibold">Tap camera to change photo</Text>
                        </View>

                        {/* Form Fields */}
                        <View className="space-y-5">
                            {/* Full Name */}
                            <View className="mb-4">
                                <Text className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</Text>
                                <View className={`bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 py-3.5 border flex-row items-center transition-all ${
                                    focusedField === 'name' 
                                        ? 'border-blue-500 bg-white dark:bg-slate-900/60' 
                                        : 'border-slate-100 dark:border-slate-800'
                                }`}>
                                    <Feather 
                                        name="user" 
                                        size={18} 
                                        color={focusedField === 'name' ? '#3B82F6' : '#94A3B8'} 
                                        style={{ marginRight: 12 }} 
                                    />
                                    <TextInput
                                        className="flex-1 text-base font-semibold text-slate-850 dark:text-slate-100"
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Enter your name"
                                        placeholderTextColor="#94A3B8"
                                        onFocus={() => setFocusedField('name')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>
                            </View>

                            {/* Phone Number */}
                            <View className="mb-4">
                                <Text className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Phone Number</Text>
                                <View className={`bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 py-3.5 border flex-row items-center ${
                                    focusedField === 'phone' 
                                        ? 'border-blue-500 bg-white dark:bg-slate-900/60' 
                                        : 'border-slate-100 dark:border-slate-800'
                                }`}>
                                    <Feather 
                                        name="phone" 
                                        size={18} 
                                        color={focusedField === 'phone' ? '#3B82F6' : '#94A3B8'} 
                                        style={{ marginRight: 12 }} 
                                    />
                                    <TextInput
                                        className="flex-1 text-base font-semibold text-slate-850 dark:text-slate-100"
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="Enter phone number"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="phone-pad"
                                        onFocus={() => setFocusedField('phone')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>
                            </View>

                            {/* Email Address */}
                            <View className="mb-4">
                                <Text className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</Text>
                                <View className={`bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 py-3.5 border flex-row items-center ${
                                    focusedField === 'email' 
                                        ? 'border-blue-500 bg-white dark:bg-slate-900/60' 
                                        : 'border-slate-100 dark:border-slate-800'
                                }`}>
                                    <Feather 
                                        name="mail" 
                                        size={18} 
                                        color={focusedField === 'email' ? '#3B82F6' : '#94A3B8'} 
                                        style={{ marginRight: 12 }} 
                                    />
                                    <TextInput
                                        className="flex-1 text-base font-semibold text-slate-850 dark:text-slate-100"
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="Enter email"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>
                            </View>

                            {/* Location */}
                            <View className="mb-4">
                                <Text className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Location</Text>
                                <View className={`bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 py-3.5 border flex-row items-center ${
                                    focusedField === 'location' 
                                        ? 'border-blue-500 bg-white dark:bg-slate-900/60' 
                                        : 'border-slate-100 dark:border-slate-800'
                                }`}>
                                    <Feather 
                                        name="map-pin" 
                                        size={18} 
                                        color={focusedField === 'location' ? '#3B82F6' : '#94A3B8'} 
                                        style={{ marginRight: 12 }} 
                                    />
                                    <TextInput
                                        className="flex-1 text-base font-semibold text-slate-850 dark:text-slate-100"
                                        value={location}
                                        onChangeText={setLocation}
                                        placeholder="Enter location / city"
                                        placeholderTextColor="#94A3B8"
                                        onFocus={() => setFocusedField('location')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.8}
                            className={`mt-10 bg-black dark:bg-blue-600 h-14 rounded-2xl items-center justify-center shadow-lg active:scale-[0.98] ${
                                saving ? 'opacity-80' : ''
                            }`}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white text-base font-bold">Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
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
