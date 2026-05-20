import { useAppStore } from '@/lib/store';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, LayoutAnimation, Platform, Keyboard } from 'react-native';
import SafeIcon from '@/components/safe-icon';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

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

export default function ServicesScreen() {
    const { categories, fetchCategories } = useAppStore();
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [showSolidBar, setShowSolidBar] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCategories = (categories || []).filter(category => {
        const name = category?.name;
        if (typeof name !== 'string') return false;
        return name.toLowerCase().includes((searchQuery || '').toLowerCase());
    });

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const renderHeader = () => (
        <View className="px-5 flex-row items-center justify-between mb-8 min-h-12" onTouchStart={(e) => e.stopPropagation()}>
            <Text className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex-1 mr-2">Explore Services</Text>
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
            {showSolidBar && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: insets.top + 6,
                        backgroundColor: isDark ? '#090d16' : '#ffffff',
                        zIndex: 9999,
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? '#1e293b' : '#f1f5f9',
                    }}
                />
            )}

            <FlatList
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 60, paddingBottom: 150 }}
                ListHeaderComponent={renderHeader()}
                data={filteredCategories}
                keyExtractor={(item) => item.id}
                numColumns={3}
                columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
                ListEmptyComponent={
                    searchQuery.length > 0 ? (
                        <View className="items-center justify-center py-10 px-5">
                            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                            <Text className="text-gray-900 dark:text-slate-100 font-bold mt-4 text-center text-lg">
                                No services found
                            </Text>
                            <Text className="text-gray-500 dark:text-slate-400 text-sm mt-1 text-center">
                                Try searching for another keyword or category.
                            </Text>
                        </View>
                    ) : null
                }
                onScroll={(event) => {
                    const offsetY = event.nativeEvent.contentOffset.y;
                    if (offsetY > 16) {
                        setShowSolidBar(true);
                    } else {
                        setShowSolidBar(false);
                    }
                }}
                scrollEventThrottle={16}
                renderItem={({ item: service, index }) => {
                    const cardColor = getVibrantColor(service);
                    return (
                        <Animated.View
                            entering={FadeInDown.delay(index * 25).springify(20).damping(5)}
                            className="w-[31%] aspect-square mb-4"
                        >
                            <TouchableOpacity
                                key={service.id}
                                onPress={() => router.push({
                                    pathname: '/(protected)/consumer/services/[id]',
                                    params: { id: service.id, name: service.name, color: cardColor, icon: service.icon || 'lightning-bolt' }
                                } as any)}
                                className="w-full h-full rounded-[15px] items-center justify-center"
                                style={{
                                    backgroundColor: cardColor,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 3,
                                    elevation: 3
                                }}
                            >
                                <SafeIcon name={(service.icon as any) || 'lightning-bolt'} size={40} color="white" />
                                <Text className="text-[10px] text-white font-black mt-2 text-center px-1 uppercase tracking-tighter">
                                    {service.name}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                }}
            />
        </View>
    );
}
