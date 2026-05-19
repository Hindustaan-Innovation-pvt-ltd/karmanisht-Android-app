import { useAppStore } from '@/lib/store';
// @ts-nocheck
import React, { useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View, Alert, ActivityIndicator, Image, Platform } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import BackButton from '@/components/back-button'
import { ShieldIcon, CameraIcon, UploadIcon, CheckCircleIcon, MapPinIcon, StarIcon } from '@/svg/icons'
import * as ImagePicker from 'expo-image-picker'
import MediaLibraryPicker from '@/components/media-library-picker'
import { insforge, uploadToInsForge } from '@/lib/insforge'

type DocStatus = 'pending' | 'uploaded' | 'verified'

export default function VerifyIdentity() {
    const user = useAppStore(state => state.user);
    const setUser = useAppStore(state => state.setUser);
    const refreshProfile = useAppStore(state => state.refreshProfile);

    const router = useRouter()
    const params = useLocalSearchParams()
    const fromDashboard = params?.from === 'dashboard'
    const [aadhaarStatus, setAadhaarStatus] = useState<DocStatus>('pending')
    const [photoStatus, setPhotoStatus] = useState<DocStatus>('pending')

    const [selectedAadhaar, setSelectedAadhaar] = useState<{ uri: string; size?: number } | null>(null)
    const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; size?: number } | null>(null)
    const [showMediaPicker, setShowMediaPicker] = useState(false)
    const [activeUploadType, setActiveUploadType] = useState<'aadhaar' | 'photo' | null>(null)
    const [uploading, setUploading] = useState(false)

    const statusColor = (s: DocStatus) =>
        s === 'verified' ? 'text-green-600' : s === 'uploaded' ? 'text-amber-500' : 'text-slate-400'

    const statusLabel = (s: DocStatus) =>
        s === 'verified' ? 'Verified' : s === 'uploaded' ? 'Under review' : 'Not uploaded'

    const takePhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Camera permission is required to take a photo.");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: activeUploadType === 'photo' ? [1, 1] : [1.6, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const imagePayload = {
                    uri: asset.uri,
                    size: asset.fileSize,
                };
                if (activeUploadType === 'aadhaar') {
                    setSelectedAadhaar(imagePayload);
                    setAadhaarStatus('uploaded');
                } else if (activeUploadType === 'photo') {
                    setSelectedPhoto(imagePayload);
                    setPhotoStatus('uploaded');
                }
            }
        } catch (err: any) {
            Alert.alert("Error capturing photo", err.message);
        }
    };

    const chooseFromLibrary = async () => {
        if (Platform.OS === 'web') {
            try {
                const result = await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: true,
                    aspect: activeUploadType === 'photo' ? [1, 1] : [1.6, 1],
                    quality: 0.8,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const asset = result.assets[0];
                    const imagePayload = {
                        uri: asset.uri,
                        size: asset.fileSize,
                    };
                    if (activeUploadType === 'aadhaar') {
                        setSelectedAadhaar(imagePayload);
                        setAadhaarStatus('uploaded');
                    } else if (activeUploadType === 'photo') {
                        setSelectedPhoto(imagePayload);
                        setPhotoStatus('uploaded');
                    }
                }
            } catch (err: any) {
                Alert.alert("Error picking photo", err.message);
            }
        } else {
            setShowMediaPicker(true);
        }
    };

    const handleSelectPhoto = (type: 'aadhaar' | 'photo') => {
        setActiveUploadType(type);
        Alert.alert(
            type === 'aadhaar' ? "Aadhaar Card" : "Profile Photo",
            "Select an option to add your image",
            [
                { text: "Take Photo", onPress: takePhoto },
                { text: "Choose from Library", onPress: chooseFromLibrary },
                { text: "Cancel", style: "cancel", onPress: () => setActiveUploadType(null) }
            ]
        );
    };

    const handleSubmit = async () => {
        if (!selectedAadhaar) {
            Alert.alert('Error', 'Please upload your Aadhaar Card.');
            return;
        }
        if (!selectedPhoto) {
            Alert.alert('Error', 'Please upload your Profile Photo.');
            return;
        }

        setUploading(true);
        try {
            let uploadedAadhaarUrl = '';
            let uploadedPhotoUrl = '';

            if (user?.id) {
                // Upload Aadhaar Card to 'aadhaar' bucket
                const aadhaarFilename = `aadhaar_${user.id}_${Date.now()}.jpg`;
                const aadhaarUpload = await uploadToInsForge('aadhaar', aadhaarFilename, selectedAadhaar);
                if (aadhaarUpload?.url) {
                    uploadedAadhaarUrl = aadhaarUpload.url;
                }

                // Upload Profile Photo to 'avatars' bucket
                const photoFilename = `avatar_${user.id}_${Date.now()}.jpg`;
                const photoUpload = await uploadToInsForge('avatars', photoFilename, selectedPhoto);
                if (photoUpload?.url) {
                    uploadedPhotoUrl = photoUpload.url;
                }
            }

            if (!uploadedAadhaarUrl || !uploadedPhotoUrl) {
                throw new Error('Image upload failed.');
            }

            // Update database profile
            const { error: providerError } = await insforge.database
                .from('service_providers')
                .update({
                    aadhaar_url: uploadedAadhaarUrl,
                    profile_image: uploadedPhotoUrl,
                    is_kyc_verified: false,
                    is_verified: false
                })
                .eq('id', user.id);

            if (providerError) {
                console.error('[VerifyIdentity] DB update provider error:', providerError);
                throw new Error(providerError.message || 'Failed updating provider profile.');
            }

            const { error: userError } = await insforge.database
                .from('users')
                .update({
                    profile_image: uploadedPhotoUrl
                })
                .eq('id', user.id);

            if (userError) {
                console.error('[VerifyIdentity] DB update user error:', userError);
                throw new Error(userError.message || 'Failed updating user profile.');
            }

            // Sync Zustand store
            setUser({
                profile_image: uploadedPhotoUrl,
                hasSpecialties: true
            });

            await refreshProfile();

            Alert.alert(
                "Submitted",
                "Your documents have been submitted successfully. We will review them within 24 hours.",
                [{
                    text: "OK",
                    onPress: () => {
                        if (fromDashboard) {
                            router.replace('/(protected)/worker');
                        } else {
                            router.replace('/(onboarding)/all-set');
                        }
                    }
                }]
            );
        } catch (err: any) {
            console.error('[VerifyIdentity] Submission error:', err);
            Alert.alert('Submission Failed', err.message || 'An unexpected error occurred.');
        } finally {
            setUploading(false);
        }
    };

    const initials = (user.name ?? '')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '??'

    return (
        <SafeAreaProvider>
            <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
                <BackButton />

                <ScrollView className='flex-1' contentContainerStyle={{ padding: 20 }}>
                    <View className='mb-6'>
                        <Text className='text-2xl font-bold text-slate-900 dark:text-slate-100'>Verify your identity</Text>
                        <Text className='text-sm text-slate-500 mt-1'>
                            Required to list your profile. Documents are reviewed within 24 hours.
                        </Text>
                    </View>

                    {/* Profile preview card */}
                    <View className='bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800'>
                        <View className='flex-row items-center gap-3'>
                            <View className='size-14 rounded-full bg-slate-200 dark:bg-slate-800 items-center justify-center overflow-hidden'>
                                {selectedPhoto ? (
                                    <Image source={{ uri: selectedPhoto.uri }} className='w-full h-full' />
                                ) : user.profile_image ? (
                                    <Image source={{ uri: user.profile_image }} className='w-full h-full' />
                                ) : (
                                    <Text className='text-xl font-bold text-slate-600 dark:text-slate-400'>{initials || '??'}</Text>
                                )}
                            </View>
                            <View className='flex-1'>
                                <Text className='text-base font-bold text-slate-900 dark:text-slate-100'>{user.name || 'Anonymous'}</Text>
                                <Text className='text-sm text-slate-500'>{user.profession || 'Provider'}</Text>
                                <View className='flex-row items-center gap-1 mt-1'>
                                    <MapPinIcon size={11} color="#9CA3AF" />
                                    <Text className='text-xs text-slate-400'>{user.location || 'Location not set'}</Text>
                                </View>
                            </View>
                            <View className='items-end'>
                                <View className='bg-amber-100 dark:bg-amber-900/35 px-2 py-0.5 rounded-full'>
                                    <Text className='text-amber-700 dark:text-amber-400 text-xs font-semibold'>Pending</Text>
                                </View>
                                <View className='flex-row items-center gap-0.5 mt-1'>
                                    <StarIcon size={11} color="#F59E0B" filled />
                                    <Text className='text-xs text-slate-600 dark:text-slate-400 font-semibold'>New</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Aadhaar upload */}
                    <View className='mb-4'>
                        <Text className='text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Aadhaar Card</Text>
                        <TouchableOpacity
                            onPress={() => handleSelectPhoto('aadhaar')}
                            activeOpacity={0.8}
                            className={`border-2 border-dashed rounded-2xl p-5 items-center gap-2 ${aadhaarStatus === 'pending' ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900' : 'border-green-200 dark:border-green-950/40 bg-green-50 dark:bg-green-950/20'}`}
                        >
                            {aadhaarStatus === 'pending' ? (
                                <>
                                    <UploadIcon size={28} color="#94A3B8" />
                                    <Text className='text-sm font-medium text-slate-500'>Tap to upload Aadhaar</Text>
                                    <Text className='text-xs text-slate-400'>JPG, PNG or PDF • max 5 MB</Text>
                                </>
                            ) : (
                                <>
                                    {selectedAadhaar ? (
                                        <Image source={{ uri: selectedAadhaar.uri }} className='w-full h-40 rounded-xl mb-1' resizeMode='cover' />
                                    ) : (
                                        <CheckCircleIcon size={28} color="#16A34A" />
                                    )}
                                    <Text className='text-sm font-semibold text-green-700 dark:text-green-400'>aadhaar_card.jpg</Text>
                                    <Text className={`text-xs font-medium ${statusColor(aadhaarStatus)}`}>
                                        {statusLabel(aadhaarStatus)}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Profile photo upload */}
                    <View className='mb-6'>
                        <Text className='text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Profile Photo</Text>
                        <TouchableOpacity
                            onPress={() => handleSelectPhoto('photo')}
                            activeOpacity={0.8}
                            className={`border-2 border-dashed rounded-2xl p-5 items-center gap-2 ${photoStatus === 'pending' ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900' : 'border-green-200 dark:border-green-950/40 bg-green-50 dark:bg-green-950/20'}`}
                        >
                            {photoStatus === 'pending' ? (
                                <>
                                    <CameraIcon size={28} color="#94A3B8" />
                                    <Text className='text-sm font-medium text-slate-500'>Tap to take or upload photo</Text>
                                    <Text className='text-xs text-slate-400'>Clear face, well-lit • JPG or PNG</Text>
                                </>
                            ) : (
                                <>
                                    {selectedPhoto ? (
                                        <Image source={{ uri: selectedPhoto.uri }} className='w-full h-40 rounded-xl mb-1' resizeMode='cover' />
                                    ) : (
                                        <CheckCircleIcon size={28} color="#16A34A" />
                                    )}
                                    <Text className='text-sm font-semibold text-green-700 dark:text-green-400'>profile_photo.jpg</Text>
                                    <Text className={`text-xs font-medium ${statusColor(photoStatus)}`}>
                                        {statusLabel(photoStatus)}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Info note */}
                    <View className='flex-row gap-2 bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3 mb-6'>
                        <ShieldIcon size={16} color="#3B82F6" />
                        <Text className='text-xs text-blue-600 dark:text-blue-400 flex-1 leading-relaxed'>
                            Your documents are encrypted and only used for identity verification. They are never shared with customers.
                        </Text>
                    </View>
                </ScrollView>

                {/* Submit */}
                <View className='p-4 border-t border-slate-100 dark:border-slate-900 gap-2'>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={uploading}
                        activeOpacity={0.8}
                        className={`py-4 rounded-2xl items-center ${uploading ? 'bg-slate-400' : 'bg-black dark:bg-blue-600'}`}
                    >
                        {uploading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className='text-white text-base font-bold'>Submit for review</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => {
                            if (fromDashboard) {
                                router.replace('/(protected)/worker');
                            } else {
                                router.replace('/(onboarding)/all-set');
                            }
                        }} 
                        activeOpacity={0.7}
                    >
                        <Text className='text-center text-sm text-slate-400 font-medium'>Skip, I&apos;ll do this later</Text>
                    </TouchableOpacity>
                </View>

                <MediaLibraryPicker
                    visible={showMediaPicker}
                    onClose={() => {
                        setShowMediaPicker(false);
                        setActiveUploadType(null);
                    }}
                    onSelect={(img) => {
                        if (activeUploadType === 'aadhaar') {
                            setSelectedAadhaar(img);
                            setAadhaarStatus('uploaded');
                        } else if (activeUploadType === 'photo') {
                            setSelectedPhoto(img);
                            setPhotoStatus('uploaded');
                        }
                        setShowMediaPicker(false);
                        setActiveUploadType(null);
                    }}
                />
            </SafeAreaView>
        </SafeAreaProvider>
    )
}
