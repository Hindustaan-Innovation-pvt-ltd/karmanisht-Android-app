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
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            console.warn('[processUserSession] Invalid user ID format:', userId);
            return null;
        }
        try {
            // 1. Check service providers (workers) table first
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
                    isPremium: workerData.is_premium ?? false,
                };

                // Fetch location for worker
                const { data: locData } = await insforge.database
                    .from('provider_locations')
                    .select('service_radius_km, area_name')
                    .eq('provider_id', workerData.id)
                    .maybeSingle();
                
                if (locData) {
                    profile.searchRadiusKm = locData.service_radius_km || 5;
                    profile.location = locData.area_name || '';
                }

                // Fetch specialties for worker
                const { data: servicesData } = await insforge.database
                    .from('provider_services')
                    .select('category_id')
                    .eq('provider_id', workerData.id);

                profile.hasSpecialties = (servicesData && servicesData.length > 0) || false;
                if (servicesData && servicesData.length > 0 && servicesData[0].category_id) {
                    profile.professionId = servicesData[0].category_id;
                }

                set({ user: profile });
                await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
                return profile;
            }

            // 2. Check consumers / admins table second
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
                    isPremium: consumerData.is_premium ?? false,
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
            const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
            const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            const cachedUserStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);

            if (token) {
                insforge.setAccessToken(token);
            }
            if (refreshToken) {
                insforge.getHttpClient().setRefreshToken(refreshToken);
            }

            let cachedUser = null;
            let currentUserId = null;
            let currentUserRole = null;

            if (cachedUserStr) {
                cachedUser = JSON.parse(cachedUserStr);
                if (cachedUser && cachedUser.id) {
                    currentUserId = cachedUser.id;
                    currentUserRole = cachedUser.role;
                    // Immediately set user to enable instant routing and render cached profile UI
                    set({ user: cachedUser });
                }
            }

            // Immediately fetch categories in parallel
            const categoriesPromise = get().fetchCategories().catch(() => {});

            // Instantly clear the boot loader spinner so app transitions are lightning-fast
            set({ isLoading: false, hasCheckedAuth: true });

            // Run database revalidation, token refresh, geocoding and location updates concurrently in the background
            (async () => {
                try {
                    if (refreshToken && !token) {
                        try {
                            const { data: refreshed } = await insforge.auth.refreshSession({ refreshToken });
                            if (refreshed?.accessToken) {
                                insforge.setAccessToken(refreshed.accessToken);
                                await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, refreshed.accessToken);
                            }
                            if (refreshed?.refreshToken) {
                                insforge.getHttpClient().setRefreshToken(refreshed.refreshToken);
                                await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshed.refreshToken);
                            }
                        } catch {
                            // Refresh failed
                        }
                    }

                    // A. Revalidate User Profile from DB
                    const activeUser = get().user;
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (activeUser && activeUser.id && !activeUser.id.startsWith('local_') && uuidRegex.test(activeUser.id)) {
                        const tableName = activeUser.role === 'worker' ? 'service_providers' : 'users';
                        const { data, error } = await insforge.database
                            .from(tableName)
                            .select('*')
                            .eq('id', activeUser.id)
                            .maybeSingle();

                        if (data && !error) {
                            const updatedUser: UserProfile = {
                                ...activeUser,
                                name: data.full_name || activeUser.name,
                                phone: data.mobile || activeUser.phone,
                                isOnline: data.is_active ?? activeUser.isOnline,
                                searchRadiusKm: data.search_radius_km || activeUser.searchRadiusKm,
                                profile_image: data.profile_image || activeUser.profile_image,
                                isPremium: data.is_premium ?? activeUser.isPremium ?? false,
                            };

                            if (activeUser.role === 'worker') {
                                updatedUser.profession = data.business_name || activeUser.profession;
                                updatedUser.bio = data.bio || activeUser.bio;
                                updatedUser.experienceYears = data.experience_years || activeUser.experienceYears;

                                const { data: locData } = await insforge.database
                                    .from('provider_locations')
                                    .select('service_radius_km, area_name')
                                    .eq('provider_id', activeUser.id)
                                    .maybeSingle();
                                if (locData) {
                                    updatedUser.searchRadiusKm = locData.service_radius_km || 5;
                                    updatedUser.location = locData.area_name || activeUser.location;
                                }

                                const { data: servicesData } = await insforge.database
                                    .from('provider_services')
                                    .select('category_id')
                                    .eq('provider_id', activeUser.id);

                                updatedUser.hasSpecialties = (servicesData && servicesData.length > 0) || false;
                                if (servicesData && servicesData.length > 0 && servicesData[0].category_id) {
                                    updatedUser.professionId = servicesData[0].category_id;
                                }
                            } else {
                                updatedUser.role = data.role || activeUser.role;
                            }

                            set({ user: updatedUser });
                            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
                        } else if (error || !data) {
                            // Account no longer exists in DB or call failed with no record
                            if (!error || (error as any).status === 404 || error.code === 'P0001') {
                                await AsyncStorage.removeItem(STORAGE_KEYS.USER);
                                set({ user: defaultUser });
                            }
                        }
                    }

                    // B. Sync Unlocked Contacts for Consumers
                    const latestUser = get().user;
                    if (latestUser && latestUser.id && latestUser.role === 'consumer' && uuidRegex.test(latestUser.id)) {
                        const { data: txs, error: txError } = await insforge.database
                            .from('unlock_transactions')
                            .select('provider_id')
                            .eq('user_id', latestUser.id);

                        if (txs && !txError) {
                            const providerIds = txs.map(t => t.provider_id).filter(id => id && uuidRegex.test(id));
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
                    } else {
                        set({ unlockedContacts: [], unlockedProviders: [] });
                    }

                    // C. Await Categories Load
                    await categoriesPromise;

                    // D. Sync GPS location in background
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const loc = (await Location.getLastKnownPositionAsync()) ??
                                    await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (loc) {
                            set({ userLocation: loc });
                            const currentUser = get().user;
                            if (currentUser && currentUser.id && !currentUser.id.startsWith('local_')) {
                                if (currentUser.role === 'worker') {
                                    const { data: locData } = await insforge.database
                                        .from('provider_locations')
                                        .select('id')
                                        .eq('provider_id', currentUser.id)
                                        .maybeSingle();

                                    if (locData) {
                                        await insforge.database.from('provider_locations').update({
                                            latitude: loc.coords.latitude,
                                            longitude: loc.coords.longitude,
                                        }).eq('provider_id', currentUser.id);
                                    } else {
                                        await insforge.database.from('provider_locations').insert([{
                                            provider_id: currentUser.id,
                                            latitude: loc.coords.latitude,
                                            longitude: loc.coords.longitude,
                                        }]);
                                    }
                                } else if (currentUser.role === 'consumer') {
                                    await insforge.database.from('users').update({
                                        current_latitude: loc.coords.latitude,
                                        current_longitude: loc.coords.longitude,
                                    }).eq('id', currentUser.id);
                                }
                            }
                        }
                    }
                } catch (bgError) {
                    console.error('[refreshProfile] Background Sync Error:', bgError);
                }
            })();
        } catch (err) {
            console.error('[refreshProfile] Main Boot Loader Error:', err);
            set({ isLoading: false, hasCheckedAuth: true });
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // updateDatabaseProfile — Upserts user data to DB and syncs local state
    // ─────────────────────────────────────────────────────────────────────────
    updateDatabaseProfile: async (updates: Partial<UserProfile>) => {
        let newId = updates.id || get().user.id;
        const mobileToUse = updates.phone || get().user.phone;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        let role = updates.role || get().user.role;
        if (!role && newId && !newId.startsWith('local_') && uuidRegex.test(newId)) {
            try {
                const { data: providerRec } = await insforge.database
                    .from('service_providers')
                    .select('id')
                    .eq('id', newId)
                    .maybeSingle();

                if (providerRec) {
                    role = 'worker';
                } else {
                    const { data: userRec } = await insforge.database
                        .from('users')
                        .select('role')
                        .eq('id', newId)
                        .maybeSingle();
                    if (userRec) {
                        role = userRec.role;
                    }
                }
            } catch (err) {
                console.error('[updateDatabaseProfile] Role resolve error:', err);
            }
        }
        if (!role) {
            role = 'consumer';
        }

        const tableName = role === 'worker' ? 'service_providers' : 'users';

        try {
            let existingRecord = null;

            if (newId && !newId.startsWith('local_') && uuidRegex.test(newId)) {
                const { data } = await insforge.database
                    .from(tableName)
                    .select('*')
                    .eq('id', newId)
                    .maybeSingle();
                existingRecord = data;
            }

            if (!existingRecord && mobileToUse) {
                const { data } = await insforge.database
                    .from(tableName)
                    .select('*')
                    .eq('mobile', mobileToUse)
                    .maybeSingle();
                existingRecord = data;
            }

            const payload: any = {
                full_name: updates.name || existingRecord?.full_name || get().user.name || 'Anonymous',
                mobile: mobileToUse || existingRecord?.mobile || '',
                is_active: updates.isOnline ?? existingRecord?.is_active ?? get().user.isOnline ?? true,
            };

            if (updates.profile_image !== undefined) {
                payload.profile_image = updates.profile_image;
            } else if (existingRecord?.profile_image !== undefined) {
                payload.profile_image = existingRecord.profile_image;
            }

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
                if (newId && !newId.startsWith('local_') && uuidRegex.test(newId)) {
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
            if (role === 'worker' && newId && !newId.startsWith('local_') && uuidRegex.test(newId)) {
                await insforge.database.from('users').upsert([{
                    id: newId,
                    full_name: updates.name || payload.full_name,
                    mobile: mobileToUse || payload.mobile,
                    role: 'worker',
                    is_active: payload.is_active,
                    profile_image: payload.profile_image,
                }]);

                if (updates.location !== undefined || updates.searchRadiusKm !== undefined) {
                    const { data: locData } = await insforge.database
                        .from('provider_locations')
                        .select('id')
                        .eq('provider_id', newId)
                        .maybeSingle();

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
        insforge.setAccessToken(null);
        insforge.getHttpClient().setRefreshToken(null);
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
