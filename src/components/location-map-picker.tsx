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
    const mapRef = React.useRef<MapView>(null);

    // Animates map viewport to the new region when it changes programmatically
    React.useEffect(() => {
        if (region && mapRef.current) {
            mapRef.current.animateToRegion(region, 350);
        }
    }, [region]);

    return (
        <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={region || {
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.00922,
                longitudeDelta: 0.00421,
            }}
            onRegionChangeComplete={onRegionChangeComplete}
        >
            <Marker
                coordinate={coords}
                draggable={false}
            />
        </MapView>
    );
}
