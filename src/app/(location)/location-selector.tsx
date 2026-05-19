// @ts-nocheck
import React from 'react'
import { Image, Text, TouchableOpacity, View, Alert } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LocationBrokenIcon, LocationIcon } from '@/svg/location'
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import BackButton from '@/components/back-button';
import { cn } from '@/lib/utils';
import { router } from 'expo-router';

export default function LocationSelector() {
    const [permissionStatus, setPermissionStatus] = React.useState<Location.PermissionStatus | null>(null)
    const [location, setLocation] = React.useState<Location.LocationObject | null>(null)
    const [canAskAgain, setCanAskAgain] = React.useState<boolean>(true)

    async function requestPermissionAndGetLocation() {
        const { granted, status, canAskAgain: canAsk } = await Location.requestForegroundPermissionsAsync();

        setPermissionStatus(status);
        setCanAskAgain(canAsk);

        if (granted) {
            try {
                const location = (await Location.getLastKnownPositionAsync()) ??
                                 await Location.getCurrentPositionAsync({ maximumAge: 60000, timeout: 10000 });
                setLocation(location);
                router.push("/locationinfo")

            } catch (err) {
                console.log("Failed to get location in requestPermissionAndGetLocation:", err);
                Alert.alert('Error', 'Failed to get location');
            }
        }
    }

    async function handlePress() {
        // Case 1: Already granted — just get location
        if (permissionStatus === Location.PermissionStatus.GRANTED) {
            try {
                const location = (await Location.getLastKnownPositionAsync()) ??
                                 await Location.getCurrentPositionAsync({ maximumAge: 60000, timeout: 10000 });
                setLocation(location);
                router.push("/locationinfo")
            } catch (err) {
                console.log("Failed to get location in handlePress:", err);
                Alert.alert('Error', 'Failed to get location');
            }
            return;
        }

        // Case 2: Denied but OS will re-prompt (first denial on Android)
        if (!canAskAgain) {
            Alert.alert(
                'Permission Required',
                'Location access was permanently denied. Please enable it in Settings.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ]
            );
            return;
        }

        // Case 3: First time or soft denial — trigger OS prompt
        await requestPermissionAndGetLocation();
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView className='relative flex-col flex-1 overflow-hidden bg-white dark:bg-slate-950'>
                <BackButton />
                <Image
                    source={require("@assets/images/image.png")}
                    className={cn(
                        "absolute -z-10 opacity-15",
                        permissionStatus === Location.PermissionStatus.DENIED ? "grayscale blur-sm" : "grayscale-0"
                    )}
                />

                <View className='flex-1 items-center justify-center gap-4 px-4'>
                    {
                        permissionStatus === Location.PermissionStatus.DENIED ? (
                            <LocationBrokenIcon size={80} color="#434343" />
                        ) : (
                            <LocationIcon size={80} color="#D92C00" />
                        )
                    }

                    <Text className='text-center text-2xl font-bold text-slate-900 dark:text-slate-100'>Find Workers near you</Text>
                    <Text className='w-80 text-center text-gray-600 dark:text-gray-400 text-xl'>
                        Allow location access to discover professionals near you
                    </Text>

                    {/* Status feedback */}
                    {permissionStatus === Location.PermissionStatus.DENIED && canAskAgain && (
                        <Text className='text-center text-red-500 text-sm'>
                            Location was denied. Tap below to try again.
                        </Text>
                    )}
                    {permissionStatus === Location.PermissionStatus.DENIED && !canAskAgain && (
                        <Text className='text-center text-red-500 text-sm'>
                            Permission permanently denied. Open Settings to enable location.
                        </Text>
                    )}
                </View>

                <View className='p-4'>
                    <TouchableOpacity
                        className="flex-row items-center justify-center gap-2 rounded-2xl bg-black dark:bg-blue-600 py-4"
                        activeOpacity={0.7}
                        onPress={handlePress}
                    >
                        <LocationIcon />
                        <Text className='text-white text-lg font-semibold'>
                            {!canAskAgain
                                ? 'Open Settings'
                                : permissionStatus === Location.PermissionStatus.DENIED
                                    ? 'Retry Location Access'
                                    : 'Select Location'
                            }
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    )
}