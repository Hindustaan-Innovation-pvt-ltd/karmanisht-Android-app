import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface StickySwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
}

export default function StickySwitch({
  value,
  onValueChange,
  activeColor = '#3B82F6', // Blue-500
  inactiveColor = '#E2E8F0', // Slate-200
}: StickySwitchProps) {
  // Track width is 56, thumb size is 24, padding is 3.
  // Left range: 3 to 29 (56 - 3 - 24 = 29)
  // Right range: 27 to 53 (56 - 3 = 53)
  const leftVal = useSharedValue(value ? 29 : 3);
  const rightVal = useSharedValue(value ? 53 : 27);

  useEffect(() => {
    if (value) {
      // Turning ON: Right edge snap-stretches forward, left edge has high inertia/lags behind
      rightVal.value = withSpring(53, { damping: 13, stiffness: 220 });
      leftVal.value = withSpring(29, { damping: 22, stiffness: 70, mass: 1.5 });
    } else {
      // Turning OFF: Left edge snap-stretches back, right edge has high inertia/lags behind
      leftVal.value = withSpring(3, { damping: 13, stiffness: 220 });
      rightVal.value = withSpring(27, { damping: 22, stiffness: 70, mass: 1.5 });
    }
  }, [value, leftVal, rightVal]);

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onValueChange(!value);
  };

  const animatedTrackStyle = useAnimatedStyle(() => {
    // Calculate progress between 0 and 1 based on leftVal
    const progress = (leftVal.value - 3) / 26;
    const backgroundColor = interpolateColor(
      progress,
      [0, 1],
      [inactiveColor, activeColor]
    );
    return { backgroundColor };
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    const width = rightVal.value - leftVal.value;
    return {
      left: leftVal.value,
      width: width,
    };
  });

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.track, animatedTrackStyle]}>
        <Animated.View style={[styles.thumb, animatedThumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 56,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    position: 'relative',
  },
  thumb: {
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
});
