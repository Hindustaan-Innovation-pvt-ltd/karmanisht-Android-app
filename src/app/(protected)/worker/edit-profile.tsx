// @ts-nocheck
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, ScrollView, 
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfile() {
    const user = useAppStore(state => state.user);
    const categories = useAppStore(state => state.categories);
    const updateProfile = useAppStore(state => state.updateProfile);
    const updateWorkerSpecialties = useAppStore(state => state.updateWorkerSpecialties);


    const router = useRouter();
    
    const [fullName, setFullName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        async function fetchDetails() {
            setFetching(true);
            setFullName(user?.name || '');
            setBio(user?.bio || '');
            try {
                if (user?.id) {
                    const { data, error } = await insforge.database
                        .from('provider_services')
                        .select('category_id')
                        .eq('provider_id', user.id);
                    
                    if (data && data.length > 0 && !error) {
                        setSelectedCategoryId(data[0].category_id);
                    } else if (categories.length > 0) {
                        setSelectedCategoryId(categories[0].id);
                    }
                } else if (categories.length > 0) {
                    setSelectedCategoryId(categories[0].id);
                }
            } catch (err) {
                console.error("Failed to load provider services:", err);
            } finally {
                setFetching(false);
            }
        }
        fetchDetails();
    }, [user?.id, categories]);

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Full name is required.');
            return;
        }

        setLoading(true);
        try {
            const profileSuccess = await updateProfile({ 
                name: fullName,
                bio: bio
            });

            let specialtySuccess = true;
            if (selectedCategoryId) {
                specialtySuccess = await updateWorkerSpecialties([selectedCategoryId], []);
            }

            if (profileSuccess && specialtySuccess) {
                Alert.alert('Success', 'Profile updated successfully!');
                router.back();
            } else {
                Alert.alert('Error', 'Failed to update some details.');
            }
        } catch (err) {
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaProvider>
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-row items-center px-5 py-4 border-b border-slate-100">
                    <TouchableOpacity onPress={() => router.back()} className="p-2">
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold ml-4">Edit Profile</Text>
                </View>

                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    {fetching ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="black" />
                            <Text className="mt-4 text-slate-500 font-medium">Loading details...</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                        {/* Name */}
                        <View className="mb-6">
                            <Text className="text-sm font-bold text-slate-500 uppercase mb-2">Full Name</Text>
                            <TextInput
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base"
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Enter your full name"
                            />
                        </View>

                        {/* Bio */}
                        <View className="mb-6">
                            <Text className="text-sm font-bold text-slate-500 uppercase mb-2">Bio / Description</Text>
                            <TextInput
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base h-32"
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Describe your skills and experience"
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Profession */}
                        <View className="mb-8">
                            <Text className="text-sm font-bold text-slate-500 uppercase mb-3">Profession</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => setSelectedCategoryId(cat.id)}
                                        className={`px-4 py-2 rounded-full border ${
                                            selectedCategoryId === cat.id 
                                            ? 'bg-black border-black' 
                                            : 'bg-white border-slate-200'
                                        }`}
                                    >
                                        <Text className={`text-sm font-medium ${
                                            selectedCategoryId === cat.id ? 'text-white' : 'text-slate-600'
                                        }`}>
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={loading}
                            className={`py-4 rounded-2xl items-center shadow-lg ${loading ? 'bg-slate-400' : 'bg-black'}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
