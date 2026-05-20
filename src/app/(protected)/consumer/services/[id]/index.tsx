import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, Platform, Dimensions, Modal, Clipboard, Linking, Pressable, Animated } from 'react-native';

const { width } = Dimensions.get('window');
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import ConsumerNavbar from '@/components/consumer-navbar';
import BackButton from '@/components/back-button';
import SafeIcon from '@/components/safe-icon';

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

interface ContactDetailModalProps {
    visible: boolean;
    provider: any;
    onClose: () => void;
    themeColor: string;
    categoryName: string;
}

const ContactDetailModal = ({ visible, provider, onClose, themeColor, categoryName }: ContactDetailModalProps) => {
    if (!provider) return null;

    const handleCall = () => {
        if (provider.mobile) {
            Linking.openURL(`tel:${provider.mobile}`);
        } else {
            Alert.alert('Error', 'Phone number not available');
        }
    };

    const handleCopy = () => {
        if (provider.mobile) {
            Clipboard.setString(provider.mobile);
            Alert.alert('Copied', 'Phone number copied to clipboard!');
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
                        <Text className="text-sm font-semibold text-slate-400 mt-1">{categoryName} Specialist</Text>
                    </View>

                    {/* Phone Number Field */}
                    <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-row items-center justify-between mb-6">
                        <View className="flex-row items-center">
                            <View style={{ backgroundColor: `${themeColor}20`, padding: 10, borderRadius: 12 }}>
                                <Ionicons name="call" size={24} color={themeColor} />
                            </View>
                            <View className="ml-3">
                                <Text className="text-xs text-slate-400 font-bold uppercase tracking-wider">Phone Number</Text>
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
                            <Text className="text-base font-bold text-slate-600">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleCall}
                            style={{ backgroundColor: themeColor, flex: 2 }}
                            className="py-4 rounded-2xl items-center justify-center flex-row"
                        >
                            <Ionicons name="call" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text className="text-base font-bold text-white">Call Now</Text>
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
    }, [visible]);

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
                    <Text className="text-2xl font-bold text-slate-800 text-center">Unlock Successful!</Text>
                    <Text className="text-sm text-slate-500 text-center mt-3 leading-relaxed">
                        Contact unlocked! You can now call and message this service professional.
                    </Text>

                    {/* Button */}
                    <TouchableOpacity
                        onPress={onClose}
                        style={{ backgroundColor: themeColor, width: '100%', borderRadius: 18, marginTop: 28 }}
                        className="py-4 items-center justify-center flex-row"
                    >
                        <Text className="text-base font-bold text-white">View Contact</Text>
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
                        <Text className="text-2xl font-black text-slate-800 text-center">Unlock Category Pass</Text>
                        <Text className="text-sm text-slate-500 text-center mt-2 px-4 leading-relaxed">
                            Get instant access to contact details for all {categoryName}s in {cityName}.
                        </Text>
                    </View>

                    {/* Pass Details Card */}
                    <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 mb-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Pass Duration</Text>
                            <View className="bg-blue-50 px-3 py-1 rounded-full">
                                <Text className="text-blue-600 font-bold text-xs">{durationHours} Hours Active</Text>
                            </View>
                        </View>
                        <View className="flex-row justify-between items-center">
                            <Text className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Price</Text>
                            <Text className="text-2xl font-black text-slate-900">₹{price}</Text>
                        </View>
                    </View>

                    {/* Features List */}
                    <View className="mb-6 gap-3">
                        <View className="flex-row items-center">
                            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                            <Text className="text-slate-600 text-sm font-semibold ml-2.5">Call & message all professionals directly</Text>
                        </View>
                        <View className="flex-row items-center">
                            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                            <Text className="text-slate-600 text-sm font-semibold ml-2.5">No commission fees or middleman charges</Text>
                        </View>
                        <View className="flex-row items-center">
                            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                            <Text className="text-slate-600 text-sm font-semibold ml-2.5">Valid for any provider in this category</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-4">
                        <TouchableOpacity
                            onPress={onClose}
                            style={{ flex: 1 }}
                            className="bg-slate-100 py-4 rounded-2xl items-center justify-center border border-slate-200"
                        >
                            <Text className="text-base font-bold text-slate-600">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onConfirm}
                            style={{ backgroundColor: '#000000', flex: 2 }}
                            className="py-4 rounded-2xl items-center justify-center flex-row"
                        >
                            <Ionicons name="card" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text className="text-base font-bold text-white">Proceed to Pay</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default function ServiceDetailScreen() {
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

    const activePasses = useAppStore(state => (state as any).activePasses);
    const fetchActivePasses = useAppStore(state => (state as any).fetchActivePasses);

    const { id, name, color, icon } = useLocalSearchParams<{ id: string, name: string, color: string, icon: string }>();
    const router = useRouter();

    const [providers, setProviders] = useState<any[]>([]);
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingTags, setLoadingTags] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContact, setSelectedContact] = useState<any | null>(null);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [tempProviderForSuccess, setTempProviderForSuccess] = useState<any | null>(null);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [providerToUnlock, setProviderToUnlock] = useState<any | null>(null);

    const [cityConfig, setCityConfig] = useState<{ id: string; name: string; tier: string } | null>(null);
    const [pricingConfig, setPricingConfig] = useState<{ unlock_price: number; unlock_duration_hours: number } | null>(null);
    const [loadingPricing, setLoadingPricing] = useState(true);

    useEffect(() => {
        fetchProviders();
        fetchSubCategories();
        resolveUserCityAndPricing();
        if (user?.id && fetchActivePasses) {
            fetchActivePasses();
        }
    }, [id, userLocation, user?.id]);

    const fetchSubCategories = async () => {
        setLoadingTags(true);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            console.warn(`fetchSubCategories: invalid category id format: "${id}". Using fallbacks.`);
            setSubCategories([
                { id: '1', name: 'Emergency Repair' },
                { id: '2', name: 'New Installation' },
                { id: '3', name: 'Maintenance' },
            ]);
            setLoadingTags(false);
            return;
        }
        try {
            const { data, error } = await insforge.database
                .from('service_tags')
                .select('id, name')
                .eq('category_id', id);

            if (data && !error) {
                setSubCategories(data);
            } else {
                setSubCategories([
                    { id: '1', name: 'Emergency Repair' },
                    { id: '2', name: 'New Installation' },
                    { id: '3', name: 'Maintenance' },
                ]);
            }
        } catch (err) {
            console.error("Failed to load subcategories:", err);
            setSubCategories([]);
        } finally {
            setLoadingTags(false);
        }
    };

    const resolveUserCityAndPricing = async () => {
        setLoadingPricing(true);
        try {
            let lat = userLocation?.coords?.latitude;
            let lng = userLocation?.coords?.longitude;
            
            if (!lat || !lng) {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const loc = await Location.getLastKnownPositionAsync() ??
                                    await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (loc?.coords) {
                            lat = loc.coords.latitude;
                            lng = loc.coords.longitude;
                        }
                    }
                } catch (locationErr) {
                    console.log("Could not obtain location coords:", locationErr);
                }
            }

            let cityName = 'Raipur'; // Default fallback
            if (lat && lng) {
                try {
                    const address = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                    if (address && address.length > 0) {
                        cityName = address[0].city || address[0].subregion || address[0].region || 'Raipur';
                    }
                } catch (err) {
                    console.log("Reverse geocode failed, using closest city distance fallback:", err);
                    const cityCoords = [
                        { name: 'Raipur', lat: 21.2514, lng: 81.6296 },
                        { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
                        { name: 'Indore', lat: 22.7196, lng: 75.8577 },
                        { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
                        { name: 'Bilaspur', lat: 22.0797, lng: 82.1391 },
                        { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
                        { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
                        { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
                        { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
                        { name: 'Pune', lat: 18.5204, lng: 73.8567 },
                    ];
                    let minDistance = Infinity;
                    let closest = 'Raipur';
                    for (const c of cityCoords) {
                        const dist = getDistanceKm(lat, lng, c.lat, c.lng);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closest = c.name;
                        }
                    }
                    cityName = closest;
                }
            }

            // Query cities table
            const { data: dbCities, error: cityError } = await insforge.database
                .from('cities')
                .select('*')
                .ilike('name', `%${cityName}%`);
            
            let resolvedCity = null;
            if (dbCities && dbCities.length > 0 && !cityError) {
                resolvedCity = dbCities[0];
            } else {
                // Fallback: fetch Raipur from database
                const { data: defaultCities } = await insforge.database
                    .from('cities')
                    .select('*')
                    .eq('name', 'Raipur');
                if (defaultCities && defaultCities.length > 0) {
                    resolvedCity = defaultCities[0];
                }
            }

            if (resolvedCity) {
                setCityConfig(resolvedCity);
                
                // Fetch pricing config
                const { data: priceData, error: priceError } = await insforge.database
                    .from('city_pricing_config')
                    .select('unlock_price, unlock_duration_hours')
                    .eq('city_id', resolvedCity.id)
                    .eq('profession_id', id)
                    .maybeSingle();

                if (priceData && !priceError) {
                    setPricingConfig({
                        unlock_price: Number(priceData.unlock_price),
                        unlock_duration_hours: Number(priceData.unlock_duration_hours)
                    });
                } else {
                    // Safety default based on city tier
                    const defaultPrice = resolvedCity.tier === 'tier_1' ? 99 : 49;
                    setPricingConfig({
                        unlock_price: defaultPrice,
                        unlock_duration_hours: 5
                    });
                }
            }
        } catch (err) {
            console.error("resolveUserCityAndPricing failed:", err);
            setPricingConfig({
                unlock_price: 49,
                unlock_duration_hours: 5
            });
        } finally {
            setLoadingPricing(false);
        }
    };

    const fetchProviders = async () => {
        setLoading(true);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            console.warn(`fetchProviders: invalid category id format: "${id}". Skipping DB fetch.`);
            setProviders([]);
            setLoading(false);
            return;
        }
        try {
            const { data: provSvcData, error: provSvcError } = await insforge.database
                .from('provider_services')
                .select('provider_id, tag_id')
                .eq('category_id', id);

            if (provSvcError) {
                console.error("Failed to fetch provider services:", provSvcError);
                setProviders([]);
                setLoading(false);
                return;
            }

            const providerIds = Array.from(new Set(provSvcData?.map(p => p.provider_id) || []));

            if (providerIds.length === 0) {
                setProviders([]);
                setLoading(false);
                return;
            }

            const { data: providersList, error: providersError } = await insforge.database
                .from('service_providers')
                .select(`
                    id,
                    full_name,
                    mobile,
                    profile_image,
                    experience_years,
                    bio,
                    average_rating,
                    total_jobs_completed,
                    is_active,
                    is_premium
                `)
                .in('id', providerIds)
                .eq('is_active', true);

            if (providersError) {
                console.error("Failed to fetch provider details:", providersError);
                setProviders([]);
                setLoading(false);
                return;
            }

            const { data: locationsList } = await insforge.database
                .from('provider_locations')
                .select('provider_id, latitude, longitude, service_radius_km')
                .in('provider_id', providerIds);

            const locationMap = new Map(
                locationsList?.map(l => [l.provider_id, { latitude: l.latitude, longitude: l.longitude, service_radius_km: l.service_radius_km }]) || []
            );

            const formattedProviders = (providersList || []).map(p => {
                const loc = locationMap.get(p.id);
                let distance_km = 0;
                if (loc && userLocation?.coords) {
                    distance_km = parseFloat(getDistanceKm(
                        userLocation.coords.latitude,
                        userLocation.coords.longitude,
                        loc.latitude,
                        loc.longitude
                    ).toFixed(1));
                }

                const providerTags = provSvcData
                    ?.filter(ps => ps.provider_id === p.id && ps.tag_id)
                    .map(ps => {
                        const tagObj = subCategories.find(sc => sc.id === ps.tag_id);
                        return tagObj ? tagObj.name : null;
                    })
                    .filter(Boolean) || [];

                return {
                    provider_id: p.id,
                    full_name: p.full_name,
                    profile_image: p.profile_image || "https://ui-avatars.com/api/?name=" + encodeURIComponent(p.full_name),
                    average_rating: p.average_rating || 0.0,
                    total_reviews: p.total_jobs_completed || 0,
                    distance_km: distance_km || 1.5,
                    experience_years: p.experience_years || 0,
                    mobile: p.mobile,
                    description: p.bio || ('Expert ' + name + ' services.'),
                    tags: providerTags,
                    service_radius_km: loc ? (loc.service_radius_km || 5) : 5,
                    is_premium: p.is_premium || false
                };
            });

            // Sort premium providers to the top, and sort by distance as secondary metric
            const sortedProviders = [...formattedProviders].sort((a, b) => {
                if (a.is_premium && !b.is_premium) return -1;
                if (!a.is_premium && b.is_premium) return 1;
                return a.distance_km - b.distance_km;
            });

            setProviders(sortedProviders);
        } catch (err) {
            console.error("Failed to load providers:", err);
            setProviders([]);
        } finally {
            setLoading(false);
        }
    };

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
            Alert.alert('Login Required', 'Please login to contact providers.');
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
                // 1. Create a row in unlock_passes table
                const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
                
                const { error: passError } = await insforge.database
                    .from('unlock_passes')
                    .insert([{
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

                // Refresh passes & profile state
                if (fetchActivePasses) {
                    await fetchActivePasses();
                }
                await refreshProfile();

                setTempProviderForSuccess(providerToUnlock);
                setShowSuccessModal(true);
            } else {
                Alert.alert('Payment Cancelled', 'The payment process was not completed.');
            }
        } catch (err: any) {
            Alert.alert('Payment Error', err.message);
        } finally {
            setLoading(false);
            setProviderToUnlock(null);
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

        // Calculate range overlaps
        const consumerRadius = user?.searchRadiusKm || 5;
        const providerRadius = p.service_radius_km || 5;
        const matchesLocationRange = p.distance_km <= consumerRadius && p.distance_km <= providerRadius;

        return matchesSearch && matchesSubCat && matchesLocationRange;
    });

    const renderHeader = () => (
        <View className="w-full">
            {/* Back Button */}
            <BackButton />

            {/* Explore Services Title */}
            <View className="px-5 mb-4 mt-20">
                <Text className="text-xl font-bold text-gray-900">Explore Services</Text>
            </View>

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
                        className="text-5xl font-bold text-white ml-3 flex-1"
                        numberOfLines={2}
                        adjustsFontSizeToFit
                    >
                        {name}
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
                        placeholder="Search your required services"
                        className="flex-1 ml-2 text-sm text-gray-700"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Sub Categories (Tags) Collapsible Grid */}
            {!loadingTags && subCategories.length > 0 && (
                <View className="mb-6 px-5">
                    <View className="flex-row flex-wrap gap-3">
                        {/* Combined list of options */}
                        {(() => {
                            const allOptions = [
                                { id: 'all', name: null, label: 'All' },
                                ...subCategories.map(s => ({ ...s, label: s.name }))
                            ];

                            // Show only 4 items if not expanded
                            const visibleOptions = isExpanded ? allOptions : allOptions.slice(0, 4);

                            return visibleOptions
                                .reduce((acc: any[][], _, i, arr) =>
                                    (i % 2 === 0 ? [...acc, arr.slice(i, i + 2)] : acc), []
                                )
                                .flatMap((row) =>
                                    row.map((item) => {
                                        const isSelected = item.name === null
                                            ? selectedSubCategories.length === 0
                                            : selectedSubCategories.includes(item.name);

                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                onPress={() => toggleSubCategory(item.name)}
                                                style={{
                                                    width: (width - 40 - 12) / 2,
                                                    ...(isSelected ? {
                                                        shadowColor: '#000',
                                                        shadowOffset: { width: 0, height: 1 },
                                                        shadowOpacity: 0.05,
                                                        shadowRadius: 2,
                                                        elevation: 1
                                                    } : {})
                                                }} // 2 columns logic + shadow
                                                className={`py-3 rounded-2xl border flex-row items-center justify-center px-3 ${isSelected
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
                                                    className={`ml-2 text-sm font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-600'
                                                        }`}
                                                >
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })
                                );
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
                                    {isExpanded ? 'Show Less' : `View More (${subCategories.length - 3} More)`}
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

            {/* Available Providers Section Title */}
            <View className="px-5 mb-6">
                <Text className="text-xl font-bold text-gray-900">Available Providers</Text>
            </View>
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
                <Text className="text-gray-400 font-medium text-center">No providers found nearby.</Text>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-white">
            <FlatList
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 60, paddingBottom: 150 }}
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
                                <Text className="text-white text-xs ml-1">{provider.experience_years || 0} years experience</Text>
                            </View>

                            {/* Skills Tags */}
                            <View className="flex-row flex-wrap">
                                <View className="px-2 py-1 rounded-full mr-2 mb-2 border border-white/50 bg-white/10">
                                    <Text className="text-[10px] text-white font-semibold">{name}</Text>
                                </View>
                                {provider.is_premium && (
                                    <View style={{ backgroundColor: '#FBBF24' }} className="px-2 py-1 rounded-full mr-2 mb-2 flex-row items-center">
                                        <Ionicons name="sparkles" size={10} color="#78350F" />
                                        <Text style={{ color: '#78350F', fontSize: 10, fontWeight: 'bold', marginLeft: 2 }}>Top Verified</Text>
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
            />

            <SuccessModal
                visible={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    if (tempProviderForSuccess) {
                        setSelectedContact(tempProviderForSuccess);
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
                cityName={cityConfig?.name || 'Raipur'}
                price={pricingConfig?.unlock_price || 49}
                durationHours={pricingConfig?.unlock_duration_hours || 5}
            />
        </View>
    );
}


