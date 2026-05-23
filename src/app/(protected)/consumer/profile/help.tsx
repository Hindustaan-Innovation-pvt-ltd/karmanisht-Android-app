// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function HelpSupportScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const CONTACT_OPTIONS = [
        { id: 'call', titleKey: 'callSupport', subtitleKey: 'callSupportHours', icon: 'phone', library: Feather, color: '#3B82F6', action: 'tel:07712994005' },
        { id: 'email', titleKey: 'emailUs', subtitleKey: 'responseIn24h', icon: 'mail', library: Feather, color: '#EF4444', action: 'mailto:support@hindustaan.in' },
    ];

    const FAQS = [
        { questionKey: 'faqQ1', answerKey: 'faqA1' },
        { questionKey: 'faqQ2', answerKey: 'faqA2' },
        { questionKey: 'faqQ3', answerKey: 'faqA3' },
        { questionKey: 'faqQ4', answerKey: 'faqA4' },
        { questionKey: 'faqQ5', answerKey: 'faqA5' },
    ];

    const toggleFAQ = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <View className="flex-1 bg-white">
            <View className="pt-14 pb-6 px-6 flex-row items-center border-b border-gray-50">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-12 h-12 bg-gray-50 rounded-2xl items-center justify-center"
                >
                    <Ionicons name="chevron-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="ml-4 text-2xl font-bold text-gray-900">{t('helpAndSupport')}</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View className="bg-gray-900 rounded-[32px] p-8 mb-10 items-center">
                    <View className="w-16 h-16 bg-white/10 rounded-2xl items-center justify-center mb-4">
                        <Feather name="headphones" size={32} color="white" />
                    </View>
                    <Text className="text-white text-2xl font-bold text-center">{t('howCanWeHelp')}</Text>
                    <Text className="text-gray-400 text-center mt-2 font-medium">{t('teamHereToAssist')}</Text>
                </View>

                {/* Contact Cards */}
                <View className="flex-row justify-between mb-10">
                    {CONTACT_OPTIONS.map((item) => {
                        const IconLib = item.library;
                        return (
                            <TouchableOpacity 
                                key={item.id}
                                className="w-[48%] bg-gray-50 rounded-3xl p-5 items-center border border-gray-100 shadow-sm active:scale-95"
                                onPress={() => {
                                    Linking.openURL(item.action).catch((err) => console.error("Failed to open support link:", err));
                                }}
                            >
                                <View className="w-14 h-14 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: `${item.color}15` }}>
                                    <IconLib name={item.icon as any} size={26} color={item.color} />
                                </View>
                                <Text className="text-sm font-bold text-gray-900 text-center">{t(item.titleKey)}</Text>
                                <Text className="text-[10px] text-gray-400 text-center mt-1">{t(item.subtitleKey)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* FAQ Section */}
                <Text className="text-xl font-bold text-gray-900 mb-6">{t('frequentlyAskedQuestions')}</Text>
                
                {FAQS.map((faq, index) => {
                    const isExpanded = expandedIndex === index;
                    return (
                        <TouchableOpacity 
                            key={index} 
                            activeOpacity={0.8}
                            onPress={() => toggleFAQ(index)}
                            className={`mb-4 rounded-2xl border p-5 transition-all ${
                                isExpanded 
                                    ? 'bg-blue-50/20 border-blue-100' 
                                    : 'bg-gray-50 border-gray-100'
                            }`}
                        >
                            <View className="flex-row items-center justify-between">
                                <Text className="flex-1 text-base font-bold text-gray-900 pr-4">{t(faq.questionKey)}</Text>
                                <View className={`w-8 h-8 rounded-full items-center justify-center ${isExpanded ? 'bg-blue-100/50' : 'bg-gray-200/50'}`}>
                                    <Feather 
                                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                                        size={18} 
                                        color={isExpanded ? "#3B82F6" : "#64748B"} 
                                    />
                                </View>
                            </View>
                            {isExpanded && (
                                <Text className="text-gray-650 font-medium mt-3 leading-6 text-sm">
                                    {t(faq.answerKey)}
                                </Text>
                            )}
                        </TouchableOpacity>
                    );
                })}

                <View className="h-10" />
            </ScrollView>
        </View>
    );
}
