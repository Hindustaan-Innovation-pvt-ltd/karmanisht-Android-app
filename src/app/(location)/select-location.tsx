// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import CustomAlert from '@/components/ui/custom-alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LocationMapPicker from '@/components/location-map-picker';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import ScalePressable from '@/components/scale-pressable';
import * as Haptics from 'expo-haptics';
import Animated, { 
    FadeInDown, 
    FadeInLeft, 
    FadeInRight, 
    FadeOutLeft, 
    FadeOutRight,
    useAnimatedStyle, 
    useSharedValue, 
    withSpring 
} from 'react-native-reanimated';

export default function SelectLocation() {
    const router = useRouter();
    const user = useAppStore(state => state.user);
    const userLocation = useAppStore(state => state.userLocation);
    const updateDatabaseProfile = useAppStore(state => state.updateDatabaseProfile);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'error' | 'success' | 'info' | 'warning';
        onClose?: () => void;
    } | null>(null);

    const showAlert = (
        title: string,
        message: string,
        type: 'error' | 'success' | 'info' | 'warning' = 'error',
        onClose?: () => void
    ) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            type,
            onClose: () => {
                setAlertConfig(null);
                if (onClose) onClose();
            }
        });
    };

    const [currentAddress, setCurrentAddress] = useState('Locating current address...');
    const [searchQuery, setSearchQuery] = useState('');
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);

    // Online autocomplete search states
    const [onlineSuggestions, setOnlineSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Form states
    const [showAddForm, setShowAddForm] = useState(false);
    const [formCoords, setFormCoords] = useState({ latitude: 21.2514, longitude: 81.6296 });
    const [formRegion, setFormRegion] = useState(null);
    const [addressName, setAddressName] = useState('Home');
    const [customName, setCustomName] = useState('');
    const [addressLine, setAddressLine] = useState('');
    const [savingAddress, setSavingAddress] = useState(false);

    // Reanimated shared values for center pin bounce animation
    const pinTranslateY = useSharedValue(0);
    const pinScale = useSharedValue(1);
    const shadowScale = useSharedValue(1);
    const shadowOpacity = useSharedValue(0.15);

    // Shared values for the dynamic search results
    const animatedPinStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: -19 + pinTranslateY.value },
                { scale: pinScale.value }
            ]
        };
    });

    const animatedShadowStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: shadowScale.value }],
            opacity: shadowOpacity.value
        };
    });

    // Fetch saved addresses from DB
    const fetchSavedAddresses = useCallback(async () => {
        if (!user?.id) return;
        setLoadingAddresses(true);
        try {
            const { data, error } = await insforge.database
                .from('user_addresses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching addresses:', error);
            } else if (data) {
                setSavedAddresses(data);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoadingAddresses(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchSavedAddresses();
    }, [fetchSavedAddresses]);

    // Debounced online place query using Nominatim
    useEffect(() => {
        let active = true;
        let controller: AbortController | null = null;
        let timeoutId: any = null;

        const searchOnlinePlaces = async () => {
            const query = searchQuery.trim();
            if (query.length < 3) {
                setOnlineSuggestions([]);
                return;
            }
            setLoadingSuggestions(true);
            controller = new AbortController();
            timeoutId = setTimeout(() => {
                if (controller) controller.abort();
            }, 5000);

            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
                    {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'Hindustaan-Innovations-App'
                        }
                    }
                );
                if (timeoutId) clearTimeout(timeoutId);
                const data = await response.json();
                if (active) {
                    if (data && Array.isArray(data)) {
                        const formatted = data.map(item => ({
                            display_name: item.display_name,
                            latitude: parseFloat(item.lat),
                            longitude: parseFloat(item.lon)
                        }));
                        setOnlineSuggestions(formatted);
                    } else {
                        setOnlineSuggestions([]);
                    }
                }
            } catch (error: any) {
                if (active && error.name !== 'AbortError') {
                    console.warn("Nominatim search error:", error);
                }
            } finally {
                if (active) {
                    setLoadingSuggestions(false);
                }
            }
        };

        const timer = setTimeout(() => {
            searchOnlinePlaces();
        }, 500);

        return () => {
            active = false;
            clearTimeout(timer);
            if (timeoutId) clearTimeout(timeoutId);
            if (controller) controller.abort();
        };
    }, [searchQuery]);

    // Fetch and geocode current location for the subtext
    useEffect(() => {
        const getGeo = async () => {
            try {
                let loc = userLocation;
                if (!loc) {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        loc = await Location.getLastKnownPositionAsync() ??
                              await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    }
                }

                if (loc?.coords) {
                    const address = await Location.reverseGeocodeAsync({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude
                    });
                    if (address && address.length > 0) {
                        const place = address[0];
                        const formatted = [
                            place.name,
                            place.street,
                            place.district,
                            place.subregion,
                            place.city,
                            place.region,
                            place.country
                        ].filter(Boolean).join(', ');
                        setCurrentAddress(formatted || 'Raipur, Chhattisgarh, India');
                    } else {
                        setCurrentAddress('Raipur, Chhattisgarh, India');
                    }
                } else {
                    setCurrentAddress('Raipur, Chhattisgarh, India');
                }
            } catch {
                // Location unavailable on this device/emulator — use default
                setCurrentAddress('Raipur, Chhattisgarh, India');
            }
        };
        getGeo();
    }, [userLocation]);

    // Haversine distance calculator
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Open map and form with current location pre-filled
    const handleUseCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission Denied', 'Location permission is required to use this feature.', 'warning');
                return;
            }

            const loc = (await Location.getLastKnownPositionAsync()) ??
                        await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;

            let addr = 'Current Location';
            try {
                const address = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                if (address && address.length > 0) {
                    const place = address[0];
                    addr = [
                        place.name,
                        place.street,
                        place.district,
                        place.subregion,
                        place.city,
                        place.region,
                        place.country
                    ].filter(Boolean).join(', ');
                }
            } catch (geocodeErr) {
                console.log("Geocoding failed inside handleUseCurrentLocation:", geocodeErr);
            }

            setFormCoords({ latitude: lat, longitude: lng });
            setFormRegion({
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.00922,
                longitudeDelta: 0.00421,
            });
            setAddressLine(addr);
            setAddressName('Home');
            setCustomName('');
            setShowAddForm(true);
        } catch (error) {
            console.log("Location selection fallback error:", error);
            // Even if an error happens, open the map form with default Raipur coordinates so the user is not stuck
            setFormCoords({ latitude: 21.2514, longitude: 81.6296 });
            setFormRegion({
                latitude: 21.2514,
                longitude: 81.6296,
                latitudeDelta: 0.00922,
                longitudeDelta: 0.00421,
            });
            setAddressLine('Raipur, Chhattisgarh, India');
            setAddressName('Home');
            setCustomName('');
            setShowAddForm(true);
        }
    };

    // Map drag begins
    const handleRegionChange = () => {
        pinTranslateY.value = withSpring(-18, { damping: 15, stiffness: 150 });
        pinScale.value = withSpring(1.15, { damping: 15, stiffness: 150 });
        shadowScale.value = withSpring(0.5, { damping: 15, stiffness: 150 });
        shadowOpacity.value = withSpring(0.05, { damping: 15, stiffness: 150 });
    };

    // Map drag settles
    const handleRegionChangeComplete = async (region: any) => {
        pinTranslateY.value = withSpring(0, { damping: 8, stiffness: 220 });
        pinScale.value = withSpring(1, { damping: 8, stiffness: 220 });
        shadowScale.value = withSpring(1, { damping: 8, stiffness: 220 });
        shadowOpacity.value = withSpring(0.15, { damping: 8, stiffness: 220 });

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }

        const lat = region.latitude;
        const lng = region.longitude;
        setFormCoords({ latitude: lat, longitude: lng });
        handleMapDrag(lat, lng);
    };

    // Dragging map or marker updates coordinates and reverse-geocodes
    const handleMapDrag = async (lat: number, lng: number) => {
        try {
            const address = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lng
            });
            if (address && address.length > 0) {
                const place = address[0];
                const formatted = [
                    place.name,
                    place.street,
                    place.district,
                    place.subregion,
                    place.city,
                    place.region,
                    place.country
                ].filter(Boolean).join(', ');
                setAddressLine(formatted || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
        } catch (err) {
            console.log(err);
        }
    };

    // Save address to DB
    const handleSaveAddress = async () => {
        if (!addressLine.trim()) {
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            }
            showAlert('Validation Error', 'Please enter address details.', 'error');
            return;
        }

        if (!user?.id) {
            showAlert('Authentication Error', 'User session not found. Please log in again.', 'error');
            return;
        }

        const finalName = addressName === 'Other' ? (customName.trim() || 'Other') : addressName;
        setSavingAddress(true);

        try {
            const { error } = await insforge.database
                .from('user_addresses')
                .insert([
                    {
                        user_id: user.id,
                        name: finalName,
                        address_line: addressLine,
                        latitude: formCoords.latitude,
                        longitude: formCoords.longitude
                    }
                ]);

            if (error) throw error;

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
            
            const cleanLine = addressLine.replace(/^[A-Z0-9]{4,}\+[A-Z0-9]+,\s*/i, '');
            await updateDatabaseProfile({
                location: cleanLine
            });

            useAppStore.setState({
                userLocation: {
                    coords: {
                        latitude: Number(formCoords.latitude),
                        longitude: Number(formCoords.longitude),
                        altitude: 0,
                        accuracy: 5,
                        altitudeAccuracy: 5,
                        heading: 0,
                        speed: 0
                    },
                    timestamp: Date.now()
                }
            });

            showAlert('Success', 'Address saved successfully!', 'success');
            setShowAddForm(false);
            fetchSavedAddresses();
        } catch (err: any) {
            console.error('Error saving address:', err);
            showAlert('Error', err.message || 'Error saving address', 'error');
        } finally {
            setSavingAddress(false);
        }
    };

    // Select address and go back
    const handleSelectAddress = async (address) => {
        try {
            // Set Zustand userLocation with the address coordinates
            useAppStore.setState({
                userLocation: {
                    coords: {
                        latitude: Number(address.latitude),
                        longitude: Number(address.longitude),
                        altitude: 0,
                        accuracy: 5,
                        altitudeAccuracy: 5,
                        heading: 0,
                        speed: 0
                    },
                    timestamp: Date.now()
                }
            });

            // Strip Google Plus Codes (e.g. "6M28+PPC, ") and show address_line only
            const cleanLine = address.address_line.replace(/^[A-Z0-9]{4,}\+[A-Z0-9]+,\s*/i, '');
            await updateDatabaseProfile({
                location: cleanLine
            });

            // Go to home — pass the clean label so the pill updates instantly
            router.replace({
                pathname: '/(protected)/consumer',
                params: { showMap: 'true', addressLabel: cleanLine }
            });
        } catch (err) {
            console.error('Select address error:', err);
        }
    };

    // Delete address from DB
    const handleDeleteAddress = (id: string) => {
        Alert.alert(
            'Delete Address',
            'Are you sure you want to delete this address?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await insforge.database
                                .from('user_addresses')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;

                            showAlert('Success', 'Address deleted successfully!', 'success');
                            fetchSavedAddresses();
                        } catch (err) {
                            console.error('Delete error:', err);
                            showAlert('Error', 'Failed to delete address', 'error');
                        }
                    }
                }
            ]
        );
    };

    // Filtered list based on search bar
    const filteredAddresses = savedAddresses.filter(addr =>
        addr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        addr.address_line.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <ScalePressable onPress={() => router.back()} style={styles.backButton} hapticType="light">
                    <Ionicons name="chevron-down" size={28} color="#1E293B" />
                </ScalePressable>
                <Text style={styles.headerTitle}>Select a location</Text>
            </View>

            {/* Address Listing view */}
            <Animated.View 
                entering={FadeInLeft.duration(350).springify().damping(20)} 
                style={styles.listingContainer}
            >
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={22} color="#059669" style={styles.searchIcon} />
                        <TextInput
                            placeholder="Search saved or search places online..."
                            placeholderTextColor="#94A3B8"
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <ScalePressable onPress={() => setSearchQuery('')} hapticType="light">
                                <Ionicons name="close-circle" size={20} color="#94A3B8" />
                            </ScalePressable>
                        )}
                    </View>

                    {searchQuery.trim().length === 0 ? (
                        <>
                            {/* Option: Use current location */}
                            <ScalePressable style={styles.optionRow} hapticType="medium" onPress={handleUseCurrentLocation}>
                                <View style={styles.optionIconContainer}>
                                    <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#059669" />
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.optionTitle}>Use current location</Text>
                                    <Text style={styles.optionSubtext} numberOfLines={2}>
                                        {currentAddress}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                            </ScalePressable>

                            {/* Option: Add Address */}
                            <ScalePressable style={styles.optionRow} hapticType="medium" onPress={handleUseCurrentLocation}>
                                <View style={styles.optionIconContainer}>
                                    <Ionicons name="add" size={22} color="#059669" />
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.optionTitle}>Add Address</Text>
                                    <Text style={styles.optionSubtext}>Select custom location on map</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                            </ScalePressable>

                            {/* SAVED ADDRESSES */}
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionHeaderText}>SAVED ADDRESSES</Text>
                            </View>

                            {loadingAddresses ? (
                                <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 20 }} />
                            ) : filteredAddresses.length === 0 ? (
                                <Text style={styles.noAddressText}>No saved addresses found.</Text>
                            ) : (
                                filteredAddresses.map((address, index) => {
                                    const distance = userLocation?.coords
                                        ? getDistance(
                                            userLocation.coords.latitude,
                                            userLocation.coords.longitude,
                                            Number(address.latitude),
                                            Number(address.longitude)
                                        )
                                        : null;

                                    const distanceStr = distance !== null
                                        ? (distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(1)} km`)
                                        : '';

                                    const isHome = address.name === 'Home';
                                    const isWork = address.name === 'Office';
                                    const iconName = isHome ? 'home-outline' : isWork ? 'business-outline' : 'location-outline';

                                    return (
                                        <Animated.View 
                                            key={address.id}
                                            entering={FadeInDown.delay(index * 40).springify().damping(15)}
                                            style={styles.savedCard}
                                        >
                                            <ScalePressable
                                                style={styles.savedCardTop}
                                                hapticType="light"
                                                onPress={() => handleSelectAddress(address)}
                                            >
                                                <View style={styles.addressIconBox}>
                                                    <Ionicons name={iconName} size={20} color="#64748B" />
                                                    {distanceStr ? <Text style={styles.distanceText}>{distanceStr}</Text> : null}
                                                </View>
                                                <View style={styles.addressDetails}>
                                                    <Text style={styles.addressName}>{address.name}</Text>
                                                    <Text style={styles.addressFull} numberOfLines={2}>
                                                        {address.address_line}
                                                    </Text>
                                                </View>
                                            </ScalePressable>
                                            <View style={styles.savedCardActions}>
                                                <ScalePressable
                                                    style={styles.deleteBtn}
                                                    hapticType="heavy"
                                                    onPress={() => handleDeleteAddress(address.id)}
                                                >
                                                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                                </ScalePressable>
                                            </View>
                                        </Animated.View>
                                    );
                                })
                            )}
                        </>
                    ) : (
                        <>
                            {/* Places & Locations Online Autocomplete */}
                            {searchQuery.trim().length > 2 && (
                                <View style={styles.onlineSuggestionsWrapper}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionHeaderText}>PLACES & LOCATIONS (OSM)</Text>
                                    </View>
                                    {loadingSuggestions ? (
                                        <View style={styles.suggestionLoadingRow}>
                                            <ActivityIndicator size="small" color="#059669" />
                                            <Text style={styles.suggestionLoadingText}>Searching places online...</Text>
                                        </View>
                                    ) : onlineSuggestions.length === 0 ? (
                                        <Text style={styles.noAddressText}>No matching online places found.</Text>
                                    ) : (
                                        onlineSuggestions.map((suggestion, index) => (
                                            <Animated.View key={index} entering={FadeInDown.delay(index * 40).springify()}>
                                                <ScalePressable
                                                    style={styles.suggestionRow}
                                                    hapticType="selection"
                                                    onPress={() => {
                                                        const lat = suggestion.latitude;
                                                        const lng = suggestion.longitude;
                                                        setFormCoords({ latitude: lat, longitude: lng });
                                                        setFormRegion({
                                                            latitude: lat,
                                                            longitude: lng,
                                                            latitudeDelta: 0.00922,
                                                            longitudeDelta: 0.00421,
                                                        });
                                                        setAddressLine(suggestion.display_name);
                                                        setAddressName('Home');
                                                        setCustomName('');
                                                        setShowAddForm(true);
                                                    }}
                                                >
                                                    <View style={styles.suggestionIconBox}>
                                                        <Ionicons name="map-outline" size={20} color="#059669" />
                                                    </View>
                                                    <View style={styles.suggestionDetails}>
                                                        <Text style={styles.suggestionTitle} numberOfLines={1}>
                                                            {suggestion.display_name.split(',')[0]}
                                                        </Text>
                                                        <Text style={styles.suggestionSubtext} numberOfLines={2}>
                                                            {suggestion.display_name}
                                                        </Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={16} color="#059669" />
                                                </ScalePressable>
                                            </Animated.View>
                                        ))
                                    )}
                                </View>
                            )}

                            {/* Filtered Saved Addresses */}
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionHeaderText}>{`SAVED ADDRESSES MATCHING "${searchQuery.toUpperCase()}"`}</Text>
                            </View>
                            {filteredAddresses.length === 0 ? (
                                <Text style={styles.noAddressText}>No matching saved addresses found.</Text>
                            ) : (
                                filteredAddresses.map((address, index) => {
                                    const distance = userLocation?.coords
                                        ? getDistance(
                                            userLocation.coords.latitude,
                                            userLocation.coords.longitude,
                                            Number(address.latitude),
                                            Number(address.longitude)
                                        )
                                        : null;

                                    const distanceStr = distance !== null
                                        ? (distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(1)} km`)
                                        : '';

                                    const isHome = address.name === 'Home';
                                    const isWork = address.name === 'Office';
                                    const iconName = isHome ? 'home-outline' : isWork ? 'business-outline' : 'location-outline';

                                    return (
                                        <Animated.View 
                                            key={address.id}
                                            entering={FadeInDown.delay(index * 40).springify().damping(15)}
                                            style={styles.savedCard}
                                        >
                                            <ScalePressable
                                                style={styles.savedCardTop}
                                                hapticType="light"
                                                onPress={() => handleSelectAddress(address)}
                                            >
                                                <View style={styles.addressIconBox}>
                                                    <Ionicons name={iconName} size={20} color="#64748B" />
                                                    {distanceStr ? <Text style={styles.distanceText}>{distanceStr}</Text> : null}
                                                </View>
                                                <View style={styles.addressDetails}>
                                                    <Text style={styles.addressName}>{address.name}</Text>
                                                    <Text style={styles.addressFull} numberOfLines={2}>
                                                        {address.address_line}
                                                    </Text>
                                                </View>
                                            </ScalePressable>
                                            <View style={styles.savedCardActions}>
                                                <ScalePressable
                                                    style={styles.deleteBtn}
                                                    hapticType="heavy"
                                                    onPress={() => handleDeleteAddress(address.id)}
                                                >
                                                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                                </ScalePressable>
                                            </View>
                                        </Animated.View>
                                    );
                                })
                            )}
                        </>
                    )}
                </ScrollView>
            </Animated.View>

            {/* Address Add Form Modal */}
            <Modal
                visible={showAddForm}
                animationType="slide"
                onRequestClose={() => setShowAddForm(false)}
            >
                <SafeAreaView style={styles.container}>
                    {/* Modal Header */}
                    <View style={styles.header}>
                        <ScalePressable onPress={() => setShowAddForm(false)} style={styles.backButton} hapticType="light">
                            <Ionicons name="close" size={28} color="#1E293B" />
                        </ScalePressable>
                        <Text style={styles.headerTitle}>Confirm your location</Text>
                    </View>

                    <View style={[styles.formContainer, { flex: 1, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
                        <Text style={styles.formSectionTitle}>Confirm your location</Text>
                        <View style={styles.mapWrapper}>
                            <LocationMapPicker
                                coords={formCoords}
                                region={formRegion}
                                onRegionChange={handleRegionChange}
                                onRegionChangeComplete={handleRegionChangeComplete}
                            />
                            {/* Centered pin overlay */}
                            {Platform.OS !== 'web' && (
                                <View style={styles.pinOverlayContainer} pointerEvents="none">
                                    <Animated.View style={[styles.centerPin, animatedPinStyle]}>
                                        <FontAwesome5 name="map-marker-alt" size={38} color="#059669" />
                                    </Animated.View>
                                    <Animated.View style={[styles.centerPinShadow, animatedShadowStyle]} />
                                </View>
                            )}
                            <View style={styles.mapPinOverlay}>
                                <Text style={styles.mapPinText}>Drag map to adjust pin</Text>
                            </View>
                        </View>

                        <ScrollView style={styles.formFields} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={styles.formLabel}>Save Address As</Text>
                            <View style={styles.typeButtonsRow}>
                                {['Home', 'Office', 'Other'].map((type) => {
                                    const isSelected = addressName === type;
                                    const iconName = type === 'Home' ? 'home' : type === 'Office' ? 'business' : 'location';
                                    return (
                                        <ScalePressable
                                            key={type}
                                            style={[
                                                styles.typeButton,
                                                isSelected && styles.typeButtonActive
                                            ]}
                                            hapticType="selection"
                                            onPress={() => {
                                                setAddressName(type);
                                            }}
                                        >
                                            <Ionicons
                                                name={iconName}
                                                size={18}
                                                color={isSelected ? '#FFFFFF' : '#64748B'}
                                                style={{ marginRight: 6 }}
                                            />
                                            <Text style={[
                                                styles.typeButtonText,
                                                isSelected && styles.typeButtonTextActive
                                            ]}>
                                                {type}
                                            </Text>
                                        </ScalePressable>
                                    );
                                })}
                            </View>

                            {addressName === 'Other' && (
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Enter custom label (e.g. Gym, Friend's house)"
                                    placeholderTextColor="#94A3B8"
                                    value={customName}
                                    onChangeText={setCustomName}
                                />
                            )}

                            <Text style={styles.formLabel}>Address Details</Text>
                            <TextInput
                                style={[styles.formInput, styles.textArea]}
                                placeholder="Enter complete address details"
                                placeholderTextColor="#94A3B8"
                                value={addressLine}
                                onChangeText={setAddressLine}
                                multiline
                                numberOfLines={3}
                            />

                            <ScalePressable
                                style={styles.saveBtn}
                                onPress={handleSaveAddress}
                                disabled={savingAddress}
                                hapticType="success"
                            >
                                {savingAddress ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save Address</Text>
                                )}
                            </ScalePressable>

                            <ScalePressable
                                style={styles.cancelBtn}
                                onPress={() => setShowAddForm(false)}
                                hapticType="light"
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </ScalePressable>
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </Modal>

            {alertConfig && (
                <CustomAlert
                    visible={alertConfig.visible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    onClose={alertConfig.onClose || (() => setAlertConfig(null))}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8FAFC',
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1E293B',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#1E293B',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    optionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0FDF4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 2,
    },
    optionSubtext: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    sectionHeader: {
        marginTop: 20,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionHeaderText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 1.2,
    },
    savedCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    savedCardTop: {
        flexDirection: 'row',
        flex: 1,
    },
    addressIconBox: {
        alignItems: 'center',
        marginRight: 12,
        width: 50,
    },
    distanceText: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },
    addressDetails: {
        flex: 1,
    },
    addressName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    addressFull: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
    },
    savedCardActions: {
        flexDirection: 'row',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        justifyContent: 'flex-end',
        gap: 12,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    formContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
    },
    formSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
    },
    mapWrapper: {
        height: 200,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        position: 'relative',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    formMap: {
        ...StyleSheet.absoluteFillObject,
    },
    mapPinOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
    },
    mapPinText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    formFields: {
        flex: 1,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
        marginTop: 4,
    },
    typeButtonsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    typeButtonActive: {
        backgroundColor: '#059669',
        borderColor: '#059669',
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    typeButtonTextActive: {
        color: '#FFFFFF',
    },
    formInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1E293B',
        marginBottom: 12,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    saveBtn: {
        backgroundColor: '#059669',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 2,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelBtn: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    cancelBtnText: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '600',
    },
    noAddressText: {
        textAlign: 'center',
        color: '#64748B',
        fontSize: 14,
        marginVertical: 20,
        fontStyle: 'italic',
    },
    deleteBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    listingContainer: {
        flex: 1,
    },
    pinOverlayContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerPin: {
        zIndex: 10,
    },
    centerPinShadow: {
        position: 'absolute',
        width: 14,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        bottom: '50%',
        marginBottom: -22,
        zIndex: 9,
    },
    onlineSuggestionsWrapper: {
        marginBottom: 16,
    },
    suggestionLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    suggestionLoadingText: {
        marginLeft: 10,
        color: '#64748B',
        fontSize: 14,
        fontWeight: '600',
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    suggestionIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ECFDF5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    suggestionDetails: {
        flex: 1,
    },
    suggestionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    suggestionSubtext: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
        lineHeight: 16,
    },
});
