import { useQuery } from '@tanstack/react-query';
import { insforge } from '@/lib/insforge';
import * as Location from 'expo-location';

// ─── Distance Utility ────────────────────────────────────────────────────────
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Fallback categories for offline / no-db cases
export const CATEGORY_FALLBACKS = [
    { id: '3489b160-1ea8-42cb-808f-7279e35cc717', name: 'Electrician', icon: 'zap', color: '#fbbf24' },
    { id: '7e1f79f0-1820-4241-8ebb-a6595f1988b0', name: 'Plumber', icon: 'droplet', color: '#3b82f6' },
    { id: 'e791e458-ca7e-4d74-9b3f-4021f6af6f70', name: 'AC Technician', icon: 'wind', color: '#06b6d4' },
    { id: '9348cab2-acc3-4453-a62d-7c9dbe41ea37', name: 'Refrigerator Technician', icon: 'refrigerator', color: '#8b5cf6' },
    { id: 'a1f9f05d-4589-4fb6-b4d8-7818fbaff2cd', name: 'Washing Machine Technician', icon: 'washing-machine', color: '#10b981' },
    { id: '5f9c50e5-89e4-454b-80f0-85175f0d5ec2', name: 'TV & Electronics Technician', icon: 'tv', color: '#6366f1' },
    { id: '199e1408-f208-42a3-8408-3dacc11c5b41', name: 'Computer / IT Technician', icon: 'monitor', color: '#ec4899' },
    { id: 'a4448bb4-683e-45fa-8295-133444f262e5', name: 'Carpenter', icon: 'hammer', color: '#f59e0b' },
];

// Fallback tags for categories
export const SUBCATEGORY_FALLBACKS = [
    { id: '1', name: 'Emergency Repair' },
    { id: '2', name: 'New Installation' },
    { id: '3', name: 'Maintenance' },
];

// ─── 1. useCategories Hook ───────────────────────────────────────────────────
export function useCategories(userId?: string) {
    return useQuery({
        queryKey: ['categories', userId],
        queryFn: async () => {
            try {
                const { data, error } = await insforge.database
                    .from('service_categories')
                    .select('*')
                    .eq('is_active', true);

                if (error) throw error;
                return (data && data.length > 0) ? data : CATEGORY_FALLBACKS;
            } catch (err) {
                console.error('[useCategories] Failed to fetch. Using fallback data.', err);
                return CATEGORY_FALLBACKS;
            }
        },
    });
}

// ─── 2. useSubCategories Hook ────────────────────────────────────────────────
export function useSubCategories(categoryId: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidId = uuidRegex.test(categoryId);

    return useQuery({
        queryKey: ['subcategories', categoryId],
        queryFn: async () => {
            if (!isValidId) {
                console.warn(`[useSubCategories] Invalid category ID: "${categoryId}". Using fallbacks.`);
                return SUBCATEGORY_FALLBACKS;
            }
            try {
                const { data, error } = await insforge.database
                    .from('service_tags')
                    .select('id, name')
                    .eq('category_id', categoryId);

                if (error) throw error;
                return (data && data.length > 0) ? data : SUBCATEGORY_FALLBACKS;
            } catch (err) {
                console.error('[useSubCategories] Failed to fetch. Using fallbacks.', err);
                return SUBCATEGORY_FALLBACKS;
            }
        },
        enabled: !!categoryId,
    });
}

// ─── 3. useProviders Hook ────────────────────────────────────────────────────
interface ProviderLocationCoords {
    latitude: number;
    longitude: number;
}

