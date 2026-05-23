import { useAppStore } from '@/lib/store';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, LayoutAnimation, Keyboard, Modal, ActivityIndicator, Alert } from 'react-native';
import SafeIcon from '@/components/safe-icon';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

const VIBRANT_COLORS = [
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F43F5E', // Rose
    '#F97316', // Orange
    '#84CC16', // Lime
    '#2563EB', // Royal Blue
    '#D946EF'  // Fuchsia
];

const getVibrantColor = (service: any) => {
    if (service.color && service.color !== '#3B82F6') {
        return service.color;
    }
    let hash = 0;
    const str = service.id || service.name || '';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % VIBRANT_COLORS.length;
    return VIBRANT_COLORS[index];
};

export default function ServicesScreen() {
    const { t } = useTranslation();
    const categories = useAppStore(state => state.categories);
    const isCategoriesLoading = useAppStore(state => state.isCategoriesLoading);
    const fetchCategories = useAppStore(state => state.fetchCategories);
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [showSolidBar, setShowSolidBar] = useState(false);
    const topOffset = Math.max(insets.top, 16);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchToggle, setIsSearchToggle] = useState<boolean>(false);
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
            Alert.alert(t('permissionDenied'), t('micPermissionRequired'));
            return;
        }

        try {
            ExpoSpeechRecognitionModule.start({
                lang: "en-IN",
                interimResults: true,
            });
        } catch (err: any) {
            console.error("Failed to start speech recognition:", err);
            Alert.alert(t('error'), t('voiceRecognitionError'));
        }
    };

    const filteredCategories = (categories || []).filter(category => {
        const name = category?.name;
        if (typeof name !== 'string') return false;
        return name.toLowerCase().includes((searchQuery || '').toLowerCase());
    });

    useEffect(() => {
        // Always re-fetch to ensure we have the latest and complete list
        fetchCategories();
    }, [fetchCategories]);

    const renderHeader = () => (
        <View className="px-5 flex-row items-center justify-between mb-8 min-h-12" onTouchStart={(e) => e.stopPropagation()}>
            <Text className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex-1 mr-2">{t('exploreServices')}</Text>
            <Modal
                visible={isSearchToggle}
                transparent={false}
                animationType="fade"
                onRequestClose={() => {
                    setIsSearchToggle(false);
                    setSearchQuery('');
                    if (isListening) ExpoSpeechRecognitionModule.stop();
                }}
            >
                <View className="flex-1 bg-white dark:bg-slate-950 px-6" style={{ paddingTop: topOffset }}>
                    {/* Header Search Box */}
                    <View className="flex-row items-center py-4 gap-3 border-b border-slate-100 dark:border-slate-900">
                        <TouchableOpacity
                            onPress={() => {
                                setIsSearchToggle(false);
                                setSearchQuery('');
                                if (isListening) ExpoSpeechRecognitionModule.stop();
                            }}
                            className="w-10 h-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 active:scale-95"
                        >
                            <Ionicons name="chevron-back" size={22} color={isDark ? '#FFFFFF' : '#000000'} />
                        </TouchableOpacity>

                        <View className="flex-1 flex-row items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-800">
                            <Ionicons name="search" size={16} color="#94A3B8" />
                            <TextInput
                                className="ml-2 flex-1 text-slate-900 dark:text-white font-semibold text-sm p-0 m-0"
                                placeholder={isListening ? t('listening') : t('searchServices')}
                                placeholderTextColor="#94A3B8"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} className="p-0.5 mr-1">
                                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleVoiceSearch} className="p-0.5">
                                <Ionicons
                                    name={isListening ? "mic" : "mic-outline"}
                                    size={20}
                                    color={isListening ? "#EF4444" : "#94A3B8"}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* List of Results */}
                    <FlatList
                        className="flex-1 mt-4"
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        data={filteredCategories}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item, index }) => {
                            const color = getVibrantColor(item);
                            const icon = item.icon || 'lightning-bolt';
                            return (
                                <Animated.View
                                    entering={FadeInDown.delay(index * 20).springify().damping(12)}
                                    className="mb-3"
                                >
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsSearchToggle(false);
                                            router.push({
                                                pathname: '/(protected)/consumer/services/[id]',
                                                params: { id: item.id, name: item.name, color: color, icon: icon }
                                            } as any);
                                        }}
                                        className="flex-row items-center bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-900/60 p-3 rounded-lg active:scale-98"
                                    >
                                        <View
                                            style={{ backgroundColor: color }}
                                            className="w-10 h-10 rounded-xl items-center justify-center shadow-sm"
                                        >
                                            <SafeIcon name={icon} size={20} color="white" />
                                        </View>
                                        <View className="ml-4 flex-1">
                                            <Text className="text-base font-medium text-slate-900 dark:text-slate-100">{t(item.name)}</Text>
                                            <Text className="text-xs text-slate-400 dark:text-slate-550 font-medium mt-0.5">{t('exploreActiveProviders')}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#CBD5E1'} />
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        }}
                        ListEmptyComponent={
                            searchQuery.length > 0 ? (
                                <View className="items-center justify-center py-16 px-5">
                                    <Ionicons name="search-outline" size={48} color="#EF4444" className="mb-4" />
                                    <Text className="text-slate-900 dark:text-slate-100 font-bold text-center text-lg">
                                        {t('noServicesFound')}
                                    </Text>
                                    <Text className="text-slate-400 dark:text-slate-550 text-sm mt-1.5 text-center px-4">
                                        {t('trySearchingDifferent')}
                                    </Text>
                                </View>
                            ) : (
                                <View className="items-center justify-center py-16 px-5">
                                    <Ionicons name="sparkles-outline" size={44} color="#3B82F6" className="mb-4" />
                                    <Text className="text-slate-900 dark:text-slate-100 font-bold text-center text-base">
                                        {t('searchHindustanServices')}
                                    </Text>
                                    <Text className="text-slate-400 dark:text-slate-550 text-xs mt-1.5 text-center">
                                        {t('discoverPros')}
                                    </Text>
                                </View>
                            )
                        }
                    />
                </View>
            </Modal>
            <TouchableOpacity
                onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsSearchToggle(!isSearchToggle);
                }}
                className="flex-row items-center rounded-xl px-4 py-2 border-2 border-gray-100 dark:border-slate-800"
            >
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <Text className="ml-2 text-gray-400 font-medium text-sm">{t('search')}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View
            className="flex-1 bg-white dark:bg-slate-950"
            onTouchStart={() => {
                if (isSearchExpanded) {
                    Keyboard.dismiss();
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsSearchExpanded(false);
                    setSearchQuery('');
                }
            }}
        >
            {showSolidBar && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: insets.top + 6,
                        backgroundColor: isDark ? '#090d16' : '#ffffff',
                        zIndex: 9999,
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? '#1e293b' : '#f1f5f9',
                    }}
                />
            )}

            <FlatList
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 60, paddingBottom: 150 }}
                ListHeaderComponent={renderHeader()}
                data={filteredCategories}
                keyExtractor={(item) => item.id}
                numColumns={3}
                columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
                ListEmptyComponent={
                    isCategoriesLoading ? (
                        <View className="items-center justify-center py-16 px-5">
                            <ActivityIndicator size="large" color="#6366F1" />
                            <Text className="text-slate-400 dark:text-slate-550 text-sm mt-4 text-center font-medium">
                                {t('loadingServices')}
                            </Text>
                        </View>
                    ) : searchQuery.length > 0 ? (
                        <View className="items-center justify-center py-10 px-5">
                            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                            <Text className="text-gray-900 dark:text-slate-100 font-bold mt-4 text-center text-lg">
                                {t('noServicesFound')}
                            </Text>
                            <Text className="text-gray-500 dark:text-slate-400 text-sm mt-1 text-center">
                                {t('trySearchingDifferent')}
                            </Text>
                        </View>
                    ) : null
                }
                onScroll={(event) => {
                    const offsetY = event.nativeEvent.contentOffset.y;
                    if (offsetY > 16) {
                        setShowSolidBar(true);
                    } else {
                        setShowSolidBar(false);
                    }
                }}
                scrollEventThrottle={16}
                renderItem={({ item: service, index }) => {
                    const cardColor = getVibrantColor(service);
                    return (
                        <Animated.View
                            entering={FadeInDown.delay(index * 25).springify(20).damping(5)}
                            className="w-[31%] aspect-square mb-4"
                        >
                            <TouchableOpacity
                                key={service.id}
                                onPress={() => router.push({
                                    pathname: '/(protected)/consumer/services/[id]',
                                    params: { id: service.id, name: service.name, color: cardColor, icon: service.icon || 'lightning-bolt' }
                                } as any)}
                                className="w-full h-full rounded-[15px] items-center justify-center"
                                style={{
                                    backgroundColor: cardColor,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 3,
                                    elevation: 3
                                }}
                            >
                                <SafeIcon name={(service.icon as any) || 'lightning-bolt'} size={40} color="white" />
                                <Text className="text-[10px] text-white font-black mt-2 text-center px-1 uppercase tracking-tighter">
                                    {t(service.name)}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                }}
            />
        </View>
    );
}
