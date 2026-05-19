// @ts-nocheck
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckIcon, ZapIcon, ArrowRightIcon } from '@/svg/icons';
import BackButton from '@/components/back-button';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function PremiumPlans() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const [selectedPlan, setSelectedPlan] = useState<'premium' | 'basic'>('premium');

    const handleContinue = () => {
        router.push({
            pathname: '/(protected)/worker/premium-payment',
            params: { plan: selectedPlan }
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            {/* Top Bar with Back Button */}
            <View className="flex-row items-center px-6 py-4 justify-between">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="size-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-800"
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-slate-800 dark:text-slate-200">Subscrption Plans</Text>
                <View className="w-10" />
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {/* Screen Title */}
                <Text className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-2 mb-6">
                    Premium plans
                </Text>

                {/* PREMIUM CARD */}
                <TouchableOpacity
                    onPress={() => setSelectedPlan('premium')}
                    activeOpacity={0.9}
                    className={`p-6 rounded-3xl mb-4 relative overflow-hidden bg-[#18181B] dark:bg-slate-900 border-2 ${
                        selectedPlan === 'premium' ? 'border-amber-400' : 'border-transparent'
                    }`}
                    style={selectedPlan === 'premium' ? styles.premiumShadow : null}
                >
                    {/* Background Golden Glow (subtle) */}
                    <View className="absolute -right-20 -top-20 size-48 rounded-full bg-amber-500/10 blur-3xl" />

                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-2">
                            <Ionicons name="ribbon-outline" size={20} color="#F59E0B" />
                            <Text className="text-sm font-black text-amber-500 uppercase tracking-widest">
                                PREMIUM
                            </Text>
                        </View>
                        <View className="bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                            <Text className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                                Best value
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-baseline mb-6">
                        <Text className="text-4xl font-black text-white">Rs.999</Text>
                        <Text className="text-slate-400 font-bold ml-1">/year</Text>
                    </View>

                    {/* Features checklist */}
                    <View className="flex-col gap-3">
                        <View className="flex-row items-center gap-3">
                            <View className="size-5 rounded-full bg-amber-500/10 items-center justify-center">
                                <Feather name="check" size={12} color="#F59E0B" />
                            </View>
                            <Text className="text-slate-200 text-sm font-semibold">Top ranking in search</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <View className="size-5 rounded-full bg-amber-500/10 items-center justify-center">
                                <Feather name="check" size={12} color="#F59E0B" />
                            </View>
                            <Text className="text-slate-200 text-sm font-semibold">Verified premium badge</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <View className="size-5 rounded-full bg-amber-500/10 items-center justify-center">
                                <Feather name="check" size={12} color="#F59E0B" />
                            </View>
                            <Text className="text-slate-200 text-sm font-semibold">Unlimited leads</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <View className="size-5 rounded-full bg-amber-500/10 items-center justify-center">
                                <Feather name="check" size={12} color="#F59E0B" />
                            </View>
                            <Text className="text-slate-200 text-sm font-semibold">Profile boost</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* BASIC CARD */}
                <TouchableOpacity
                    onPress={() => setSelectedPlan('basic')}
                    activeOpacity={0.9}
                    className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 ${
                        selectedPlan === 'basic' ? 'border-black dark:border-white' : 'border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <View className="mb-4">
                        <Text className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            BASIC
                        </Text>
                    </View>

                    <View className="flex-row items-baseline mb-6">
                        <Text className="text-4xl font-black text-slate-900 dark:text-white">Rs.499</Text>
                        <Text className="text-slate-500 dark:text-slate-400 font-bold ml-1">/year</Text>
                    </View>

                    {/* Features checklist */}
                    <View className="flex-col gap-3">
                        <View className="flex-row items-center gap-3">
                            <View className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                                <Feather name="check" size={12} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            </View>
                            <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Standard listing</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <View className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                                <Feather name="check" size={12} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            </View>
                            <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">50 leads/month</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <View className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                                <Feather name="check" size={12} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            </View>
                            <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Profile visible in city</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom CTA Button */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <TouchableOpacity
                    onPress={handleContinue}
                    activeOpacity={0.8}
                    className="bg-[#18181B] dark:bg-slate-100 py-4 rounded-2xl items-center justify-center flex-row gap-2"
                >
                    <Text className="text-white dark:text-slate-950 font-black text-lg">
                        Get {selectedPlan === 'premium' ? 'premium — Rs.999/yr' : 'basic — Rs.499/yr'}
                    </Text>
                    <Feather name="arrow-right" size={18} color={colorScheme === 'dark' ? '#000' : '#fff'} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    premiumShadow: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 6
    }
});
