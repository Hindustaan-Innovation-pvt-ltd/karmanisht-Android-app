import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
];

interface ConfettiPieceProps {
    index: number;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ index }) => {
    // Randomize initial properties
    const sizeWidth = useRef(Math.random() * 6 + 6).current;
    const sizeHeight = useRef(Math.random() * 8 + 10).current;
    const color = useRef(CONFETTI_COLORS[index % CONFETTI_COLORS.length]).current;
    
    // 0 = Rectangle, 1 = Circle, 2 = Oval
    const shapeType = useRef(Math.floor(Math.random() * 3)).current;
    const borderRadius = shapeType === 1 ? sizeWidth / 2 : shapeType === 2 ? sizeWidth / 4 : 0;

    // Animated values
    const initialX = useRef(Math.random() * SCREEN_WIDTH).current;
    const translateY = useRef(new Animated.Value(-50)).current;
    const translateX = useRef(new Animated.Value(initialX)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const rotateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const duration = Math.random() * 2000 + 2500; // 2.5s to 4.5s
        const delay = Math.random() * 1500; // Staggered start up to 1.5s

        // Animating fall
        const fallAnim = Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT + 50,
            duration,
            delay,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        });

        // Horizontal sway (using multiple keyframe-like steps for natural motion)
        const swayWidth = Math.random() * 60 + 30; // 30px to 90px sway
        const swayAnim = Animated.sequence([
            Animated.timing(translateX, {
                toValue: initialX + swayWidth / 2,
                duration: duration / 3,
                delay,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
            }),
            Animated.timing(translateX, {
                toValue: initialX - swayWidth / 2,
                duration: duration / 3,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
            }),
            Animated.timing(translateX, {
                toValue: initialX + Math.random() * 20 - 10,
                duration: duration / 3,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
            }),
        ]);

        // Continuous spin
        const rotateAnim = Animated.timing(rotate, {
            toValue: Math.random() * 4 + 2, // 2 to 6 full rotations
            duration,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
        });

        // Flip rotation
        const rotateYAnim = Animated.timing(rotateY, {
            toValue: Math.random() * 6 + 3,
            duration,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
        });

        // Fade out near the bottom
        const fadeAnim = Animated.timing(opacity, {
            toValue: 0,
            duration: 600,
            delay: delay + duration - 600,
            easing: Easing.linear,
            useNativeDriver: true,
        });

        Animated.parallel([fallAnim, swayAnim, rotateAnim, rotateYAnim, fadeAnim]).start();
    }, [translateY, translateX, rotate, rotateY, opacity, initialX]);

    const rotateStr = rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const rotateYStr = rotateY.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View
            style={[
                styles.piece,
                {
                    width: sizeWidth,
                    height: sizeHeight,
                    backgroundColor: color,
                    borderRadius,
                    opacity: opacity,
                    transform: [
                        { translateY },
                        { translateX },
                        { rotate: rotateStr },
                        { rotateY: rotateYStr },
                    ],
                },
            ]}
        />
    );
};

interface ConfettiProps {
    active: boolean;
    count?: number;
}

export const Confetti: React.FC<ConfettiProps> = ({ active, count = 75 }) => {
    if (!active) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Array.from({ length: count }).map((_, idx) => (
                <ConfettiPiece key={idx} index={idx} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    piece: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
});
