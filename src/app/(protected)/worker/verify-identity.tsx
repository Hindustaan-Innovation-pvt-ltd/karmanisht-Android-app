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
import { Ionicons } from '@expo/vector-icons'

type DocStatus = 'pending' | 'uploaded' | 'verified'
type UploadType = 'aadhaar_front' | 'aadhaar_back' | 'pan_front' | 'photo'

export default function VerifyIdentity() {
    const user = useAppStore(state => state.user);
    const setUser = useAppStore(state => state.setUser);
    const refreshProfile = useAppStore(state => state.refreshProfile);

    const router = useRouter()
    const params = useLocalSearchParams()
    const fromDashboard = params?.from === 'dashboard'

    // Individual document states
    const [aadhaarFront, setAadhaarFront] = useState<{ uri: string; size?: number } | null>(null)
    const [aadhaarBack, setAadhaarBack] = useState<{ uri: string; size?: number } | null>(null)
    const [panFront, setPanFront] = useState<{ uri: string; size?: number } | null>(null)
    const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; size?: number } | null>(null)

    const [aadhaarFrontStatus, setAadhaarFrontStatus] = useState<DocStatus>('pending')
    const [aadhaarBackStatus, setAadhaarBackStatus] = useState<DocStatus>('pending')
    const [panFrontStatus, setPanFrontStatus] = useState<DocStatus>('pending')
    const [photoStatus, setPhotoStatus] = useState<DocStatus>('pending')

    const [showMediaPicker, setShowMediaPicker] = useState(false)
    const [activeUploadType, setActiveUploadType] = useState<UploadType | null>(null)
    const [uploading, setUploading] = useState(false)

    const statusColor = (s: DocStatus) =>
        s === 'verified' ? 'text-green-600' : s === 'uploaded' ? 'text-amber-500' : 'text-slate-400'

    const statusLabel = (s: DocStatus) =>
        s === 'verified' ? 'Verified ✓' : s === 'uploaded' ? 'Under review' : 'Not uploaded'

    const setDocForType = (type: UploadType, payload: { uri: string; size?: number }) => {
        if (type === 'aadhaar_front') { setAadhaarFront(payload); setAadhaarFrontStatus('uploaded'); }
        else if (type === 'aadhaar_back') { setAadhaarBack(payload); setAadhaarBackStatus('uploaded'); }
        else if (type === 'pan_front') { setPanFront(payload); setPanFrontStatus('uploaded'); }
        else if (type === 'photo') { setSelectedPhoto(payload); setPhotoStatus('uploaded'); }
    };

    const takePhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Camera permission is required.");
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: activeUploadType === 'photo' ? [1, 1] : [1.586, 1], // ID card ratio for docs
                quality: 0.85,
            });
            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                if (activeUploadType) setDocForType(activeUploadType, { uri: asset.uri, size: asset.fileSize });
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
                    aspect: activeUploadType === 'photo' ? [1, 1] : [1.586, 1],
                    quality: 0.85,
                });
                if (!result.canceled && result.assets?.length > 0) {
                    const asset = result.assets[0];
                    if (activeUploadType) setDocForType(activeUploadType, { uri: asset.uri, size: asset.fileSize });
                }
            } catch (err: any) {
                Alert.alert("Error picking image", err.message);
            }
        } else {
            setShowMediaPicker(true);
        }
    };

    const handleSelectPhoto = (type: UploadType) => {
        setActiveUploadType(type);
        const labels: Record<UploadType, string> = {
            aadhaar_front: 'Aadhaar Front',
            aadhaar_back: 'Aadhaar Back',
            pan_front: 'PAN Card (Front)',
            photo: 'Profile Photo',
        };
        Alert.alert(labels[type], "How would you like to add the image?", [
            { text: "Take Photo", onPress: takePhoto },
            { text: "Choose from Library", onPress: chooseFromLibrary },
            { text: "Cancel", style: "cancel", onPress: () => setActiveUploadType(null) }
        ]);
    };

    const handleSubmit = async () => {
        if (!aadhaarFront) { Alert.alert('Missing', 'Please upload the front side of your Aadhaar card.'); return; }
        if (!aadhaarBack) { Alert.alert('Missing', 'Please upload the back side of your Aadhaar card.'); return; }
        if (!panFront) { Alert.alert('Missing', 'Please upload the front side of your PAN card.'); return; }
        if (!selectedPhoto) { Alert.alert('Missing', 'Please upload your profile photo.'); return; }

        setUploading(true);
        try {
            if (!user?.id) throw new Error('User not found.');

            const ts = Date.now();

            // Upload all 4 images concurrently
            const [aadhaarFrontRes, aadhaarBackRes, panFrontRes, photoRes] = await Promise.all([
                uploadToInsForge('documents', `aadhaar_front_${user.id}_${ts}.jpg`, aadhaarFront),
                uploadToInsForge('documents', `aadhaar_back_${user.id}_${ts}.jpg`, aadhaarBack),
                uploadToInsForge('documents', `pan_front_${user.id}_${ts}.jpg`, panFront),
                uploadToInsForge('avatars', `avatar_${user.id}_${ts}.jpg`, selectedPhoto),
            ]);

            const aadhaarFrontUrl = aadhaarFrontRes?.url || '';
            const aadhaarBackUrl = aadhaarBackRes?.url || '';
            const panFrontUrl = panFrontRes?.url || '';
            const photoUrl = photoRes?.url || '';

            if (!aadhaarFrontUrl || !aadhaarBackUrl || !panFrontUrl || !photoUrl) {
                throw new Error('One or more uploads failed. Please try again.');
            }

            // Save all URLs to service_providers
            const { error: providerError } = await insforge.database
                .from('service_providers')
                .update({
                    aadhaar_url: aadhaarFrontUrl,         // legacy column — keep for compatibility
                    aadhaar_front_url: aadhaarFrontUrl,
                    aadhaar_back_url: aadhaarBackUrl,
                    pan_front_url: panFrontUrl,
                    profile_image: photoUrl,
                    is_kyc_verified: false,
                    is_verified: false,
                })
                .eq('id', user.id);

            if (providerError) {
                console.error('[VerifyIdentity] DB update error:', providerError);
                throw new Error(providerError.message || 'Failed to save documents.');
            }

            // Also sync profile_image to users table
            await insforge.database
                .from('users')
                .update({ profile_image: photoUrl })
                .eq('id', user.id);

            setUser({ profile_image: photoUrl, hasSpecialties: true });
            await refreshProfile();

            Alert.alert(
                "Documents Submitted ✓",
                "Your documents have been submitted successfully. We will review them within 24 hours.",
                [{
                    text: "OK",
                    onPress: () => {
                        if (fromDashboard) router.replace('/(protected)/worker');
                        else router.replace('/(onboarding)/all-set');
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
        .split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'

    const allDocsUploaded = !!aadhaarFront && !!aadhaarBack && !!panFront && !!selectedPhoto;

    // ── Reusable upload card ──────────────────────────────────────────────────
    const UploadCard = ({
        type, label, hint, selectedImg, status, icon
    }: {
        type: UploadType;
        label: string;
        hint: string;
        selectedImg: { uri: string } | null;
        status: DocStatus;
        icon?: React.ReactNode;
    }) => {
        const uploaded = status !== 'pending';
        return (
            <TouchableOpacity
                onPress={() => handleSelectPhoto(type)}
                activeOpacity={0.8}
                className={`border-2 border-dashed rounded-2xl overflow-hidden ${uploaded
                    ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                    }`}
            >
                {selectedImg ? (
                    <View>
                        <Image
                            source={{ uri: selectedImg.uri }}
                            style={{ width: '100%', height: 140 }}
                            resizeMode="cover"
                        />
                        <View className="flex-row items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-950/30">
                            <CheckCircleIcon size={14} color="#16A34A" />
                            <Text className="text-xs font-semibold text-green-700 dark:text-green-400 flex-1">{label} uploaded</Text>
                            <Text className="text-[10px] text-green-600 font-medium">Tap to change</Text>
                        </View>
                    </View>
                ) : (
                    <View className="p-5 items-center gap-2">
                        {icon || <UploadIcon size={26} color="#94A3B8" />}
                        <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300 text-center">{label}</Text>
                        <Text className="text-xs text-slate-400 text-center">{hint}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaProvider>
            <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
                <ScrollView className='flex-1' contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                    <BackButton />
                    <View className='mb-6 mt-12'>
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
                                    <Text className='text-xl font-bold text-slate-600 dark:text-slate-400'>{initials}</Text>
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
                            </View>
                        </View>
                    </View>

                    {/* ── Section: Aadhaar Card ─────────────────────────────── */}
                    <View className='mb-5'>
                        <View className='flex-row items-center gap-2 mb-3'>
                            <View className='w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center'>
                                <Text className='text-xs font-black text-blue-600 dark:text-blue-400'>1</Text>
                            </View>
                            <Text className='text-base font-bold text-slate-800 dark:text-slate-100'>Aadhaar Card</Text>
                            <Text className='text-xs text-slate-400 font-medium'>(Both sides required)</Text>
                        </View>

                        <View className='flex-row gap-3'>
                            {/* Front */}
                            <View className='flex-1'>
                                <Text className='text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ml-0.5'>FRONT SIDE</Text>
                                <UploadCard
                                    type="aadhaar_front"
                                    label="Aadhaar Front"
                                    hint="Name & photo side"
                                    selectedImg={aadhaarFront}
                                    status={aadhaarFrontStatus}
                                    icon={<UploadIcon size={24} color="#94A3B8" />}
                                />
                            </View>
                            {/* Back */}
                            <View className='flex-1'>
                                <Text className='text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ml-0.5'>BACK SIDE</Text>
                                <UploadCard
                                    type="aadhaar_back"
                                    label="Aadhaar Back"
                                    hint="Address side"
                                    selectedImg={aadhaarBack}
                                    status={aadhaarBackStatus}
                                    icon={<UploadIcon size={24} color="#94A3B8" />}
                                />
                            </View>
                        </View>
                    </View>

                    {/* ── Section: PAN Card ─────────────────────────────────── */}
                    <View className='mb-5'>
                        <View className='flex-row items-center gap-2 mb-3'>
                            <View className='w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 items-center justify-center'>
                                <Text className='text-xs font-black text-orange-600 dark:text-orange-400'>2</Text>
                            </View>
                            <Text className='text-base font-bold text-slate-800 dark:text-slate-100'>PAN Card</Text>
                            <Text className='text-xs text-slate-400 font-medium'>(Front side only)</Text>
                        </View>
                        <UploadCard
                            type="pan_front"
                            label="PAN Card — Front Side"
                            hint="Name, DOB & PAN number visible • JPG or PNG"
                            selectedImg={panFront}
                            status={panFrontStatus}
                            icon={<UploadIcon size={26} color="#94A3B8" />}
                        />
                    </View>

                    {/* Progress indicator */}
                    <View className='flex-row gap-2 mb-4'>
                        {[
                            { done: !!aadhaarFront, label: 'Aadhaar Front' },
                            { done: !!aadhaarBack, label: 'Aadhaar Back' },
                            { done: !!panFront, label: 'PAN Front' },
                        ].map((item, i) => (
                            <View key={i} className='flex-1 items-center gap-1'>
                                <View className={`w-full h-1.5 rounded-full ${item.done ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                <Text className={`text-[9px] font-semibold ${item.done ? 'text-green-600' : 'text-slate-400'}`}>
                                    {item.done ? '✓ ' : ''}{item.label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Security note */}
                    <View className='flex-row gap-2 bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3'>
                        <ShieldIcon size={16} color="#3B82F6" />
                        <Text className='text-xs text-blue-600 dark:text-blue-400 flex-1 leading-relaxed'>
                            Your documents are encrypted and stored securely. They are only used for identity verification and never shared with customers.
                        </Text>
                    </View>
                </ScrollView>

                {/* Submit bar */}
                <View className='p-4 border-t border-slate-100 dark:border-slate-900 gap-2'>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={uploading}
                        activeOpacity={0.8}
                        className={`py-4 rounded-2xl items-center flex-row justify-center gap-2 ${uploading ? 'bg-slate-400' : allDocsUploaded ? 'bg-black dark:bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                        {uploading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="shield-checkmark" size={18} color="white" />
                                <Text className='text-white text-base font-bold'>
                                    {allDocsUploaded ? 'Submit for Review' : `${[!!aadhaarFront, !!aadhaarBack, !!panFront, !!selectedPhoto].filter(Boolean).length}/4 documents uploaded`}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            if (fromDashboard) router.replace('/(protected)/worker');
                            else router.replace('/(onboarding)/all-set');
                        }}
                        activeOpacity={0.7}
                    >
                        <Text className='text-center text-sm text-slate-400 font-medium'>Skip, I&apos;ll do this later</Text>
                    </TouchableOpacity>
                </View>

                <MediaLibraryPicker
                    visible={showMediaPicker}
                    onClose={() => { setShowMediaPicker(false); setActiveUploadType(null); }}
                    onSelect={(img) => {
                        if (activeUploadType) setDocForType(activeUploadType, img);
                        setShowMediaPicker(false);
                        setActiveUploadType(null);
                    }}
                />
            </SafeAreaView>
        </SafeAreaProvider>
    )
}
