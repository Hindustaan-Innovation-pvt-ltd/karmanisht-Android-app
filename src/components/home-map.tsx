// @ts-nocheck
import React, { useRef, useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import MapView, { UrlTile } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Default fallback: Raipur, Chhattisgarh
const DEFAULT_LAT   = 21.2514;
const DEFAULT_LNG   = 81.6296;
const DEFAULT_DELTA = 0.04;

interface HomeMapProps {
    userLocation?: { latitude: number; longitude: number } | null;
    topOffset?: number;
    locationName?: string;
    onProfilePress?: () => void;
    onLocationPress?: () => void;
    isDark?: boolean;
}

export default function HomeMap({
    userLocation,
    topOffset = 16,
    locationName = 'Shankar Nagar, Raipur',
    onProfilePress,
    onLocationPress,
    isDark = false,
}: HomeMapProps) {
    const mapRef = useRef<MapView>(null);

    const [region, setRegion] = useState({
        latitude:       userLocation?.latitude  ?? DEFAULT_LAT,
        longitude:      userLocation?.longitude ?? DEFAULT_LNG,
        latitudeDelta:  DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
    });

    // Zoom In
    const zoomIn = useCallback(() => {
        const next = {
            ...region,
            latitudeDelta:  Math.max(region.latitudeDelta  / 2, 0.002),
            longitudeDelta: Math.max(region.longitudeDelta / 2, 0.002),
        };
        setRegion(next);
        mapRef.current?.animateToRegion(next, 300);
    }, [region]);

    // Zoom Out
    const zoomOut = useCallback(() => {
        const next = {
            ...region,
            latitudeDelta:  Math.min(region.latitudeDelta  * 2, 60),
            longitudeDelta: Math.min(region.longitudeDelta * 2, 60),
        };
        setRegion(next);
        mapRef.current?.animateToRegion(next, 300);
    }, [region]);

    // Re-center on user
    const reCenter = useCallback(() => {
        const next = {
            latitude:       userLocation?.latitude  ?? DEFAULT_LAT,
            longitude:      userLocation?.longitude ?? DEFAULT_LNG,
            latitudeDelta:  DEFAULT_DELTA,
            longitudeDelta: DEFAULT_DELTA,
        };
        setRegion(next);
        mapRef.current?.animateToRegion(next, 400);
    }, [userLocation]);

    return (
        <View style={styles.container}>
            {/* ── Standard map (no API key needed) ─────────────────────────── */}
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                mapType="standard"
                initialRegion={region}
                onRegionChangeComplete={setRegion}
                showsUserLocation      // native blue dot — live GPS
                showsMyLocationButton={false}
                showsCompass={false}
                toolbarEnabled={false}
                scrollEnabled
                zoomEnabled
                rotateEnabled
                pitchEnabled
            >
                <UrlTile
                    urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                    maximumZ={19}
                    flipY={false}
                    zIndex={1}
                />
            </MapView>

            {/* ── Top gradient overlay ──────────────────────────────────────── */}
            <LinearGradient
                colors={
                    isDark
                        ? ['rgba(9,13,22,0.95)', 'rgba(9,13,22,0.5)', 'transparent']
                        : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.5)', 'transparent']
                }
                locations={[0, 0.25, 1]}
                style={[styles.gradient, { height: topOffset + 100 }]}
                pointerEvents="none"
            />

            {/* ── Location pill ────────────────────────────────────────────── */}
            <TouchableOpacity
                onPress={onLocationPress}
                style={[styles.locationPill, { top: topOffset }]}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="target" size={28} color="#3B82F6" />
                <Text style={styles.locationText} numberOfLines={1}>
                    {locationName}
                </Text>
            </TouchableOpacity>

            {/* ── Profile button ────────────────────────────────────────────── */}
            {onProfilePress && (
                <TouchableOpacity
                    onPress={onProfilePress}
                    style={[styles.profileBtn, { top: topOffset }]}
                    activeOpacity={0.8}
                >
                    <Ionicons name="person" size={22} color="white" />
                </TouchableOpacity>
            )}

            {/* ── Zoom controls (bottom-right) ──────────────────────────────── */}
            <View style={[styles.zoomPanel, isDark && styles.zoomPanelDark]}>
                <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn} activeOpacity={0.7}>
                    <Ionicons name="add" size={24} color={isDark ? '#F1F5F9' : '#1E293B'} />
                </TouchableOpacity>

                <View style={[styles.divider, isDark && styles.dividerDark]} />

                <TouchableOpacity style={styles.zoomBtn} onPress={zoomOut} activeOpacity={0.7}>
                    <Ionicons name="remove" size={24} color={isDark ? '#F1F5F9' : '#1E293B'} />
                </TouchableOpacity>

                <View style={[styles.divider, isDark && styles.dividerDark]} />

                <TouchableOpacity style={styles.zoomBtn} onPress={reCenter} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#3B82F6" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 500,
        width: '100%',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        overflow: 'hidden',
    },
    gradient: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 10,
    },
    locationPill: {
        position: 'absolute',
        left: '10%',
        width: '70%',
        height: 56,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
        zIndex: 20,
        borderWidth: 1,
        borderColor: 'rgba(241,245,249,1)',
    },
    locationText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginLeft: 10,
        flex: 1,
    },
    profileBtn: {
        position: 'absolute',
        right: 16,
        width: 52,
        height: 52,
        backgroundColor: '#000',
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 20,
    },
    // Zoom panel
    zoomPanel: {
        position: 'absolute',
        right: 14,
        bottom: 24,
        zIndex: 20,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
        elevation: 5,
        overflow: 'hidden',
    },
    zoomPanelDark: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
    },
    zoomBtn: {
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        marginHorizontal: 8,
        backgroundColor: '#E2E8F0',
    },
    dividerDark: {
        backgroundColor: '#334155',
    },
});
