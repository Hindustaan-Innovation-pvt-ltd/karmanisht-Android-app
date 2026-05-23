// @ts-nocheck
import { useAppStore } from '@/lib/store';
import { uploadToInsForge } from '@/lib/insforge';
import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image,
    Modal, useColorScheme
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MediaLibraryPicker from '@/components/media-library-picker';
import { useTranslation } from 'react-i18next';
 
export default function EditProfile() {
    const { t } = useTranslation();
    const user = useAppStore(state => state.user);
    const updateProfile = useAppStore(state => state.updateProfile);
    const refreshProfile = useAppStore(state => state.refreshProfile);
 
    const router = useRouter();
    const params = useLocalSearchParams();
    const fromSettings = params?.from === 'settings';
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
 
    const [fullName, setFullName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [selectedImage, setSelectedImage] = useState<{ uri: string; size?: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showSourceModal, setShowSourceModal] = useState(false);
 
    // Fetch saved details from user store
    useEffect(() => {
        setFullName(user?.name || '');
        setBio(user?.bio || '');
        setFetching(false);
    }, [user?.id, user?.name, user?.bio]);
 
    // Photo handlers
    const takePhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert(t('permissionRequired'), t('cameraPermissionMsg'));
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
            Alert.alert(t('errorCapturingPhoto'), err.message);
        }
    };
 
    const handleSelectPhoto = () => {
        setShowSourceModal(true);
    };
 
    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert(t('error'), t('fullNameRequired'));
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
 
            const profileSuccess = await updateProfile({
                name: fullName,
                bio: bio,
                profile_image: uploadedImageUrl !== undefined ? uploadedImageUrl : user?.profile_image,
            });
 
            if (profileSuccess) {
                setShowSuccessModal(true);
            } else {
                Alert.alert(t('error'), t('failedUpdateProfileDetails'));
            }
        } catch {
            Alert.alert(t('error'), t('unexpectedError'));
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
        <SafeAreaProvider style={{ flex: 1, backgroundColor: isDark ? '#090d16' : '#ffffff' }}>
            {/* ── Image Source Selection Modal (Bottom Sheet style) ── */}
            <Modal
                visible={showSourceModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSourceModal(false)}
            >
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setShowSourceModal(false)}
                >
                    <View style={{ 
                        backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                        borderTopLeftRadius: 28, 
                        borderTopRightRadius: 28, 
                        padding: 24, 
                        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: isDark ? '#1e293b' : 'transparent'
                    }}>
                        {/* Drag Handle */}
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#334155' : '#cbd5e1', alignSelf: 'center', marginBottom: 20 }} />
 
                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 4 }}>
                            {t('profilePhoto')}
                        </Text>
                        <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 24 }}>
                            {t('selectUpdatePhotoDesc')}
                        </Text>
 
                        {/* Camera Option */}
                        <TouchableOpacity
                            onPress={() => {
                                setShowSourceModal(false);
                                setTimeout(takePhoto, 100);
                            }}
                            activeOpacity={0.7}
                            style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                backgroundColor: isDark ? '#1e293b' : '#f8fafc', 
                                padding: 16, 
                                borderRadius: 16, 
                                marginBottom: 12, 
                                borderWidth: 1, 
                                borderColor: isDark ? '#334155' : '#f1f5f9' 
                            }}
                        >
                            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? '#172554' : '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                <Ionicons name="camera" size={22} color={isDark ? '#3b82f6' : '#2563eb'} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' }}>{t('takePhoto')}</Text>
                                <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 1 }}>{t('captureUsingCamera')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#94a3b8'} />
                        </TouchableOpacity>
 
                        {/* Gallery Option */}
                        <TouchableOpacity
                            onPress={() => {
                                setShowSourceModal(false);
                                setTimeout(() => setShowMediaPicker(true), 100);
                            }}
                            activeOpacity={0.7}
                            style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                backgroundColor: isDark ? '#1e293b' : '#f8fafc', 
                                padding: 16, 
                                borderRadius: 16, 
                                marginBottom: 24, 
                                borderWidth: 1, 
                                borderColor: isDark ? '#334155' : '#f1f5f9' 
                            }}
                        >
                            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? '#064e3b' : '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                <Ionicons name="image" size={22} color={isDark ? '#10b981' : '#16a34a'} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' }}>{t('chooseFromLibrary')}</Text>
                                <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 1 }}>{t('selectFromPhotos')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#94a3b8'} />
                        </TouchableOpacity>
 
                        {/* Cancel Button */}
                        <TouchableOpacity
                            onPress={() => setShowSourceModal(false)}
                            activeOpacity={0.8}
                            style={{ backgroundColor: isDark ? '#334155' : '#f1f5f9', paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#cbd5e1' : '#475569' }}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
 
            {/* ── Custom Success Modal ── */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => { }}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                    <View style={{ 
                        backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                        borderRadius: 24, 
                        padding: 32, 
                        width: '100%', 
                        alignItems: 'center', 
                        shadowColor: '#000', 
                        shadowOpacity: 0.15, 
                        shadowRadius: 20, 
                        elevation: 10,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: isDark ? '#1e293b' : 'transparent'
                    }}>
                        {/* Green circle with checkmark */}
                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? '#064e3b' : '#f0fdf4', borderWidth: 2, borderColor: isDark ? '#059669' : '#bbf7d0', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <Ionicons name="checkmark" size={38} color={isDark ? '#34d399' : '#16a34a'} />
                        </View>
 
                        <Text style={{ fontSize: 22, fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 8, textAlign: 'center' }}>{t('profileUpdated')}</Text>
                        <Text style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>{t('profileUpdatedMsg')}</Text>
 
                        <TouchableOpacity
                            onPress={handleSuccessOk}
                            activeOpacity={0.85}
                            style={{ backgroundColor: isDark ? '#2563eb' : '#000000', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 48, width: '100%', alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('ok')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
 
            <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
                <View className="flex-row items-center px-5 py-4 border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950">
                    <TouchableOpacity onPress={() => {
                        if (fromSettings) {
                            router.replace('/(protected)/worker/settings');
                        } else {
                            router.back();
                        }
                    }} className="p-2">
                        <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold ml-4 text-slate-900 dark:text-slate-100">{t('editProfile')}</Text>
                </View>
 
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    {fetching ? (
                        <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
                            <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
                            <Text className="mt-4 text-slate-500 dark:text-slate-400 font-medium">{t('loadingDetails')}</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ padding: 20 }} className="bg-white dark:bg-slate-950">
                            {/* Profile Photo Section */}
                            <View className="items-center mb-8">
                                <View className="relative">
                                    <Image
                                        source={{ uri: selectedImage?.uri || user?.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'Worker')}&background=0D8ABC&color=fff` }}
                                        className="w-32 h-32 rounded-[32px] border-4 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                                    />
                                    <TouchableOpacity
                                        onPress={handleSelectPhoto}
                                        activeOpacity={0.8}
                                        className="absolute bottom-0 right-0 w-10 h-10 bg-black dark:bg-blue-600 rounded-xl items-center justify-center border-4 border-white dark:border-slate-950"
                                    >
                                        <Feather name="camera" size={18} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
 
                            {/* Name */}
                            <View className="mb-6">
                                <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('fullName')}</Text>
                                <TextInput
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-base text-slate-900 dark:text-slate-100 font-semibold"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder={t('enterFullName')}
                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                />
                            </View>
 
                            {/* Bio */}
                            <View className="mb-6">
                                <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('bioDescription')}</Text>
                                <TextInput
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-base text-slate-900 dark:text-slate-100 font-semibold h-32"
                                    value={bio}
                                    onChangeText={setBio}
                                    placeholder={t('describeSkillsExperience')}
                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
 
                            {/* Save Button */}
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={loading}
                                className={`py-4 rounded-2xl items-center shadow-lg ${loading ? 'bg-slate-400' : 'bg-black dark:bg-blue-600'}`}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">{t('saveChanges')}</Text>
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
