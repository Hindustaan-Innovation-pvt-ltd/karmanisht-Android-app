// @ts-nocheck
import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function AllSet() {
    const router = useRouter();
    const { user } = useAppStore();
    const colorScheme = useColorScheme();
    const isWorker = user?.role === 'worker';

    const handleGoToDashboard = () => {
        if (isWorker) {
            router.replace('/(protected)/worker');
        } else {
            router.replace('/(protected)/consumer');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 items-center justify-between p-6">
            <View className="w-full items-center mt-12 flex-1 justify-center">
                {/* Large Checkmark Icon */}
                <View className="size-24 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500 items-center justify-center mb-8">
                    <Feather name="check" size={44} color="#10B981" />
                </View>

                {/* Main Titles */}
                <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 text-center">
                    You're all set!
                </Text>
                <Text className="text-slate-400 dark:text-slate-500 font-semibold mb-8 text-center">
                    Profile created!
                </Text>

                {/* Custom cards based on role */}
                <View className="w-full flex-col gap-4 px-2">
                    {isWorker ? (
                        <>
                            {/* Card 1: Available Now */}
                            <View className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[24px] flex-row justify-between items-center">
                                <View className="flex-1 pr-2">
                                    <Text className="text-base font-bold text-slate-900 dark:text-white mb-1">
                                        Available now
                                    </Text>
                                    <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                        Customers can find you now
                                    </Text>
                                </View>
                                <View className="bg-emerald-100 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                                    <Text className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                        Online
                                    </Text>
                                </View>
                            </View>

                            {/* Card 2: Service Hours */}
                            <View className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[24px] flex-col gap-2">
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    SERVICE HOURS
                                </Text>
                                <Text className="text-base font-bold text-slate-900 dark:text-white">
                                    9 am – 8 pm
                                </Text>
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Card 1: Explore Services */}
                            <View className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[24px] flex-row justify-between items-center">
                                <View className="flex-1 pr-2">
                                    <Text className="text-base font-bold text-slate-900 dark:text-white mb-1">
                                        Explore Services
                                    </Text>
                                    <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                        Find local professionals instantly
                                    </Text>
                                </View>
                                <View className="bg-blue-100 dark:bg-blue-950/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900/30">
                                    <Text className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                                        Ready
                                    </Text>
                                </View>
                            </View>

                            {/* Card 2: Secure Payments */}
                            <View className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[24px] flex-col gap-2">
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    SECURE PAYMENTS
                                </Text>
                                <Text className="text-base font-bold text-slate-900 dark:text-white">
                                    Pay safely via UPI or card
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </View>

            {/* Bottom CTA Button */}
            <View className="w-full mb-4">
                <TouchableOpacity
                    onPress={handleGoToDashboard}
                    activeOpacity={0.8}
                    className="w-full bg-[#18181B] dark:bg-slate-100 py-4 rounded-2xl items-center justify-center"
                >
                    <Text className="text-white dark:text-slate-950 font-black text-base">
                        Go to dashboard
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