export function useProviders(
    categoryId: string,
    userLocationCoords: ProviderLocationCoords | null,
    categoryName: string,
    userId: string | undefined
) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidId = uuidRegex.test(categoryId);

    // Approximate coords to 3 decimal places (~110m resolution) in the queryKey.
    // This prevents micro-movements of the device from invalidating the cache,
    // which saves precious bandwidth on slow 3G/4G connections.
    const keyLat = userLocationCoords ? Math.round(userLocationCoords.latitude * 1000) / 1000 : null;
    const keyLng = userLocationCoords ? Math.round(userLocationCoords.longitude * 1000) / 1000 : null;

    return useQuery({
        queryKey: ['providers', categoryId, keyLat, keyLng, userId],
        queryFn: async () => {
            if (!isValidId) {
                return [];
            }

            const lat = userLocationCoords ? userLocationCoords.latitude : 21.2514;
            const lng = userLocationCoords ? userLocationCoords.longitude : 81.6296;
            const customerId = userId || '00000000-0000-0000-0000-000000000000';

            const { data, error } = await insforge.database.rpc('get_nearby_providers_secure', {
                p_customer_id: customerId,
                p_category_id: categoryId,
                p_user_lat: lat,
                p_user_lng: lng
            });

            if (error) {
                console.error('[useProviders] RPC Error, fallback to empty list:', error);
                throw error;
            }

            if (!data || data.length === 0) return [];

            return data.map((p: any) => ({
                provider_id: p.provider_id,
                full_name: p.full_name,
                business_name: p.business_name,
                profile_image: p.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}`,
                average_rating: Number(p.average_rating) || 0.0,
                total_reviews: p.total_reviews || 0,
                distance_km: Number(p.distance_km) || 0,
                experience_years: p.experience_years || 0,
                mobile: p.mobile,
                email: p.email,
                latitude: p.latitude,
                longitude: p.longitude,
                is_unlocked: p.is_unlocked || false,
                unlock_expires_in_seconds: p.unlock_expires_in_seconds || 0,
                description: p.bio || `Expert ${categoryName} services.`,
                tags: p.tags || [],
                service_radius_km: Number(p.service_radius_km) || 5,
                is_premium: p.is_premium || false
            }));
        },
        enabled: !!categoryId,
    });
}

// ─── 4. useCityPricing Hook ──────────────────────────────────────────────────
export function useCityPricing(categoryId: string, userLocationCoords: ProviderLocationCoords | null) {
    const keyLat = userLocationCoords ? Math.round(userLocationCoords.latitude * 1000) / 1000 : null;
    const keyLng = userLocationCoords ? Math.round(userLocationCoords.longitude * 1000) / 1000 : null;

    return useQuery({
        queryKey: ['cityPricing', categoryId, keyLat, keyLng],
        queryFn: async () => {
            let cityName = 'Raipur'; // Default fallback

            if (userLocationCoords) {
                try {
                    const address = await Location.reverseGeocodeAsync({
                        latitude: userLocationCoords.latitude,
                        longitude: userLocationCoords.longitude
                    });
                    if (address && address.length > 0) {
                        cityName = address[0].city || address[0].subregion || address[0].region || 'Raipur';
                    }
                } catch (err) {
                    console.log('[useCityPricing] Reverse geocode failed, finding closest city coords distance fallback:', err);
                    const cityCoords = [
                        { name: 'Raipur', lat: 21.2514, lng: 81.6296 },
                        { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
                        { name: 'Indore', lat: 22.7196, lng: 75.8577 },
                        { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
                        { name: 'Bilaspur', lat: 22.0797, lng: 82.1391 },
                        { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
                        { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
                        { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
                        { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
                        { name: 'Pune', lat: 18.5204, lng: 73.8567 },
                    ];
                    let minDistance = Infinity;
                    let closest = 'Raipur';
                    for (const c of cityCoords) {
                        const dist = getDistanceKm(userLocationCoords.latitude, userLocationCoords.longitude, c.lat, c.lng);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closest = c.name;
                        }
                    }
                    cityName = closest;
                }
            }

            // Fetch city details
            const { data: dbCities, error: cityError } = await insforge.database
                .from('cities')
                .select('*')
                .ilike('name', `%${cityName}%`);

            let resolvedCity = null;
            if (dbCities && dbCities.length > 0 && !cityError) {
                resolvedCity = dbCities[0];
            } else {
                // Fetch default city
                const { data: defaultCities } = await insforge.database
                    .from('cities')
                    .select('*')
                    .eq('name', 'Raipur');
                if (defaultCities && defaultCities.length > 0) {
                    resolvedCity = defaultCities[0];
                }
            }

            // Fetch dynamic payment settings defaults from the database
            const { data: settingsData } = await insforge.database
                .from('payment_settings')
                .select('*');

            const settings: Record<string, string> = {};
            if (settingsData) {
                settingsData.forEach((s: any) => {
                    settings[s.key] = s.value;
                });
            }

            const defaultUnlockHours = settings['default_unlock_duration_hours'] 
                ? Number(settings['default_unlock_duration_hours']) 
                : 5;
            const unlockPriceTier1 = settings['default_unlock_price_tier_1'] 
                ? Number(settings['default_unlock_price_tier_1']) 
                : 99;
            const unlockPriceTier2 = settings['default_unlock_price_tier_2'] 
                ? Number(settings['default_unlock_price_tier_2']) 
                : 49;
            const unlockPriceTier3 = settings['default_unlock_price_tier_3'] 
                ? Number(settings['default_unlock_price_tier_3']) 
                : 49;

            const basicFeeTier1 = settings['default_provider_basic_fee_tier_1'] 
                ? Number(settings['default_provider_basic_fee_tier_1']) 
                : 2999;
            const basicFeeTier2 = settings['default_provider_basic_fee_tier_2'] 
                ? Number(settings['default_provider_basic_fee_tier_2']) 
                : 1999;
            const basicFeeTier3 = settings['default_provider_basic_fee_tier_3'] 
                ? Number(settings['default_provider_basic_fee_tier_3']) 
                : 499;

            const premiumFeeTier1 = settings['default_provider_premium_fee_tier_1'] 
                ? Number(settings['default_provider_premium_fee_tier_1']) 
                : 20000;
            const premiumFeeTier2 = settings['default_provider_premium_fee_tier_2'] 
                ? Number(settings['default_provider_premium_fee_tier_2']) 
                : 15000;
            const premiumFeeTier3 = settings['default_provider_premium_fee_tier_3'] 
                ? Number(settings['default_provider_premium_fee_tier_3']) 
                : 5000;

            if (!resolvedCity) {
                return {
                    cityConfig: { id: '57b3868e-c554-4ae5-b80f-fb1bd0617542', name: 'Raipur', tier: 'tier_2' },
                    pricingConfig: {
                        unlock_price: unlockPriceTier2,
                        provider_basic_fee: basicFeeTier2,
                        provider_premium_fee: premiumFeeTier2,
                        unlock_duration_hours: defaultUnlockHours
                    }
                };
            }

            // Fetch pricing config
            const { data: priceData, error: priceError } = await insforge.database
                .from('city_pricing_config')
                .select('unlock_price, provider_basic_fee, provider_premium_fee, unlock_duration_hours')
                .eq('city_id', resolvedCity.id)
                .eq('profession_id', categoryId)
                .maybeSingle();

            const pricingConfig = (priceData && !priceError)
                ? {
                    unlock_price: Number(priceData.unlock_price),
                    provider_basic_fee: Number(priceData.provider_basic_fee),
                    provider_premium_fee: Number(priceData.provider_premium_fee),
                    unlock_duration_hours: Number(priceData.unlock_duration_hours)
                }
                : {
                    unlock_price: resolvedCity.tier === 'tier_1' ? unlockPriceTier1 : (resolvedCity.tier === 'tier_2' ? unlockPriceTier2 : unlockPriceTier3),
                    provider_basic_fee: resolvedCity.tier === 'tier_1' ? basicFeeTier1 : (resolvedCity.tier === 'tier_2' ? basicFeeTier2 : basicFeeTier3),
                    provider_premium_fee: resolvedCity.tier === 'tier_1' ? premiumFeeTier1 : (resolvedCity.tier === 'tier_2' ? premiumFeeTier2 : premiumFeeTier3),
                    unlock_duration_hours: defaultUnlockHours
                };

            return {
                cityConfig: resolvedCity,
                pricingConfig
            };
        },
        enabled: !!categoryId,
    });
}

// ─── 5. useActivePasses Hook ─────────────────────────────────────────────────
export function useActivePasses(userId: string | undefined) {
    // Round current time to nearest 2 minutes to keep query key stable.
    // This allows cached active passes to be hit repeatedly without hitting the database.
    const roundedNow = new Date(Math.floor(Date.now() / 120000) * 120000).toISOString();

    return useQuery({
        queryKey: ['activePasses', userId, roundedNow],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { data, error } = await insforge.database
                    .from('unlock_passes')
                    .select('*')
                    .eq('customer_id', userId)
                    .eq('payment_status', 'paid')
                    .gt('expires_at', roundedNow);

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('[useActivePasses] Failed to fetch active passes.', err);
                return [];
            }
        },
        enabled: !!userId,
    });
}
