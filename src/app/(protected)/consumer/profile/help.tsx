// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CONTACT_OPTIONS = [
    { id: 'call', title: 'Call Support', subtitle: '9 AM - 6 PM', icon: 'phone', library: Feather, color: '#3B82F6' },
    { id: 'whatsapp', title: 'WhatsApp Us', subtitle: 'Instant Reply', icon: 'whatsapp', library: MaterialCommunityIcons, color: '#22C55E' },
    { id: 'email', title: 'Email Us', subtitle: 'Response in 24h', icon: 'mail', library: Feather, color: '#EF4444' },
];

const FAQS = [
    { question: 'How do I book a service?', answer: 'Go to the services tab, select your category, and choose a provider.' },
    { question: 'What are the payment methods?', answer: 'We support UPI, Credit/Debit cards, and Cash after service.' },
    { question: 'Can I cancel my booking?', answer: 'Yes, you can cancel up to 2 hours before the scheduled time.' },
];

export default function HelpSupportScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white">
            <View className="pt-14 pb-6 px-6 flex-row items-center border-b border-gray-50">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-12 h-12 bg-gray-50 rounded-2xl items-center justify-center"
                >
                    <Ionicons name="chevron-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="ml-4 text-2xl font-bold text-gray-900">Help & Support</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View className="bg-gray-900 rounded-[32px] p-8 mb-10 items-center">
                    <View className="w-16 h-16 bg-white/10 rounded-2xl items-center justify-center mb-4">
                        <Feather name="headphones" size={32} color="white" />
                    </View>
                    <Text className="text-white text-2xl font-bold text-center">How can we help you today?</Text>
                    <Text className="text-gray-400 text-center mt-2 font-medium">Our team is here to assist you with any issues.</Text>
                </View>

                {/* Contact Cards */}
                <View className="flex-row justify-between mb-10">
                    {CONTACT_OPTIONS.map((item) => {
                        const IconLib = item.library;
                        return (
                            <TouchableOpacity 
                                key={item.id}
                                className="w-[30%] bg-gray-50 rounded-3xl p-4 items-center border border-gray-100"
                                onPress={() => {
                                    if (item.id === 'call') Linking.openURL('tel:+911234567890');
                                    // Handle others if needed
                                }}
                            >
                                <View className="w-12 h-12 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: `${item.color}20` }}>
                                    <IconLib name={item.icon as any} size={24} color={item.color} />
                                </View>
                                <Text className="text-[10px] font-bold text-gray-900 text-center uppercase tracking-tighter">{item.title}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* FAQ Section */}
                <Text className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</Text>
                
                {FAQS.map((faq, index) => (
                    <View key={index} className="bg-gray-50 rounded-2xl p-6 mb-4 border border-gray-100">
                        <Text className="text-lg font-bold text-gray-900">{faq.question}</Text>
                        <Text className="text-gray-500 font-medium mt-2 leading-6">{faq.answer}</Text>
                    </View>
                ))}

                <View className="h-10" />
            </ScrollView>
        </View>
    );
}
