// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, Linking } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInDown } from 'react-native-reanimated';
import { router, useRouter } from 'expo-router';

import { useAppStore } from '@/lib/store';
import SafeIcon from '@/components/safe-icon';
import { useTheme } from '@/lib/theme';

const ContactListItem = ({ provider, categories, index }: { provider: any; categories: any[]; index: number }) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { isDark } = useTheme();
    const category = categories.find(c => c.id === provider.category_id);
    const categoryName = category ? t(category.name) : t('professional');
    const categoryIcon = category ? category.icon : 'briefcase';
    const color = category ? category.color : '#3B82F6';
    const avatar = provider.profile_image || ("https://ui-avatars.com/api/?name=" + encodeURIComponent(provider.full_name) + "&background=6366F1&color=fff");

    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }]
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    };

    const handleCall = (phone: string) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`).catch((err) => {
                console.error("Failed to open dialer:", err);
            });
        }
    };

    const rating = provider.average_rating ? Number(provider.average_rating).toFixed(1) : "4.5";

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 45).springify().damping(20).stiffness(150)}
        >
            <Animated.View style={[animatedStyle]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={() =>
                        router.push({
                            pathname: '/(protected)/consumer/services/[id]',
                            params: { id: provider.category_id, providerId: provider.id },
                        } as any)
                    }
                    className="mx-4 mb-4 rounded-[24px] overflow-hidden flex-row border shadow-sm dark:shadow-none bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800"
                >
                    {/* Left Accent Color bar */}
                    <View style={{ width: 5, backgroundColor: color }} />

                    <View className="flex-row flex-1 p-4 items-center">
                        {/* Profile Image with Ring border */}
                        <View>
                            <Image
                                source={{ uri: avatar }}
                                className="w-20 h-20 rounded-[18px]"
                                resizeMode="cover"
                            />
                        </View>

                        {/* Info details */}
                        <View className="ml-4 flex-1 justify-between py-0.5">
                            <View>
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex-1 mr-2" numberOfLines={1}>
                                        {provider.full_name}
                                    </Text>

                                    {/* Rating & Experience Row */}
                                    <View className="flex-row items-center bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/10 px-2 py-0.5 rounded-lg">
                                        <Ionicons name="star" size={11} color="#FBBF24" />
                                        <Text className="text-amber-600 dark:text-amber-400 text-xs ml-1 font-extrabold">
                                            {rating}
                                        </Text>
                                    </View>
                                </View>

                                {/* Category tag & Experience Row */}
                                <View className="flex-row items-center mt-2 gap-2">
                                    <View
                                        className="px-2.5 py-1 rounded-full flex-row items-center border border-slate-200 dark:border-slate-800"
                                    >
                                        <SafeIcon name={categoryIcon} size={12} color={
                                            isDark ? '#fff' : '#000'
                                        } />
                                        <Text
                                            className="text-[9px] font-semibold ml-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300"
                                        >
                                            {categoryName}
                                        </Text>
                                    </View>

                                    <View className="flex-row items-center bg-slate-100/70 dark:bg-slate-800/80 border border-slate-200/40 dark:border-slate-700/20 px-2.5 py-1 rounded-full">
                                        <Feather name="clock" size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                                        <Text className="text-slate-600 dark:text-slate-300 text-xs ml-1 font-medium">
                                            {t('yrsExp', { count: provider.experience_years || 0 })}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Contact Action Row */}
                            <View className="flex-row items-end justify-between mt-3.5 pt-2 border-t border-slate-100/60 dark:border-slate-800/40">
                                <View className="flex-row items-center">
                                    <View className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mr-2">
                                        <Feather name="phone" size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                                    </View>
                                    <Text className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                                        {provider.mobile}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleCall(provider.mobile);
                                    }}
                                    className="w-10 h-10 rounded-full items-center justify-center border border-slate-200 dark:border-slate-500/20"
                                    style={{ backgroundColor: color }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="call" size={18} color="blue" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
};

export default function ContactScreen() {
    const { t } = useTranslation();
    const { unlockedProviders, categories } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

    const filteredProviders = unlockedProviders.filter(provider => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;

        const fullName = provider.full_name || '';
        const mobile = provider.mobile || '';

        const matchesName = fullName.toLowerCase().includes(query);
        const matchesMobile = mobile.toLowerCase().includes(query);

        const category = categories.find(c => c.id === provider.category_id);
        const categoryKeyName = category?.name || '';
        const categoryTranslatedName = category ? t(category.name) : '';

        const matchesCategoryKey = categoryKeyName.toLowerCase().includes(query);
        const matchesCategoryTranslated = categoryTranslatedName.toLowerCase().includes(query);

        return matchesName || matchesMobile || matchesCategoryKey || matchesCategoryTranslated;
    });

    const renderHeader = () => (
        <View className="w-full mb-6">
            <View className="px-5 flex-row items-center justify-start gap-4 mb-4">
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
                <Text className="text-3xl font-black text-slate-800 dark:text-slate-100">{t('yourContacts')}</Text>
            </View>

            <View className="px-5">
                <View className="flex-row items-center px-4 py-3 rounded-2xl border bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-950">
                    <Feather name="search" size={16} color="#64748B" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={t('searchPlaceholder', 'Search contacts by name or category...')}
                        placeholderTextColor="#94A3B8"
                        className="flex-1 ml-3 text-sm font-semibold text-slate-800 dark:text-slate-100 p-0 m-0"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                            <Ionicons name="close-circle" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View className="py-24 items-center justify-center px-6">
            <View className="w-20 h-20 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full items-center justify-center mb-5 shadow-sm">
                <Ionicons name="people-outline" size={38} color="#94A3B8" />
            </View>
            <Text className="text-slate-800 dark:text-slate-100 text-center font-extrabold text-base">
                {searchQuery.length > 0 ? t('noMatchingContacts') : t('noUnlockedContacts')}
            </Text>
            <Text className="text-slate-400 dark:text-slate-500 text-center font-medium mt-1.5 text-xs max-w-xs leading-normal">
                {searchQuery.length > 0 ? t('trySearchAnother') : t('findAndContactWorkers')}
            </Text>
        </View>
    );

    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            <FlatList
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: insets.top > 0 ? insets.top + 16 : 24,
                    paddingBottom: insets.bottom > 0 ? insets.bottom + 120 : 120
                }}
                ListHeaderComponent={renderHeader()}
                data={filteredProviders}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmpty}
                renderItem={({ item, index }) => (
                    <ContactListItem
                        provider={item}
                        categories={categories}
                        index={index}
                    />
                )}
            />
        </View>
    );
}
