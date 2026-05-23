// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insforge, uploadToInsForge } from '@/lib/insforge';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, Modal, Image } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import BackButton from '@/components/back-button'
import Progress from '@/components/progress'
import { UserIcon, BriefcaseIcon, PhoneIcon, ClockIcon } from '@/svg/icons'
import { useAppStore } from '@/lib/store'
import { Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import MediaLibraryPicker from '@/components/media-library-picker'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import auth from '@react-native-firebase/auth';
import { useTranslation } from 'react-i18next'
import CustomAlert from '@/components/ui/custom-alert';

type Role = 'worker' | 'consumer'

export default function Register() {
    const { t } = useTranslation();
    const router = useRouter()
    const { updateDatabaseProfile, refreshProfile } = useAppStore()
    const [selectedImage, setSelectedImage] = useState<{ uri: string; size?: number } | null>(null)
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'error' | 'success' | 'info' | 'warning';
        onClose?: () => void;
    } | null>(null);

    const showAlert = (
        title: string,
        message: string,
        type: 'error' | 'success' | 'info' | 'warning' = 'error',
        onClose?: () => void
    ) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            type,
            onClose: () => {
                setAlertConfig(null);
                if (onClose) onClose();
            }
        });
    };

    const {
        mobile: paramMobile,
        prefilledName,
        prefilledUserId,
    } = useLocalSearchParams<{
        mobile?: string,
        prefilledName?: string,
        prefilledEmail?: string,
        prefilledUserId?: string,
    }>()

    const [fullName, setFullName] = useState(prefilledName || '')
    const [phone, setPhone] = useState(paramMobile || '')
    const [experience, setExperience] = useState('')
    const [role, setRole] = useState<Role | null>(null)
    const [loading, setLoading] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const [resendingOtp, setResendingOtp] = useState(false)

    const [showOtpModal, setShowOtpModal] = useState(false)
    const [otp, setOtp] = useState('')
    const [verifyingOtp, setVerifyingOtp] = useState(false)
    const [showMediaPicker, setShowMediaPicker] = useState(false)
    const [verificationId, setVerificationId] = useState('')
    const hasProcessedRef = useRef(false)

    useEffect(() => {
        if (!showOtpModal) return;
        const isDev = process.env.EXPO_PUBLIC_APP_MODE === 'development';
        if (isDev) return;

        const unsubscribe = auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log('Firebase user auto-authenticated in Register screen:', user.uid);
                await handleSuccessfulRegistration();
            }
        });
        return () => unsubscribe();
    }, [showOtpModal]);

    // ── Cooldown countdown timer ─────────────────────────────────────────────
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const canContinue =
        fullName.trim().length > 1 &&
        phone.trim().length >= 10 &&
        role !== null &&
        (role === 'consumer' || experience.trim().length > 0)

    // ── Step 1: Send OTP ─────────────────────────────────────────────────────
    const handleContinue = async () => {
        if (!canContinue) return
        if (!/^[6-9]\d{9}$/.test(phone)) {
            showAlert('Invalid Mobile', 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.', 'error');
            return;
        }
        if (cooldown > 0) {
            showAlert('Please Wait', `You can request another OTP in ${cooldown} seconds.`, 'warning');
            return;
        }
        setLoading(true);
        try {
            const isDev = process.env.EXPO_PUBLIC_APP_MODE === 'development';
            let vId = 'mock-verification-id';

            if (!isDev) {
                const confirmation = await auth().signInWithPhoneNumber('+91' + phone);
                vId = confirmation.verificationId;
            }

            setVerificationId(vId);
            setCooldown(30); // 30 seconds cooldown
            showAlert('OTP Sent', 'OTP sent successfully!', 'success', () => {
                setShowOtpModal(true);
            });
        } catch (err: any) {
            console.error('[Firebase OTP Error]', err);
            showAlert('Error', err.message || 'Failed to send OTP', 'error');
        } finally {
            setLoading(false);
        }
    }

    const handleResendOtp = async () => {
        if (cooldown > 0) return;
        setResendingOtp(true);
        try {
            const isDev = process.env.EXPO_PUBLIC_APP_MODE === 'development';
            let vId = 'mock-verification-id';

            if (!isDev) {
                const confirmation = await auth().signInWithPhoneNumber('+91' + phone);
                vId = confirmation.verificationId;
            }

            setVerificationId(vId);
            setCooldown(30);
            showAlert('OTP Sent', 'OTP resent successfully!', 'success');
        } catch (err: any) {
            console.error('[Firebase OTP Resend Error]', err);
            showAlert('Error', err.message || 'Failed to resend OTP', 'error');
        } finally {
            setResendingOtp(false);
        }
    }

    const handleSuccessfulRegistration = async () => {
        if (hasProcessedRef.current) return;
        hasProcessedRef.current = true;
        setVerifyingOtp(true);
        try {
            // Establish auth session (only if this isn't a Google-prefilled registration)
            let finalUserId = prefilledUserId;
            if (!prefilledUserId) {
                const mockEmail = `${phone}@mock-mobile.local`;
                const mockPassword = `Static_Auth_${phone}`;
                
                // First try to sign in
                let { data: authData, error: authError } = await insforge.auth.signInWithPassword({
                    email: mockEmail,
                    password: mockPassword
                });
                
                // If sign in fails (likely because account doesn't exist during registration)
                if (authError) {
                     const signUpRes = await insforge.auth.signUp({
                          email: mockEmail,
                          password: mockPassword
                      });
                      authData = signUpRes.data;
                      authError = signUpRes.error;
                }

                if (authError || !authData?.user) {
                    throw new Error(authError?.message || 'Could not establish auth session.');
                }
                if (authData.accessToken) {
                    await AsyncStorage.setItem('@@app_token', authData.accessToken);
                    insforge.setAccessToken(authData.accessToken);
                }
                if (authData.refreshToken) {
                    await AsyncStorage.setItem('@@app_refresh_token', authData.refreshToken);
                    insforge.getHttpClient().setRefreshToken(authData.refreshToken);
                }
                if (authData.csrfToken) {
                    await AsyncStorage.setItem('@@app_csrf_token', authData.csrfToken);
                    if (typeof document !== 'undefined') {
                        document.cookie = `insforge_csrf_token=${authData.csrfToken}`;
                    }
                }
                finalUserId = authData.user.id;
            }

            setShowOtpModal(false);
            await finalizeRegistration(finalUserId || '');
        } catch (err: any) {
            showAlert('Verification Failed', err.message, 'error');
            hasProcessedRef.current = false; // allow retry
        } finally {
            setVerifyingOtp(false);
        }
    }

    // ── Step 2: Verify OTP ───────────────────────────────────────────────────
    const handleVerifyOtp = async () => {
        if (otp.length < 6) return;
        setVerifyingOtp(true);

        const isDev = process.env.EXPO_PUBLIC_APP_MODE === 'development';
        if (isDev) {
            await handleSuccessfulRegistration();
            return;
        }

        try {
            const credential = auth.PhoneAuthProvider.credential(verificationId, otp);
            await auth().signInWithCredential(credential);
        } catch (err: any) {
            console.error('[OTP Register Verify Manual]', err);
            // If the user is already signed in natively, signInWithCredential throws session-expired.
            const currentUser = auth().currentUser;
            if (currentUser) {
                console.log('User is already authenticated in register, bypassing session-expired error...');
                await handleSuccessfulRegistration();
            } else {
                showAlert('Verification Failed', err.message, 'error');
                setVerifyingOtp(false);
            }
        }
    };

    const takePhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
                showAlert("Permission Required", "Camera permission is required to take a photo.", "warning");
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
            showAlert("Error capturing photo", err.message, "error");
        }
    };

    const handleSelectPhoto = () => {
        Alert.alert(
            t('profilePhoto'),
            t('selectPhotoOption'),
            [
                { text: t('takePhoto'), onPress: takePhoto },
                { text: t('chooseFromLibrary'), onPress: () => setShowMediaPicker(true) },
                { text: t('cancel'), style: "cancel" }
            ]
        );
    };

    // ── Step 3: Write profile to DB via store ─────────────────────────────────
    const finalizeRegistration = async (userId: string) => {
        setLoading(true);
        try {
            let uploadedImageUrl = undefined;

            if (selectedImage) {
                try {
                    const filename = `avatar_${userId}_${Date.now()}.jpg`;
                    const uploadRes = await uploadToInsForge('avatars', filename, selectedImage);
                    if (uploadRes?.url) {
                        uploadedImageUrl = uploadRes.url;
                    }
                } catch (uploadErr) {
                    console.error('[finalizeRegistration] Failed converting/uploading photo:', uploadErr);
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
            });

            await refreshProfile();

            // Both roles go to location screen first
            router.replace('/(location)/locationinfo');
        } catch (err: any) {
            showAlert('Registration Error', err.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <View className='flex-1 pt-12 mt-16'>

            <BackButton />
            <Progress currentStep={1} totalSteps={4} />

            <KeyboardAvoidingView
                className='flex-1'
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={8}
            >
                <ScrollView
                    className='flex-1'
                    contentContainerStyle={{ padding: 20, gap: 16 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View>
                        <Text className='text-2xl font-bold text-slate-900 dark:text-slate-100'>{t('yourBasicDetails')}</Text>
                        <Text className='text-sm text-slate-500 mt-1'>
                            {t('tellUsAboutYourself')}
                        </Text>
                    </View>

                    {/* Profile Photo Selection */}
                    <View className="items-center my-2">
                        <TouchableOpacity
                            onPress={handleSelectPhoto}
                            activeOpacity={0.8}
                            className="relative w-28 h-28 rounded-[28px] border-4 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-md items-center justify-center overflow-hidden"
                        >
                            {selectedImage?.uri ? (
                                <Image source={{ uri: selectedImage.uri }} className="w-full h-full" resizeMode="cover" />
                            ) : (
                                <View className="items-center justify-center">
                                    <Feather name="camera" size={28} color="#94A3B8" />
                                    <Text className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{t('addPhoto')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Full name */}
                    <View className='gap-1.5'>
                        <Text className='text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider'>{t('fullName')}</Text>
                        <TextInput
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder='Ramesh Kumar Sahu'
                            placeholderTextColor="#94A3B8"
                            autoCapitalize='words'
                            className='border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900'
                        />
                    </View>

                    {/* Phone Number */}
                    <View className='gap-1.5'>
                        <Text className='text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider'>{t('phoneNumber2')}</Text>
                        <View className='flex-row items-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 px-4'>
                            <PhoneIcon size={18} color="#94A3B8" />
                            <TextInput
                                value={phone}
                                onChangeText={setPhone}
                                placeholder='9876543210'
                                placeholderTextColor="#94A3B8"
                                keyboardType='phone-pad'
                                maxLength={10}
                                className='flex-1 py-3.5 ml-2 text-base text-slate-900 dark:text-slate-100'
                            />
                        </View>
                    </View>

                    {/* Role selection */}
                    <View className='gap-3'>
                        <Text className='text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider'>{t('iAmA')}</Text>
                        <View className='flex-row gap-3'>
                            {/* Worker */}
                            <TouchableOpacity
                                onPress={() => setRole('worker')}
                                activeOpacity={0.8}
                                className={`flex-1 p-4 rounded-2xl border-2 ${role === 'worker' ? 'border-black dark:border-blue-500 bg-slate-50 dark:bg-slate-900' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                            >
                                <View className={`size-10 rounded-full items-center justify-center mb-2 ${role === 'worker' ? 'bg-black' : 'bg-slate-100'}`}>
                                    <BriefcaseIcon size={18} color={role === 'worker' ? '#fff' : '#64748b'} />
                                </View>
                                <Text className={`text-base font-bold ${role === 'worker' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{t('provider')}</Text>
                                <Text className='text-xs text-slate-400 mt-0.5'>{t('iWantToWork')}</Text>
                            </TouchableOpacity>

                            {/* Consumer */}
                            <TouchableOpacity
                                onPress={() => setRole('consumer')}
                                activeOpacity={0.8}
                                className={`flex-1 p-4 rounded-2xl border-2 ${role === 'consumer' ? 'border-black dark:border-blue-500 bg-slate-50 dark:bg-slate-900' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                            >
                                <View className={`size-10 rounded-full items-center justify-center mb-2 ${role === 'consumer' ? 'bg-black' : 'bg-slate-100'}`}>
                                    <UserIcon size={18} color={role === 'consumer' ? '#fff' : '#64748b'} />
                                </View>
                                <Text className={`text-base font-bold ${role === 'consumer' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{t('customer')}</Text>
                                <Text className='text-xs text-slate-400 mt-0.5'>{t('iNeedService')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Experience (workers only) */}
                    {role === 'worker' && (
                        <View className='gap-1.5'>
                            <Text className='text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider'>{t('yearsOfExperience')}</Text>
                            <View className='flex-row items-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 px-4'>
                                <ClockIcon size={18} color="#94A3B8" />
                                <TextInput
                                    value={experience}
                                    onChangeText={setExperience}
                                    placeholder='e.g. 5'
                                    placeholderTextColor="#94A3B8"
                                    keyboardType='number-pad'
                                    className='flex-1 py-3.5 ml-2 text-base text-slate-900 dark:text-slate-100'
                                />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Continue button */}
                <View className='p-4 pb-12'>
                    <TouchableOpacity
                        onPress={handleContinue}
                        activeOpacity={0.8}
                        disabled={!canContinue || loading || cooldown > 0}
                        className={`py-4 rounded-2xl items-center ${canContinue && cooldown === 0 ? 'bg-black dark:bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className={`text-base font-bold ${canContinue && cooldown === 0 ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                {cooldown > 0 ? `${t('resendIn', { time: `${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}` })}` : t('continueBtn')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* OTP Verification Modal */}
            <Modal
                visible={showOtpModal}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!verifyingOtp && !resendingOtp) {
                        setShowOtpModal(false);
                    }
                }}
            >
                <View className="flex-1 bg-black/50 items-center justify-center p-6">
                    <View className="bg-white dark:bg-slate-900 w-full rounded-3xl p-6"
                        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
                    >
                        <Text className="text-2xl font-bold text-slate-900 dark:text-white text-center">{t('verifyMobile')}</Text>
                        <Text className="text-slate-500 text-center mt-2 mb-6">
                            {t('sentCodeTo')}{' '}
                            <Text className="font-bold text-slate-900 dark:text-slate-100">{phone}</Text>
                        </Text>

                        <View className="items-center mb-6">
                            <InputOTP maxLength={6} onChangeText={setOtp} value={otp}>
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                </InputOTPGroup>
                            </InputOTP>
                        </View>

                        {/* Cooldown / Resend Section */}
                        <View className="flex-row justify-center items-center mb-6 h-6">
                            {cooldown > 0 ? (
                                <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                    {t('resendIn', { time: `${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}` })}
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={handleResendOtp} disabled={resendingOtp} activeOpacity={0.7}>
                                    {resendingOtp ? (
                                        <ActivityIndicator size="small" color="#2563eb" />
                                    ) : (
                                        <Text className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                                            {t('resendOtp')}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            onPress={handleVerifyOtp}
                            disabled={otp.length < 6 || verifyingOtp || resendingOtp}
                            className={`py-4 rounded-2xl items-center ${otp.length === 6 && !resendingOtp ? 'bg-black dark:bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                        >
                            {verifyingOtp ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className={`text-base font-bold ${otp.length === 6 && !resendingOtp ? 'text-white' : 'text-slate-400'}`}>{t('verifyAndContinue')}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowOtpModal(false)} className="mt-4" disabled={verifyingOtp || resendingOtp}>
                            <Text className="text-center text-slate-500 font-medium">{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <MediaLibraryPicker
                visible={showMediaPicker}
                onClose={() => setShowMediaPicker(false)}
                onSelect={(img) => setSelectedImage(img)}
            />

            {alertConfig && (
                <CustomAlert
                    visible={alertConfig.visible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    onClose={alertConfig.onClose || (() => setAlertConfig(null))}
                />
            )}
        </View>
    )
}
