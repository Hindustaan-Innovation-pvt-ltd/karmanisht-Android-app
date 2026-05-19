import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, useColorScheme } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MapPinIcon, CrosshairIcon } from '@/svg/icons'
import { useAppStore } from '@/lib/store';
import BackButton from '@/components/back-button'
import Progress from '@/components/progress'

const RADIUS_OPTIONS = [1, 2, 5, 10, 20]

export default function LocationInfo() {
    const { user, updateDatabaseProfile } = useAppStore();
    const isDark = useColorScheme() === 'dark'

    const router = useRouter()
    const [radiusKm, setRadiusKm] = React.useState(user?.searchRadiusKm || 5)
    const [locationLabel] = React.useState('Shankar Nagar, Raipur')

    React.useEffect(() => {
        if (user?.searchRadiusKm) {
            setRadiusKm(user.searchRadiusKm)
        }
    }, [user?.searchRadiusKm])

    const handleFinish = async () => {
        await updateDatabaseProfile({ 
            location: locationLabel,
            searchRadiusKm: radiusKm
        });
        
        if (user?.role === 'worker') {
            router.push('/(onboarding)/worker/profession')
        } else {
            router.replace('/(protected)/consumer')
        }
    }

    return (
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

                        {/* Location Preview */}
                        <View className='bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 mb-8'>
                            <View className='flex-row items-center gap-3 mb-4'>
                                <View className='bg-black dark:bg-blue-600 p-2 rounded-full'>
                                    <MapPinIcon size={20} color="white" />
                                </View>
                                <View className='flex-1'>
                                    <Text className='text-xs text-slate-400 font-bold uppercase tracking-wider'>Current Location</Text>
                                    <Text className='text-lg font-bold text-slate-900 dark:text-slate-100'>{locationLabel}</Text>
                                </View>
                                <TouchableOpacity className='bg-slate-200 dark:bg-slate-800 p-2 rounded-full'>
                                    <CrosshairIcon size={20} color={isDark ? "#94a3b8" : "#475569"} />
                                </TouchableOpacity>
                            </View>

                            <View className='h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl items-center justify-center overflow-hidden'>
                                <Text className='text-slate-400 dark:text-slate-500 font-medium'>Map View Placeholder</Text>
                                {/* In a real app, a MapView would be here */}
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
    )
}
