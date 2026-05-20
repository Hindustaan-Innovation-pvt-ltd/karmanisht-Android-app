// @ts-nocheck
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import React from 'react';
import { FlatList, Text, TouchableOpacity, View, Switch, ActivityIndicator, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StarIcon, MapPinIcon, EditIcon, UploadIcon, ShieldIcon, ClockIcon } from '@/svg/icons';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

export default function WorkerDashboard() {
    const { user, isOnline, toggleOnlineStatus, workerStats, refreshProfile } = useAppStore();
    const router = useRouter();
    const [reviews, setReviews] = React.useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = React.useState(true);
    const [subExpiry, setSubExpiry] = React.useState<string | null>(null);
    const [daysLeft, setDaysLeft] = React.useState<number>(0);

    React.useEffect(() => {
        refreshProfile().catch(err => console.error('[WorkerDashboard] refreshProfile error:', err));
    }, [refreshProfile]);

    const initials = user?.name
        ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : '??';

    const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500'];
    const avatarColor = avatarColors[user?.name ? user.name.length % avatarColors.length : 0];

    // Fetch subscription expiry from DB (schema: provider_id, expires_at, is_active)
    React.useEffect(() => {
        async function fetchSubInfo() {
            if (!user?.id || !user?.isPremium) return;
            try {
                const { data } = await insforge.database
                    .from('provider_premium_subscriptions')
                    .select('expires_at')
                    .eq('provider_id', user.id)
                    .eq('is_active', true)
                    .order('expires_at', { ascending: false })
                    .limit(1);

                if (data && data[0]) {
                    const exp = data[0].expires_at;
                    setSubExpiry(exp);
                    const days = Math.max(0, Math.ceil((new Date(exp).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                    setDaysLeft(days);
                }
            } catch (e) {
                console.error('[Dashboard] Sub fetch error:', e);
            }
        }
        fetchSubInfo();
    }, [user?.id, user?.isPremium]);

    const formatExpiry = (iso: string) =>
        new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    React.useEffect(() => {
        async function fetchReviews() {
            if (!user?.id) return;
            setLoadingReviews(true);
            try {
                const { data, error } = await insforge.database
                    .from('reviews')
                    .select('id, rating, content, created_at, users(full_name)')
                    .eq('provider_id', user.id);

                if (data && !error) {
                    const formattedReviews = data.map(item => ({
                        id: item.id,
                        rating: item.rating,
                        review: item.content,
                        created_at: item.created_at,
                        reviewer: {
                            full_name: item.users?.full_name || 'Anonymous'
                        }
                    }));
                    setReviews(formattedReviews);
                } else {
                    setReviews([]);
                }
            } catch (err) {
                console.error("Failed to fetch reviews:", err);
                setReviews([]);
            } finally {
                setLoadingReviews(false);
            }
        }
        fetchReviews();
    }, [user?.id]);

    const renderHeader = () => (
        <View className="w-full">
            {/* Header */}
            <View
                className="bg-white dark:bg-slate-900 px-5 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800"
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
                <View className="flex-row items-center justify-between mb-6">
                    <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Dashboard</Text>
                    <View className="flex-row items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
                        <Text className={`text-xs font-bold ${isOnline ? 'text-green-600' : 'text-slate-400'}`}>
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </Text>

                        <Switch
                            value={isOnline}
                            onValueChange={toggleOnlineStatus}
                            trackColor={{ false: '#CBD5E1', true: '#22C55E' }}
                            thumbColor="#fff"
                            ios_backgroundColor="#CBD5E1"
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                    </View>
                </View>

                <View className="flex-row items-start gap-4">
                    {/* Avatar */}
                    <View className="relative">
                        {user?.profile_image ? (
                            <Image
                                source={{ uri: user.profile_image }}
                                className="size-16 rounded-full border border-white/20 shadow-sm"
                                resizeMode="cover"
                            />
                        ) : (
                            <View className={`size-16 rounded-full ${avatarColor} items-center justify-center border border-white/20 shadow-sm`}>
                                <Text className="text-2xl font-black text-white">{initials || '??'}</Text>
                            </View>
                        )}
                        <View className={`absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
                    </View>

                    {/* Info */}
                    <View className="flex-1">
                        <View className="flex-row items-center gap-2 flex-wrap">
                            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                {user?.name || 'Anonymous'}
                            </Text>
                            {user?.isPremium && (
                                <View style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 3,
                                    backgroundColor: '#F59E0B',
                                    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99
                                }}>
                                    <Ionicons name="ribbon" size={10} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 9, letterSpacing: 0.5 }}>
                                        PREMIUM
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-sm text-slate-500 font-medium">{user?.profession || 'Service Provider'}</Text>
                        <View className="flex-row items-center gap-1 mt-1">
                            <MapPinIcon size={12} color="#94A3B8" />
                            <Text className="text-xs text-slate-400 font-medium">{user?.location || 'Location not set'}</Text>
                        </View>
                    </View>

                    {/* Edit */}
                    <TouchableOpacity
                        onPress={() => router.push('/(protected)/worker/edit-profile')}
                        className="size-10 rounded-full border border-slate-200 items-center justify-center"
                    >
                        <EditIcon size={18} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Stats Card */}
                <View
                    className="flex-row mt-6 bg-slate-900 dark:bg-slate-800 rounded-[24px] p-1 overflow-hidden"
                    style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                >
                    <View className="flex-1 items-center py-4 border-r border-slate-800">
                        <View className="flex-row items-center gap-1">
                            <StarIcon size={14} color="#F59E0B" filled />
                            <Text className="text-lg font-bold text-white">{workerStats.rating?.toFixed(1) || '0.0'}</Text>
                        </View>
                        <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rating</Text>
                    </View>
                    <View className="flex-1 items-center py-4 border-r border-slate-800">
                        <Text className="text-lg font-bold text-white">{workerStats.jobsDone || 0}</Text>
                        <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jobs Done</Text>
                    </View>
                    <View className="flex-1 items-center py-4">
                        <Text className="text-lg font-bold text-white">{user?.experience || '0 yrs'}</Text>
                        <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Experience</Text>
                    </View>
                </View>

                {/* Verification Nudge */}
                <TouchableOpacity
                    onPress={() => router.push('/(protected)/worker/verify-identity?from=dashboard')}
                    className="flex-row items-center gap-3 mt-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30"
                >
                    <View className="size-8 rounded-full bg-amber-100 items-center justify-center">
                        <ShieldIcon size={16} color="#D97706" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-xs font-bold text-amber-900">Get Verified</Text>
                        <Text className="text-[10px] text-amber-700 font-medium">Verify your identity to get 2x more leads</Text>
                    </View>
                    <Text className="text-xs font-black text-amber-900">START</Text>
                </TouchableOpacity>

                {/* Premium Subscription Nudge */}
                <TouchableOpacity
                    onPress={() => router.push('/(protected)/worker/premium-plans')}
                    activeOpacity={0.85}
                    className={`mt-3 rounded-2xl border overflow-hidden ${user?.isPremium
                        ? 'bg-[#18181B] border-amber-800/30'
                        : 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30'
                        }`}
                >
                    {user?.isPremium ? (
                        <View className="p-4">
                            {/* Plan header */}
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center gap-2">
                                    <Ionicons name="ribbon" size={16} color="#F59E0B" />
                                    <Text className="text-xs font-black text-amber-400 uppercase tracking-widest">
                                        PREMIUM PLAN
                                    </Text>
                                </View>
                                {/* Active dot */}
                                <View className="flex-row items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    <View className="size-1.5 rounded-full bg-emerald-400" />
                                    <Text className="text-[9px] font-black text-emerald-400">ACTIVE</Text>
                                </View>
                            </View>

                            {/* Expiry row */}
                            {subExpiry && (
                                <View className="flex-row items-center gap-2 mb-3">
                                    <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                                    <Text className="text-xs font-semibold text-slate-400">
                                        Valid till {formatExpiry(subExpiry)} · {daysLeft} days left
                                    </Text>
                                </View>
                            )}

                            {/* Benefits summary */}
                            <View className="flex-row items-center justify-between">
                                <Text className="text-xs font-medium text-slate-400">
                                    Top ranking · Unlimited leads · Verified badge
                                </Text>
                                <View className="bg-slate-700 px-3 py-1 rounded-xl">
                                    <Text className="text-white text-[10px] font-black">MANAGE</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View className="flex-row items-center gap-3 p-4">
                            <View className="size-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center">
                                <Ionicons name="ribbon" size={16} color="#6366F1" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs font-bold text-indigo-950 dark:text-indigo-300">Upgrade to Premium</Text>
                                <Text className="text-[10px] text-indigo-700 dark:text-indigo-400">Boost ranking, get verified badge & unlimited leads</Text>
                            </View>
                            <Text className="text-xs font-black text-indigo-950 dark:text-indigo-200">VIEW</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Quick Actions Grid */}
            <View className="px-5 mt-6">
                <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Settings & Tools</Text>
                <View className="flex-col gap-3">
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            onPress={() => router.push('/(location)/locationinfo')}
                            className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 items-center gap-2"
                        >
                            <View className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                                <MapPinIcon size={20} color="#3B82F6" />
                            </View>
                            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Area</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/(protected)/worker/verify-identity?from=dashboard')}
                            className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 items-center gap-2"
                        >
                            <View className="size-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 items-center justify-center">
                                <UploadIcon size={20} color="#A855F7" />
                            </View>
                            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Documents</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 items-center gap-2"
                        >
                            <View className="size-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center">
                                <StarIcon size={20} color="#EC4899" filled />
                            </View>
                            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Reviews</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/(protected)/worker/premium-plans')}
                            className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 items-center gap-2"
                        >
                            <View className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 items-center justify-center">
                                <Ionicons name="ribbon" size={20} color="#F59E0B" />
                            </View>
                            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Premium Plans</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Recent Reviews Section Title */}
            <View className="px-5 mt-8 mb-4 flex-row items-center justify-between">
                <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest">Recent Reviews</Text>
                <TouchableOpacity>
                    <Text className="text-xs text-slate-500 font-bold">See All</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderEmpty = () => {
        if (loadingReviews) {
            return (
                <View className="py-8 items-center justify-center">
                    <ActivityIndicator color="black" />
                    <Text className="mt-2 text-xs text-slate-400 font-bold uppercase tracking-widest">Loading Reviews...</Text>
                </View>
            );
        }
        return (
            <View className="bg-white rounded-[24px] p-8 items-center justify-center border border-slate-100 shadow-sm mx-5 mb-6">
                <View className="size-12 rounded-full bg-slate-50 items-center justify-center mb-4">
                    <ShieldIcon size={20} color="#CBD5E1" />
                </View>
                <Text className="text-slate-400 text-center font-medium">No reviews yet. Complete jobs to get rated!</Text>
            </View>
        );
    };

    return (
        <SafeAreaProvider>
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
                <FlatList
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    ListHeaderComponent={renderHeader}
                    data={reviews}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={renderEmpty}
                    renderItem={({ item: r }) => (
                        <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 mx-5 border border-slate-100 dark:border-slate-800">
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center gap-2">
                                    <View className="size-8 rounded-full bg-slate-50 items-center justify-center">
                                        <Text className="text-xs font-bold text-slate-600">{(r.reviewer?.full_name || 'U')[0]}</Text>
                                    </View>
                                    <Text className="text-sm font-bold text-slate-800 dark:text-slate-100">{r.reviewer?.full_name || 'Anonymous User'}</Text>
                                </View>
                                <View className="flex-row items-center gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <StarIcon key={i} size={11} color={i < r.rating ? "#F59E0B" : "#E2E8F0"} filled={i < r.rating} />
                                    ))}
                                </View>
                            </View>
                            <Text className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">&quot;{r.review}&quot;</Text>
                            <View className="flex-row items-center gap-1 mt-3">
                                <ClockIcon size={10} color="#94A3B8" />
                                <Text className="text-[10px] text-slate-400 font-bold uppercase">{new Date(r.created_at).toLocaleDateString()}</Text>
                            </View>
                        </View>
                    )}
                />
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

