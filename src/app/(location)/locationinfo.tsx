// @ts-nocheck
import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, useColorScheme, TextInput, Alert, ActivityIndicator, Switch, StyleSheet } from 'react-native'
import Animated, { useSharedValue, withTiming, withRepeat, withDelay, useAnimatedStyle } from 'react-native-reanimated'
import ScalePressable from '@/components/scale-pressable'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAppStore } from '@/lib/store';
import * as Location from 'expo-location'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

const POPULAR_AREAS = [
    'Shankar Nagar',
    'Telibandha',
    'Devendra Nagar',
    'Civil Lines',
    'Pandri',
    'Tatibandh',
    'Samta Colony',
    'Sadar Bazar'
]

export default function LocationInfo() {
    const { user, updateDatabaseProfile } = useAppStore();
    const isDark = useColorScheme() === 'dark'
    const router = useRouter()
    const params = useLocalSearchParams()
    const fromDashboard = params?.from === 'dashboard'
    const fromSettings = params?.from === 'settings'

    const [radiusKm, setRadiusKm] = React.useState(user?.searchRadiusKm || 5)
    const [locationLabel, setLocationLabel] = React.useState(user?.location || 'Shankar Nagar, Raipur')
    const [loadingLocation, setLoadingLocation] = React.useState(false)
    const [cityWide, setCityWide] = React.useState(user?.role === 'worker' && user?.searchRadiusKm >= 30 ? true : false)

    React.useEffect(() => {
        if (user?.searchRadiusKm) {
            setRadiusKm(user.searchRadiusKm)
            if (user.role === 'worker' && user.searchRadiusKm >= 30) {
                setCityWide(true)
            }
        }
        if (user?.location) {
            setLocationLabel(user.location)
        }
    }, [user?.searchRadiusKm, user?.location, user?.role])

    const handleFinish = async () => {
        if (!locationLabel.trim()) {
            Alert.alert('Required', 'Please enter or select a location.');
            return;
        }

        const finalRadius = (user?.role === 'worker' && cityWide) ? 50 : radiusKm;

        await updateDatabaseProfile({
            location: locationLabel.trim(),
            searchRadiusKm: finalRadius
        });

        if (fromSettings) {
            router.replace('/(protected)/worker/settings')
        } else if (fromDashboard) {
            router.back()
        } else if (user?.role === 'worker') {
            router.push('/(onboarding)/worker/profession')
        } else {
            router.replace('/(onboarding)/all-set')
        }
    }

    const detectCurrentLocation = async () => {
        setLoadingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to detect your current area.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });
            if (reverseGeocode && reverseGeocode.length > 0) {
                const place = reverseGeocode[0];
                const area = place.district || place.subregion || place.name || '';
                const city = place.city || 'Raipur';
                const label = area ? `${area}, ${city}` : city;
                setLocationLabel(label);
            } else {
                Alert.alert('Unable to resolve', 'We got your coordinates, but could not determine the area name. Please enter it manually.');
            }
        } catch (err) {
            console.log("Geocoding error:", err);
            Alert.alert('Error', 'Failed to detect location. Please enter it manually.');
        } finally {
            setLoadingLocation(false);
        }
    };

    // Calculate dynamic scaling for the coverage area preview circle
    // 2km -> small, 5km -> medium, 10km -> large, citywide -> full width
    // Scale logic moved inside animated style

    // Radar pulse animation shared value
    const radarPulse = useSharedValue(1);
    const radiusSV = useSharedValue(radiusKm);
    const cityWideSV = useSharedValue(cityWide ? 1 : 0);
    React.useEffect(() => {
        radiusSV.value = radiusKm;
        cityWideSV.value = cityWide ? 1 : 0;
        radarPulse.value = withRepeat(
            withTiming(1.2, { duration: 800 }),
            -1,
            true
        );
    }, [radiusKm, cityWide, radiusSV, cityWideSV, radarPulse]);

    const radarStyle = useAnimatedStyle(() => {
        // Determine base scale: full width if cityWide, otherwise proportional to radius (max 10km)
        const baseScale = cityWideSV.value === 1 ? 1 : radiusSV.value / 10;
        return {
            transform: [{ scale: radarPulse.value * baseScale }],
            opacity: withDelay(0, withTiming(1, { duration: 800 }))
        };
    });

    return (
        <SafeAreaProvider>
            <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
                {/* Header Back Button */}
                <View className="px-4 py-2 flex-row items-center">
                    <TouchableOpacity onPress={() => {
                        if (fromSettings) {
                            router.replace('/(protected)/worker/settings')
                        } else {
                            router.back()
                        }
                    }} className="p-1">
                        <Ionicons name="arrow-back" size={24} color={isDark ? "#F8FAFC" : "#0F172A"} />
                    </TouchableOpacity>
                </View>

                <ScrollView className='flex-1' showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    <View className='px-6 pt-2'>
                        {/* Title */}
                        <Text className='text-3xl font-black text-slate-900 dark:text-slate-100 mb-6'>
                            Service radius
                        </Text>

                        {/* Location / Area input */}
                        <View className="mb-6">
                            <Text className='text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest'>Your Location / Area</Text>
                            <View className='flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-1'>
                                <Ionicons name="location-sharp" size={20} color={isDark ? "#3B82F6" : "#64748B"} />
                                <TextInput
                                    className='flex-1 ml-2 text-base py-3 text-slate-900 dark:text-slate-100 font-medium'
                                    placeholder='Enter your neighborhood/city'
                                    placeholderTextColor="#94A3B8"
                                    value={locationLabel}
                                    onChangeText={setLocationLabel}
                                />
                                <TouchableOpacity
                                    onPress={detectCurrentLocation}
                                    disabled={loadingLocation}
                                    className='bg-slate-200/60 dark:bg-slate-800 p-2 rounded-full'
                                >
                                    {loadingLocation ? (
                                        <ActivityIndicator size="small" color="#3B82F6" />
                                    ) : (
                                        <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#3B82F6" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Popular Areas Suggestions */}
                        <View className="mb-6">
                            <Text className='text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-widest'>Raipur Neighborhoods</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {POPULAR_AREAS.map((area) => (
                                    <TouchableOpacity
                                        key={area}
                                        onPress={() => setLocationLabel(`${area}, Raipur`)}
                                        className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-2.5 rounded-full"
                                    >
                                        <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">{area}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Coverage Area Preview Card */}
                        <LinearGradient
                            colors={isDark ? ['#1E3A8A', '#312E81'] : ['#6366F1', '#A78BFA']}
                            style={{
                                borderRadius: 24,
                                padding: 24,
                                marginBottom: 24,
                                minHeight: 220,
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderWidth: 1.5,
                                borderColor: isDark ? '#475569' : '#0F172A',
                            }}
                        >

                            {/* Circle Radar Preview */}
                            <View className="flex-1 items-center justify-center my-4">
                                {/* Animated outer circle */}
                                <Animated.View
                                    style={[radarStyle, {
                                        width: 140,
                                        height: 140,
                                        borderRadius: 70,
                                        borderWidth: 1.5,
                                        borderColor: isDark ? '#475569' : '#0F172A',
                                        backgroundColor: isDark ? 'rgba(71, 85, 105, 0.15)' : '#E2E8F0',
                                    }
                                    ]}
                                    className="items-center justify-center"
                                >
                                    {/* Inner Location Pin Badge */}
                                    <View className="size-10 rounded-full bg-slate-900 dark:bg-slate-100 items-center justify-center border-2 border-white dark:border-slate-950 shadow-md">
                                        <Ionicons name="location" size={18} color={isDark ? "#0F172A" : "#FFFFFF"} />
                                    </View>
                                </Animated.View>
                            </View>
                        </LinearGradient>
                        <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider self-start">
                            Coverage area preview
                        </Text>
                    </View>

                    {/* Quick Distance Selector */}
                    <View className="mb-6">
                        <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-widest">
                            QUICK DISTANCE
                        </Text>
                        <View className="flex-row gap-3">
                            {[2, 5, 10].map((dist) => {
                                const isActive = radiusKm === dist && !cityWide;
                                return (
                                    <ScalePressable
                                        key={dist}
                                        disabled={cityWide}
                                        onPress={() => setRadiusKm(dist)}
                                        style={isActive ? styles.btnActive : styles.btnInactive}
                                        className={`flex-1 py-3.5 rounded-xl items-center justify-center border ${cityWide ? 'opacity-40' : ''}`}
                                    >
                                        <Text style={isActive ? styles.textActive : styles.textInactive} className="text-sm font-black">
                                            {dist} km
                                        </Text>
                                    </ScalePressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* City Wide Switch Row */}
                    {user?.role === 'worker' && (
                        <View className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex-row justify-between items-center mb-6">
                            <Text className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Accept city wide requests
                            </Text>
                            <Switch
                                value={cityWide}
                                onValueChange={setCityWide}
                                trackColor={{ false: '#E2E8F0', true: '#000000' }}
                                thumbColor={cityWide ? '#FFFFFF' : '#FFFFFF'}
                            />
                        </View>
                    )}
                </ScrollView>

                {/* Footer Save Button */}
                <View className='p-4 border-t border-slate-100 dark:border-slate-900 items-center gap-2'>
                    <ScalePressable
                        onPress={handleFinish}
                        className='w-full bg-[#18181B] dark:bg-blue-600 py-4 rounded-2xl items-center'>
                        <Text className='text-white text-base font-black'>Save radius</Text>
                    </ScalePressable>
                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Service area setup
                    </Text>
                </View>
            </SafeAreaView>
        </SafeAreaProvider >
    )
}

const styles = StyleSheet.create({
    btnActive: {
        backgroundColor: '#4F46E5', // indigo-600
        borderColor: '#4F46E5',
    },
    btnInactive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
    },
    textActive: {
        color: '#FFFFFF',
    },
    textInactive: {
        color: '#0F172A',
    }
});
