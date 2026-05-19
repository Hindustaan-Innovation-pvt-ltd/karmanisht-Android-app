// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAppStore } from '@/lib/store';
import SafeIcon from '@/components/safe-icon';
import { Linking } from 'react-native';

export default function ContactScreen() {
    const { unlockedProviders, categories } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');

    const handleCall = (phone: string) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`).catch((err) => {
                console.error("Failed to open dialer:", err);
            });
        }
    };

    const filteredProviders = unlockedProviders.filter(provider => {
        const matchesName = provider.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const category = categories.find(c => c.id === provider.category_id);
        const matchesCategory = category?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesName || matchesCategory;
    });

    const renderHeader = () => (
        <View className="w-full">
            {/* Header */}
            <View className="px-5 flex-row items-center justify-between mb-8">
                <Text className="text-3xl font-bold text-gray-900 dark:text-slate-100">Your Contacts</Text>
            </View>

            {/* Search Bar */}
            <View className="px-5 mb-6">
                <View className="bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl px-4 h-12 flex-row items-center">
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                        className="ml-3 flex-1 text-gray-900 dark:text-slate-100 font-semibold text-base"
                        placeholder="Search contacts..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View className="py-20 items-center justify-center px-6">
            <Ionicons name="people-outline" size={60} color="#D1D5DB" />
            <Text className="text-slate-400 text-center font-medium mt-4 text-base">
                {searchQuery.length > 0 ? "No matching contacts found." : "No unlocked contacts yet. Find skilled workers in the Explore tab!"}
            </Text>
        </View>
    );

    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            <FlatList
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 60, paddingBottom: 150 }}
                ListHeaderComponent={renderHeader}
                data={filteredProviders}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmpty}
                renderItem={({ item: provider }) => {
                    const category = categories.find(c => c.id === provider.category_id);
                    const categoryName = category ? category.name : 'Professional';
                    const categoryIcon = category ? category.icon : 'briefcase';
                    const color = category ? category.color : '#3B82F6';
                    const avatar = provider.profile_image || ("https://ui-avatars.com/api/?name=" + provider.full_name);

                    return (
                        <View 
                            key={provider.id} 
                            className="rounded-[24px] p-4 flex-row mb-4 mx-4 shadow-sm overflow-hidden border border-white/10"
                            style={{ backgroundColor: color }}
                        >
                            {/* Provider Image */}
                            <Image 
                                source={{ uri: avatar }} 
                                className="w-24 h-28 rounded-2xl bg-white/20"
                                resizeMode="cover"
                            />
                            
                            {/* Provider Info */}
                            <View className="ml-4 flex-1 justify-between">
                                <View>
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-xl font-black text-white flex-1 mr-2" numberOfLines={1}>
                                            {provider.full_name}
                                        </Text>
                                        {/* Category Tag */}
                                        <View className="bg-white/25 px-2.5 py-0.5 rounded-full flex-row items-center border border-white/45">
                                            <SafeIcon name={categoryIcon} size={12} color="white" />
                                            <Text className="text-[9px] text-white font-bold ml-1 uppercase tracking-tighter">{categoryName}</Text>
                                        </View>
                                    </View>
                                    <View className="flex-row items-center mt-1">
                                        <Ionicons name="star" size={14} color="white" />
                                        <Text className="text-white text-xs ml-1 font-bold">{(provider.average_rating || 4.5).toString()}</Text>
                                    </View>
                                    <View className="flex-row items-center mt-1">
                                        <Feather name="briefcase" size={14} color="white" />
                                        <Text className="text-white text-xs ml-1">{provider.experience_years || 0} years of experience</Text>
                                    </View>
                                </View>
                                
                                <View className="flex-row items-end justify-between">
                                    <Text className="text-md font-bold text-white mb-1">{provider.mobile}</Text>
                                    <TouchableOpacity 
                                        onPress={() => handleCall(provider.mobile)}
                                        className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-md active:scale-95"
                                    >
                                        <Ionicons name="call" size={24} color={color} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    );
                }}
            />

        </View>
    );
}

