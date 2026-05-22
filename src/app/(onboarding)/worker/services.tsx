// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import BackButton from '@/components/back-button'
import Progress from '@/components/progress'
import ServiceTag from '@/components/service-tag'
import { useAppStore } from '@/lib/store'
import { insforge } from '@/lib/insforge'

export default function Services() {
    const router = useRouter()
    const { professionId: paramProfessionId, professionName: paramProfessionName } = useLocalSearchParams<{ professionId: string, professionName: string }>()
    
    const updateWorkerSpecialties = useAppStore(state => state.updateWorkerSpecialties)
    const storeUser = useAppStore(state => state.user)
    const categories = useAppStore(state => state.categories)
    const fetchCategories = useAppStore(state => state.fetchCategories)

    // Ensure categories are loaded in the background
    useEffect(() => {
        if (!categories || categories.length === 0) {
            fetchCategories();
        }
    }, [categories, fetchCategories]);

    // Resolve professionName
    const rawProfessionName = paramProfessionName || storeUser?.profession;
    const professionName = Array.isArray(rawProfessionName) ? rawProfessionName[0] : rawProfessionName;

    // Resolve professionId (either param, store, or categories list lookup by name)
    const rawProfessionId = paramProfessionId || storeUser?.professionId || (professionName ? categories.find(c => c.name === professionName)?.id : null);
    const professionId = Array.isArray(rawProfessionId) ? rawProfessionId[0] : rawProfessionId;
    
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [tags, setTags] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Fetch subcategories (service tags) directly from InsForge matching category ID
    useEffect(() => {
        async function fetchTags() {
           
            if (!professionId || professionId === 'undefined' || professionId === 'null') {
                console.warn('[Services] Invalid or missing professionId. Cannot fetch tags.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true)
                const { data, error } = await insforge.database
                    .from('service_tags')
                    .select('*')
                    .eq('category_id', professionId)

                if (error) {
                    console.error('[Services] Database error while fetching service tags:', error);
                }

                if (data && !error) {
                    // Sort alphabetically
                    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
                    setTags(sorted)
                } else {
                    console.warn('[Services] No data returned or error occurred. Tags list is empty.');
                }
            } catch (err) {
                console.error('[Services] Failed to fetch service tags:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchTags()
    }, [professionId, categories])

    const toggle = (tagId: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(tagId)) {
                next.delete(tagId)
            } else {
                next.add(tagId)
            }
            return next
        })
    }

    // Save mapping between provider and chosen category + service tags to database
    const handleContinue = async () => {
        if (selected.size === 0) return
        setSaving(true)
        try {
            const success = await updateWorkerSpecialties([professionId], Array.from(selected))
            if (success) {
                router.push('/(protected)/worker/verify-identity')
            } else {
                Alert.alert('Error', 'Failed to save your selections.')
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'An error occurred.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
                <BackButton />
                <Progress currentStep={4} totalSteps={5} />

                <View className='px-5 pt-4 pb-3'>
                    <Text className='text-2xl font-bold text-slate-900 dark:text-slate-100'>Your services</Text>
                    <View className='mt-1.5 flex-row items-center gap-2'>
                        <View className='bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800'>
                            <Text className='text-sm font-semibold text-slate-700 dark:text-slate-300'>{professionName || 'Service Provider'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text className='text-sm text-blue-500 font-medium'>Change</Text>
                        </TouchableOpacity>
                    </View>
                    <Text className='text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium'>
                        What do you specifically offer?
                    </Text>
                </View>

                <ScrollView
                    className='flex-1 px-5'
                    contentContainerStyle={{ paddingBottom: 120 }}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" className="mt-20" />
                    ) : (
                        <View className='flex-row flex-wrap'>
                            {tags.map(svc => (
                                <ServiceTag
                                    key={svc.id}
                                    label={svc.name}
                                    selected={selected.has(svc.id)}
                                    onPress={() => toggle(svc.id)}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>

                <View className='absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800'>
                    <View className='flex-row items-center justify-between mb-3 px-1'>
                        <Text className='text-xs text-slate-400 dark:text-slate-500'>
                            {selected.size} service{selected.size !== 1 ? 's' : ''} selected
                        </Text>
                        {selected.size > 0 && (
                            <TouchableOpacity onPress={() => setSelected(new Set())}>
                                <Text className='text-xs text-red-400 font-medium'>Clear all</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={handleContinue}
                        activeOpacity={0.8}
                        disabled={selected.size === 0 || saving}
                        className={`py-4 rounded-2xl items-center ${selected.size > 0 ? 'bg-black dark:bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className={`text-base font-bold ${selected.size > 0 ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                Continue
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    )
}
