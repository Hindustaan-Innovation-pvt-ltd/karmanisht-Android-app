import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

    const { id, name, color, icon } = useLocalSearchParams<{ id: string, name: string, color: string, icon: string }>();
    const router = useRouter();

    const [providers, setProviders] = useState<any[]>([]);
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingTags, setLoadingTags] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchProviders();
        fetchSubCategories();
    }, [id, userLocation]);

    const fetchSubCategories = async () => {
        setLoadingTags(true);
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

    const fetchProviders = async () => {
        setLoading(true);
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
                    experience_years,
                    bio,
                    average_rating,
                    total_jobs_completed,
                    is_active
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
                    profile_image: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400',
                    average_rating: p.average_rating || 0.0,
                    total_reviews: p.total_jobs_completed || 0,
                    distance_km: distance_km || 1.5,
                    experience_years: p.experience_years || 0,
                    mobile: p.mobile,
                    description: p.bio || ('Expert ' + name + ' services.'),
                    tags: providerTags,
                    service_radius_km: loc ? (loc.service_radius_km || 5) : 5
                };
            });

            setProviders(formattedProviders);
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

        if (isUnlocked(provider.provider_id)) {
            Alert.alert('Contact', `Phone: ${provider.mobile || 'Not available'}`);
            return;
        }

        try {
            setLoading(true);
            const success = await handleRazorpayPayment(provider);

            if (success) {
                Alert.alert(
                    'Unlock Successful',
                    'Contact unlocked! You can now call this professional.',
                    [{
                        text: 'OK',
                        onPress: async () => {
                            await unlockWorker(provider.provider_id);
                        }
                    }]
                );
            } else {
                Alert.alert('Payment Cancelled', 'The payment process was not completed.');
            }
        } catch (err: any) {
            Alert.alert('Payment Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredProviders = providers.filter(p => {
        const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
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
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: 0.15,
                            shadowRadius: 15,
                            elevation: 8
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
                            <Text className="text-2xl font-bold text-white mb-1" numberOfLines={1}>{provider.full_name}</Text>
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
                                <View className="px-2 py-1 rounded-full mr-3 mb-2 border-2 border-white">
                                    <Text className="text-[10px] text-white">{name}</Text>
                                </View>
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
                                name={isUnlocked(provider.provider_id) ? "call" : "lock-closed"}
                                size={24}
                                color={color || '#3B82F6'}
                            />
                        </TouchableOpacity>
                    </View>
                )}
            />

            <ConsumerNavbar activeTab="services" />
        </View>
    );
}


