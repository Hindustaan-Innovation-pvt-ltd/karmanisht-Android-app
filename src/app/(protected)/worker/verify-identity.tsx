// @ts-nocheck
import { useAppStore } from '@/lib/store';
import React, { useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View, Alert, ActivityIndicator, Image, Platform, useColorScheme, Modal } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import BackButton from '@/components/back-button'
import { ShieldIcon, UploadIcon, CheckCircleIcon } from '@/svg/icons'
import * as ImagePicker from 'expo-image-picker'
import MediaLibraryPicker from '@/components/media-library-picker'
import { insforge, uploadToInsForge } from '@/lib/insforge'
import { Ionicons } from '@expo/vector-icons'

type DocStatus = 'pending' | 'uploaded' | 'verified'
type UploadType = 'aadhaar_front' | 'aadhaar_back' | 'pan_front'

export default function VerifyIdentity() {
    const user = useAppStore(state => state.user);
    const setUser = useAppStore(state => state.setUser);
    const refreshProfile = useAppStore(state => state.refreshProfile);

    const router = useRouter()
    const params = useLocalSearchParams()
    const colorScheme = useColorScheme()
    const isDark = colorScheme === 'dark'

    const fromDashboard = params?.from === 'dashboard'
    const fromSettings = params?.from === 'settings'

    // Individual document states
    const [aadhaarFront, setAadhaarFront] = useState<{ uri: string; size?: number } | null>(null)
    const [aadhaarBack, setAadhaarBack] = useState<{ uri: string; size?: number } | null>(null)
    const [panFront, setPanFront] = useState<{ uri: string; size?: number } | null>(null)

    const [aadhaarFrontStatus, setAadhaarFrontStatus] = useState<DocStatus>('pending')
    const [aadhaarBackStatus, setAadhaarBackStatus] = useState<DocStatus>('pending')
    const [panFrontStatus, setPanFrontStatus] = useState<DocStatus>('pending')

    const [showMediaPicker, setShowMediaPicker] = useState(false)
    const [activeUploadType, setActiveUploadType] = useState<UploadType | null>(null)
    const [uploading, setUploading] = useState(false)

    // Custom Modal States
    const [showSourceModal, setShowSourceModal] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    const setDocForType = (type: UploadType, payload: { uri: string; size?: number }) => {
        if (type === 'aadhaar_front') { setAadhaarFront(payload); setAadhaarFrontStatus('uploaded'); }
        else if (type === 'aadhaar_back') { setAadhaarBack(payload); setAadhaarBackStatus('uploaded'); }
        else if (type === 'pan_front') { setPanFront(payload); setPanFrontStatus('uploaded'); }
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
                aspect: [1.586, 1], // ID card ratio for docs
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
                    aspect: [1.586, 1],
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
        setShowSourceModal(true);
    };

    const handleSubmit = async () => {
        if (!aadhaarFront) { Alert.alert('Missing', 'Please upload the front side of your Aadhaar card.'); return; }
        if (!aadhaarBack) { Alert.alert('Missing', 'Please upload the back side of your Aadhaar card.'); return; }
        if (!panFront) { Alert.alert('Missing', 'Please upload the front side of your PAN card.'); return; }

        setUploading(true);
        try {
            if (!user?.id) throw new Error('User not found.');

            const ts = Date.now();

            // Upload all 3 images concurrently
            const [aadhaarFrontRes, aadhaarBackRes, panFrontRes] = await Promise.all([
                uploadToInsForge('documents', `aadhaar_front_${user.id}_${ts}.jpg`, aadhaarFront),
                uploadToInsForge('documents', `aadhaar_back_${user.id}_${ts}.jpg`, aadhaarBack),
                uploadToInsForge('documents', `pan_front_${user.id}_${ts}.jpg`, panFront),
            ]);

            const aadhaarFrontUrl = aadhaarFrontRes?.url || '';
            const aadhaarBackUrl = aadhaarBackRes?.url || '';
            const panFrontUrl = panFrontRes?.url || '';

            if (!aadhaarFrontUrl || !aadhaarBackUrl || !panFrontUrl) {
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
                    is_kyc_verified: false,
                    is_verified: false,
                })
                .eq('id', user.id);

            if (providerError) {
                console.error('[VerifyIdentity] DB update error:', providerError);
                throw new Error(providerError.message || 'Failed to save documents.');
            }

            setUser({ hasSpecialties: true });
            await refreshProfile();
            setShowSuccessModal(true);
        } catch (err: any) {
            console.error('[VerifyIdentity] Submission error:', err);
            Alert.alert('Submission Failed', err.message || 'An unexpected error occurred.');
        } finally {
            setUploading(false);
        }
    };

    const initials = (user.name ?? '')
        .split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'

    const allDocsUploaded = !!aadhaarFront && !!aadhaarBack && !!panFront;

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
            {/* ── Image Source Selection Modal (Bottom Sheet style) ── */}
            <Modal
                visible={showSourceModal}
                transparent
                animationType="slide"
                onRequestClose={() => { setShowSourceModal(false); setActiveUploadType(null); }}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => { setShowSourceModal(false); setActiveUploadType(null); }}
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
                            {activeUploadType === 'aadhaar_front' && 'Aadhaar Card (Front)'}
                            {activeUploadType === 'aadhaar_back' && 'Aadhaar Card (Back)'}
                            {activeUploadType === 'pan_front' && 'PAN Card (Front)'}
                        </Text>
                        <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 24 }}>
                            Please choose how you want to upload this document.
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
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' }}>Take Photo</Text>
                                <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 1 }}>Use your device camera</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#94a3b8'} />
                        </TouchableOpacity>

                        {/* Gallery Option */}
                        <TouchableOpacity
                            onPress={() => {
                                setShowSourceModal(false);
                                setTimeout(chooseFromLibrary, 100);
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
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' }}>Choose from Gallery</Text>
                                <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 1 }}>Select an existing document photo</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#94a3b8'} />
                        </TouchableOpacity>

                        {/* Cancel Button */}
                        <TouchableOpacity
                            onPress={() => { setShowSourceModal(false); setActiveUploadType(null); }}
                            activeOpacity={0.8}
                            style={{ backgroundColor: isDark ? '#334155' : '#f1f5f9', paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#cbd5e1' : '#475569' }}>Cancel</Text>
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

                        <Text style={{ fontSize: 22, fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 8, textAlign: 'center' }}>Documents Submitted!</Text>
                        <Text style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>Your documents have been submitted successfully. We will review them within 24 hours.</Text>

                        <TouchableOpacity
                            onPress={() => {
                                setShowSuccessModal(false);
                                if (fromSettings) router.replace('/(protected)/worker/settings');
                                else if (fromDashboard) router.replace('/(protected)/worker');
                                else router.replace('/(onboarding)/all-set');
                            }}
                            activeOpacity={0.85}
                            style={{ backgroundColor: isDark ? '#2563eb' : '#000000', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 48, width: '100%', alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
                <ScrollView className='flex-1' contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                    <View className='mb-6 mt-12 flex-col gap-4'>
                        <View className='flex-row items-center gap-6 justify-start'>
                            <Ionicons name='arrow-back' size={22} color="#000" onPress={() => {
                                if (fromSettings) router.replace('/(protected)/worker/settings');
                                else router.back();
                            }} />
                            <Text className='text-2xl font-bold text-slate-900 dark:text-slate-100'>Verify your identity</Text>
                        </View>
                        <Text className='text-sm text-slate-500 mt-1'>
                            Required to list your profile. Documents are reviewed within 24 hours.
                        </Text>
                    </View>

                    {/* Profile preview card */}
                    <View className='bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800'>
                        <View className='flex-row items-center gap-3'>
                            <View className='size-14 rounded-full bg-slate-200 dark:bg-slate-800 items-center justify-center overflow-hidden'>
                                {user.profile_image ? (
                                    <Image source={{ uri: user.profile_image }} className='w-full h-full' />
                                ) : (
                                    <Text className='text-xl font-bold text-slate-600 dark:text-slate-400'>{initials}</Text>
                                )}
                            </View>
                            <View className='flex-1'>
                                <Text className='text-base font-bold text-slate-900 dark:text-slate-100'>{user.name || 'Anonymous'}</Text>
                                <Text className='text-sm text-slate-500'>{user.profession || 'Provider'}</Text>
                                <View className='flex-row items-center gap-1 mt-1'>
                                    <Ionicons name="location-outline" size={11} color="#9CA3AF" />
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
                                    {allDocsUploaded ? 'Submit for Review' : `${[!!aadhaarFront, !!aadhaarBack, !!panFront].filter(Boolean).length}/3 documents uploaded`}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            if (fromSettings) router.replace('/(protected)/worker/settings');
                            else if (fromDashboard) router.replace('/(protected)/worker');
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
