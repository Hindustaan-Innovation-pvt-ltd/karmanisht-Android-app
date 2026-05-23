// @ts-nocheck
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import { useSubCategories, useProviders, useCityPricing, useActivePasses } from '@/hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, Dimensions, Modal, Clipboard, Linking, Pressable, Animated, useColorScheme } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SafeIcon from '@/components/safe-icon';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { adjustHindiFont } from '@/lib/utils';
import CustomAlert from '@/components/ui/custom-alert';

const { width } = Dimensions.get('window');

interface ContactDetailModalProps {
    visible: boolean;
    provider: any;
    onClose: () => void;
    themeColor: string;
    categoryName: string;
    showAlert: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const ContactDetailModal = ({ visible, provider, onClose, themeColor, categoryName, showAlert }: ContactDetailModalProps) => {
    const { t } = useTranslation();
    if (!provider) return null;

    const handleCall = () => {
        if (provider.mobile) {
            Linking.openURL(`tel:${provider.mobile}`);
        } else {
            showAlert(t('error'), t('phoneNotAvailable'), 'error');
        }
    };

    const handleCopy = () => {
        if (provider.mobile) {
            Clipboard.setString(provider.mobile);
            showAlert(t('copied'), t('copiedMsg'), 'success');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <Pressable style={{ flex: 1 }} onPress={onClose} />
                <View
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderTopLeftRadius: 30,
                        borderTopRightRadius: 30,
                        padding: 24,
                        paddingBottom: 40,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 10,
                        elevation: 10
                    }}
                >
                    {/* Header Handle */}
                    <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 }} />

                    {/* Content */}
                    <View className="items-center mb-6">
                        <Image
                            source={{ uri: provider.profile_image }}
                            style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 3, borderColor: themeColor }}
                            resizeMode="cover"
                        />
                        <Text className="text-2xl font-bold text-slate-800">{provider.full_name}</Text>
                        <Text className="text-sm font-semibold text-slate-400 mt-1">{t('exploreCategory', { category: t(categoryName) })}</Text>
                    </View>

                    {/* Phone Number Field */}
                    <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-row items-center justify-between mb-6">
                        <View className="flex-row items-center">
                            <View style={{ backgroundColor: `${themeColor}20`, padding: 10, borderRadius: 12 }}>
                                <Ionicons name="call" size={24} color={themeColor} />
                            </View>
                            <View className="ml-3">
                                <Text className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('phoneNumber')}</Text>
                                <Text className="text-lg font-bold text-slate-800 mt-0.5">{provider.mobile}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={handleCopy}
                            style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 10 }}
                        >
                            <Ionicons name="copy-outline" size={20} color="#475569" />
                        </TouchableOpacity>
                    </View>

                    {/* Buttons */}
                    <View className="flex-row gap-4">
                        <TouchableOpacity
                            onPress={onClose}
                            style={{ flex: 1 }}
                            className="bg-slate-100 py-4 rounded-2xl items-center justify-center border border-slate-200"
                        >
                            <Text className="text-base font-bold text-slate-600">{t('cancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleCall}
                            style={{ backgroundColor: themeColor, flex: 2 }}
                            className="py-4 rounded-2xl items-center justify-center flex-row"
                        >
                            <Ionicons name="call" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text className="text-base font-bold text-white">{t('callNow')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

interface SuccessModalProps {
    visible: boolean;
    onClose: () => void;
    themeColor: string;
}

const SuccessModal = ({ visible, onClose, themeColor }: SuccessModalProps) => {
    const { t } = useTranslation();
    const scaleAnim = React.useRef(new Animated.Value(0)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 40,
                    friction: 6,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 350,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [visible, opacityAnim, scaleAnim]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <Animated.View
                    style={{
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 32,
                        padding: 30,
                        width: '100%',
                        maxWidth: 340,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 20 },
                        shadowOpacity: 0.25,
                        shadowRadius: 25,
                        elevation: 15
                    }}
                >
                    {/* Animated Checkmark Circle */}
                    <View
                        style={{
                            width: 90,
                            height: 90,
                            borderRadius: 45,
                            backgroundColor: '#DCFCE7',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 24,
                            borderWidth: 4,
                            borderColor: '#86EFAC'
                        }}
                    >
                        <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
                    </View>

                    {/* Success message */}
                    <Text className="text-2xl font-bold text-slate-800 text-center">{t('unlockSuccessful')}</Text>
                    <Text className="text-sm text-slate-500 text-center mt-3 leading-relaxed">
                        {t('contactUnlockedMsg')}
                    </Text>

                    {/* Button */}
                    <TouchableOpacity
                        onPress={onClose}
                        style={{ backgroundColor: themeColor, width: '100%', borderRadius: 18, marginTop: 28 }}
                        className="py-4 items-center justify-center flex-row"
                    >
                        <Text className="text-base font-bold text-white">{t('viewContact')}</Text>
                        <Ionicons name="arrow-forward-outline" size={20} color="white" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

interface UnlockCategoryPassModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    themeColor: string;
    categoryName: string;
    cityName: string;
    price: number;
    durationHours: number;
}

const UnlockCategoryPassModal = ({
    visible,
    onClose,
    onConfirm,
    themeColor,
    categoryName,
    cityName,
    price,
    durationHours
}: UnlockCategoryPassModalProps) => {
    const { t } = useTranslation();
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <Pressable style={{ flex: 1 }} onPress={onClose} />
                <View
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderTopLeftRadius: 30,
                        borderTopRightRadius: 30,
                        padding: 24,
                        paddingBottom: 40,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 10,
                        elevation: 10
                    }}
                >
                    {/* Header Handle */}
                    <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 }} />

                    {/* Title */}
                    <View className="items-center mb-6">
                        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: `${themeColor}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                            <Ionicons name="key" size={28} color={themeColor} />
                        </View>
                        <Text className="text-2xl font-black text-slate-800 text-center">{t('unlockContactTitle')}</Text>
                        <Text className="text-sm text-slate-500 text-center mt-2 px-4 leading-relaxed">
                            {t('unlockContactMsg', { category: t(categoryName), city: cityName })}
                        </Text>
                    </View>

                    {/* Pass Details Card */}
                    <View className="bg-slate-50 border border-slate-100 rounded-2xl mb-6 p-4">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">{t('passDuration')}</Text>
                            <View className="bg-blue-50 px-3 py-1 rounded-full">
                                <Text className="text-blue-600 font-bold text-xs">{t('hoursActive', { count: durationHours })}</Text>
                            </View>
                        </View>
                        <View className="flex-row justify-between items-center">
                            <Text className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">{t('priceLabel')}</Text>
                            <Text className="text-2xl font-black text-slate-900">₹{price}</Text>
                        </View>
                    </View>

                    {/* Features List */}
                    <View className="mb-6 gap-3">
                        <View className="flex-row items-center">
                            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                            <Text className="text-slate-600 text-sm font-semibold ml-2.5">{t('featureCallDirectly')}</Text>
                        </View>
                        <View className="flex-row items-center">
                            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                            <Text className="text-slate-600 text-sm font-semibold ml-2.5">{t('featureNoCommission')}</Text>
                        </View>
                        <View className="flex-row items-center">
                            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                            <Text className="text-slate-600 text-sm font-semibold ml-2.5">{t('featureValidAnyProvider')}</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-4">
                        <TouchableOpacity
                            onPress={onClose}
                            style={{ flex: 1 }}
                            className="bg-slate-100 py-4 rounded-2xl items-center justify-center border border-slate-200"
                        >
                            <Text className="text-base font-bold text-slate-600">{t('cancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onConfirm}
                            style={{ backgroundColor: '#000000', flex: 2 }}
                            className="py-4 rounded-2xl items-center justify-center flex-row"
                        >
                            <Ionicons name="card" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text className="text-base font-bold text-white">{t('proceedToPay')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── Category Pass Modal ─────────────────────────────────────────────────────

interface CategoryPassModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    themeColor: string;
    categoryName: string;
    providerCount: number;
    price: number;
    durationHours: number;
    loading: boolean;
}

const CategoryPassModal = ({
    visible, onClose, onConfirm, themeColor,
    categoryName, providerCount, price, durationHours, loading
}: CategoryPassModalProps) => {
    const { t } = useTranslation();
    if (!visible) return null;
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
                <Pressable style={{ flex: 1 }} onPress={onClose} />
                <View style={{
                    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
                    padding: 24, paddingBottom: 44,
                    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
                    shadowOpacity: 0.12, shadowRadius: 16, elevation: 16
                }}>
                    {/* Handle */}
                    <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 }} />

                    {/* Header */}
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <LinearGradient
                            colors={[themeColor, `${themeColor}BB`]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={{ width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
                        >
                            <Ionicons name="people" size={32} color="#fff" />
                        </LinearGradient>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                            {t('unlockAllTitle', { category: t(categoryName) })}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, paddingHorizontal: 16, lineHeight: 19 }}>
                            {t('unlockAllMsg', { count: providerCount })}
                        </Text>
                    </View>

                    {/* Savings card */}
                    <LinearGradient
                        colors={['#F0FDF4', '#DCFCE7']}
                        style={{ borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#BBF7D0' }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('categoryPass')}</Text>
                            <View style={{ backgroundColor: '#16A34A', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{t('bestValue')}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                            <Text style={{ fontSize: 36, fontWeight: '900', color: '#0F172A' }}>₹{price}</Text>
                            <Text style={{ fontSize: 13, color: '#94A3B8', textDecorationLine: 'line-through' }}>₹{price * providerCount}</Text>
                            <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '700' }}>{t('total')}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '600', marginTop: 4 }}>
                            {t('savePassMsg', { amount: Math.max(0, price * providerCount - price) })}
                        </Text>
                    </LinearGradient>

                    {/* Feature rows */}
                    <View style={{ gap: 10, marginBottom: 24 }}>
                        {[
                            { icon: 'call', text: t('callAllMsg', { count: providerCount, category: t(categoryName) }) },
                            { icon: 'time-outline', text: t('validHoursMsg', { count: durationHours }) },
                            { icon: 'shield-checkmark-outline', text: t('noCommissionHiddenFees') },
                        ].map(({ icon, text }) => (
                            <View key={icon} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name={icon as any} size={17} color="#16A34A" />
                                <Text style={{ color: '#334155', fontSize: 13, fontWeight: '600', marginLeft: 10 }}>{text}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Buttons */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
                        >
                            <Text style={{ color: '#64748B', fontWeight: '700', fontSize: 14 }}>{t('cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onConfirm}
                            disabled={loading}
                            style={{ flex: 2, borderRadius: 18, overflow: 'hidden' }}
                        >
                            <LinearGradient
                                colors={[themeColor, `${themeColor}CC`]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="card" size={18} color="#fff" />
                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{t('payAmount', { price: price })}</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export default function ServiceDetailScreen() {
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        onClose?: () => void;
    } | null>(null);

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'error', onClose?: () => void) => {
        setAlertConfig({ visible: true, title, message, type, onClose });
    };

    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const user = useAppStore(state => state.user);
    const refreshProfile = useAppStore(state => state.refreshProfile);
    const unlockedContacts = useAppStore(state => state.unlockedContacts);
    const userLocation = useAppStore(state => state.userLocation);
    const handleRazorpayPayment = useAppStore(state => state.handleRazorpayPayment);
    const fetchActivePasses = useAppStore(state => (state as any).fetchActivePasses);

    const { id, name, color, icon } = useLocalSearchParams<{ id: string, name: string, color: string, icon: string }>();

    const { data: subCategories = [], isLoading: loadingTags } = useSubCategories(id);
    const { data: providers = [], isLoading: loadingProviders } = useProviders(
        id,
        userLocation?.coords ? { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude } : null,
        name,
        user?.id
    );
    const { data: cityPricingData, isLoading: loadingPricing } = useCityPricing(
        id,
        userLocation?.coords ? { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude } : null
    );
    const { data: activePasses = [] } = useActivePasses(user?.id);

    const isUnlocked = (providerId: string, categoryId?: string) => {
        if (unlockedContacts.includes(providerId)) return true;

        // Dynamic check from the secure database RPC response
        const providerObj = providers.find(p => p.provider_id === providerId);
        if (providerObj && providerObj.is_unlocked) return true;

        if (categoryId) {
            const now = new Date().toISOString();
            return activePasses.some(p => p.profession_id === categoryId && p.expires_at > now && p.payment_status === 'paid');
        }
        return false;
    };

    const cityConfig = cityPricingData?.cityConfig || null;
    const pricingConfig = cityPricingData?.pricingConfig || null;

    // State for local mutation loading (Razorpay payments)
    const [mutateLoading, setLoading] = useState(false);

    // Combine hooks loading state with mutation loading state
    const loading = loadingProviders || loadingPricing || mutateLoading;

    const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isListening, setIsListening] = useState(false);

    useSpeechRecognitionEvent('start', () => setIsListening(true));
    useSpeechRecognitionEvent('end', () => setIsListening(false));
    useSpeechRecognitionEvent('result', (event) => {
        if (event.results && event.results[0]) {
            const transcript = event.results[0].transcript;
            const cleaned = transcript.trim().replace(/[.?,!]/g, "");
            setSearchQuery(cleaned);
        }
    });
    useSpeechRecognitionEvent('error', (event) => {
        if (event.error === 'no-speech') {
            // Silently kill the session and prepare for a new one
            try {
                ExpoSpeechRecognitionModule.stop();
            } catch { }
            setIsListening(false);
        } else {
            console.warn('[SpeechToText Error]', event.error, event.message);
            try {
                ExpoSpeechRecognitionModule.stop();
            } catch { }
            setIsListening(false);
        }
    });

    const checkAndRequestVoicePermission = async (): Promise<boolean> => {
        const permissionStatus = await ExpoSpeechRecognitionModule.getPermissionsAsync();

        if (permissionStatus.granted) {
            return true;
        }

        return new Promise((resolve) => {
            Alert.alert(
                t('voiceSearchAccessRequired'),
                t('voiceSearchPermissionMsg'),
                [
                    {
                        text: t('cancel'),
                        style: "cancel",
                        onPress: () => resolve(false)
                    },
                    {
                        text: t('allow'),
                        onPress: async () => {
                            const requestResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
                            resolve(requestResult.granted);
                        }
                    }
                ]
            );
        });
    };

    const handleVoiceSearch = async () => {
        if (isListening) {
            ExpoSpeechRecognitionModule.stop();
            return;
        }

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch { }

        const permissionGranted = await checkAndRequestVoicePermission();
        if (!permissionGranted) {
            showAlert(t('permissionDenied'), t('micPermissionRequired'), 'error');
            return;
        }

        try {
            ExpoSpeechRecognitionModule.start({
                lang: "en-IN",
                interimResults: true,
            });
        } catch (err: any) {
            console.error("Failed to start speech recognition:", err);
            showAlert(t('error'), t('voiceRecognitionError'), 'error');
        }
    };

    const [selectedContact, setSelectedContact] = useState<any | null>(null);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [tempProviderForSuccess, setTempProviderForSuccess] = useState<any | null>(null);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [providerToUnlock, setProviderToUnlock] = useState<any | null>(null);
    const [showCategoryPassModal, setShowCategoryPassModal] = useState(false);
    const [categoryPassLoading, setCategoryPassLoading] = useState(false);

    const toggleSubCategory = (tagName: string | null) => {
        if (tagName === null) {
            setSelectedSubCategories([]);
            return;
        }

        setSelectedSubCategories(prev =>
            prev.includes(tagName)
                ? prev.filter(t => t !== tagName)
                : [...prev, tagName]
        );
    };

    const handleUnlockContact = async (provider: any) => {
        if (!user?.id) {
            showAlert(t('loginRequired'), t('pleaseLoginContact'), 'warning');
            return;
        }

        if (isUnlocked(provider.provider_id, id)) {
            setSelectedContact(provider);
            setShowContactModal(true);
            return;
        }

        setProviderToUnlock(provider);
        setShowUnlockModal(true);
    };

    const handleConfirmUnlock = async () => {
        if (!providerToUnlock) return;
        setShowUnlockModal(false);

        const dynamicPrice = pricingConfig?.unlock_price || 49;
        const durationHours = pricingConfig?.unlock_duration_hours || 5;

        try {
            setLoading(true);
            const success = await handleRazorpayPayment(providerToUnlock, dynamicPrice);

            if (success) {
                // Get active gateway for logging
                let gatewayName = 'razorpay';
                try {
                    const { data: activeGw } = await insforge.database
                        .from('payment_settings')
                        .select('value')
                        .eq('key', 'active_gateway')
                        .maybeSingle();
                    if (activeGw?.value) gatewayName = activeGw.value;
                } catch (err) {}

                const passId = generateUUID();
                const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

                // 1. Create a row in unlock_passes table
                const { error: passError } = await insforge.database
                    .from('unlock_passes')
                    .insert([{
                        id: passId,
                        customer_id: user.id,
                        profession_id: id,
                        city_id: cityConfig?.id || '57b3868e-c554-4ae5-b80f-fb1bd0617542',
                        amount_paid: dynamicPrice,
                        expires_at: expiresAt,
                        payment_status: 'paid'
                    }]);

                if (passError) {
                    console.error("Failed to insert unlock pass record:", passError);
                }

                // 2. Create lead inside unlock_transactions
                const { error: txError } = await insforge.database
                    .from('unlock_transactions')
                    .insert([{
                        user_id: user.id,
                        provider_id: providerToUnlock.provider_id,
                        amount: dynamicPrice,
                        payment_status: 'completed',
                        transaction_id: `tx_${Date.now()}`
                    }]);

                if (txError) {
                    console.error("Failed to insert unlock lead transaction:", txError);
                }

                // 3. Create record in payments ledger
                try {
                    await insforge.database
                        .from('payments')
                        .insert([{
                            user_id: user.id,
                            payment_type: 'unlock_pass',
                            reference_id: passId,
                            amount: dynamicPrice,
                            gateway: gatewayName,
                            gateway_payment_id: `pay_unl_${Date.now()}`,
                            payment_status: 'paid'
                        }]);
                } catch (payErr) {
                    console.error("Failed to insert payment record in payments table:", payErr);
                }

                // Refresh passes, profile state AND the secure providers RPC
                if (fetchActivePasses) {
                    await fetchActivePasses();
                }
                await refreshProfile();

                if (user?.id) {
                    // Invalidate active passes
                    queryClient.invalidateQueries({ queryKey: ['activePasses', user.id] });
                    // Invalidate providers — forces re-call of get_nearby_providers_secure RPC
                    // which will now return is_unlocked=true and real contact details
                    queryClient.invalidateQueries({ queryKey: ['providers', id] });
                }

                setTempProviderForSuccess(providerToUnlock);
                setShowSuccessModal(true);
            } else {
                showAlert(t('paymentCancelled'), t('paymentNotCompleted'), 'warning');
            }
        } catch (err: any) {
            showAlert(t('paymentError'), err.message, 'error');
        } finally {
            setLoading(false);
            setProviderToUnlock(null);
        }
    };

    // ── Category pass: one payment → all providers in category unlocked ──────
    const handleBuyCategoryPass = async () => {
        if (!user?.id) {
            showAlert(t('loginRequired'), t('pleaseLoginContinue'), 'warning');
            return;
        }
        setShowCategoryPassModal(false);
        setCategoryPassLoading(true);

        const passPrice = pricingConfig?.unlock_price || 49;
        const durationHours = pricingConfig?.unlock_duration_hours || 5;

        try {
            // Use first provider as payment proxy (Razorpay needs a reference)
            const proxy = providers[0] || { provider_id: id };
            const success = await handleRazorpayPayment(proxy, passPrice);

            if (success) {
                // Get active gateway for logging
                let gatewayName = 'razorpay';
                try {
                    const { data: activeGw } = await insforge.database
                        .from('payment_settings')
                        .select('value')
                        .eq('key', 'active_gateway')
                        .maybeSingle();
                    if (activeGw?.value) gatewayName = activeGw.value;
                } catch (err) {}

                const passId = generateUUID();
                const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

                // 1. Create the category-level unlock pass
                const { error: passError } = await insforge.database
                    .from('unlock_passes')
                    .insert([{
                        id: passId,
                        customer_id: user.id,
                        profession_id: id,
                        city_id: cityConfig?.id || '57b3868e-c554-4ae5-b80f-fb1bd0617542',
                        amount_paid: passPrice,
                        expires_at: expiresAt,
                        payment_status: 'paid'
                    }]);

                if (passError) console.error('Category pass insert failed:', passError);

                // Insert into payments ledger
                try {
                    await insforge.database.from('payments').insert([{
                        user_id: user.id,
                        payment_type: 'unlock_pass',
                        reference_id: passId,
                        amount: passPrice,
                        gateway: gatewayName,
                        gateway_payment_id: `pay_unl_${Date.now()}`,
                        payment_status: 'paid'
                    }]);
                } catch (payErr) {
                    console.error("Failed to insert category pass payment record:", payErr);
                }

                // 2. Bulk-insert unlock_transactions for every provider in category
                const transactions = providers.map(p => ({
                    user_id: user.id,
                    provider_id: p.provider_id,
                    amount: passPrice,
                    payment_status: 'completed',
                    transaction_id: `cat_${Date.now()}_${p.provider_id.slice(0, 8)}`
                }));

                if (transactions.length > 0) {
                    const { error: txError } = await insforge.database
                        .from('unlock_transactions')
                        .insert(transactions);
                    if (txError) console.error('Bulk transactions insert failed:', txError);
                }

                if (fetchActivePasses) await fetchActivePasses();
                await refreshProfile();

                if (user?.id) {
                    // Invalidate active passes
                    queryClient.invalidateQueries({ queryKey: ['activePasses', user.id] });
                    // Invalidate providers — forces re-call of get_nearby_providers_secure RPC
                    // All providers in this category will now return is_unlocked=true with real contacts
                    queryClient.invalidateQueries({ queryKey: ['providers', id] });
                }

                // Show the same success modal as single-unlock for consistent UX
                setTempProviderForSuccess(providers[0] || null);
                setShowSuccessModal(true);
            } else {
                showAlert(t('paymentCancelled'), t('paymentNotCompleted'), 'warning');
            }
        } catch (err: any) {
            showAlert(t('paymentError'), err.message, 'error');
        } finally {
            setCategoryPassLoading(false);
        }
    };

    const filteredProviders = providers.filter(p => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = query === '' ||
            p.full_name.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query) ||
            p.tags?.some((t: string) => t.toLowerCase().includes(query));

        const matchesSubCat = selectedSubCategories.length > 0
            ? selectedSubCategories.some(tag =>
                p.description?.toLowerCase().includes(tag.toLowerCase()) ||
                p.tags?.some((t: string) => t.toLowerCase() === tag.toLowerCase())
            )
            : true;

        return matchesSearch && matchesSubCat;
    });

    const colorScheme = useColorScheme()
    const router = useRouter()

    const renderHeader = () => (
        <View className="w-full">

            {/* Category Header Card */}
            <View className="px-5 mb-6">
                <View
                    className="rounded-[12px] min-h-[110px] py-4 flex-row items-center justify-start px-6"
                    style={{
                        backgroundColor: color || '#3B82F6',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 3
                    }}
                >
                    <SafeIcon name={(icon as any) || 'lightning-bolt'} size={44} color="white" />
                    <Text
                        style={{ fontSize: adjustHindiFont(t(name), 28, 1.1) }}
                        className="font-bold text-white ml-3 flex-1"
                        numberOfLines={2}
                        adjustsFontSizeToFit
                    >
                        {t(name)}
                    </Text>
                </View>
            </View>

            {/* Search Bar */}
            <View className="px-5 mb-4">
                <View
                    className="bg-white border border-gray-200 rounded-xl px-4 h-12 flex-row items-center"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1
                    }}
                >
                    <Ionicons name="search-outline" size={20} color="#6d737eff" />
                    <TextInput
                        placeholder={isListening ? t('listening') : t('searchRequiredServices')}
                        className="flex-1 ml-2 text-sm text-gray-700"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1 mr-1">
                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleVoiceSearch} className="p-1">
                        <Ionicons
                            name={isListening ? "mic" : "mic-outline"}
                            size={20}
                            color={isListening ? "#EF4444" : "#9CA3AF"}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Sub Categories (Tags) Collapsible Grid */}
            {!loadingTags && subCategories.length > 0 && (
                <View className="mb-6 px-5">
                    <View className="flex-row items-center flex-wrap gap-3">
                        {/* Combined list of options */}
                        {(() => {
                            const allOptions = [
                                { id: 'all', name: null, label: t('all') },
                                ...subCategories.map(s => ({ ...s, label: t(s.name) }))
                            ];

                            // Show only 4 items if not expanded
                            const visibleOptions = isExpanded ? allOptions : allOptions.slice(0, 4);

                            return visibleOptions.map((item, index) => {
                                const isSelected = item.name === null
                                    ? selectedSubCategories.length === 0
                                    : selectedSubCategories.includes(item.name);

                                return (
                                    <TouchableOpacity
                                        key={item.id ? `${item.id}-${index}` : `subcat-${index}`}
                                        onPress={() => toggleSubCategory(item.name)}
                                        style={{
                                            width: width - 40,
                                            ...(isSelected ? {
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: 0.05,
                                                shadowRadius: 2,
                                                elevation: 1
                                            } : {})
                                        }} // 1 column logic + shadow
                                        className={`py-3 rounded-2xl border flex-row items-center justify-start ml-2 px-3 ${isSelected
                                            ? 'bg-black border-black'
                                            : 'bg-slate-50 border-slate-100'
                                            }`}
                                    >
                                        <Ionicons
                                            name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                                            size={18}
                                            color={isSelected ? "white" : "#64748B"}
                                        />
                                        <Text
                                            numberOfLines={1}
                                            style={{ fontSize: adjustHindiFont(item.label, 14, 1.15) }}
                                            className={`ml-2 font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-600'
                                                }`}
                                        >
                                            {t(item.label)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            });
                        })()}
                    </View>

                    {/* Expand/Collapse Button */}
                    {subCategories.length > 3 && (
                        <TouchableOpacity
                            onPress={() => setIsExpanded(!isExpanded)}
                            className="mt-4 items-center justify-center py-2 rounded-xl"
                            style={{
                                backgroundColor: 'rgba(241, 245, 249, 0.5)',
                                borderColor: 'rgba(226, 232, 240, 0.5)',
                                borderWidth: 1
                            }}
                        >
                            <View className="flex-row items-center">
                                <Text className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                                    {isExpanded ? t('showLess') : t('viewMore', { count: subCategories.length - 3 })}
                                </Text>
                                <Ionicons
                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                    size={14}
                                    color="#64748B"
                                    style={{ marginLeft: 6 }}
                                />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Available Providers header + Category Pass banner */}
            <View className="px-5 mb-3 flex-row items-center justify-between">
                <Text className="text-xl font-bold text-gray-900">{t('availableProviders')}</Text>
                {providers.length > 0 && (
                    <View style={{ backgroundColor: `${color}20`, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ color: color || '#3B82F6', fontSize: 11, fontWeight: '800' }}>{t('nearYou', { count: providers.length })}</Text>
                    </View>
                )}
            </View>

            {/* Category Pass CTA — only show when user hasn't unlocked all yet */}
            {providers.length > 0 && !providers.every(p => isUnlocked(p.provider_id, id)) && (
                <TouchableOpacity
                    onPress={() => setShowCategoryPassModal(true)}
                    activeOpacity={0.92}
                    style={{ marginHorizontal: 20, marginBottom: 16 }}
                >
                    <LinearGradient
                        colors={[color || '#3B82F6', `${color || '#3B82F6'}AA`]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons name="people" size={22} color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', marginBottom: 2 }}>
                                    {t('unlockAllContacts', { category: t(name) })}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' }}>
                                    {t('prosCountPay', { count: providers.length, price: pricingConfig?.unlock_price || 49 })}
                                </Text>
                            </View>
                        </View>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 8 }}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{t('unlockAll')}</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderEmpty = () => {
        if (loading) {
            return (
                <View className="py-10 items-center justify-center">
                    <ActivityIndicator size="large" color={color || '#3B82F6'} />
                </View>
            );
        }
        return (
            <View className="items-center justify-center py-10 px-5">
                <Text className="text-gray-400 font-medium text-center">{t('noProvidersFound')}</Text>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-white">
            {/* Fixed title bar — never scrolls */}
            <View
                className="px-5 flex-row items-center gap-2 bg-white mb-4"
                style={{ paddingTop: 60, paddingBottom: 12, borderBottomWidth: 0 }}
            >
                <Ionicons
                    name="arrow-back"
                    size={22}
                    color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
                    onPress={() => router.back()}
                />
                <Text className="text-xl font-bold text-gray-900">{t('exploreCategory', { category: t(name) })}</Text>
            </View>

            {/* Category card + search + tags + Available Providers + cards — all scroll together */}
            <FlatList
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 150 }}
                ListHeaderComponent={renderHeader}
                data={filteredProviders}
                keyExtractor={(item) => item.provider_id}
                ListEmptyComponent={renderEmpty}
                renderItem={({ item: provider }) => (
                    <View
                        className="rounded-[30px] p-5 flex-row mb-4 mx-5 relative"
                        style={{
                            backgroundColor: color || '#3B82F6',
                            shadowColor: provider.is_premium ? '#F59E0B' : '#000',
                            shadowOffset: { width: 0, height: provider.is_premium ? 12 : 10 },
                            shadowOpacity: provider.is_premium ? 0.35 : 0.15,
                            shadowRadius: provider.is_premium ? 18 : 15,
                            elevation: provider.is_premium ? 12 : 8,
                            borderColor: '#FBBF24',
                            borderWidth: provider.is_premium ? 2.5 : 0
                        }}
                    >
                        {/* Provider Image */}
                        <Image
                            source={{ uri: provider.profile_image || 'https://via.placeholder.com/150' }}
                            className="w-24 h-28 rounded-2xl bg-white/20"
                            resizeMode="cover"
                        />

                        {/* Provider Info */}
                        <View className="ml-4 flex-1">
                            <View className="flex-row items-center mb-1 flex-wrap pr-10">
                                <Text className="text-2xl font-bold text-white mr-2" numberOfLines={1}>{provider.full_name}</Text>
                                {provider.is_premium && (
                                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                                        <MaterialCommunityIcons name="crown" size={12} color="#D97706" />
                                        <Text style={{ color: '#D97706', fontSize: 9, fontWeight: 'bold', marginLeft: 2 }}>PREMIUM</Text>
                                    </View>
                                )}
                            </View>
                            <View className="flex-row items-center mb-1">
                                <Ionicons name="star" size={15} color="white" className='mb-0.4' />
                                <Text className="text-white text-xs ml-1">{provider.average_rating || 0}({provider.total_reviews || 0})</Text>
                                <Ionicons name="time-outline" size={15} color="white" style={{ marginLeft: 12 }} />
                                <Text className="text-white text-xs ml-1">{provider.distance_km?.toFixed(1) || 0} km</Text>
                            </View>
                            <View className="flex-row items-center mb-3">
                                <Feather name="briefcase" size={14} color="white" />
                                <Text className="text-white text-xs ml-1">{t('yearsExperience', { count: provider.experience_years || 0 })}</Text>
                            </View>

                            {provider.is_unlocked && provider.unlock_expires_in_seconds > 0 && (
                                <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Ionicons name="lock-open" size={12} color="#4ADE80" />
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 4 }}>
                                        {t('unlocked')} ({Math.ceil(provider.unlock_expires_in_seconds / 3600)}h left)
                                    </Text>
                                </View>
                            )}

                            {/* Skills Tags */}
                            <View className="flex-row flex-wrap">
                                <View className="px-2 py-1 rounded-full mr-2 mb-2 border border-white/50 bg-white/10">
                                    <Text className="text-[10px] text-white font-semibold">{t(name)}</Text>
                                </View>
                                {provider.is_premium && (
                                    <View style={{ backgroundColor: '#FBBF24' }} className="px-2 py-1 rounded-full mr-2 mb-2 flex-row items-center">
                                        <Ionicons name="sparkles" size={10} color="#78350F" />
                                        <Text style={{ color: '#78350F', fontSize: 10, fontWeight: 'bold', marginLeft: 2 }}>{t('topVerified')}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Call/Unlock Button */}
                        <TouchableOpacity
                            className="absolute top-5 right-5 w-12 h-12 bg-white rounded-full items-center justify-center"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 3,
                                elevation: 3
                            }}
                            onPress={() => handleUnlockContact(provider)}
                        >
                            <Ionicons
                                name={isUnlocked(provider.provider_id, id) ? "call" : "lock-closed"}
                                size={24}
                                color={color || '#3B82F6'}
                            />
                        </TouchableOpacity>
                    </View>
                )}
            />

            <ContactDetailModal
                visible={showContactModal}
                provider={selectedContact}
                onClose={() => {
                    setShowContactModal(false);
                    setSelectedContact(null);
                }}
                themeColor={color || '#3B82F6'}
                categoryName={name}
                showAlert={showAlert}
            />

            <SuccessModal
                visible={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    if (tempProviderForSuccess) {
                        // Read fresh unmasked data from the re-fetched providers list
                        const freshProvider = providers.find(p => p.provider_id === tempProviderForSuccess.provider_id) || tempProviderForSuccess;
                        setSelectedContact(freshProvider);
                        setShowContactModal(true);
                    }
                }}
                themeColor={color || '#3B82F6'}
            />

            <UnlockCategoryPassModal
                visible={showUnlockModal}
                onClose={() => {
                    setShowUnlockModal(false);
                    setProviderToUnlock(null);
                }}
                onConfirm={handleConfirmUnlock}
                themeColor={color || '#3B82F6'}
                categoryName={name || 'Service Provider'}
                cityName={t(cityConfig?.name || 'Raipur')}
                price={pricingConfig?.unlock_price || 49}
                durationHours={pricingConfig?.unlock_duration_hours || 5}
            />

            <CategoryPassModal
                visible={showCategoryPassModal}
                onClose={() => setShowCategoryPassModal(false)}
                onConfirm={handleBuyCategoryPass}
                themeColor={color || '#3B82F6'}
                categoryName={name || 'Service Provider'}
                providerCount={providers.length}
                price={pricingConfig?.unlock_price || 49}
                durationHours={pricingConfig?.unlock_duration_hours || 5}
                loading={categoryPassLoading}
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
    );
}


