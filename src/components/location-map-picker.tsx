// @ts-nocheck
// Native implementation — uses react-native-maps
import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

interface LocationMapPickerProps {
    coords: { latitude: number; longitude: number };
    region: any;
    onRegionChangeComplete: (region: any) => void;
    onMarkerDragEnd: (lat: number, lng: number) => void;
}

export default function LocationMapPicker({
    coords,
    region,
    onRegionChangeComplete,
    onMarkerDragEnd,
}: LocationMapPickerProps) {
    return (
        <MapView
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.00922,
                longitudeDelta: 0.00421,
            }}
            region={region}
            onRegionChangeComplete={(r) => {
                onRegionChangeComplete(r);
            }}
        >
            <Marker
                coordinate={coords}
                draggable
                onDragEnd={(e) => {
                    const c = e.nativeEvent.coordinate;
                    onMarkerDragEnd(c.latitude, c.longitude);
                }}
            />
        </MapView>
    );
}
