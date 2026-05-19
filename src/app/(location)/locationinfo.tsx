import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, useColorScheme, TextInput, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MapPinIcon, CrosshairIcon } from '@/svg/icons'
import { useAppStore } from '@/lib/store';
import BackButton from '@/components/back-button'
import Progress from '@/components/progress'
import * as Location from 'expo-location'

const RADIUS_OPTIONS = [1, 2, 5, 10, 20]

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
    const [radiusKm, setRadiusKm] = React.useState(user?.searchRadiusKm || 5)
    const [locationLabel, setLocationLabel] = React.useState(user?.location || 'Shankar Nagar, Raipur')
    const [loadingLocation, setLoadingLocation] = React.useState(false)

    React.useEffect(() => {
        if (user?.searchRadiusKm) {
            setRadiusKm(user.searchRadiusKm)
        }
        if (user?.location) {
            setLocationLabel(user.location)
        }
    }, [user?.searchRadiusKm, user?.location])

    const handleFinish = async () => {
        if (!locationLabel.trim()) {
            Alert.alert('Required', 'Please enter or select a location.');
            return;
        }
        await updateDatabaseProfile({
            location: locationLabel.trim(),
            searchRadiusKm: radiusKm
        });

        if (user?.role === 'worker') {
            router.push('/(onboarding)/worker/profession')
        } else {
            router.replace('/(protected)/consumer')
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
            const loc = (await Location.getLastKnownPositionAsync()) ??
                        await Location.getCurrentPositionAsync({ maximumAge: 60000, timeout: 10000 });
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
            console.error("Geocoding error:", err);
            Alert.alert('Error', 'Failed to detect location. Please enter it manually.');
        } finally {
            setLoadingLocation(false);
        }
    };

    return (
        <SafeAreaProvider>
            <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
                <BackButton />
                <Progress currentStep={2} totalSteps={user?.role === 'worker' ? 5 : 2} />

                <ScrollView className='flex-1'>
                    <View className='p-6'>
                        <View className='mb-6'>
                            <Text className='text-3xl font-bold text-slate-900 dark:text-slate-100'>Service area</Text>
                            <Text className='text-base text-slate-500 mt-2'>
                                {user.role === 'worker'
                                    ? 'Set the range where you can provide services.'
                                    : 'We will show workers available in your selected area.'}
                            </Text>
                        </View>

                        {/* Location Selection Input */}
                        <View className="mb-6">
                            <Text className='text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-widest'>Your Area / Neighborhood</Text>
                            <View className='flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-1'>
                                <MapPinIcon size={20} color={isDark ? "#3b82f6" : "#000"} />
                                <TextInput
                                    className='flex-1 ml-2 text-base py-3 text-slate-900 dark:text-slate-100 font-medium'
                                    placeholder='Search or type your area name'
                                    placeholderTextColor="#94A3B8"
                                    value={locationLabel}
                                    onChangeText={setLocationLabel}
                                />
                                <TouchableOpacity 
                                    onPress={detectCurrentLocation}
                                    disabled={loadingLocation}
                                    className='bg-slate-200 dark:bg-slate-800 p-2 rounded-full'
                                >
                                    {loadingLocation ? (
                                        <ActivityIndicator size="small" color={isDark ? "#3b82f6" : "#000"} />
                                    ) : (
                                        <CrosshairIcon size={20} color={isDark ? "#3b82f6" : "#475569"} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Suggestions */}
                        <View className="mb-6">
                            <Text className='text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider'>Popular Raipur Neighborhoods</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {POPULAR_AREAS.map((area) => (
                                    <TouchableOpacity
                                        key={area}
                                        onPress={() => setLocationLabel(`${area}, Raipur`)}
                                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-full"
                                    >
                                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{area}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Coverage Radar / Preview */}
                        <View className='bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 mb-8 relative overflow-hidden'>
                            <Text className='text-xs text-slate-400 font-bold uppercase tracking-wider mb-2'>Coverage Radar ({radiusKm} KM)</Text>
                            
                            <View className='h-48 bg-slate-100 dark:bg-slate-800/50 rounded-2xl items-center justify-center relative overflow-hidden'>
                                {/* Radar Rings */}
                                <View className="absolute size-40 rounded-full border border-blue-500/10 items-center justify-center">
                                    <View className="size-28 rounded-full border border-blue-500/20 items-center justify-center">
                                        <View className="size-16 rounded-full border border-blue-500/40 items-center justify-center" />
                                    </View>
                                </View>
                                
                                {/* Glowing search area representation scaled by radiusKm */}
                                <View 
                                    style={{
                                        width: 40 + radiusKm * 6,
                                        height: 40 + radiusKm * 6,
                                        borderRadius: 9999,
                                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0, 0, 0, 0.05)',
                                        borderColor: isDark ? '#3b82f6' : '#000',
                                        borderWidth: 1.5,
                                        borderStyle: 'dashed'
                                    }}
                                    className="absolute items-center justify-center"
                                />

                                {/* Radar Center Pin */}
                                <View className="size-6 rounded-full bg-black dark:bg-blue-600 items-center justify-center shadow-lg border-2 border-white">
                                    <View className="size-2 rounded-full bg-white" />
                                </View>

                                {/* Legend/Info */}
                                <View className="absolute bottom-3 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                                    <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-center">
                                        Active coverage area: {Math.PI * radiusKm * radiusKm < 10 ? (Math.PI * radiusKm * radiusKm).toFixed(1) : Math.round(Math.PI * radiusKm * radiusKm)} sq km
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Radius Selector */}
                        <View>
                            <Text className='text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-widest'>Select Radius (KM)</Text>
                            <View className='flex-row justify-between'>
                                {RADIUS_OPTIONS.map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        onPress={() => setRadiusKm(opt)}
                                        className={`size-12 rounded-2xl items-center justify-center border ${radiusKm === opt ? 'bg-black dark:bg-blue-600 border-black dark:border-blue-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                                        style={radiusKm === opt ? {
                                            elevation: 3,
                                            shadowColor: isDark ? '#3b82f6' : '#000',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.2,
                                            shadowRadius: 4
                                        } : null}
                                    >
                                        <Text className={`font-bold ${radiusKm === opt ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {opt}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <View className='p-4 border-t border-slate-100 dark:border-slate-900'>
                    <TouchableOpacity
                        onPress={handleFinish}
                        activeOpacity={0.8}
                        className='bg-black dark:bg-blue-600 py-4 rounded-2xl items-center'
                    >
                        <Text className='text-white text-lg font-bold'>Confirm & Continue</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    )
}
