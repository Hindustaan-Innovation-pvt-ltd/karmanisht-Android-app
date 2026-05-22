// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, useColorScheme, Linking, LayoutAnimation, Keyboard } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInDown } from 'react-native-reanimated';
import { useAppStore } from '@/lib/store';
import SafeIcon from '@/components/safe-icon';

const ContactListItem = ({ provider, categories, index, isDark }) => {
    const category = categories.find(c => c.id === provider.category_id);
    const categoryName = category ? category.name : 'Professional';
    const categoryIcon = category ? category.icon : 'briefcase';
    const color = category ? category.color : '#3B82F6';
    const avatar = provider.profile_image || ("https://ui-avatars.com/api/?name=" + encodeURIComponent(provider.full_name));

    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }]
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 20, stiffness: 200 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 20, stiffness: 200 });
    };

    const handleCall = (phone: string) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`).catch((err) => {
                console.error("Failed to open dialer:", err);
            });
        }
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 50).springify().damping(20).stiffness(150)}
        >
            <Animated.View style={[animatedStyle]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    className="mx-4 mb-4 rounded-[24px] overflow-hidden flex-row border shadow-sm dark:shadow-none"
                    style={{
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(248, 250, 252, 0.95)',
                        borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)',
                    }}
                >
                    {/* Left Accent Color bar */}
                    <View style={{ width: 6, backgroundColor: color }} />

                    <View className="flex-row flex-1 p-4 items-center">
                        {/* Profile Image with Ring border */}
                        <View className="rounded-[20px] p-[2px] shadow-sm bg-white dark:bg-slate-800">
                            <Image
                                source={{ uri: avatar }}
                                className="w-20 h-20 rounded-[18px]"
                                resizeMode="cover"
                            />
                        </View>

                        {/* Info details */}
                        <View className="ml-4 flex-1 justify-between py-1">
                            <View>
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex-1 mr-2" numberOfLines={1}>
                                        {provider.full_name}
                                    </Text>

                                    {/* Category tag */}
                                    <View
                                        className="px-2 py-0.5 rounded-full flex-row items-center"
                                        style={{ backgroundColor: color + '15' }}
                                    >
                                        <SafeIcon name={categoryIcon} size={10} color={color} />
                                        <Text
                                            className="text-[9px] font-black ml-1 uppercase tracking-wider"
                                            style={{ color: color }}
                                        >
                                            {categoryName}
                                        </Text>
                                    </View>
                                </View>

                                {/* Rating & Experience Row */}
                                <View className="flex-row items-center mt-2">
                                    <View className="flex-row items-center bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg">
                                        <Ionicons name="star" size={12} color="#F59E0B" />
                                        <Text className="text-amber-700 dark:text-amber-400 text-xs ml-1 font-bold">
                                            {(provider.average_rating || 4.5).toFixed(1)}
                                        </Text>
                                    </View>

                                    <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg ml-2">
                                        <Feather name="clock" size={12} className="text-slate-500 dark:text-slate-400" />
                                        <Text className="text-slate-600 dark:text-slate-300 text-xs ml-1 font-semibold">
                                            {provider.experience_years || 0} yrs exp
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Contact Action Row */}
                            <View className="flex-row items-center justify-between mt-3">
                                <View className="flex-row items-center">
                                    <Feather name="phone" size={12} className="text-slate-400 dark:text-slate-500" />
                                    <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold ml-1.5">
                                        {provider.mobile}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleCall(provider.mobile);
                                    }}
                                    className="w-10 h-10 rounded-full items-center justify-center shadow-sm"
                                    style={{ backgroundColor: color }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="call" size={18} color="black" />
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
    const { unlockedProviders, categories } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';

    const filteredProviders = unlockedProviders.filter(provider => {
        const matchesName = provider.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const category = categories.find(c => c.id === provider.category_id);
        const matchesCategory = category?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesName || matchesCategory;
    });

    const renderHeader = () => (
        <View className="w-full mb-6">
            <View className="px-5 flex-row items-center justify-between min-h-12" onTouchStart={(e) => e.stopPropagation()}>
                <Text className="text-3xl font-black text-slate-800 dark:text-slate-100 flex-1 mr-2">Your Contacts</Text>
                {isSearchExpanded ? (
                    <View className="w-[50%] flex-row items-center rounded-xl px-2.5 py-1.5 border-2 border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                        <Ionicons name="search" size={16} color="#9CA3AF" />
                        <TextInput
                            className="ml-1.5 flex-1 text-gray-900 dark:text-slate-100 font-medium text-[13px] p-0 m-0"
                            placeholder="Search..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsSearchExpanded(false);
                                setSearchQuery('');
                            }}
                            className="ml-2 pl-2 border-l border-gray-200 dark:border-slate-700"
                        >
                            <Text className="text-blue-500 font-semibold text-xs">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setIsSearchExpanded(true);
                        }}
                        className="flex-row items-center rounded-xl px-4 py-2 border-2 border-gray-100 dark:border-slate-800"
                    >
                        <Ionicons name="search" size={18} color="#9CA3AF" />
                        <Text className="ml-2 text-gray-400 font-medium text-sm">Search</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View className="py-20 items-center justify-center px-6">
            <View className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full items-center justify-center mb-4">
                <Ionicons name="people-outline" size={40} color="#94A3B8" />
            </View>
            <Text className="text-slate-500 dark:text-slate-400 text-center font-bold text-base">
                {searchQuery.length > 0 ? "No matching contacts found." : "No unlocked contacts yet."}
            </Text>
            <Text className="text-slate-400 dark:text-slate-500 text-center font-medium mt-1 text-sm max-w-xs">
                {searchQuery.length > 0 ? "Try search for another name or professional role." : "Find and contact highly-skilled workers in the Explore section!"}
            </Text>
        </View>
    );

    return (
        <View
            className="flex-1 bg-white dark:bg-slate-950"
            onTouchStart={() => {
                if (isSearchExpanded) {
                    Keyboard.dismiss();
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsSearchExpanded(false);
                    setSearchQuery('');
                }
            }}
        >
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
                        isDark={isDark}
                    />
                )}
            />
        </View>
    );
}
