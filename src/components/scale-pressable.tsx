import React from 'react';
import { Pressable, GestureResponderEvent, Platform, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, WithSpringConfig } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HapticType =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'none';

interface ScalePressableProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  scaleTo?: number;
  hapticType?: HapticType;
  style?: StyleProp<ViewStyle>;
  className?: string;
  springConfig?: WithSpringConfig;
}

const DEFAULT_SPRING_CONFIG: WithSpringConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

export default function ScalePressable({
  children,
  onPress,
  onLongPress,
  disabled = false,
  scaleTo = 0.96,
  hapticType = 'light',
  style,
  className,
  springConfig = DEFAULT_SPRING_CONFIG,
}: ScalePressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const triggerHaptic = async () => {
    if (Platform.OS === 'web' || disabled) return;
    try {
      switch (hapticType) {
        case 'selection':
          await Haptics.selectionAsync();
          break;
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        default:
          break;
      }
    } catch (error) {
      console.warn('Haptics failed:', error);
    }
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (disabled) return;
    scale.value = withSpring(scaleTo, springConfig);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (disabled) return;
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (disabled || !onPress) return;
    triggerHaptic();
    onPress(event);
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      style={[style, animatedStyle]}
      className={className}
    >
      {children}
    </AnimatedPressable>
  );
}
