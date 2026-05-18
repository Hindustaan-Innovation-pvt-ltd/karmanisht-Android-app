// @ts-nocheck
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { insforge } from './insforge';

export type UserRole = 'worker' | 'consumer' | 'admin' | null;

interface UserProfile {
    id?: string;
    name: string;
    role: UserRole;
    phone?: string;
    profession?: string;
    professionId?: string;
    experience?: string;
    experienceYears?: number;
    location?: string;
    isOnline?: boolean;
    bio?: string;
    searchRadiusKm?: number;
}

interface Category {
    id: string;
    name: string;
    icon?: string;
    color?: string;
}

interface AppContextType {
    user: UserProfile;
    setUser: (u: Partial<UserProfile>) => void;
    updateDatabaseProfile: (u: Partial<UserProfile>) => Promise<void>;
    refreshProfile: () => Promise<void>;
    unlockedContacts: string[];
    unlockedProviders: any[];
    isUnlocked: (id: string) => boolean;
    unlockWorker: (id: string) => Promise<void>;
    isOnline: boolean;
    setOnline: (v: boolean) => void;
    toggleOnlineStatus: () => void;
    isLoading: boolean;
    hasCheckedAuth: boolean;
    isSessionExpired: boolean;
    categories: Category[];
    userLocation: Location.LocationObject | null;
    fetchCategories: () => Promise<void>;
    sessionToken: string | null;
    workerStats: { rating: number; jobsDone: number; responseTime: string };
    handleRazorpayPayment: (provider: any) => Promise<boolean>;
    updateProfile: (data: any) => Promise<boolean>;
    updateWorkerSpecialties: (categoryIds: string[], tagIds: string[]) => Promise<boolean>;
    signOut: () => Promise<void>;
    loginWithMobile: (mobile: string) => Promise<any>;
}

const defaultUser: UserProfile = {
    name: '',
    role: null,
    isOnline: true,
};

const AppContext = createContext<AppContextType>({
    user: defaultUser,
    setUser: () => {},
    updateDatabaseProfile: async () => {},
    refreshProfile: async () => {},
    unlockedContacts: [],
    unlockedProviders: [],
    isUnlocked: () => false,
    unlockWorker: async () => {},
    isOnline: true,
    setOnline: () => {},
    toggleOnlineStatus: () => {},
    isLoading: true,
    hasCheckedAuth: false,
    isSessionExpired: false,
    categories: [],
    userLocation: null,
    fetchCategories: async () => {},
    sessionToken: null,
    workerStats: { rating: 0, jobsDone: 0, responseTime: 'Fast' },
    handleRazorpayPayment: async () => false,
    updateProfile: async () => false,
    updateWorkerSpecialties: async () => false,
    signOut: async () => {},
    loginWithMobile: async () => null,
});

