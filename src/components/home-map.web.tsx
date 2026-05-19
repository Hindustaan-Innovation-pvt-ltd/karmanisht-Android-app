// @ts-nocheck
// Web stub — react-native-maps is not supported on web.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HomeMapProps {
    userLocation?: { latitude: number; longitude: number } | null;
    topOffset?: number;
    locationName?: string;
    onProfilePress?: () => void;
    onLocationPress?: () => void;
    isDark?: boolean;
}

export default function HomeMap({
    topOffset = 16,
    locationName = 'Shankar Nagar, Raipur',
    onProfilePress,
    onLocationPress,
    isDark = false,
}: HomeMapProps) {
    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.placeholder}>
                <MaterialCommunityIcons name="map-outline" size={48} color={isDark ? '#475569' : '#CBD5E1'} />
                <Text style={[styles.placeholderText, isDark && styles.placeholderTextDark]}>
                    Map view is only available on mobile
                </Text>
            </View>

            {/* Location pill */}
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
        backgroundColor: '#F1F5F9',
    },
    containerDark: {
        backgroundColor: '#1E293B',
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    placeholderText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    placeholderTextDark: {
        color: '#475569',
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
});
