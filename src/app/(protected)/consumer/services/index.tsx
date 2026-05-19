import { useAppStore } from '@/lib/store';
// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import ConsumerNavbar from '@/components/consumer-navbar';
import SafeIcon from '@/components/safe-icon';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const { categories } = useAppStore();
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [showSolidBar, setShowSolidBar] = useState(false);

    const renderHeader = () => (
        <View className="px-5 flex-row items-center justify-between mb-8">
            <Text className="text-3xl font-bold text-gray-900 dark:text-slate-100">Explore Services</Text>
        </View>
    );

    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
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
                ListHeaderComponent={renderHeader}
                data={categories}
                keyExtractor={(item) => item.id}
                numColumns={3}
                columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
                onScroll={(event) => {
                    const offsetY = event.nativeEvent.contentOffset.y;
                    if (offsetY > 16) {
                        setShowSolidBar(true);
                    } else {
                        setShowSolidBar(false);
                    }
                }}
                scrollEventThrottle={16}
                renderItem={({ item: service }) => {
                    const cardColor = getVibrantColor(service);
                    return (
                        <TouchableOpacity
                            key={service.id}
                            onPress={() => router.push({
                                pathname: '/(protected)/consumer/services/[id]',
                                params: { id: service.id, name: service.name, color: cardColor, icon: service.icon || 'lightning-bolt' }
                            } as any)}
                            className="w-[31%] aspect-square rounded-[15px] mb-4 items-center justify-center"
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
                    );
                }}
            />

            <ConsumerNavbar activeTab="services" />
        </View>
    );
}
