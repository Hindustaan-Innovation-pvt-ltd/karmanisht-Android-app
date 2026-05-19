// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';

export default function SelectLocation() {
    const router = useRouter();
    const user = useAppStore(state => state.user);
    const userLocation = useAppStore(state => state.userLocation);
    const refreshProfile = useAppStore(state => state.refreshProfile);
    const updateDatabaseProfile = useAppStore(state => state.updateDatabaseProfile);

    const [currentAddress, setCurrentAddress] = useState('Locating current address...');
    const [searchQuery, setSearchQuery] = useState('');
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);

    // Form states
    const [showAddForm, setShowAddForm] = useState(false);
    const [formCoords, setFormCoords] = useState({ latitude: 21.2514, longitude: 81.6296 });
    const [formRegion, setFormRegion] = useState(null);
    const [addressName, setAddressName] = useState('Home');
    const [customName, setCustomName] = useState('');
    const [addressLine, setAddressLine] = useState('');
    const [savingAddress, setSavingAddress] = useState(false);

    // Fetch saved addresses from DB
    const fetchSavedAddresses = async () => {
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
    };

    useEffect(() => {
        fetchSavedAddresses();
    }, [user?.id]);

    // Fetch and geocode current location for the subtext
    useEffect(() => {
        const getGeo = async () => {
            try {
                let loc = userLocation;
                if (!loc) {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        loc = await Location.getCurrentPositionAsync({});
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
                    setCurrentAddress('Unable to fetch location. Tap to grant permission.');
                }
            } catch (err) {
                console.warn(err);
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
                Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({});
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;

            let addr = 'Current Location';
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
            console.error(error);
            Alert.alert('Error', 'Error getting current location');
        }
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
            console.warn(err);
        }
    };

    // Save address to DB
    const handleSaveAddress = async () => {
        if (!addressLine.trim()) {
            Alert.alert('Validation Error', 'Please enter address details.');
            return;
        }

        if (!user?.id) {
            Alert.alert('Authentication Error', 'User session not found. Please log in again.');
            return;
        }

        const finalName = addressName === 'Other' ? (customName.trim() || 'Other') : addressName;
        setSavingAddress(true);

        try {
            const { data, error } = await insforge.database
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

            Alert.alert('Success', 'Address saved successfully!');
            setShowAddForm(false);
            fetchSavedAddresses();
        } catch (err: any) {
            console.error('Error saving address:', err);
            Alert.alert('Error', err.message || 'Error saving address');
        } finally {
            setSavingAddress(false);
        }
    };

    // Select address and go back
    const handleSelectAddress = async (address) => {
        try {
            // Set Zustand userLocation
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

            // Update user profile location string
            await updateDatabaseProfile({
                location: address.name
            });
            await refreshProfile();

            // Go to home and show map
            router.replace({
                pathname: '/(protected)/consumer',
                params: { showMap: 'true' }
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

                            Alert.alert('Success', 'Address deleted successfully!');
                            fetchSavedAddresses();
                        } catch (err) {
                            console.error('Delete error:', err);
                            Alert.alert('Error', 'Failed to delete address');
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
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-down" size={28} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Select a location</Text>
            </View>

            {showAddForm ? (
                /* Address Add Form view */
                <View style={styles.formContainer}>
                    <Text style={styles.formSectionTitle}>Confirm your location</Text>
                    <View style={styles.mapWrapper}>
                        <MapView
                            style={styles.formMap}
                            initialRegion={{
                                latitude: formCoords.latitude,
                                longitude: formCoords.longitude,
                                latitudeDelta: 0.00922,
                                longitudeDelta: 0.00421,
                            }}
                            region={formRegion}
                            onRegionChangeComplete={(region) => {
                                setFormCoords({
                                    latitude: region.latitude,
                                    longitude: region.longitude
                                });
                                handleMapDrag(region.latitude, region.longitude);
                            }}
                        >
                            <Marker
                                coordinate={formCoords}
                                draggable
                                onDragEnd={(e) => {
                                    const newCoords = e.nativeEvent.coordinate;
                                    setFormCoords(newCoords);
                                    handleMapDrag(newCoords.latitude, newCoords.longitude);
                                }}
                            />
                        </MapView>
                        <View style={styles.mapPinOverlay}>
                            <Text style={styles.mapPinText}>Drag map or marker to adjust pin</Text>
                        </View>
                    </View>

                    <ScrollView style={styles.formFields} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.formLabel}>Save Address As</Text>
                        <View style={styles.typeButtonsRow}>
                            {['Home', 'Office', 'Other'].map((type) => {
                                const isSelected = addressName === type;
                                const iconName = type === 'Home' ? 'home' : type === 'Office' ? 'business' : 'location';
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.typeButton,
                                            isSelected && styles.typeButtonActive
                                        ]}
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
                                    </TouchableOpacity>
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

                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSaveAddress}
                            disabled={savingAddress}
                        >
                            {savingAddress ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Address</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setShowAddForm(false)}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            ) : (
                /* Address Listing view */
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={22} color="#059669" style={styles.searchIcon} />
                        <TextInput
                            placeholder="Search saved addresses..."
                            placeholderTextColor="#94A3B8"
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Option: Use current location */}
                    <TouchableOpacity style={styles.optionRow} onPress={handleUseCurrentLocation}>
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
                    </TouchableOpacity>

                    {/* Option: Add Address */}
                    <TouchableOpacity style={styles.optionRow} onPress={handleUseCurrentLocation}>
                        <View style={styles.optionIconContainer}>
                            <Ionicons name="add" size={22} color="#059669" />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>Add Address</Text>
                            <Text style={styles.optionSubtext}>Select custom location on map</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </TouchableOpacity>

                    {/* SAVED ADDRESSES */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>SAVED ADDRESSES</Text>
                    </View>

                    {loadingAddresses ? (
                        <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 20 }} />
                    ) : filteredAddresses.length === 0 ? (
                        <Text style={styles.noAddressText}>No saved addresses found.</Text>
                    ) : (
                        filteredAddresses.map((address) => {
                            // Calculate distance if coordinates are available
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
                                <View key={address.id} style={styles.savedCard}>
                                    <TouchableOpacity 
                                        style={styles.savedCardTop}
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
                                    </TouchableOpacity>
                                    <View style={styles.savedCardActions}>
                                        <TouchableOpacity 
                                            style={styles.deleteBtn}
                                            onPress={() => handleDeleteAddress(address.id)}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn}>
                                            <Ionicons name="share-social-outline" size={18} color="#64748B" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn}>
                                            <Ionicons name="camera-outline" size={18} color="#64748B" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}

                    {/* RECENT LOCATIONS */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>RECENT LOCATIONS</Text>
                    </View>

                    {/* Recent Item 1 */}
                    <TouchableOpacity style={styles.recentRow}>
                        <View style={styles.recentLeft}>
                            <Ionicons name="time-outline" size={22} color="#64748B" />
                            <Text style={styles.recentDistance}>266 m</Text>
                        </View>
                        <View style={styles.recentDetails}>
                            <Text style={styles.recentTitle}>Kamal Vihar</Text>
                            <Text style={styles.recentSubtext} numberOfLines={1}>
                                Sector 8 A, Dunda, Raipur, Chhattisgarh, India
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Recent Item 2 */}
                    <TouchableOpacity style={styles.recentRow}>
                        <View style={styles.recentLeft}>
                            <Ionicons name="time-outline" size={22} color="#64748B" />
                            <Text style={styles.recentDistance}>266 m</Text>
                        </View>
                        <View style={styles.recentDetails}>
                            <Text style={styles.recentTitle}>7C3</Text>
                            <Text style={styles.recentSubtext} numberOfLines={1}>
                                Kamal Vihar Rd, Raipur
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Google branding */}
                    <View style={styles.googleBrand}>
                        <Text style={styles.poweredBy}>powered by</Text>
                        <Text style={styles.googleText}>
                            <Text style={{ color: '#4285F4' }}>G</Text>
                            <Text style={{ color: '#EA4335' }}>o</Text>
                            <Text style={{ color: '#FBBC05' }}>o</Text>
                            <Text style={{ color: '#4285F4' }}>g</Text>
                            <Text style={{ color: '#34A853' }}>l</Text>
                            <Text style={{ color: '#EA4335' }}>e</Text>
                        </Text>
                    </View>
                </ScrollView>
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
    recentRow: {
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
    recentLeft: {
        alignItems: 'center',
        marginRight: 16,
        width: 40,
    },
    recentDistance: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 2,
    },
    recentDetails: {
        flex: 1,
    },
    recentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 2,
    },
    recentSubtext: {
        fontSize: 13,
        color: '#64748B',
    },
    googleBrand: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 40,
    },
    poweredBy: {
        fontSize: 12,
        color: '#94A3B8',
        marginRight: 4,
        fontWeight: '500',
    },
    googleText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.5,
    },

    // Form Styles
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
    }
});
