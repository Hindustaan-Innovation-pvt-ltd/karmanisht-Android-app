// @ts-nocheck
import React, { useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import BackButton from '@/components/back-button'
import Progress from '@/components/progress'
import ServiceTag from '@/components/service-tag'


export default function Services() {
    const router = useRouter()
    const { professionId, professionName } = useLocalSearchParams<{ professionId: string, professionName: string }>()
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [tags, setTags] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    React.useEffect(() => {
        async function fetchTags() {
            if (!professionId) return
            setLoading(true)
            // Mock tags for clean env
            const mockTags = [
                { id: '1', name: 'Wiring' },
                { id: '2', name: 'Repair' },
                { id: '3', name: 'Installation' },
                { id: '4', name: 'Maintenance' },
            ];
            setTags(mockTags);
            setLoading(false)
        }
        fetchTags()
    }, [professionId])

    const toggle = (svc: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(svc) ? next.delete(svc) : next.add(svc)
            return next
        })
    }

    const handleContinue = async () => {
        router.push('/(onboarding)/worker/verify-identity')
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
                <BackButton />
                <Progress currentStep={4} totalSteps={5} />

                <View className='px-5 pt-4 pb-3'>
                    <Text className='text-2xl font-bold text-slate-900 dark:text-slate-100'>Your profession</Text>
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
                                    selected={selected.has(svc.name)}
                                    onPress={() => toggle(svc.name)}
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
                        disabled={selected.size === 0}
                        className={`py-4 rounded-2xl items-center ${selected.size > 0 ? 'bg-black dark:bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                        <Text className={`text-base font-bold ${selected.size > 0 ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                            Continue
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    )
}
