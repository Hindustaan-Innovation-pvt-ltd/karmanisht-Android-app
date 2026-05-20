import { useAppStore } from '@/lib/store';
// @ts-nocheck
import HomeMap from '@/components/home-map';
import SafeIcon from '@/components/safe-icon';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, Image, Linking, Text, TouchableOpacity, View, TextInput, LayoutAnimation, Platform, Keyboard } from 'react-native';
import Animated, { FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');


export default function ConsumerHome() {
    const user = useAppStore(state => state.user);
    const setUser = useAppStore(state => state.setUser);
    const updateDatabaseProfile = useAppStore(state => state.updateDatabaseProfile);
    const refreshProfile = useAppStore(state => state.refreshProfile);
    const unlockedContacts = useAppStore(state => state.unlockedContacts);
    const unlockedProviders = useAppStore(state => state.unlockedProviders);
    const isUnlocked = useAppStore(state => state.isUnlocked);
    const unlockWorker = useAppStore(state => state.unlockWorker);
    const isOnline = useAppStore(state => state.isOnline);
    const setOnline = useAppStore(state => state.setOnline);
    const toggleOnlineStatus = useAppStore(state => state.toggleOnlineStatus);
    const isLoading = useAppStore(state => state.isLoading);
    const hasCheckedAuth = useAppStore(state => state.hasCheckedAuth);
    const isSessionExpired = useAppStore(state => state.isSessionExpired);
    const categories = useAppStore(state => state.categories);
    const userLocation = useAppStore(state => state.userLocation);
    const fetchCategories = useAppStore(state => state.fetchCategories);
    const sessionToken = useAppStore(state => state.sessionToken);
    const workerStats = useAppStore(state => state.workerStats);
    const handleRazorpayPayment = useAppStore(state => state.handleRazorpayPayment);
    const updateProfile = useAppStore(state => state.updateProfile);
    const updateWorkerSpecialties = useAppStore(state => state.updateWorkerSpecialties);
    const signOut = useAppStore(state => state.signOut);

    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const topOffset = Math.max(insets.top, 16);
    const [showSolidBar, setShowSolidBar] = useState(false);
    const [readableAddress, setReadableAddress] = useState<string | null>(null);
    const router = useRouter();
    const params = useLocalSearchParams();
    const [showLiveMap, setShowLiveMap] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

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
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCategories = (categories || []).filter(category => {
        const name = category?.name;
        if (typeof name !== 'string') return false;
        return name.toLowerCase().includes((searchQuery || '').toLowerCase());
    });

    console.log('[ConsumerHome] categories count:', categories?.length, 'filtered count:', filteredCategories?.length, 'searchQuery:', JSON.stringify(searchQuery));

    // Fetch the user's most recent saved address from DB to show in the location pill
    useEffect(() => {
        if (!user?.id) return;
        async function fetchSavedAddress() {
            try {
                const { data } = await insforge.database
                    .from('user_addresses')
                    .select('name, address_line')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (data) {
                    // Strip leading Google Plus Codes like "6M28+PPC, " and show address_line only
                    const clean = data.address_line.replace(/^[A-Z0-9]{4,}\+[A-Z0-9]+,\s*/i, '');
                    setSavedAddressName(clean);
                }
            } catch (error) {
                // Ignore address fetch errors silently
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
                        setReadableAddress(name || city || "Current Location");
                    }
                }
            }).catch(err => {
                console.warn("Reverse geocoding error:", err);
            });
        }
    }, [userLocation]);

    // Priority: saved DB address > profile location > GPS address > fallback
    const locationName = savedAddressName || user.location || readableAddress || (userLocation ? "Locating..." : "Shankar Nagar, Raipur");

    const renderHeader = () => (
        <View className="w-full">
            {/* Map Header Area */}
            {showLiveMap ? (
                <HomeMap
                    userLocation={userLocation?.coords ? { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude } : null}
                    topOffset={topOffset}
                    locationName={locationName}
                    onProfilePress={() => router.push('/(protected)/consumer/profile' as any)}
                    onLocationPress={() => router.push('/(location)/select-location' as any)}
                    isDark={isDark}
                />
            ) : (
                <View className="w-full bg-white dark:bg-slate-900 overflow-hidden relative shadow-sm dark:shadow-none">
                    <Image
                        source={require('../../../../assets/images/map.png')}
                        className="w-full h-96"
                        resizeMode="cover"
                    />

                    {/* Gradient Overlay */}
                    <LinearGradient
                        colors={
                            isDark ? [
                                'rgba(9,13,22,1)',
                                'rgba(9,13,22,0.9)',
                                'rgba(9,13,22,0.7)',
                                'rgba(9,13,22,0.3)',
                                'transparent',
                            ] : [
                                'rgba(255,255,255,1)',
                                'rgba(255,255,255,0.9)',
                                'rgba(255,255,255,0.7)',
                                'rgba(255,255,255,0.3)',
                                'transparent',
                            ]
                        }
                        locations={[0, 0.1, 0.2, 0.5, 1]}
                        className="absolute top-0 left-0 right-0 h-full z-10 opacity-100 dark:opacity-80"
                    />

                    <View className="absolute left-0 top-0 w-full bg-white dark:bg-slate-800 rounded-[15px] flex-row items-center justify-between px-4 shadow-lg z-20 border border-gray-100 dark:border-slate-700 dark:shadow-none">
                        {/* Centered Location Bar */}
                        <TouchableOpacity
                            onPress={() => router.push('/(location)/select-location' as any)}
                            style={{ top: topOffset }}
                            className='w-[40%] flex-row items-center bg-white shadow-md rounded-lg p-2 '
                            activeOpacity={0.8}
                        >
                            <Ionicons name="location" size={24} color="#3B82F6" />
                            <Text className="ml-3 flex-1 text-gray-900 dark:text-slate-100 font-bold text-sm" numberOfLines={1}>
                                {locationName}
                            </Text>
                        </TouchableOpacity>

                        {/* Profile Icon */}
                        <TouchableOpacity
                            onPress={() => router.push('/(protected)/consumer/profile' as any)}
                            style={{ top: topOffset }}
                            className="absolute right-4 w-14 h-14 bg-black dark:bg-slate-700 rounded-full items-center justify-center shadow-lg z-20 dark:shadow-none"
                        >
                            <Image source={{ uri: user.profile_image }} className="w-full h-full rounded-full" />
                        </TouchableOpacity>
                    </View>
                </View>)}


            {/* Your Contacts Section */}
            <View className="py-5 px-5">
                <Text className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-5">Your Contacts</Text>
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
                            <Text className="text-sm text-gray-400 dark:text-slate-500 font-medium mt-2">Find more</Text>
                        </TouchableOpacity>
                    }
                />
            </View>



            {/* Explore Services Header */}
            <View className="mt-8 px-5 mb-6 flex-row items-center justify-between h-12" onTouchStart={(e) => e.stopPropagation()}>
                <Text className="text-xl font-bold text-gray-900 dark:text-slate-100">Explore Services</Text>
                {isSearchExpanded ? (
                    <View className="w-[50%] flex-row items-center rounded-xl px-2.5 py-1.5 border-2 border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                        <Ionicons name="search" size={16} color="#9CA3AF" />
                        <TextInput
                            className="ml-1.5 flex-1 text-gray-900 dark:text-slate-100 font-medium text-[13px] p-0 m-0"
                            placeholder="Search..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsSearchExpanded(false);
                                setSearchQuery('');
                            }}
                            className="ml-2 pl-2 border-l border-gray-200 dark:border-slate-700"
                        >
                            <Text className="text-blue-500 font-semibold text-xs">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setIsSearchExpanded(true);
                        }}
                        className="flex-row items-center rounded-xl px-4 py-2 border-2 border-gray-100 dark:border-slate-800"
                    >
                        <Ionicons name="search" size={18} color="#9CA3AF" />
                        <Text className="ml-2 text-gray-400 font-medium text-sm">Search</Text>
                    </TouchableOpacity>
                )}
            </View>
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
                contentContainerStyle={{ paddingBottom: 150 }}
                ListHeaderComponent={renderHeader()}
                data={filteredCategories}
                keyExtractor={(item) => item.id}
                numColumns={3}
                columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
                renderItem={({ item, index }) => <ServiceCard service={item} index={index} />}
                ListEmptyComponent={
                    searchQuery.length > 0 ? (
                        <View className="items-center justify-center py-10 px-5">
                            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                            <Text className="text-gray-900 dark:text-slate-100 font-bold mt-4 text-center text-lg">
                                No services found
                            </Text>
                            <Text className="text-gray-500 dark:text-slate-400 text-sm mt-1 text-center">
                                Try searching for another keyword or category.
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
    const router = useRouter();
    const avatar = provider.profile_image || "https://ui-avatars.com/api/?name=" + encodeURIComponent(provider.full_name);
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }]
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 20, stiffness: 200 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 20, stiffness: 200 });
    };

    return (
        <Animated.View
            entering={FadeInRight.delay(index * 50).springify().damping(20).stiffness(150)}
        >
            <Animated.View style={[animatedStyle]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={() => router.push({
                        pathname: '/(protected)/consumer/services/[id]',
                        params: { id: provider.category_id, providerId: provider.id }
                    } as any)}
                    className="w-44 h-44 rounded-[15px] overflow-hidden mr-3 relative shadow-sm border border-gray-50 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                >
                    <Image
                        source={{ uri: avatar }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                    <View className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                        <Text className="text-white text-[10px] font-bold" numberOfLines={1}>{provider.full_name}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            if (provider.mobile) {
                                Linking.openURL(`tel:${provider.mobile}`).catch((err) => {
                                    console.error("Failed to open dialer:", err);
                                });
                            }
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center shadow-md border border-white bg-slate-200 active:scale-90"
                    >
                        <Ionicons name="call" size={16} color="black" />
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
    const router = useRouter();
    // Default icons/colors if missing from DB
    const icon = (service.icon as any) || 'lightning-bolt';
    const color = getVibrantColor(service);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 30).springify().damping(12)}
            className="w-[31%] aspect-square mb-4"
        >
            <TouchableOpacity
                onPress={() => router.push({
                    pathname: '/(protected)/consumer/services/[id]',
                    params: { id: service.id, name: service.name, color: color, icon: icon }
                } as any)}
                className="w-full h-full rounded-[20px] items-center justify-center shadow-sm"
                style={{ backgroundColor: color }}
            >
                <SafeIcon name={icon} size={36} color="white" />
                <Text className="text-[10px] text-white font-black mt-2 text-center px-1 uppercase tracking-tighter">
                    {service.name}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};


