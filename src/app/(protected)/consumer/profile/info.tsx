// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';

export default function ProfileInfoScreen() {
    const router = useRouter();
    const { user, updateDatabaseProfile, refreshProfile } = useAppStore();

    const [name, setName] = useState(user.name || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [email, setEmail] = useState(user.email || '');
    const [location, setLocation] = useState(user.location || '');
    const [saving, setSaving] = useState(false);

    // Sync input fields when context user changes
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setPhone(user.phone || '');
            setEmail(user.email || '');
            setLocation(user.location || '');
        }
    }, [user]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required Field', 'Please enter your name.');
            return;
        }
        if (!phone.trim()) {
            Alert.alert('Required Field', 'Please enter your phone number.');
            return;
        }

        setSaving(true);
        try {
            await updateDatabaseProfile({
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                location: location.trim(),
            });
            await refreshProfile();
            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error("Save Profile Error:", error);
            Alert.alert('Error', 'Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            {/* Header */}
            <View className="pt-14 pb-6 px-6 flex-row items-center border-b border-gray-50 dark:border-slate-800">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-12 h-12 bg-gray-50 dark:bg-slate-900 rounded-2xl items-center justify-center"
                >
                    <Ionicons name="chevron-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="ml-4 text-2xl font-bold text-gray-900 dark:text-slate-100">Profile Info</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
                {/* Profile Image Section */}
                <View className="items-center mb-10">
                    <View className="relative">
                        <Image
                            source={{ uri: user.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0D8ABC&color=fff` }}
                            className="w-32 h-32 rounded-[32px] border-4 border-gray-50 dark:border-slate-800 bg-slate-100"
                        />
                        <TouchableOpacity className="absolute bottom-0 right-0 w-10 h-10 bg-black dark:bg-slate-800 rounded-xl items-center justify-center border-4 border-white dark:border-slate-950">
                            <Feather name="camera" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Form Fields */}
                <View className="space-y-6">
                    <View>
                        <Text className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</Text>
                        <View className="bg-gray-50 dark:bg-slate-900 rounded-2xl px-5 py-4 border border-gray-100 dark:border-slate-800">
                            <TextInput
                                className="text-lg font-semibold text-gray-900 dark:text-slate-100"
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your name"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    <View className="mt-6">
                        <Text className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Phone Number</Text>
                        <View className="bg-gray-50 dark:bg-slate-900 rounded-2xl px-5 py-4 border border-gray-100 dark:border-slate-800 flex-row items-center">
                            <TextInput
                                className="flex-1 text-lg font-semibold text-gray-900 dark:text-slate-100"
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Enter phone number"
                                placeholderTextColor="#94A3B8"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View className="mt-6">
                        <Text className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</Text>
                        <View className="bg-gray-50 dark:bg-slate-900 rounded-2xl px-5 py-4 border border-gray-100 dark:border-slate-800">
                            <TextInput
                                className="text-lg font-semibold text-gray-900 dark:text-slate-100"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter email"
                                placeholderTextColor="#94A3B8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View className="mt-6">
                        <Text className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Location</Text>
                        <View className="bg-gray-50 dark:bg-slate-900 rounded-2xl px-5 py-4 border border-gray-100 dark:border-slate-800 flex-row items-center">
                            <Feather name="map-pin" size={20} color="#9CA3AF" />
                            <TextInput
                                className="ml-3 flex-1 text-lg font-semibold text-gray-900 dark:text-slate-100"
                                value={location}
                                onChangeText={setLocation}
                                placeholder="Enter location"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    className="mt-12 mb-10 bg-black dark:bg-slate-800 h-16 rounded-2xl items-center justify-center shadow-lg shadow-black/20"
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-lg font-bold">Save Changes</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
