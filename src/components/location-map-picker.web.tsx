// @ts-nocheck
// Web stub — react-native-maps is not available on web
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LocationMapPickerProps {
    coords: { latitude: number; longitude: number };
    region: any;
    onRegionChangeComplete: (region: any) => void;
    onMarkerDragEnd: (lat: number, lng: number) => void;
}

export default function LocationMapPicker({ coords }: LocationMapPickerProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>📍 Map not available on web</Text>
            <Text style={styles.coords}>
                {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
    },
    text: {
        fontSize: 15,
        color: '#64748B',
        fontWeight: '600',
    },
    coords: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 6,
    },
});
