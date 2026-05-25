import { StateCreator } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { AppStoreType, AuthSlice, UserProfile, STORAGE_KEYS, defaultUser } from '../types';
import { insforge } from '../../insforge';

function isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        let jsonPayload: string;

        if (typeof atob !== 'undefined') {
            jsonPayload = atob(base64);
        } else {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            const lookup = new Uint8Array(256);
            for (let i = 0; i < chars.length; i++) {
                lookup[chars.charCodeAt(i)] = i;
            }
            let buffer = '';
            const cleanStr = base64.replace(/=+$/, '');
            const len = cleanStr.length;
            for (let i = 0; i < len; i += 4) {
                const encoded1 = lookup[cleanStr.charCodeAt(i)];
                const encoded2 = lookup[cleanStr.charCodeAt(i + 1)];
                const encoded3 = i + 2 < len ? lookup[cleanStr.charCodeAt(i + 2)] : 0;
                const encoded4 = i + 3 < len ? lookup[cleanStr.charCodeAt(i + 3)] : 0;
                const bytes = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
                buffer += String.fromCharCode((bytes >> 16) & 255);
                if (i + 2 < len) buffer += String.fromCharCode((bytes >> 8) & 255);
                if (i + 3 < len) buffer += String.fromCharCode(bytes & 255);
            }
            jsonPayload = buffer;
        }

        const payload = JSON.parse(jsonPayload);
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            return payload.exp - now < 300; // expires in < 5 minutes
        }
    } catch {
        return true;
    }
    return true;
}

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
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next)).catch(() => { });
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
            // Ensure CSRF token cookie is primed in memory from AsyncStorage
            const csrfToken = await AsyncStorage.getItem('@@app_csrf_token');
            if (csrfToken && typeof document !== 'undefined') {
                document.cookie = `insforge_csrf_token=${csrfToken}`;
            }
            // Ensure token is set on insforge client instance before executing database requests
            const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
            const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (token) {
                insforge.setAccessToken(token);
            }
            if (refreshToken) {
                insforge.getHttpClient().setRefreshToken(refreshToken);
            }
            // 1. Check users (primary identity table containing roles) first
            const { data: userData } = await insforge.database
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (userData) {
                const isGoogleUser = (userData.email && !userData.email.endsWith('@mock-mobile.local')) || (userData.mobile && userData.mobile.startsWith('google-'));
                if (userData.role === 'admin') {
                    const profile: UserProfile = {
                        id: userData.id,
                        name: userData.full_name || fallbackName || 'Admin',
                        role: 'admin',
                        phone: userData.mobile && userData.mobile.startsWith('google-') ? '' : (userData.mobile || ''),
                        isOnline: userData.is_active ?? true,
                        searchRadiusKm: userData.search_radius_km || 5,
                        email: userData.email || '',
                        isGoogleUser: !!isGoogleUser,
                    };
                    set({ user: profile, isOnline: profile.isOnline ?? true });
                    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
                    await get().refreshProfile();
                    return profile;
                } else if (userData.role === 'worker') {
                    // Fetch details from service_providers
                    const { data: workerData } = await insforge.database
                        .from('service_providers')
                        .select('*')
                        .eq('id', userId)
                        .maybeSingle();

                    if (workerData) {
                        const isGoogleWorker = (workerData.email && !workerData.email.endsWith('@mock-mobile.local')) || (workerData.mobile && workerData.mobile.startsWith('google-'));
                        const profile: UserProfile = {
                            id: workerData.id,
                            name: workerData.full_name || fallbackName || 'Provider',
                            role: 'worker',
                            phone: workerData.mobile && workerData.mobile.startsWith('google-') ? '' : (workerData.mobile || ''),
                            profession: workerData.business_name || '',
                            bio: workerData.bio || '',
                            experienceYears: workerData.experience_years || 0,
                            isOnline: workerData.is_active ?? true,
                            isPremium: workerData.is_premium ?? false,
                            email: workerData.email || '',
                            isGoogleUser: !!isGoogleWorker,
                        };

                        // Fetch location for worker
                        const { data: locData } = await insforge.database
                            .from('provider_locations')
                            .select('service_radius_km, area_name, latitude, longitude')
                            .eq('provider_id', workerData.id)
                            .maybeSingle();

                        if (locData) {
                            profile.searchRadiusKm = locData.service_radius_km || 5;
                            profile.location = locData.area_name || '';
                            profile.latitude = locData.latitude;
                            profile.longitude = locData.longitude;
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

                        set({
                            user: profile,
                            isOnline: profile.isOnline ?? true,
                            workerStats: {
                                rating: workerData.average_rating ? Number(workerData.average_rating) : 0.0,
                                jobsDone: workerData.total_jobs_completed || 0,
                                responseTime: 'Fast'
                            }
                        });
                        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
                        await get().refreshProfile();
                        return profile;
                    }
                }

                if (userData.role === 'consumer') {
                    const profile: UserProfile = {
                        id: userData.id,
                        name: userData.full_name || fallbackName || 'User',
                        role: 'consumer',
                        phone: userData.mobile && userData.mobile.startsWith('google-') ? '' : (userData.mobile || ''),
                        isOnline: userData.is_active ?? true,
                        searchRadiusKm: userData.search_radius_km || 5,
                        email: userData.email || '',
                        isGoogleUser: !!isGoogleUser,
                    };
                    set({ user: profile, isOnline: profile.isOnline ?? true });
                    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
                    await get().refreshProfile();
                    return profile;
                } else if (!userData.role) {
                    const profile: UserProfile = {
                        id: userData.id,
                        name: userData.full_name || fallbackName || 'User',
                        role: null,
                        phone: userData.mobile && userData.mobile.startsWith('google-') ? '' : (userData.mobile || ''),
                        isOnline: userData.is_active ?? true,
                        searchRadiusKm: userData.search_radius_km || 5,
                        email: userData.email || '',
                        isGoogleUser: !!isGoogleUser,
                    };
                    set({ user: profile, isOnline: profile.isOnline ?? true });
                    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
                    await get().refreshProfile();
                    return profile;
                } else {
                    const profile: UserProfile = {
                        id: userData.id,
                        name: userData.full_name || fallbackName || 'User',
                        role: 'consumer',
                        phone: userData.mobile && userData.mobile.startsWith('google-') ? '' : (userData.mobile || ''),
                        isOnline: userData.is_active ?? true,
                        searchRadiusKm: userData.search_radius_km || 5,
                        email: userData.email || '',
                        isGoogleUser: !!isGoogleUser,
                    };
                    set({ user: profile, isOnline: profile.isOnline ?? true });
                    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
                    await get().refreshProfile();
                    return profile;
                }
            }

            // Fallback: Check service_providers directly if user record is missing in users table
            const { data: workerData } = await insforge.database
                .from('service_providers')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (workerData) {
                const isGoogleWorker = (workerData.email && !workerData.email.endsWith('@mock-mobile.local')) || (workerData.mobile && workerData.mobile.startsWith('google-'));
                const profile: UserProfile = {
                    id: workerData.id,
                    name: workerData.full_name || fallbackName || 'Provider',
                    role: 'worker',
                    phone: workerData.mobile && workerData.mobile.startsWith('google-') ? '' : (workerData.mobile || ''),
                    profession: workerData.business_name || '',
                    bio: workerData.bio || '',
                    experienceYears: workerData.experience_years || 0,
                    isOnline: workerData.is_active ?? true,
                    isPremium: workerData.is_premium ?? false,
                    email: workerData.email || '',
                    isGoogleUser: !!isGoogleWorker,
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

                set({
                    user: profile,
                    isOnline: profile.isOnline ?? true,
                    workerStats: {
                        rating: workerData.average_rating ? Number(workerData.average_rating) : 0.0,
                        jobsDone: workerData.total_jobs_completed || 0,
                        responseTime: 'Fast'
                    }
                });
                await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
                await get().refreshProfile();
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
            // Ensure CSRF token cookie is primed in memory from AsyncStorage
            const csrfToken = await AsyncStorage.getItem('@@app_csrf_token');
            if (csrfToken && typeof document !== 'undefined') {
                document.cookie = `insforge_csrf_token=${csrfToken}`;
            }
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

            if (cachedUserStr) {
                cachedUser = JSON.parse(cachedUserStr);
                if (cachedUser && cachedUser.id) {
                    // Immediately set user to enable instant routing and render cached profile UI
                    set({ user: cachedUser, isOnline: cachedUser.isOnline ?? true });
                }
            }

            let hasToken = !!token && !isTokenExpired(token);

            if (refreshToken && (!token || isTokenExpired(token))) {
                try {
                    const { data: refreshed } = await insforge.auth.refreshSession({ refreshToken });
                    if (refreshed?.accessToken) {
                        insforge.setAccessToken(refreshed.accessToken);
                        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, refreshed.accessToken);
                        hasToken = true;
                    }
                    if (refreshed?.refreshToken) {
                        insforge.getHttpClient().setRefreshToken(refreshed.refreshToken);
                        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshed.refreshToken);
                    }
                    if (refreshed?.csrfToken) {
                        await AsyncStorage.setItem('@@app_csrf_token', refreshed.csrfToken);
                        if (typeof document !== 'undefined') {
                            document.cookie = `insforge_csrf_token=${refreshed.csrfToken}`;
                        }
                    }
                } catch (refreshErr) {
                    console.error('[refreshProfile] Refresh failed:', refreshErr);
                    // Clear the expired token from client to enable anonymous queries
                    insforge.setAccessToken(null);
                    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
                    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
                    hasToken = false;
                }
            } else if (!hasToken) {
                // Clear the expired or missing token from client so we query anonymously
                insforge.setAccessToken(null);
            }

            // Immediately fetch categories in parallel after resolving token state
            let categoriesPromise = get().fetchCategories(hasToken).catch(() => { });

            // A. Revalidate User Profile from DB
            const activeUser = get().user;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (activeUser && activeUser.id && !activeUser.id.startsWith('local_') && uuidRegex.test(activeUser.id)) {
                // Fetch the primary user record from users table to get the true, latest role
                const { data: identityData, error: identityErr } = await insforge.database
                    .from('users')
                    .select('*')
                    .eq('id', activeUser.id)
                    .maybeSingle();

                if (identityData && !identityErr) {
                    const resolvedRole = identityData.role || null;
                    const tableName = resolvedRole === 'worker' ? 'service_providers' : 'users';

                    const { data, error } = tableName === 'users'
                        ? { data: identityData, error: null }
                        : await insforge.database
                            .from(tableName)
                            .select('*')
                            .eq('id', activeUser.id)
                            .maybeSingle();

                    if (data && !error) {
                        const isGoogleUser = (data.email && !data.email.endsWith('@mock-mobile.local')) || (data.mobile && data.mobile.startsWith('google-'));
                        const updatedUser: UserProfile = {
                            ...activeUser,
                            name: data.full_name || activeUser.name,
                            phone: data.mobile && data.mobile.startsWith('google-') ? '' : (data.mobile || ''),
                            isOnline: data.is_active ?? activeUser.isOnline,
                            searchRadiusKm: data.search_radius_km || activeUser.searchRadiusKm,
                            profile_image: data.profile_image || activeUser.profile_image,
                            role: resolvedRole as any,
                            email: data.email || activeUser.email || '',
                            isGoogleUser: !!isGoogleUser,
                            // isPremium is only valid for workers — read from service_providers.is_premium
                            isPremium: resolvedRole === 'worker'
                                ? (data.is_premium ?? activeUser.isPremium ?? false)
                                : undefined,
                        };

                        if (resolvedRole === 'worker') {
                            updatedUser.profession = data.business_name || activeUser.profession;
                            updatedUser.bio = data.bio || activeUser.bio;
                            updatedUser.experienceYears = data.experience_years || activeUser.experienceYears;
                            updatedUser.experience = `${data.experience_years || 0} yrs`;

                            const { data: locData } = await insforge.database
                                .from('provider_locations')
                                .select('service_radius_km, area_name, latitude, longitude')
                                .eq('provider_id', activeUser.id)
                                .maybeSingle();
                            if (locData) {
                                updatedUser.searchRadiusKm = locData.service_radius_km || 5;
                                updatedUser.location = locData.area_name || activeUser.location;
                                updatedUser.latitude = locData.latitude;
                                updatedUser.longitude = locData.longitude;
                            }

                            const { data: servicesData } = await insforge.database
                                .from('provider_services')
                                .select('category_id')
                                .eq('provider_id', activeUser.id);

                            updatedUser.hasSpecialties = (servicesData && servicesData.length > 0) || false;
                            if (servicesData && servicesData.length > 0 && servicesData[0].category_id) {
                                updatedUser.professionId = servicesData[0].category_id;
                            }

                            set({
                                workerStats: {
                                    rating: data.average_rating ? Number(data.average_rating) : 0.0,
                                    jobsDone: data.total_jobs_completed || 0,
                                    responseTime: 'Fast'
                                }
                            });
                        }

                        set({ user: updatedUser, isOnline: updatedUser.isOnline ?? true });
                        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
                    }
                } else if (identityErr || !identityData) {
                    // Account no longer exists in DB or call failed with no record
                    if (!identityErr || (identityErr as any).status === 404 || identityErr.code === 'P0001') {
                        // Check if Google user is in onboarding phase (no DB record yet, but valid session)
                        const isGoogleOnboarding = activeUser?.isGoogleUser && !activeUser?.role;
                        if (!isGoogleOnboarding) {
                            await AsyncStorage.removeItem(STORAGE_KEYS.USER);
                            set({ user: defaultUser });
                        }
                    }
                }
            }

            // B. Sync Unlocked Contacts & Active Passes for Consumers
            const latestUser = get().user;
            if (latestUser && latestUser.id && latestUser.role === 'consumer' && uuidRegex.test(latestUser.id)) {
                // Fetch active passes
                await get().fetchActivePasses().catch(err => console.error('[refreshProfile] fetchActivePasses error:', err));

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

                            const { data: activeCats } = await insforge.database
                                .from('service_categories')
                                .select('id')
                                .eq('is_active', true);
                            const activeCatIds = new Set((activeCats || []).map(c => c.id));

                            const providersWithCat = providers
                                .map(p => {
                                    const match = pServices?.find(ps => ps.provider_id === p.id);
                                    return { ...p, category_id: match ? match.category_id : null };
                                })
                                .filter(p => p.category_id && activeCatIds.has(p.category_id));

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

            // Instantly clear the boot loader spinner so app transitions are lightning-fast
            set({ isLoading: false, hasCheckedAuth: true });

            // D. Sync GPS location in background
            (async () => {
                try {
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
                } catch (gpsError) {
                    console.warn('[refreshProfile] Background location sync error:', gpsError);
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
        const userEmail = get().user.email;
        const isGoogleUser = !!(updates.isGoogleUser || get().user.isGoogleUser || (updates.email && !updates.email.endsWith('@mock-mobile.local')) || (userEmail && !userEmail.endsWith('@mock-mobile.local')));
        let mobileToUse = updates.phone || get().user.phone;
        if (isGoogleUser && (!mobileToUse || mobileToUse.startsWith('google-'))) {
            mobileToUse = `google-${newId}`;
        }
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

            const emailToUse = updates.email || get().user.email || existingRecord?.email;
            if (emailToUse) {
                payload.email = emailToUse;
            }

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
                    email: payload.email || null,
                }]);

                if (updates.location !== undefined || updates.searchRadiusKm !== undefined || updates.latitude !== undefined || updates.longitude !== undefined) {
                    const { data: locData } = await insforge.database
                        .from('provider_locations')
                        .select('id')
                        .eq('provider_id', newId)
                        .maybeSingle();

                    const locPayload: any = {};
                    if (updates.location !== undefined) locPayload.area_name = updates.location;
                    if (updates.searchRadiusKm !== undefined) locPayload.service_radius_km = updates.searchRadiusKm;
                    if (updates.latitude !== undefined) locPayload.latitude = updates.latitude;
                    if (updates.longitude !== undefined) locPayload.longitude = updates.longitude;

                    if (locData) {
                        await insforge.database.from('provider_locations').update(locPayload).eq('provider_id', newId);
                    } else {
                        locPayload.provider_id = newId;
                        locPayload.latitude = updates.latitude !== undefined ? updates.latitude : (get().userLocation?.coords?.latitude || 21.2514);
                        locPayload.longitude = updates.longitude !== undefined ? updates.longitude : (get().userLocation?.coords?.longitude || 81.6296);
                        await insforge.database.from('provider_locations').insert([locPayload]);
                    }
                }
            }
        } catch (err) {
            console.error('[updateDatabaseProfile] Error:', err);
            if (!newId) newId = `local_${Date.now()}`;
        }

        const nextUser = { ...get().user, ...updates, id: newId };
        if (isGoogleUser && (!nextUser.phone || nextUser.phone.startsWith('google-'))) {
            nextUser.phone = '';
        }
        set({ user: nextUser });
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(nextUser)).catch(() => { });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Online status helpers
    // ─────────────────────────────────────────────────────────────────────────
    setOnline: async (v: boolean) => {
        set({ isOnline: v });
        const nextUser = { ...get().user, isOnline: v };
        set({ user: nextUser });
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(nextUser)).catch(() => { });
        AsyncStorage.setItem(STORAGE_KEYS.ONLINE, String(v)).catch(() => { });
        const userId = get().user.id;
        if (userId && !userId.startsWith('local_')) {
            try {
                const tableName = get().user.role === 'worker' ? 'service_providers' : 'users';
                await insforge.database.from(tableName).update({ is_active: v }).eq('id', userId);

                // For workers, keep the users table in sync too
                if (get().user.role === 'worker') {
                    await insforge.database.from('users').update({ is_active: v }).eq('id', userId);
                }
            } catch (err) {
                console.error('[setOnline] Failed to sync status with database:', err);
            }
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
            workerStats: { rating: 0, jobsDone: 0, responseTime: 'Fast' },
            sessionToken: null,
            isLoading: false,
            hasCheckedAuth: true,
            categories: [],
        });
    },
});
