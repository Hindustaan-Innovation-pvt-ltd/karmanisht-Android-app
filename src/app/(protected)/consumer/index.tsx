import { useAppStore } from '@/lib/store';
import { useCategories } from '@/hooks/queries';
// @ts-nocheck
// import HomeMap from '@/components/home-map';
import SafeIcon from '@/components/safe-icon';
import BannerStack from '@/components/banner-stack';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, Linking, Text, TouchableOpacity, View, TextInput, LayoutAnimation, Keyboard, Modal, Alert, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScalePressable from '@/components/scale-pressable';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { adjustHindiFont } from '@/lib/utils';


export default function ConsumerHome() {
    const { t } = useTranslation();
    const user = useAppStore(state => state.user);
    const unlockedProviders = useAppStore(state => state.unlockedProviders);
    const { data: categories = [] } = useCategories(user?.id);
    const userLocation = useAppStore(state => state.userLocation);
    const refreshProfile = useAppStore(state => state.refreshProfile);
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const topOffset = Math.max(insets.top, 16);
    const [showSolidBar, setShowSolidBar] = useState(false);
    const [readableAddress, setReadableAddress] = useState<string | null>(null);
    const router = useRouter();
    const params = useLocalSearchParams();
    const [showLiveMap, setShowLiveMap] = useState(true);
    useEffect(() => {
        refreshProfile().catch(err => console.error('[ConsumerHome] refreshProfile error:', err));
    }, [refreshProfile]);

    useEffect(() => {
        if (params?.showMap === 'true') {
            setShowLiveMap(true);
        }
        // Instantly apply the address label passed back from select-location
        if (params?.addressLabel) {
            setSavedAddressName(params.addressLabel as string);
        }
    }, [params?.showMap, params?.addressLabel]);

    const [savedAddressName, setSavedAddressName] = useState<string | null>(null);
    const [isSearchToggle, setIsSearchToggle] = useState(false);
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

    // Fetch the user's most recent saved address from DB to show in the location pill
    useEffect(() => {
        if (!user?.id) return;
        async function fetchSavedAddress() {
            try {
                const { data } = await insforge.database
                    .from('user_addresses')
                    .select('name, address_line, latitude, longitude')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (data) {
                    // Strip leading Google Plus Codes like "6M28+PPC, " and show address_line only
                    const clean = data.address_line.replace(/^[A-Z0-9]{4,}\+[A-Z0-9]+,\s*/i, '');
                    setSavedAddressName(clean);

                    // Sync the active user location coordinates with this latest saved address
                    if (data.latitude && data.longitude) {
                        useAppStore.setState({
                            userLocation: {
                                coords: {
                                    latitude: Number(data.latitude),
                                    longitude: Number(data.longitude),
                                    altitude: 0,
                                    accuracy: 5,
                                    altitudeAccuracy: 5,
                                    heading: 0,
                                    speed: 0
                                },
                                timestamp: Date.now()
                            }
                        });
                    }
                }
            } catch (err) {
                console.error("Error fetching saved address inside consumer home:", err);
            }
        }
        fetchSavedAddress();
    }, [user?.id]);

    useEffect(() => {
        if (userLocation?.coords) {
            Location.reverseGeocodeAsync({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude
            }).then(address => {
                if (address && address.length > 0) {
                    const place = address[0];
                    const name = place.district || place.subregion || place.city || place.name || "";
                    const city = place.city || place.subregion || place.region || "";
                    if (name && city && name !== city) {
                        setReadableAddress(`${name}, ${city}`);
                    } else {
                        setReadableAddress(name || city || t('currentLocation'));
                    }
                }
            }).catch(err => {
                console.warn("Reverse geocoding error:", err);
            });
        }
    }, [userLocation]);
     function truncate(str:string){
        if(str.length>20){
            return str.slice(0,20)+'...'  
        }
        return str
     }
    // Priority: saved DB address > profile location > GPS address > fallback
    const locationName = savedAddressName || user.location || readableAddress || (userLocation ? t('locating') : "Shankar Nagar, Raipur");

    const renderHeader = () => (
        <View className="w-full pt-4 bg-white dark:bg-slate-950">
            {/* Top Bar: Location & Profile */}
            <View className="px-5 flex-row items-center justify-between" style={{ marginTop: topOffset }}>
                <View className="flex-1 mr-4">
                    <ScalePressable
                        onPress={() => router.push('/(location)/select-location' as any)}
                        className="flex-row items-center mt-1"
                    >
                        <Ionicons name="location" size={18} color="#3B82F6" />
                        <Text className="ml-1.5 text-base font-bold text-gray-900 dark:text-white" numberOfLines={1}>
                            {truncate(locationName)}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color="#94A3B8" className="ml-1" />
                    </ScalePressable>
                </View>

                {/* Profile Button */}
                <ScalePressable
                    onPress={() => router.push('/(protected)/consumer/profile' as any)}
                    hapticType="selection"
                    scaleTo={0.92}
                    className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full items-center justify-center border border-gray-200 dark:border-slate-800 shadow-sm"
                >
                    {user?.profile_image ? (
                        <Image source={{ uri: user.profile_image }} className="w-12 h-12 rounded-full" />
                    ) : (
                        <Ionicons name="person" size={20} color={isDark ? "#FFFFFF" : "#1E293B"} />
                    )}
                </ScalePressable>
            </View>

            {/* Welcome message & Search block */}
            <View className="px-5 mt-6 gap-3 mb-4">
                <Text className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                    {t('helloUser', 'Hello')}, {user?.name || t('guest')}!
                </Text>
                
                {/* Search Bar */}
                <TouchableOpacity
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsSearchToggle(!isSearchToggle);
                    }}
                    activeOpacity={0.8}
                    className="flex-row items-center bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl px-4 py-3.5 mt-2"
                >
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <Text className="ml-3 text-gray-400 font-semibold text-sm flex-1">{t('searchServices', 'Search for services...')}</Text>
                    <Ionicons name="mic-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            {/* Elegant Premium Animated Banners Stack */}
            <BannerStack />

            {/* Your Contacts Section */}
            <View className="py-5 px-5">
                <Text className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-5">{t('yourContacts')}</Text>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={unlockedProviders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => <ContactCard provider={item} index={index} />}
                    ListEmptyComponent={
                        <></>
                    }
                    ListFooterComponent={
                        <TouchableOpacity
                            onPress={() => router.push('/(protected)/consumer/services' as any)}
                            className="w-44 h-44 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-[15px] items-center justify-center ml-2 shadow-sm"
                        >
                            <Ionicons name="add" size={40} color="#D1D5DB" />
                            <Text className="text-sm text-gray-400 dark:text-slate-550 font-medium mt-2">{t('findMore')}</Text>
                        </TouchableOpacity>
                    }
                />
            </View>



            {/* Explore Services Header */}
            <View className="mt-8 px-5 mb-6 flex-row items-center justify-between h-12" onTouchStart={(e) => e.stopPropagation()}>
                <Text className="text-xl font-bold text-gray-900 dark:text-slate-100">{t('exploreServices')}</Text>
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
                                            className="flex-row items-center bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-900/60 p-3 rounded-2xl active:scale-98"
                                        >
                                            <View
                                                style={{ backgroundColor: color }}
                                                className="w-10 h-10 rounded-xl items-center justify-center shadow-sm"
                                            >
                                                <SafeIcon name={icon} size={20} color="white" />
                                            </View>
                                            <View className="ml-4 flex-1">
                                                <Text
                                                    style={{ fontSize: adjustHindiFont(t(item.name), 16, 1.15) }}
                                                    className="font-bold text-slate-900 dark:text-slate-100"
                                                >
                                                    {t(item.name)}
                                                </Text>
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
        </View>
    );

    return (
        <View
            className="flex-1 bg-white dark:bg-slate-950"
            onTouchStart={() => {
                if (isSearchToggle) {
                    Keyboard.dismiss();
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsSearchToggle(false);
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
                contentContainerStyle={{ paddingBottom: 150 }}
                ListHeaderComponent={renderHeader()}
                data={filteredCategories}
                keyExtractor={(item) => item.id}
                numColumns={3}
                columnWrapperStyle={{
                    justifyContent: 'space-between', paddingHorizontal: 20
                }}
                renderItem={({ item, index }) => <ServiceCard service={item} index={index} />}
                ListEmptyComponent={
                    searchQuery.length > 0 ? (
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
            />
        </View>
    );
}

const ContactCard = ({ provider, index }: { provider: any; index: number }) => {
    const { t } = useTranslation();
    const router = useRouter();
    const avatar =
        provider.profile_image ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.full_name)}&background=6366F1&color=fff&size=176`;
    const scale = useSharedValue(1);
    const borderOpacity = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const borderStyle = useAnimatedStyle(() => ({
        opacity: borderOpacity.value,
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.93, { damping: 18, stiffness: 220 });
        borderOpacity.value = withSpring(1, { damping: 20, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 18, stiffness: 220 });
        borderOpacity.value = withSpring(0, { damping: 20, stiffness: 300 });
    };

    const rating = provider.average_rating ? Number(provider.average_rating).toFixed(1) : null;

    return (
        <Animated.View
            entering={FadeInRight.delay(index * 55).springify().damping(18).stiffness(140)}
        >
            <Animated.View style={animatedStyle}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={() =>
                        router.push({
                            pathname: '/(protected)/consumer/services/[id]',
                            params: { id: provider.category_id, providerId: provider.id },
                        } as any)
                    }
                    style={{ width: 176, height: 176, borderRadius: 20, overflow: 'hidden', marginRight: 12 }}
                >
                    {/* Photo */}
                    <Image
                        source={{ uri: avatar }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />

                    {/* Animated press border ring */}
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            {
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                borderRadius: 20,
                                borderWidth: 2.5,
                                borderColor: '#6366F1',
                            },
                            borderStyle,
                        ]}
                    />

                    {/* Gradient nameplate */}
                    <LinearGradient
                        colors={['transparent', 'rgba(214, 214, 214, 0.72)', 'rgba(218, 218, 218, 0.92)']}
                        locations={[0, 0.55, 1]}
                        style={{
                            position: 'absolute',
                            bottom: 0, left: 0, right: 0,
                            paddingTop: 24,
                            paddingBottom: 10,
                            paddingHorizontal: 10,
                        }}
                    >
                        <Text
                            style={{ color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.1 }}
                            numberOfLines={1}
                        >
                            {provider.full_name}
                        </Text>
                        {provider.business_name ? (
                            <Text
                                style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9.5, fontWeight: '600', marginTop: 1 }}
                                numberOfLines={1}
                            >
                                {provider.business_name}
                            </Text>
                        ) : null}

                        {/* Rating row */}
                        {rating && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <Ionicons name="star" size={10} color="#FBBF24" />
                                <Text style={{ color: '#FBBF24', fontSize: 10, fontWeight: '800', marginLeft: 3 }}>
                                    {rating}
                                </Text>
                                {provider.total_jobs_completed > 0 && (
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginLeft: 4 }}>
                                        · {t('jobsCount', { count: provider.total_jobs_completed })}
                                    </Text>
                                )}
                            </View>
                        )}
                    </LinearGradient>

                    {/* Call FAB */}
                    <TouchableOpacity
                        onPress={() => {
                            if (provider.mobile) {
                                Linking.openURL(`tel:${provider.mobile}`).catch((err) => {
                                    console.error('Failed to open dialer:', err);
                                });
                            }
                        }}
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            overflow: 'hidden',
                            shadowColor: '#fff',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.35,
                            shadowRadius: 4,
                            elevation: 6,
                        }}
                    >
                        <LinearGradient
                            colors={['#22C55E', '#16A34A']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                width: '100%',
                                height: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="call" size={16} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
};

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

const ServiceCard = ({ service, index }: { service: any; index: number }) => {
    const { t } = useTranslation();
    const router = useRouter();
    // Default icons/colors if missing from DB
    const icon = (service.icon as any) || 'lightning-bolt';
    const color = getVibrantColor(service);

    return (
        <Animated.View
            entering={FadeInDown.duration(400)}
            className="w-[31%] aspect-square mb-4"
        >
            <ScalePressable
                onPress={() => router.push({
                    pathname: '/(protected)/consumer/services/[id]',
                    params: { id: service.id, name: service.name, color: color, icon: icon }
                } as any)}
                hapticType="light"
                scaleTo={0.93}
                className="w-full h-full rounded-lg items-center justify-center shadow-sm"
                style={{ backgroundColor: color }}
            >
                <SafeIcon name={icon} size={28} color="white" />
                <Text
                    className="text-sm text-white font-medium mt-2 text-center px-1 uppercase tracking-tighter leading-none"
                >
                    {t(service.name)}
                </Text>
            </ScalePressable>
        </Animated.View>
    );
};


