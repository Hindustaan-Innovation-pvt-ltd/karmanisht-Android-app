// @ts-nocheck
// Native implementation — uses react-native-maps
import React from 'react';
import MapView, { Marker, UrlTile } from 'react-native-maps';
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
            mapType="standard"
            initialRegion={region || {
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.00922,
                longitudeDelta: 0.00421,
            }}
            onRegionChangeComplete={onRegionChangeComplete}
        >
            <UrlTile
                urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                maximumZ={19}
                flipY={false}
                zIndex={1}
            />
            <Marker
                coordinate={coords}
                draggable={false}
                zIndex={2}
            />
        </MapView>
    );
}
