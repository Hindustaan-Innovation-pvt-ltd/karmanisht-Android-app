import { StateCreator } from 'zustand';
import { AppStoreType, TranslationSlice, TranslationRecord } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { insforge } from '@/lib/insforge';
import i18n, { LANGUAGE_KEY, staticResources } from '@/lib/i18n';

export const createTranslationSlice: StateCreator<AppStoreType, [], [], TranslationSlice> = (set, get) => ({
    currentLanguage: 'en',
    dbTranslations: [],
    isTranslationLoading: false,
    hasSyncedTranslations: false,

    initTranslations: async (force = false) => {
        if (get().hasSyncedTranslations && !force) return;
        set({ isTranslationLoading: true });

        let savedLanguage = 'en';
        try {
            const persisted = await AsyncStorage.getItem(LANGUAGE_KEY);
            if (persisted) {
                savedLanguage = persisted;
            } else {
                const locales = Localization.getLocales();
                const deviceLanguage = locales[0]?.languageCode;
                if (deviceLanguage && ['en', 'hi'].includes(deviceLanguage)) {
                    savedLanguage = deviceLanguage;
                }
            }
        } catch (err) {
            console.warn('[Zustand i18n] Failed to load language setting:', err);
        }

        (global as any).__appLanguageCache = savedLanguage;
        set({ currentLanguage: savedLanguage });
        if (i18n.language !== savedLanguage) {
            await i18n.changeLanguage(savedLanguage);
        }

        try {
            // Fetch translations from InsForge PostgreSQL
            const { data: dbData, error } = await insforge.database
                .from('translations')
                .select('*')
                .order('key', { ascending: true });

            if (error) {
                throw error;
            }

            const dbTranslationsList: TranslationRecord[] = dbData || [];
            const dbKeys = new Set(dbTranslationsList.map(row => row.key));
            const newKeysToInsert: Array<{ key: string; en: string; hi: string }> = [];

            // Compare static keys and push missing ones
            const staticEn = staticResources.en.translation;
            const staticHi = staticResources.hi.translation;

            Object.keys(staticEn).forEach((key) => {
                if (!dbKeys.has(key)) {
                    const enVal = staticEn[key as keyof typeof staticEn] || key;
                    const hiVal = staticHi[key as keyof typeof staticHi] || key;
                    newKeysToInsert.push({ key, en: enVal, hi: hiVal });
                    dbTranslationsList.push({ key, en: enVal, hi: hiVal });
                }
            });

            if (newKeysToInsert.length > 0) {
                const { error: insertError } = await insforge.database
                    .from('translations')
                    .upsert(newKeysToInsert, { onConflict: 'key', ignoreDuplicates: true });
                if (insertError) {
                    console.warn('[Zustand i18n] Failed to populate database with new static keys:', insertError);
                }
            }

            // Add all database translations to active i18n resources
            dbTranslationsList.forEach((row) => {
                if (row.key) {
                    if (row.en) i18n.addResource('en', 'translation', row.key, row.en);
                    if (row.hi) i18n.addResource('hi', 'translation', row.key, row.hi);
                }
            });

            set({
                dbTranslations: dbTranslationsList,
                hasSyncedTranslations: true,
            });
        } catch (dbErr) {
            console.error('[Zustand i18n] Error syncing translations with database:', dbErr);
        } finally {
            set({ isTranslationLoading: false });
        }
    },

    changeLanguage: async (lang: string) => {
        try {
            (global as any).__appLanguageCache = lang;
            await i18n.changeLanguage(lang);
            await AsyncStorage.setItem(LANGUAGE_KEY, lang);
            set({ currentLanguage: lang });
        } catch (err) {
            console.error('[Zustand i18n] Failed to change language:', err);
        }
    },

    upsertTranslation: async (key: string, en: string, hi: string) => {
        if (!key || key.trim() === '') return false;
        try {
            // Upsert to DB
            const { error } = await insforge.database
                .from('translations')
                .upsert([{ key, en, hi }], { onConflict: 'key' });

            if (error) {
                console.error('[Zustand i18n] Failed to upsert translation:', error);
                return false;
            }

            // Update in-memory active i18n resources
            i18n.addResource('en', 'translation', key, en);
            i18n.addResource('hi', 'translation', key, hi);

            // Update local store state
            const updatedTranslations = get().dbTranslations.map((item) => {
                if (item.key === key) {
                    return { ...item, en, hi };
                }
                return item;
            });

            // If it's a completely new key, append it
            if (!get().dbTranslations.some(item => item.key === key)) {
                updatedTranslations.push({ key, en, hi });
            }

            set({ dbTranslations: updatedTranslations });
            return true;
        } catch (err) {
            console.error('[Zustand i18n] Error in upsertTranslation:', err);
            return false;
        }
    },

    registerMissingKey: async (key: string, defaultVal?: string) => {
        if (!key || key.trim() === '') return;
        const fallbackValue = defaultVal || key;
        try {
            const { error } = await insforge.database
                .from('translations')
                .upsert([{ key, en: fallbackValue, hi: fallbackValue }], { onConflict: 'key', ignoreDuplicates: true });

            if (error) {
                console.warn('[Zustand i18n] Failed to save missing key:', key, error);
                return;
            }

            // Update local resource in i18n
            i18n.addResource('en', 'translation', key, fallbackValue);
            i18n.addResource('hi', 'translation', key, fallbackValue);

            // Add to local state if missing
            const exists = get().dbTranslations.some(item => item.key === key);
            if (!exists) {
                set({
                    dbTranslations: [...get().dbTranslations, { key, en: fallbackValue, hi: fallbackValue }]
                });
            }
        } catch (err) {
            console.error('[Zustand i18n] Error in registerMissingKey:', err);
        }
    }
});
