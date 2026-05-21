// @ts-nocheck
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, useColorScheme, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { insforge, uploadToInsForge } from '@/lib/insforge'
import { useAppStore } from '@/lib/store'
import { UserIcon, BriefcaseIcon, PhoneIcon, ClockIcon } from '@/svg/icons'
import { Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import MediaLibraryPicker from '@/components/media-library-picker'
import ScalePressable from '@/components/scale-pressable'

type Role = 'worker' | 'consumer'

export default function GoogleOnboarding() {
    const router = useRouter()
    const { updateDatabaseProfile, refreshProfile, signOut } = useAppStore()
    const colorScheme = useColorScheme()
    const isDark = colorScheme === 'dark'

    const {
        prefilledName,
        prefilledEmail,
        prefilledUserId,
    } = useLocalSearchParams<{
        prefilledName?: string,
        prefilledEmail?: string,
        prefilledUserId?: string,
    }>()

    const [fullName, setFullName] = useState(prefilledName || '')
    const [phone, setPhone] = useState('')
    const [role, setRole] = useState<Role | null>(null)
    const [experience, setExperience] = useState('')
    const [selectedImage, setSelectedImage] = useState<{ uri: string; size?: number } | null>(null)
    const [showMediaPicker, setShowMediaPicker] = useState(false)
    const [loading, setLoading] = useState(false)

    const canSubmit =
        fullName.trim().length > 1 &&
        phone.trim().length >= 10 &&
        role !== null &&
        (role === 'consumer' || experience.trim().length > 0)

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

    const handleCompleteOnboarding = async () => {
        if (!canSubmit) return;
        if (!/^[7-9]\d{9}$/.test(phone)) {
            Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit Indian mobile number starting with 7, 8, or 9.');
            return;
        }

        setLoading(true);
        try {
            const userId = prefilledUserId || useAppStore.getState().user.id;
            if (!userId) {
                throw new Error('User session not found. Please log in again.');
            }

            let uploadedImageUrl = undefined;
            if (selectedImage) {
                try {
                    const filename = `avatar_${userId}_${Date.now()}.jpg`;
                    const uploadRes = await uploadToInsForge('avatars', filename, selectedImage);
                    if (uploadRes?.url) {
                        uploadedImageUrl = uploadRes.url;
                    }
                } catch (uploadErr) {
                    console.error('[GoogleOnboarding] Failed converting/uploading photo:', uploadErr);
                }
            }

            await updateDatabaseProfile({
                id: userId,
                name: fullName,
                phone: phone,
                role: role!,
                experienceYears: role === 'worker' ? parseInt(experience) || 0 : undefined,
                experience: role === 'worker' ? `${experience} yrs` : undefined,
                profile_image: uploadedImageUrl,
                isGoogleUser: true
            });

            await refreshProfile();

            // Direct route to location setup first
            router.replace('/(location)/locationinfo');
        } catch (err: any) {
            Alert.alert('Onboarding Error', err.message || 'Failed to complete registration.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        Alert.alert(
            "Cancel Onboarding?",
            "Are you sure you want to cancel? This will sign you out.",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Sign Out",
                    onPress: async () => {
                        await signOut();
                        router.replace('/(onboarding)/auth/login');
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
            {/* Header / Cancel bar */}
            <View className="px-6 py-4 flex-row justify-between items-center border-b border-slate-100 dark:border-slate-900">
                <Text className="text-xl font-black text-slate-900 dark:text-slate-100">Setup Account</Text>
                <TouchableOpacity onPress={handleCancel} className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Sign Out</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                className='flex-1'
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={8}
            >
                <ScrollView
                    className='flex-1'
                    contentContainerStyle={{ padding: 24, gap: 20 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View>
                        <Text className='text-3xl font-black text-slate-900 dark:text-white leading-tight'>Almost there!</Text>
                        <Text className='text-sm text-slate-500 mt-2 font-medium'>
                            Let&apos;s set up your profile details. You bypassed mobile verification since you signed in securely with Google.
                        </Text>
                    </View>

                    {/* Profile Photo Selection */}
                    <View className="items-center my-3">
                        <TouchableOpacity
                            onPress={handleSelectPhoto}
                            activeOpacity={0.8}
                            className="relative w-28 h-28 rounded-[36px] border-4 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-md items-center justify-center overflow-hidden"
                        >
                            {selectedImage?.uri ? (
                                <Image source={{ uri: selectedImage.uri }} className="w-full h-full" resizeMode="cover" />
                            ) : (
                                <View className="items-center justify-center">
                                    <Feather name="camera" size={28} color="#94A3B8" />
                                    <Text className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Add Photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Full name */}
                    <View className='gap-2'>
                        <Text className='text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest'>Full Name</Text>
                        <TextInput
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder='e.g. Ramesh Kumar'
                            placeholderTextColor="#94A3B8"
                            autoCapitalize='words'
                            className='border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-base font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900'
                        />
                    </View>

                    {/* Phone Number */}
                    <View className='gap-2'>
                        <Text className='text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest'>Phone Number</Text>
                        <View className='flex-row items-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900 px-5'>
                            <PhoneIcon size={18} color="#94A3B8" />
                            <TextInput
                                value={phone}
                                onChangeText={setPhone}
                                placeholder='9876543210'
                                placeholderTextColor="#94A3B8"
                                keyboardType='phone-pad'
                                maxLength={10}
                                className='flex-1 py-4 ml-3 text-base font-semibold text-slate-900 dark:text-slate-100'
                            />
                        </View>
                    </View>

                    {/* Role Selection */}
                    <View className='gap-3'>
                        <Text className='text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest'>How will you use the app?</Text>
                        <View className='flex-row gap-4'>
                            {/* Worker */}
                            <TouchableOpacity
                                onPress={() => setRole('worker')}
                                activeOpacity={0.8}
                                className={`flex-1 p-5 rounded-3xl border-2 ${role === 'worker' ? 'border-black dark:border-blue-500 bg-slate-50 dark:bg-slate-900/60' : 'border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900'}`}
                            >
                                <View className={`size-12 rounded-2xl items-center justify-center mb-3 ${role === 'worker' ? 'bg-black dark:bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                    <BriefcaseIcon size={22} color={role === 'worker' ? '#fff' : '#64748b'} />
                                </View>
                                <Text className={`text-lg font-bold ${role === 'worker' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-350'}`}>Provider</Text>
                                <Text className='text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium'>I want to offer services</Text>
                            </TouchableOpacity>

                            {/* Consumer */}
                            <TouchableOpacity
                                onPress={() => setRole('consumer')}
                                activeOpacity={0.8}
                                className={`flex-1 p-5 rounded-3xl border-2 ${role === 'consumer' ? 'border-black dark:border-blue-500 bg-slate-50 dark:bg-slate-900/60' : 'border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900'}`}
                            >
                                <View className={`size-12 rounded-2xl items-center justify-center mb-3 ${role === 'consumer' ? 'bg-black dark:bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                    <UserIcon size={22} color={role === 'consumer' ? '#fff' : '#64748b'} />
                                </View>
                                <Text className={`text-lg font-bold ${role === 'consumer' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-350'}`}>Customer</Text>
                                <Text className='text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium'>I need to hire services</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Experience (workers only) */}
                    {role === 'worker' && (
                        <View className='gap-2 animate-fade-in'>
                            <Text className='text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest'>Years of Experience</Text>
                            <View className='flex-row items-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900 px-5'>
                                <ClockIcon size={18} color="#94A3B8" />
                                <TextInput
                                    value={experience}
                                    onChangeText={setExperience}
                                    placeholder='e.g. 5'
                                    placeholderTextColor="#94A3B8"
                                    keyboardType='number-pad'
                                    className='flex-1 py-4 ml-3 text-base font-semibold text-slate-900 dark:text-slate-100'
                                />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Complete Button */}
                <View className='p-6 pb-10 border-t border-slate-100 dark:border-slate-900'>
                    <ScalePressable
                        onPress={handleCompleteOnboarding}
                        disabled={!canSubmit || loading}
                        hapticType="medium"
                        scaleTo={0.97}
                        className={`py-4.5 rounded-2xl items-center justify-center ${canSubmit ? 'bg-black dark:bg-blue-600' : 'bg-slate-100 dark:bg-slate-900'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color={isDark ? "white" : "black"} />
                        ) : (
                            <Text className={`text-base font-black uppercase tracking-wider ${canSubmit ? 'text-white' : 'text-slate-400 dark:text-slate-600'}`}>
                                Complete Onboarding
                            </Text>
                        )}
                    </ScalePressable>
                </View>
            </KeyboardAvoidingView>

            <MediaLibraryPicker
                visible={showMediaPicker}
                onClose={() => setShowMediaPicker(false)}
                onSelect={(img) => setSelectedImage(img)}
            />
        </SafeAreaView>
    )
}