const STORAGE_KEYS = {
    USER: '@@app_user',
    ONLINE: '@@app_online',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [user, _setUser] = useState<UserProfile>(defaultUser);
    const [unlockedContacts, setUnlockedContacts] = useState<string[]>([]);
    const [unlockedProviders, setUnlockedProviders] = useState<any[]>([]);
    const [isOnline, _setOnline] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [workerStats, setWorkerStats] = useState({ rating: 0, jobsDone: 0, responseTime: 'Fast' });

    const loginWithMobile = async (mobile: string) => {
        try {
            // First check users table
            let { data, error } = await insforge.database
                .from('users')
                .select('*')
                .eq('mobile', mobile)
                .single();
                
            let isWorker = false;
            
            if (data && data.role === 'worker') {
                isWorker = true;
                // Fetch details from service_providers
                const { data: workerData } = await insforge.database
                    .from('service_providers')
                    .select('*')
                    .eq('mobile', mobile)
                    .single();
                if (workerData) {
                    data = workerData;
                }
            } else if (!data) {
                // Fallback: Check service_providers table directly (legacy)
                const { data: workerData } = await insforge.database
                    .from('service_providers')
                    .select('*')
                    .eq('mobile', mobile)
                    .single();
                if (workerData) {
                    data = workerData;
                    isWorker = true;
                }
            }

            if (data) {
                let finalRole: UserRole = 'consumer';
                if (isWorker) {
                    finalRole = 'worker';
                } else if (data.role === 'admin') {
                    finalRole = 'admin';
                }
                const loggedInUser: UserProfile = {
                    id: data.id,
                    name: data.full_name,
                    role: finalRole,
                    phone: data.mobile,
                    isOnline: data.is_active
                };
                if (isWorker) {
                    loggedInUser.profession = data.business_name;
                    loggedInUser.bio = data.bio;
                    loggedInUser.experienceYears = data.experience_years;
                }
                
                _setUser(loggedInUser);
                await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedInUser));
                return loggedInUser;
            }
            return null; // User not found
        } catch (e) {
            console.error("Login Error:", e);
            return null;
        }
    };

    const fetchCategories = useCallback(async () => {
        try {
            const { data, error } = await insforge.database
                .from('service_categories')
                .select('*');
            if (data && !error) {
                setCategories(data);
            } else {
                // Fallback
                setCategories([
                    { id: '1', name: 'Electrician', icon: 'zap', color: '#fbbf24' },
                    { id: '2', name: 'Plumber', icon: 'droplets', color: '#3b82f6' },
                ]);
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        try {
            const cachedUserStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
            let currentUserRole = null;
            let currentUserId = null;

            if (cachedUserStr) {
                const cachedUser = JSON.parse(cachedUserStr);
                currentUserRole = cachedUser.role;
                currentUserId = cachedUser.id;
                
                // Handle legacy mock admin session
                if (cachedUser.id === 'admin_user') {
                    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
                    _setUser(defaultUser);
                    return;
                }

                // Fetch latest from InsForge DB if we have an ID
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
                            searchRadiusKm: data.search_radius_km || cachedUser.searchRadiusKm
                        };
                        
                        if (cachedUser.role === 'worker') {
                            updatedUser.profession = data.business_name || cachedUser.profession;
                            updatedUser.bio = data.bio || cachedUser.bio;
                            updatedUser.experienceYears = data.experience_years || cachedUser.experienceYears;
                            
                            // Fetch service_radius_km from provider_locations
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

                        _setUser(updatedUser);
                        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
                    } else {
                        // User not found in DB or error fetching, clear session
                        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
                        _setUser(defaultUser);
                    }
                } else {
                    _setUser(cachedUser);
                }
            } else {
                _setUser(defaultUser);
            }
            
            if (currentUserId && currentUserRole === 'consumer') {
                try {
                    const { data: txs, error: txError } = await insforge.database
                        .from('unlock_transactions')
                        .select('provider_id')
                        .eq('user_id', currentUserId);
                    
                    if (txs && !txError) {
                        const providerIds = txs.map(t => t.provider_id).filter(Boolean);
                        setUnlockedContacts(providerIds);
                        
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
                                    return {
                                        ...p,
                                        category_id: match ? match.category_id : null
                                    };
                                });
                                
                                setUnlockedProviders(providersWithCat);
                            }
                        } else {
                            setUnlockedProviders([]);
                        }
                    }
                } catch (txErr) {
                    console.error("Failed to fetch unlocked transactions:", txErr);
                }
            } else {
                setUnlockedContacts([]);
                setUnlockedProviders([]);
            }
            
            await fetchCategories();

            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    setUserLocation(loc);

                    if (currentUserId) {
                        if (currentUserRole === 'worker') {
                            // Update provider_locations
                            const { data: locData } = await insforge.database
                                .from('provider_locations')
                                .select('id')
                                .eq('provider_id', currentUserId)
                                .single();
                                
                            if (locData) {
                                await insforge.database.from('provider_locations').update({
                                    latitude: loc.coords.latitude,
                                    longitude: loc.coords.longitude
                                }).eq('provider_id', currentUserId);
                            } else {
                                await insforge.database.from('provider_locations').insert([{
                                    provider_id: currentUserId,
                                    latitude: loc.coords.latitude,
                                    longitude: loc.coords.longitude
                                }]);
                            }
                        } else if (currentUserRole === 'consumer') {
                            // Update consumer location
                            await insforge.database.from('users').update({
                                current_latitude: loc.coords.latitude,
                                current_longitude: loc.coords.longitude
                            }).eq('id', currentUserId);
                        }
                    }
                }
            } catch (e) {
                // Ignore location errors
            }
        } catch (err) {
            console.error('Initialization error:', err);
        } finally {
            setIsLoading(false);
            setHasCheckedAuth(true);
        }
    }, [fetchCategories]);

    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

    const setUser = useCallback(async (partial: Partial<UserProfile>) => {
        _setUser(prev => {
            const next = { ...prev, ...partial };
            AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next)).catch(() => {});
            return next;
        });
    }, []);

    const updateDatabaseProfile = useCallback(async (updates: Partial<UserProfile>) => {
        let newId = updates.id || user.id;
        const mobileToUse = updates.phone || user.phone;

        const role = updates.role || user.role || 'consumer';
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
                // Check if a record with this mobile exists first
                const { data } = await insforge.database
                    .from(tableName)
                    .select('*')
                    .eq('mobile', mobileToUse)
                    .single();
                existingRecord = data;
            }

            const payload: any = {
                full_name: updates.name || (existingRecord ? existingRecord.full_name : (user.name || 'Anonymous')),
                mobile: mobileToUse || (existingRecord ? existingRecord.mobile : ''),
                is_active: updates.isOnline ?? (existingRecord ? existingRecord.is_active : (user.isOnline ?? true))
            };

            if (role === 'worker') {
                if (updates.bio !== undefined) payload.bio = updates.bio;
                else if (existingRecord && existingRecord.bio !== undefined) payload.bio = existingRecord.bio;

                if (updates.experienceYears !== undefined) payload.experience_years = updates.experienceYears;
                else if (existingRecord && existingRecord.experience_years !== undefined) payload.experience_years = existingRecord.experience_years;

                if (updates.profession) payload.business_name = updates.profession;
                else if (existingRecord && existingRecord.business_name !== undefined) payload.business_name = existingRecord.business_name;
            } else {
                payload.role = 'consumer';
                if (updates.searchRadiusKm !== undefined) {
                    payload.search_radius_km = updates.searchRadiusKm;
                } else if (existingRecord && existingRecord.search_radius_km !== undefined) {
                    payload.search_radius_km = existingRecord.search_radius_km;
                }
            }

            if (existingRecord) {
                newId = existingRecord.id;
                await insforge.database
                    .from(tableName)
                    .update(payload)
                    .eq('id', newId);
            } else {
                // Create new record
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
                    console.error("Insert error:", error);
                }
            }

            // Keep core 'users' table in sync for workers
            if (role === 'worker' && newId && !newId.startsWith('local_')) {
                const nameToSync = updates.name || payload.full_name;
                const mobileToSync = mobileToUse || payload.mobile;
                
                await insforge.database
                    .from('users')
                    .upsert([{
                        id: newId,
                        full_name: nameToSync,
                        mobile: mobileToSync,
                        role: 'worker',
                        is_active: payload.is_active
                    }]);

                // Keep provider_locations table in sync
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
                        await insforge.database
                            .from('provider_locations')
                            .update(locPayload)
                            .eq('provider_id', newId);
                    } else {
                        // Fallback coordinates if no GPS fetched yet
                        locPayload.provider_id = newId;
                        locPayload.latitude = userLocation?.coords?.latitude || 21.2514;
                        locPayload.longitude = userLocation?.coords?.longitude || 81.6296;
                        await insforge.database
                            .from('provider_locations')
                            .insert([locPayload]);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to update database profile:", err);
            // Fallback to purely local if backend fails
            if (!newId) newId = `local_${Date.now()}`;
        }
        
        _setUser(prev => {
            const next = { ...prev, ...updates, id: newId };
            AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next)).catch(() => {});
            return next;
        });
    }, [user]);

    const isUnlocked = useCallback((id: string) => unlockedContacts.includes(id), [unlockedContacts]);

    const unlockWorker = useCallback(async (providerId: string) => {
        if (!user.id) return;
        try {
            await insforge.database.from('unlock_transactions').insert([{
                user_id: user.id,
                provider_id: providerId,
                amount: 50,
                payment_status: 'completed',
                transaction_id: `tx_${Date.now()}`
            }]);
            setUnlockedContacts(prev => [...prev, providerId]);
            await refreshProfile();
        } catch (e) {
            console.error("Unlock transaction failed:", e);
        }
    }, [user.id, refreshProfile]);

    const setOnline = useCallback(async (v: boolean) => {
        _setOnline(v);
        AsyncStorage.setItem(STORAGE_KEYS.ONLINE, String(v)).catch(() => {});
        if (user.id) {
            const tableName = user.role === 'worker' ? 'service_providers' : 'users';
            insforge.database.from(tableName).update({ is_active: v }).eq('id', user.id).then();
        }
    }, [user.id, user.role]);

    const toggleOnlineStatus = useCallback(() => {
        setOnline(!isOnline);
    }, [isOnline, setOnline]);

    const handleRazorpayPayment = async (provider: any): Promise<boolean> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                alert(`Mock Payment Successful`);
                resolve(true);
            }, 1000);
        });
    };

    const updateProfile = async (data: any) => {
        await updateDatabaseProfile(data);
        return true;
    };

    const updateWorkerSpecialties = async (categoryIds: string[], tagIds: string[]) => {
        if (!user.id || user.role !== 'worker') return false;
        
        try {
            await insforge.database
                .from('provider_services')
                .delete()
                .eq('provider_id', user.id);
                
            const insertData = [];
            for (const catId of categoryIds) {
                if (tagIds && tagIds.length > 0) {
                    for (const tagId of tagIds) {
                        insertData.push({
                            provider_id: user.id,
                            category_id: catId,
                            tag_id: tagId
                        });
                    }
                } else {
                    insertData.push({
                        provider_id: user.id,
                        category_id: catId,
                    });
                }
            }
            
            if (insertData.length > 0) {
                await insforge.database.from('provider_services').insert(insertData);
            }

            setUser({ professionId: categoryIds[0] });
            return true;
        } catch (e) {
            console.error("Failed to update specialties:", e);
            return false;
        }
    };

    const signOut = async () => {
        await AsyncStorage.clear();
        _setUser(defaultUser);
        setUnlockedContacts([]);
        setUnlockedProviders([]);
    };

    const value = {
        user,
        setUser,
        updateDatabaseProfile,
        refreshProfile,
        unlockedContacts,
        unlockedProviders,
        isUnlocked,
        unlockWorker,
        isOnline,
        setOnline,
        toggleOnlineStatus,
        isLoading,
        hasCheckedAuth,
        isSessionExpired,
        categories,
        userLocation,
        fetchCategories,
        sessionToken,
        workerStats,
        handleRazorpayPayment,
        updateProfile,
        updateWorkerSpecialties,
        signOut,
        loginWithMobile,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
    return useContext(AppContext);
}
