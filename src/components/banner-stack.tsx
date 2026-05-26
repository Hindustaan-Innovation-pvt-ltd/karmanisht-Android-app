// BannerStack.tsx
import React, { memo, useEffect } from 'react';
import {
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

import Animated, {
    cancelAnimation,
    Easing,
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
    SharedValue,
} from 'react-native-reanimated';

import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';

import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const BANNERS = [
    require('../../assets/images/banner1.png'),
    require('../../assets/images/banner2.png'),
    require('../../assets/images/banner3.png'),
];

const CARD_HEIGHT = 150;
const CARD_RADIUS = 24;
const DRAG_SENSITIVITY = 320;
const AUTO_PLAY_DELAY = 2000;

function impact() {
    Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Light
    ).catch(() => { });
}

function getCircularDiff(
    value: number,
    index: number,
    length: number
) {
    'worklet';
    const raw = (index - value) % length;
    if (raw > length / 2) return raw - length;
    if (raw < -length / 2) return raw + length;
    return raw;
}

interface BannerCardProps {
    index: number;
    progress: SharedValue<number>;
    source: any;
    total: number;
}

const BannerCard = memo(
    ({ index, progress, source, total }: BannerCardProps) => {
        const animatedStyle = useAnimatedStyle(() => {
            const d = getCircularDiff(progress.value, index, total);

            const scale = interpolate(
                d,
                [-1.2, 0, 1.2],
                [0.93, 1, 0.96],
                Extrapolation.CLAMP
            );

            const translateY = interpolate(
                d,
                [-1.2, 0, 1.2],
                [28, 0, 12],
                Extrapolation.CLAMP
            );

            const translateX = interpolate(
                d,
                [-1.2, 0, 1.2],
                [-3, 0, 3],
                Extrapolation.CLAMP
            );

            const opacity = interpolate(
                Math.abs(d),
                [0, 0.5, 1.2],
                [1, 0.92, 0.82],
                Extrapolation.CLAMP
            );

            const zIndex = 100 - Math.round(Math.abs(d)) * 10;

            return {
                opacity,
                zIndex,
                transform: [
                    { perspective: 1000 },
                    { translateY },
                    { translateX },
                    { scale },
                ],
            };
        });

        return (
            <Animated.View style={[styles.card, animatedStyle]}>
                <Image
                    source={source}
                    resizeMode="cover"
                    style={styles.image}
                />
            </Animated.View>
        );
    }
);

interface DotProps {
    index: number;
    progress: SharedValue<number>;
    total: number;
}

const PaginationDot = memo(
    ({ index, progress, total }: DotProps) => {
        const stylez = useAnimatedStyle(() => {
            const active = ((progress.value % total) + total) % total;

            let dist = Math.abs(index - active);
            if (dist > total / 2) dist = total - dist;

            const width = interpolate(
                dist,
                [0, 1],
                [18, 6],
                Extrapolation.CLAMP
            );

            const opacity = interpolate(
                dist,
                [0, 1],
                [1, 0.3],
                Extrapolation.CLAMP
            );

            return { width, opacity };
        });

        return <Animated.View style={[styles.dot, stylez]} />;
    }
);

export default function BannerStack() {
    const progress = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const startValue = useSharedValue(0);

    const startAutoPlay = () => {
        cancelAnimation(progress);
        progress.value = withDelay(
            AUTO_PLAY_DELAY,
            withTiming(
                Math.round(progress.value) + 1,
                {
                    duration: 1800,
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                },
                (finished) => {
                    'worklet';
                    if (finished && !isDragging.value) {
                        runOnJS(startAutoPlay)();
                    }
                }
            )
        );
    };

    useEffect(() => {
        startAutoPlay();
        return () => { cancelAnimation(progress); };
    }, []);

    useAnimatedReaction(
        () => Math.round(progress.value),
        (current, prev) => {
            if (current !== prev && !isDragging.value) {
                runOnJS(impact)();
            }
        }
    );

    const panGesture = Gesture.Pan()

        .onStart(() => {
            isDragging.value = true;
            startValue.value = progress.value;
            cancelAnimation(progress);
        })

        .onUpdate((event) => {
            progress.value =
                startValue.value +
                (event.translationY * 0.92) / DRAG_SENSITIVITY;
        })

        .onEnd((event) => {
            const velocity = event.velocityY;
            let snapPoint = Math.round(progress.value);

            if (velocity > 450) snapPoint = Math.floor(progress.value);
            if (velocity < -450) snapPoint = Math.ceil(progress.value);

            progress.value = withSpring(
                snapPoint,
                {
                    damping: 22,
                    stiffness: 90,
                    mass: 0.7,
                    overshootClamping: true,
                    energyThreshold: 0.001,
                },
                (finished) => {
                    'worklet';
                    if (finished) {
                        isDragging.value = false;
                        runOnJS(startAutoPlay)();
                    }
                }
            );
        });

    return (
        <View style={styles.container}>
            <GestureDetector gesture={panGesture}>
                <View style={styles.deck}>
                    {BANNERS.map((source, index) => (
                        <BannerCard
                            key={index}
                            index={index}
                            source={source}
                            progress={progress}
                            total={BANNERS.length}
                        />
                    ))}
                </View>
            </GestureDetector>

            <View style={styles.paginationContainer}>
                {BANNERS.map((_, index) => (
                    <PaginationDot
                        key={index}
                        index={index}
                        progress={progress}
                        total={BANNERS.length}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 200,
        width: '100%',
        alignItems: 'center',
        position: 'relative',
    },
    deck: {
        height: CARD_HEIGHT,
        width: '100%',
        position: 'relative',
    },
    card: {
        position: 'absolute',
        left: 20,
        right: 20,
        height: CARD_HEIGHT,
        borderRadius: CARD_RADIUS,
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
            },
            android: { elevation: 1 },
            web: {
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            },
        }),
    },
    image: {
        width: '100%',
        height: '100%',
    },
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
        height: 10,
    },
    dot: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#6366f1',
        marginHorizontal: 3.5,
    },
});