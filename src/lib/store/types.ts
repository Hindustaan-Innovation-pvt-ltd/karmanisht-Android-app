import * as Location from 'expo-location';

export type UserRole = 'worker' | 'consumer' | 'admin' | null;

export interface UserProfile {
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
    profile_image?: string;
    hasSpecialties?: boolean;
    /** Worker-only. Consumers do NOT have premium. Sourced from service_providers.is_premium. */
    isPremium?: boolean;
}

export interface Category {
    id: string;
    name: string;
    icon?: string;
    color?: string;
}

export interface AuthSlice {
    user: UserProfile;
    isOnline: boolean;
    isLoading: boolean;
    hasCheckedAuth: boolean;
    isSessionExpired: boolean;
    sessionToken: string | null;

    setUser: (u: Partial<UserProfile>) => void;
    /**
     * Central post-auth method. Takes an authenticated user's ID, looks them up
     * in the DB, syncs the Zustand store + AsyncStorage, and returns the profile.
     * Returns null if the user has no DB record (i.e., they are brand new).
     */
    processUserSession: (userId: string, fallbackName?: string) => Promise<UserProfile | null>;
    refreshProfile: () => Promise<void>;
    updateDatabaseProfile: (u: Partial<UserProfile>) => Promise<void>;
    setOnline: (v: boolean) => void;
    toggleOnlineStatus: () => void;
    signOut: () => Promise<void>;
}

export interface CommonSlice {
    categories: Category[];
    isCategoriesLoading: boolean;
    userLocation: Location.LocationObject | null;

    fetchCategories: () => Promise<void>;
    updateProfile: (data: any) => Promise<boolean>;
}

export interface ConsumerSlice {
    unlockedContacts: string[];
    unlockedProviders: any[];
    activePasses: any[];

    isUnlocked: (id: string, categoryId?: string) => boolean;
    unlockWorker: (id: string) => Promise<void>;
    handleRazorpayPayment: (provider: any, amount?: number) => Promise<boolean>;
    fetchActivePasses: () => Promise<void>;
}

export interface WorkerSlice {
    workerStats: { rating: number; jobsDone: number; responseTime: string };

    updateWorkerSpecialties: (categoryIds: string[], tagIds: string[]) => Promise<boolean>;
}

export type AppStoreType = AuthSlice & CommonSlice & ConsumerSlice & WorkerSlice;

export const defaultUser: UserProfile = {
    name: '',
    role: null,
    isOnline: true,
};

export const STORAGE_KEYS = {
    USER: '@@app_user',
    ONLINE: '@@app_online',
    TOKEN: '@@app_token',
    REFRESH_TOKEN: '@@app_refresh_token',
};
