// @ts-nocheck
import * as React from "react";
import Location from "expo-location";

export default function useGeolocation() {
  const [location, setLocation] =
    React.useState<Location.LocationObject | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          if (mounted) setError("Permission to access location was denied.");
          return;
        }

        let currentLocation = null;
        try {
          currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        } catch {
          currentLocation = await Location.getLastKnownPositionAsync({});
        }

        if (!currentLocation) {
          currentLocation = {
            coords: {
              latitude: 21.2514,
              longitude: 81.6296
            }
          };
        }

        if (mounted) {
          setLocation(currentLocation);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to get location.",
          );
        }
      }
    };

    getLocation();

    return () => {
      mounted = false;
    };
  }, []);

  return { location, error };
}
