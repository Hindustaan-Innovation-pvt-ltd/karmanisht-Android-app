import { StateCreator } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { AppStoreType, AuthSlice, UserProfile, STORAGE_KEYS, defaultUser } from '../types';
import { insforge } from '../../insforge';

export const createAuthSlice: StateCreator<AppStoreType, [], [], AuthSlice> = (set, get) => ({
    user: defaultUser,
    isOnline: true,
    isLoading: true,
    hasCheckedAuth: false,
    isSessionExpired: false,
    sessionToken: null,

    // ─────────────────────────────────────────────────────────────────────────
    // setUser — merge partial update into user, persist to AsyncStorage
    // ─────────────────────────────────────────────────────────────────────────
    setUser: async (partial: Partial<UserProfile>) => {
        const next = { ...get().user, ...partial };
        set({ user: next });
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next)).catch(() => {});
    },

    // ─────────────────────────────────────────────────────────────────────────
    // processUserSession — THE central post-authentication method.
    // Call this after any successful auth (OTP verify, Google OAuth, etc.).
    // It checks both DB tables, builds the UserProfile, syncs Zustand + AsyncStorage,
    // and returns the profile so the calling screen can route accordingly.
    // Returns null if the user has no DB record (brand new user needs to register).
    // ─────────────────────────────────────────────────────────────────────────
    processUserSession: async (userId: string, fallbackName?: string): Promise<UserProfile | null> => {
        try {
            // 1. Check consumers / admins table first
            const { data: consumerData } = await insforge.database
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (consumerData) {
                const profile: UserProfile = {
                    id: consumerData.id,
                    name: consumerData.full_name || fallbackName || 'User',
                    role: (consumerData.role === 'admin' ? 'admin' : 'consumer') as any,
                    phone: consumerData.mobile || '',
                    isOnline: consumerData.is_active ?? true,
                    searchRadiusKm: consumerData.search_radius_km || 5,
                };
                set({ user: profile });
                await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
                return profile;
            }

            // 2. Check service providers (workers) table
            const { data: workerData } = await insforge.database
                .from('service_providers')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (workerData) {
                const profile: UserProfile = {
                    id: workerData.id,
                    name: workerData.full_name || fallbackName || 'Provider',
                    role: 'worker',
                    phone: workerData.mobile || '',
                    profession: workerData.business_name || '',
                    bio: workerData.bio || '',
                    experienceYears: workerData.experience_years || 0,
                    isOnline: workerData.is_active ?? true,
                };
                set({ user: profile });
                await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
                return profile;
            }

            // 3. User has no DB record — they are brand new
            return null;
        } catch (err) {
            console.error('[processUserSession] Error:', err);
            return null;
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // refreshProfile — Re-fetches the persisted user from AsyncStorage and DB,
    // syncs unlocked contacts, categories and GPS. Called on app boot.
    // ─────────────────────────────────────────────────────────────────────────
    refreshProfile: async () => {
        try {
            const cachedUserStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
            let currentUserRole = null;
            let currentUserId = null;

            if (cachedUserStr) {
                const cachedUser = JSON.parse(cachedUserStr);
                currentUserRole = cachedUser.role;
                currentUserId = cachedUser.id;

                if (cachedUser.id) {
                    const tableName = cachedUser.role === 'worker' ? 'service_providers' : 'users';
                    const { data, error } = await insforge.database
                        .from(tableName)
                        .select('*')
                        .eq('id', cachedUser.id)
                        .single();

                    if (data && !error) {
                        const updatedUser: UserProfile = {
                            ...cachedUser,
                            name: data.full_name || cachedUser.name,
                            phone: data.mobile || cachedUser.phone,
                            isOnline: data.is_active ?? cachedUser.isOnline,
                            searchRadiusKm: data.search_radius_km || cachedUser.searchRadiusKm,
                        };

                        if (cachedUser.role === 'worker') {
                            updatedUser.profession = data.business_name || cachedUser.profession;
                            updatedUser.bio = data.bio || cachedUser.bio;
                            updatedUser.experienceYears = data.experience_years || cachedUser.experienceYears;

                            const { data: locData } = await insforge.database
                                .from('provider_locations')
                                .select('service_radius_km, area_name')
                                .eq('provider_id', cachedUser.id)
                                .single();
                            if (locData) {
                                updatedUser.searchRadiusKm = locData.service_radius_km || 5;
                                updatedUser.location = locData.area_name || cachedUser.location;
                            }
                        } else {
                            updatedUser.role = data.role || cachedUser.role;
                        }

                        set({ user: updatedUser });
                        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
                    } else {
                        // Record gone from DB — sign out
                        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
                        set({ user: defaultUser });
                    }
                } else {
                    set({ user: cachedUser });
                }
            } else {
                set({ user: defaultUser });
            }

            // Sync unlocked contacts for consumers
            if (currentUserId && currentUserRole === 'consumer') {
                try {
                    const { data: txs, error: txError } = await insforge.database
                        .from('unlock_transactions')
                        .select('provider_id')
                        .eq('user_id', currentUserId);

                    if (txs && !txError) {
                        const providerIds = txs.map(t => t.provider_id).filter(Boolean);
                        set({ unlockedContacts: providerIds });

                        if (providerIds.length > 0) {
                            const { data: providers, error: providersError } = await insforge.database
                                .from('service_providers')
                                .select('*')
                                .in('id', providerIds);

                            if (providers && !providersError) {
                                const { data: pServices } = await insforge.database
                                    .from('provider_services')
                                    .select('provider_id, category_id')
                                    .in('provider_id', providerIds);

                                const providersWithCat = providers.map(p => {
                                    const match = pServices?.find(ps => ps.provider_id === p.id);
                                    return { ...p, category_id: match ? match.category_id : null };
                                });
                                set({ unlockedProviders: providersWithCat });
                            }
                        } else {
                            set({ unlockedProviders: [] });
                        }
                    }
                } catch (txErr) {
                    console.error('Failed to fetch unlocked transactions:', txErr);
                }
            } else {
                set({ unlockedContacts: [], unlockedProviders: [] });
            }

            await get().fetchCategories();

            // Sync GPS location
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    set({ userLocation: loc });

                    if (currentUserId) {
                        if (currentUserRole === 'worker') {
                            const { data: locData } = await insforge.database
                                .from('provider_locations')
                                .select('id')
                                .eq('provider_id', currentUserId)
                                .single();

                            if (locData) {
                                await insforge.database.from('provider_locations').update({
                                    latitude: loc.coords.latitude,
                                    longitude: loc.coords.longitude,
                                }).eq('provider_id', currentUserId);
                            } else {
                                await insforge.database.from('provider_locations').insert([{
                                    provider_id: currentUserId,
                                    latitude: loc.coords.latitude,
                                    longitude: loc.coords.longitude,
                                }]);
                            }
                        } else if (currentUserRole === 'consumer') {
                            await insforge.database.from('users').update({
                                current_latitude: loc.coords.latitude,
                                current_longitude: loc.coords.longitude,
                            }).eq('id', currentUserId);
                        }
                    }
                }
            } catch {
                // Ignore location errors silently
            }
        } catch (err) {
            console.error('[refreshProfile] Error:', err);
        } finally {
            set({ isLoading: false, hasCheckedAuth: true });
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // updateDatabaseProfile — Upserts user data to DB and syncs local state
    // ─────────────────────────────────────────────────────────────────────────
    updateDatabaseProfile: async (updates: Partial<UserProfile>) => {
        let newId = updates.id || get().user.id;
        const mobileToUse = updates.phone || get().user.phone;
        const role = updates.role || get().user.role || 'consumer';
        const tableName = role === 'worker' ? 'service_providers' : 'users';

        try {
            let existingRecord = null;

            if (newId && !newId.startsWith('local_')) {
                const { data } = await insforge.database
                    .from(tableName)
                    .select('*')
                    .eq('id', newId)
                    .single();
                existingRecord = data;
            }

            if (!existingRecord && mobileToUse) {
                const { data } = await insforge.database
                    .from(tableName)
                    .select('*')
                    .eq('mobile', mobileToUse)
                    .single();
                existingRecord = data;
            }

            const payload: any = {
                full_name: updates.name || existingRecord?.full_name || get().user.name || 'Anonymous',
                mobile: mobileToUse || existingRecord?.mobile || '',
                is_active: updates.isOnline ?? existingRecord?.is_active ?? get().user.isOnline ?? true,
            };

            if (role === 'worker') {
                if (updates.bio !== undefined) payload.bio = updates.bio;
                else if (existingRecord?.bio !== undefined) payload.bio = existingRecord.bio;

                if (updates.experienceYears !== undefined) payload.experience_years = updates.experienceYears;
                else if (existingRecord?.experience_years !== undefined) payload.experience_years = existingRecord.experience_years;

                if (updates.profession) payload.business_name = updates.profession;
                else if (existingRecord?.business_name !== undefined) payload.business_name = existingRecord.business_name;
            } else {
                payload.role = role === 'admin' ? 'admin' : 'consumer';
                if (updates.searchRadiusKm !== undefined) payload.search_radius_km = updates.searchRadiusKm;
                else if (existingRecord?.search_radius_km !== undefined) payload.search_radius_km = existingRecord.search_radius_km;
            }

            if (existingRecord) {
                newId = existingRecord.id;
                await insforge.database.from(tableName).update(payload).eq('id', newId);
            } else {
                if (newId && !newId.startsWith('local_')) {
                    payload.id = newId;
                }
                const { data, error } = await insforge.database
                    .from(tableName)
                    .insert([payload])
                    .select()
                    .single();
                if (data) {
                    newId = data.id;
                } else if (error) {
                    console.error('[updateDatabaseProfile] Insert error:', error);
                }
            }

            // For workers, also sync the users table (for unified login lookup)
            if (role === 'worker' && newId && !newId.startsWith('local_')) {
                await insforge.database.from('users').upsert([{
                    id: newId,
                    full_name: updates.name || payload.full_name,
                    mobile: mobileToUse || payload.mobile,
                    role: 'worker',
                    is_active: payload.is_active,
                }]);

                if (updates.location !== undefined || updates.searchRadiusKm !== undefined) {
                    const { data: locData } = await insforge.database
                        .from('provider_locations')
                        .select('id')
                        .eq('provider_id', newId)
                        .single();

                    const locPayload: any = {};
                    if (updates.location !== undefined) locPayload.area_name = updates.location;
                    if (updates.searchRadiusKm !== undefined) locPayload.service_radius_km = updates.searchRadiusKm;

                    if (locData) {
                        await insforge.database.from('provider_locations').update(locPayload).eq('provider_id', newId);
                    } else {
                        locPayload.provider_id = newId;
                        locPayload.latitude = get().userLocation?.coords?.latitude || 21.2514;
                        locPayload.longitude = get().userLocation?.coords?.longitude || 81.6296;
                        await insforge.database.from('provider_locations').insert([locPayload]);
                    }
                }
            }
        } catch (err) {
            console.error('[updateDatabaseProfile] Error:', err);
            if (!newId) newId = `local_${Date.now()}`;
        }

        const nextUser = { ...get().user, ...updates, id: newId };
        set({ user: nextUser });
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(nextUser)).catch(() => {});
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Online status helpers
    // ─────────────────────────────────────────────────────────────────────────
    setOnline: async (v: boolean) => {
        set({ isOnline: v });
        AsyncStorage.setItem(STORAGE_KEYS.ONLINE, String(v)).catch(() => {});
        const userId = get().user.id;
        if (userId) {
            const tableName = get().user.role === 'worker' ? 'service_providers' : 'users';
            insforge.database.from(tableName).update({ is_active: v }).eq('id', userId).then();
        }
    },

    toggleOnlineStatus: () => {
        get().setOnline(!get().isOnline);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // signOut — clear all state and storage
    // ─────────────────────────────────────────────────────────────────────────
    signOut: async () => {
        try {
            await insforge.auth.signOut();
        } catch {
            // best-effort
        }
        await AsyncStorage.clear();
        set({
            user: defaultUser,
            unlockedContacts: [],
            unlockedProviders: [],
            isLoading: false,
            hasCheckedAuth: true,
        });
    },
});
