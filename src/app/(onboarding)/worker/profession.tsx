import { useAppContext } from '@/lib/context';
// @ts-nocheck
import React, { useState } from 'react'
import { FlatList, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import BackButton from '@/components/back-button'
import Progress from '@/components/progress'
import CategoryChip from '@/components/category-chip'
import {
    ZapIcon, DropletIcon, WindIcon, WrenchIcon, BriefcaseIcon,
    HomeIcon, UsersIcon, ShieldIcon, BellIcon, ClockIcon,
} from '@/svg/icons'

const PROFESSIONS = [
    { id: 'electrician', label: 'Electrician', icon: ZapIcon },
    { id: 'plumber', label: 'Plumber', icon: DropletIcon },
    { id: 'ac_technician', label: 'AC Technician', icon: WindIcon },
    { id: 'carpenter', label: 'Carpenter', icon: WrenchIcon },
    { id: 'painter', label: 'Painter', icon: BriefcaseIcon },
    { id: 'cleaner', label: 'Cleaner', icon: HomeIcon },
    { id: 'refrigerator', label: 'Refrigerator Tech', icon: WindIcon },
    { id: 'washing_machine', label: 'Washing Machine Tech', icon: WindIcon },
    { id: 'mason', label: 'Mason / Civil', icon: ShieldIcon },
    { id: 'pest_control', label: 'Pest Control', icon: ShieldIcon },
    { id: 'cook', label: 'Cook / Chef', icon: HomeIcon },
    { id: 'driver', label: 'Driver', icon: BriefcaseIcon },
    { id: 'security', label: 'Security / Watchman', icon: ShieldIcon },
    { id: 'domestic_help', label: 'Domestic Help', icon: UsersIcon },
    { id: 'gardener', label: 'Gardener / Mali', icon: BellIcon },
    { id: 'salon', label: 'Home Salon', icon: UsersIcon },
    { id: 'packers', label: 'Packers & Movers', icon: BriefcaseIcon },
    { id: 'locksmith', label: 'Locksmith', icon: ShieldIcon },
    { id: 'solar', label: 'Solar Technician', icon: ZapIcon },
    { id: 'inverter', label: 'Inverter / Battery', icon: ZapIcon },
    { id: 'tv_electronics', label: 'TV & Electronics', icon: ClockIcon },
    { id: 'computer', label: 'Computer / IT', icon: ClockIcon },
    { id: 'waterproofing', label: 'Waterproofing', icon: DropletIcon },
    { id: 'interior', label: 'Interior Designer', icon: HomeIcon },
]

export default function Profession() {
    const { user, setUser, updateDatabaseProfile, refreshProfile, unlockedContacts, unlockedProviders, isUnlocked, unlockWorker, isOnline, setOnline, toggleOnlineStatus, isLoading, hasCheckedAuth, isSessionExpired, categories, userLocation, fetchCategories, sessionToken, workerStats, handleRazorpayPayment, updateProfile, updateWorkerSpecialties, signOut } = useAppContext();


    const router = useRouter()
    const [selected, setSelected] = useState<string | null>(null)

    const toggle = (id: string) => setSelected(prev => prev === id ? null : id)

    const handleContinue = async () => {
        if (!selected) return
        const cat = categories.find(c => c.id === selected)
        if (cat) {
            await updateDatabaseProfile({ profession: cat.name, professionId: selected })
            router.push({
                pathname: '/(onboarding)/worker/services',
                params: { professionId: selected, professionName: cat.name }
            })
        }
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
                <BackButton />
                <Progress currentStep={3} totalSteps={5} />

                <View className='px-5 pt-4 pb-2'>
                    <Text className='text-2xl font-bold text-slate-900 dark:text-slate-100'>Your profession</Text>
                    <Text className='text-sm text-slate-500 mt-1'>
                        Select the primary service you provide.
                    </Text>
                </View>

                <FlatList
                    data={categories}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                    columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
                    renderItem={({ item }) => (
                        <View className='flex-1'>
                            <CategoryChip
                                label={item.name}
                                selected={selected === item.id}
                                onPress={() => toggle(item.id)}
                                icon={
                                    <MaterialCommunityIcons
                                        name={(item.icon as any) || 'briefcase'}
                                        size={20}
                                        color={selected === item.id ? "#fff" : "#64748B"}
                                    />
                                }
                            />
                        </View>
                    )}
                />

                <View className='absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800'>
                    <TouchableOpacity
                        onPress={handleContinue}
                        activeOpacity={0.8}
                        disabled={!selected}
                        className={`py-4 rounded-2xl items-center ${selected ? 'bg-black dark:bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                        <Text className={`text-base font-bold ${selected ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                            Continue
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    )
}
