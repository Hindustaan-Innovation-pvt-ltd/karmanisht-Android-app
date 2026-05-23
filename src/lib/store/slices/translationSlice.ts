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
            const dbMap = new Map<string, TranslationRecord>();
            dbTranslationsList.forEach(row => {
                dbMap.set(row.key, row);
            });

            // Compare static keys and push missing or basic dummy ones
            const staticEn = staticResources.en.translation;
            const staticHi = staticResources.hi.translation;
            const keysToUpsert: Array<{ key: string; en: string; hi: string }> = [];

            Object.keys(staticEn).forEach((key) => {
                const enStaticVal = staticEn[key as keyof typeof staticEn] || key;
                const hiStaticVal = staticHi[key as keyof typeof staticHi] || key;
                const dbRow = dbMap.get(key);

                if (!dbRow) {
                    // New key entirely
                    const newRow = { key, en: enStaticVal, hi: hiStaticVal };
                    dbTranslationsList.push(newRow);
                    dbMap.set(key, newRow);
                    keysToUpsert.push(newRow);
                } else {
                    // Key exists in DB, check if it's a dummy value (e.g. equal to key)
                    // and we have a better static translation.
                    let needsUpdate = false;
                    let updatedEn = dbRow.en;
                    let updatedHi = dbRow.hi;

                    if (dbRow.en === key && enStaticVal !== key) {
                        updatedEn = enStaticVal;
                        needsUpdate = true;
                    }
                    if (dbRow.hi === key && hiStaticVal !== key) {
                        updatedHi = hiStaticVal;
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        dbRow.en = updatedEn;
                        dbRow.hi = updatedHi;
                        keysToUpsert.push({ key, en: updatedEn, hi: updatedHi });
                    }
                }
            });

            if (keysToUpsert.length > 0) {
                const { error: upsertError } = await insforge.database
                    .from('translations')
                    .upsert(keysToUpsert, { onConflict: 'key' });
                if (upsertError) {
                    console.warn('[Zustand i18n] Failed to update dummy/missing keys in database:', upsertError);
                }
            }

            // Add all database translations to active i18n resources
            dbTranslationsList.forEach((row) => {
                if (row.key) {
                    if (row.en) i18n.addResource('en', 'translation', row.key, row.en);
                    if (row.hi) i18n.addResource('hi', 'translation', row.key, row.hi);
                }
            });

            // Set global language cache for synconous initialization in i18n.ts
            (global as any).__appLanguageCache = savedLanguage;

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
            (global as any).__appLanguageCache = lang;
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

        // If translations are not fully synced yet, do not register missing keys
        // to avoid race conditions or overwriting existing keys before load completes.
        if (!get().hasSyncedTranslations) {
            return;
        }

        // Check if the key already exists in local DB cache
        const exists = get().dbTranslations.some(item => item.key === key);
        if (exists) {
            return;
        }

        const staticEn = staticResources.en.translation;
        const staticHi = staticResources.hi.translation;
        
        // Use static translations as fallback if available to prevent dummy values
        const fallbackEn = staticEn[key as keyof typeof staticEn] || defaultVal || key;
        const fallbackHi = staticHi[key as keyof typeof staticHi] || defaultVal || key;

        try {
            const { error } = await insforge.database
                .from('translations')
                .upsert([{ key, en: fallbackEn, hi: fallbackHi }], { onConflict: 'key' });

            if (error) {
                console.warn('[Zustand i18n] Failed to save missing key:', key, error);
                return;
            }

            // Update in-memory active i18n resources
            i18n.addResource('en', 'translation', key, fallbackEn);
            i18n.addResource('hi', 'translation', key, fallbackHi);

            // Add to local state
            set({
                dbTranslations: [...get().dbTranslations, { key, en: fallbackEn, hi: fallbackHi }]
            });
        } catch (err) {
            console.error('[Zustand i18n] Error in registerMissingKey:', err);
        }
    }
});
