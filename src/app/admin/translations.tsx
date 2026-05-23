// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal, Platform, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';

const shadowSm = Platform.OS === 'web'
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

const shadow2xl = Platform.OS === 'web'
    ? { boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }
    : { elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 16 };

interface TranslationRecord {
    key: string;
    en: string;
    hi: string;
    created_at?: string;
    updated_at?: string;
}

export default function AdminTranslationsConsole() {
    const { t } = useTranslation();
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Get state and actions from Zustand store
    const translations = useAppStore(state => state.dbTranslations);
    const loading = useAppStore(state => state.isTranslationLoading);
    const initTranslations = useAppStore(state => state.initTranslations);
    const upsertTranslation = useAppStore(state => state.upsertTranslation);

    // Edit modal states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<TranslationRecord | null>(null);
    const [editEn, setEditEn] = useState('');
    const [editHi, setEditHi] = useState('');
    const [saving, setSaving] = useState(false);

    // Fetch/reload translation list
    const fetchTranslations = useCallback(async (isRef = false) => {
        if (isRef) setRefreshing(true);
        try {
            await initTranslations(true); // force reload from DB
        } catch (err) {
            console.error('[AdminTranslations] Fetch error:', err);
            Alert.alert("Database Error", "Failed to retrieve language dictionary keys.");
        } finally {
            setRefreshing(false);
        }
    }, [initTranslations]);

    useEffect(() => {
        initTranslations();
    }, [initTranslations]);

    const handleOpenEdit = (rec: TranslationRecord) => {
        setSelectedRecord(rec);
        setEditEn(rec.en || '');
        setEditHi(rec.hi || '');
        setEditModalVisible(true);
    };

    const handleSaveTranslation = async () => {
        if (!selectedRecord) return;
        setSaving(true);

        try {
            const success = await upsertTranslation(selectedRecord.key, editEn, editHi);
            if (!success) throw new Error("Upsert operation failed");

            Alert.alert("Success", "Translation updated successfully!");
            setEditModalVisible(false);
            setSelectedRecord(null);
        } catch (err: any) {
            console.error('[AdminTranslations] Save error:', err);
            Alert.alert("Save Error", err.message || "Failed to update database translations.");
        } finally {
            setSaving(false);
        }
    };

    const getFilteredTranslations = () => {
        const query = searchQuery.toLowerCase();
        if (!query) return translations;
        return translations.filter(t =>
            t.key.toLowerCase().includes(query) ||
            (t.en || '').toLowerCase().includes(query) ||
            (t.hi || '').toLowerCase().includes(query)
        );
    };

    const bgClass = isDark ? 'bg-slate-950' : 'bg-slate-50';
    const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';
    const textSubClass = isDark ? 'text-slate-400' : 'text-slate-500';
    const searchBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

    return (
        <View className={`flex-1 ${bgClass}`} style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className={`pt-4 pb-5 px-6 flex-row items-center justify-between border-b ${isDark ? 'border-slate-900 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                    >
                        <Ionicons name="chevron-back" size={24} color="#6366F1" />
                    </TouchableOpacity>
                    <View>
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>{t('adminLanguages', 'Languages')}</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t('adminGlobal', 'Global Admin')}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => fetchTranslations(true)}
                    className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                >
                    <Feather name="refresh-cw" size={18} color="#6366F1" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 px-5 pt-5">
                {/* Search Bar */}
                <View className={`flex-row items-center px-4 py-3 rounded-2xl mb-4 border ${searchBgClass}`}>
                    <Feather name="search" size={18} color="#64748B" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={t('adminSearchKeysPlaceholder', 'Search keys, English or Hindi text...')}
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        className={`flex-1 ml-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                    />
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text className="text-xs font-bold text-slate-500 mt-4 tracking-widest uppercase">{t('adminFetchingDictionary', 'Fetching Dictionary...')}</Text>
                    </View>
                ) : (
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => fetchTranslations(true)} colors={['#6366F1']} />
                        }
                    >
                        {getFilteredTranslations().length === 0 ? (
                            <View className="py-20 items-center justify-center">
                                <MaterialCommunityIcons name="translate-off" size={48} color="#64748B" />
                                <Text className="text-xs font-bold text-slate-400 mt-4 tracking-widest">{t('adminNoMatchingKeys', 'NO MATCHING DICTIONARY KEYS')}</Text>
                            </View>
                        ) : (
                            getFilteredTranslations().map((rec) => (
                                <TouchableOpacity
                                    key={rec.key}
                                    onPress={() => handleOpenEdit(rec)}
                                    className={`p-4 rounded-[24px] mb-3 border ${cardBgClass} active:scale-98`}
                                    style={shadowSm}
                                >
                                    <View className="flex-row justify-between items-center mb-2">
                                        <Text className="text-xs font-black text-indigo-500 uppercase tracking-wide flex-1 mr-2" numberOfLines={1}>
                                            {rec.key}
                                        </Text>
                                        <Feather name="edit-2" size={12} color="#6366F1" />
                                    </View>
                                    
                                    <View className="gap-1 mt-1">
                                        <View className="flex-row items-start">
                                            <Text className="text-[10px] font-black text-slate-400 w-10 uppercase">EN:</Text>
                                            <Text className={`text-xs font-bold flex-1 ${textMainClass}`} numberOfLines={2}>{rec.en || '-'}</Text>
                                        </View>
                                        <View className="flex-row items-start">
                                            <Text className="text-[10px] font-black text-slate-400 w-10 uppercase">HI:</Text>
                                            <Text className={`text-xs font-bold flex-1 text-indigo-600 dark:text-indigo-400`} numberOfLines={2}>{rec.hi || '-'}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                        <View className="h-10" />
                    </ScrollView>
                )}
            </View>

            {/* Edit Translation Modal */}
            <Modal
                visible={editModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View className="flex-1 items-center justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className={`w-full p-6 rounded-t-[36px] border-t ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={shadow2xl}>
                        {/* Drawer bar */}
                        <View className={`w-12 h-1.5 rounded-full self-center mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-xl font-black tracking-tight ${textMainClass}`}>{t('adminEditTranslation', 'Edit Translation')}</Text>
                            <TouchableOpacity
                                onPress={() => setEditModalVisible(false)}
                                className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                            >
                                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>

                        {selectedRecord && (
                            <View className="gap-4">
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('adminDictionaryKey', 'Dictionary Key')}</Text>
                                    <Text className={`text-sm font-bold text-indigo-600 dark:text-indigo-400 px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-2xl`}>
                                        {selectedRecord.key}
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('adminEnglishTranslation', 'English Translation')}</Text>
                                    <TextInput
                                        value={editEn}
                                        onChangeText={setEditEn}
                                        multiline={true}
                                        numberOfLines={2}
                                        className={`px-4 py-3 text-sm font-semibold rounded-2xl border min-h-[60px] ${
                                            isDark ? 'bg-slate-950 text-slate-100 border-slate-850' : 'bg-slate-50 text-slate-800 border-slate-200'
                                        }`}
                                    />
                                </View>

                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('adminHindiTranslation', 'Hindi Translation')}</Text>
                                    <TextInput
                                        value={editHi}
                                        onChangeText={setEditHi}
                                        multiline={true}
                                        numberOfLines={2}
                                        className={`px-4 py-3 text-sm font-semibold rounded-2xl border min-h-[60px] ${
                                            isDark ? 'bg-slate-950 text-slate-100 border-slate-850' : 'bg-slate-50 text-slate-800 border-slate-200'
                                        }`}
                                    />
                                </View>

                                <View className="flex-row gap-3 mt-4 mb-4">
                                    <TouchableOpacity
                                        onPress={handleSaveTranslation}
                                        className="flex-1 bg-indigo-600 py-4 rounded-2xl items-center"
                                        disabled={saving}
                                        style={Platform.OS === 'web' ? { boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' } : {}}
                                    >
                                        {saving ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Text className="text-sm font-bold text-white uppercase tracking-wider">{t('saveChanges', 'Save Changes')}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
