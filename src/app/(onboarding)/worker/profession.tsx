// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { FlatList, Text, TouchableOpacity, View, ActivityIndicator, Dimensions } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import BackButton from '@/components/back-button'
import Progress from '@/components/progress'
import SafeIcon from '@/components/safe-icon'
import { useAppStore } from '@/lib/store'
import { insforge } from '@/lib/insforge'
import { useTheme } from '@/lib/theme'

const { width } = Dimensions.get('window');

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

export default function Profession() {
    const updateDatabaseProfile = useAppStore(state => state.updateDatabaseProfile);
    const router = useRouter()
    const { isDark } = useTheme()
    
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<string | null>(null)

    // Fetch categories directly from InsForge database
    useEffect(() => {
        const loadCategories = async () => {
            try {
                setLoading(true);
                const { data, error } = await insforge.database
                    .from('service_categories')
                    .select('*')
                    .eq('is_active', true);
                
                if (data && !error) {
                    // Sort categories alphabetically
                    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
                    setCategories(sorted);
                }
            } catch (err) {
                console.error('[Profession] Failed to fetch categories from InsForge:', err);
            } finally {
                setLoading(false);
            }
        };
        loadCategories();
    }, []);

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

                <View className='px-5 pt-4 pb-5'>
                    <Text className='text-2xl font-bold text-slate-900 dark:text-slate-100'>Your profession</Text>
                    <Text className='text-sm text-slate-500 mt-1'>
                        Select the primary service category you provide.
                    </Text>
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#000" />
                        <Text className="text-slate-500 mt-2">Loading professions...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={categories}
                        keyExtractor={item => item.id}
                        numColumns={3}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
                        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 4 }}
                        renderItem={({ item }) => {
                            const isSelected = selected === item.id;
                            const color = getVibrantColor(item);
                            const icon = item.icon || 'lightning-bolt';

                            return (
                                <TouchableOpacity
                                    onPress={() => toggle(item.id)}
                                    activeOpacity={0.9}
                                    className="w-[31%] aspect-square rounded-[20px] mb-4 items-center justify-center shadow-sm"
                                    style={{
                                        backgroundColor: color,
                                        borderWidth: isSelected ? 3.5 : 0,
                                        borderColor: isDark ? '#ffffff' : '#000000',
                                        opacity: selected === null || isSelected ? 1 : 0.45,
                                        transform: isSelected ? [{ scale: 1.03 }] : [{ scale: 1 }]
                                    }}
                                >
                                    <SafeIcon name={icon} size={34} color="white" />
                                    <Text className="text-[10px] text-white font-black mt-2 text-center px-1 uppercase tracking-tighter" numberOfLines={2}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}

                <View className='absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 z-50'>
                    <TouchableOpacity
                        onPress={handleContinue}
                        activeOpacity={0.8}
                        disabled={!selected || loading}
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
