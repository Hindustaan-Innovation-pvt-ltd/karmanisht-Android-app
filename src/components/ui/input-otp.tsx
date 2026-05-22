// @ts-nocheck
import * as React from "react"
import {
    View,
    TextInput,
    Pressable,
    Platform,
    Animated,
    Easing,
    useColorScheme,
} from "react-native"
import { Minus } from "lucide-react-native"

import { cn } from "@/lib/utils"

// ─── Context ─────────────────────────────────────────────────────────────────

interface OTPContextType {
    value: string
    focused: boolean
    maxLength: number
}

const OTPContext = React.createContext<OTPContextType>({
    value: "",
    focused: false,
    maxLength: 0,
})

export const OTPInputContext = OTPContext

// ─── InputOTP (container) ────────────────────────────────────────────────────

interface InputOTPProps extends React.ComponentProps<typeof TextInput> {
    containerClassName?: string
    maxLength: number
    value: string
    onChangeText: (value: string) => void
    children: React.ReactNode
}

function InputOTP({
    className,
    containerClassName,
    maxLength,
    value,
    onChangeText,
    children,
    ...props
}: InputOTPProps) {
    const [focused, setFocused] = React.useState(false)
    const inputRef = React.useRef<TextInput>(null)

    return (
        <OTPContext.Provider value={{ value, focused, maxLength }}>
            <Pressable
                onPress={() => inputRef.current?.focus()}
                className={cn("flex flex-row items-center justify-center relative", containerClassName)}
            >
                {children}
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={(text) => {
                        if (text.length <= maxLength) onChangeText(text)
                    }}
                    maxLength={maxLength}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="absolute inset-0"
                    style={{
                        opacity: 0.01,
                        zIndex: 100,
                        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
                    }}
                    caretHidden
                    {...props}
                />
            </Pressable>
        </OTPContext.Provider>
    )
}

// ─── InputOTPGroup ───────────────────────────────────────────────────────────

function InputOTPGroup({ className, ...props }: React.ComponentProps<typeof View>) {
    return (
        <View
            className={cn("flex flex-row items-center", className)}
            {...props}
        />
    )
}

// ─── BlinkingCaret ───────────────────────────────────────────────────────────

function BlinkingCaret() {
    const opacity = React.useRef(new Animated.Value(1)).current

    React.useEffect(() => {
        const blink = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 530,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 530,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        )
        blink.start()
        return () => blink.stop()
    }, [opacity])

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                width: 2,
                height: 24,
                borderRadius: 1,
                backgroundColor: '#6366F1',
                opacity,
            }}
        />
    )
}

// ─── InputOTPSlot ─────────────────────────────────────────────────────────────

function InputOTPSlot({
    index,
    className,
    ...props
}: React.ComponentProps<typeof View> & { index: number }) {
    const context = React.useContext(OTPContext)
    const scheme = useColorScheme()
    const isDark = scheme === 'dark'

    const char = context.value[index]
    const isActive = context.focused && context.value.length === index
    const isFilled =
        context.focused &&
        index === context.maxLength - 1 &&
        context.value.length === context.maxLength
    const showActive = isActive || isFilled

    // ── Scale animation ───────────────────────────────────────────────────────
    // Single Animated.Value + single effect to prevent competing animations.
    // We always stop the current animation before starting a new one.
    const scaleAnim = React.useRef(new Animated.Value(1)).current
    const prevChar = React.useRef<string | undefined>(char)
    const prevShowActive = React.useRef(showActive)

    React.useEffect(() => {
        const charChanged = char !== prevChar.current
        const activeChanged = showActive !== prevShowActive.current

        prevChar.current = char
        prevShowActive.current = showActive

        // Always stop whatever was running to prevent mid-flight interference
        scaleAnim.stopAnimation()

        const settleTo = showActive ? 1.04 : 1

        if (charChanged && char) {
            // A new digit arrived: quick overshoot then ease back to settle
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.13,
                    duration: 75,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: settleTo,
                    duration: 180,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start()
        } else if (activeChanged || (charChanged && !char)) {
            // Focus cursor moved to/from this slot, or digit cleared — smooth glide
            Animated.timing(scaleAnim, {
                toValue: settleTo,
                duration: 160,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start()
        }
    }, [char, showActive, scaleAnim])

    // ── Digit fade + slide-in ─────────────────────────────────────────────────
    // Initialise to visible (1/0) if a char already exists at mount time,
    // so pre-filled slots are never blank.
    const charOpacity = React.useRef(new Animated.Value(char ? 1 : 0)).current
    const charTranslateY = React.useRef(new Animated.Value(char ? 0 : -8)).current

    React.useEffect(() => {
        if (char) {
            charOpacity.stopAnimation()
            charTranslateY.stopAnimation()
            charOpacity.setValue(0)
            charTranslateY.setValue(-8)
            Animated.parallel([
                Animated.timing(charOpacity, {
                    toValue: 1,
                    duration: 140,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(charTranslateY, {
                    toValue: 0,
                    duration: 180,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start()
        } else {
            charOpacity.stopAnimation()
            charTranslateY.stopAnimation()
            charOpacity.setValue(0)
            charTranslateY.setValue(-8)
        }
    }, [char, charOpacity, charTranslateY])

    // ── Active glow pulse ─────────────────────────────────────────────────────
    const glowOpacity = React.useRef(new Animated.Value(0)).current

    React.useEffect(() => {
        if (showActive) {
            glowOpacity.stopAnimation()
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(glowOpacity, {
                        toValue: 0.16,
                        duration: 950,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowOpacity, {
                        toValue: 0,
                        duration: 950,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ])
            )
            pulse.start()
            return () => {
                pulse.stop()
                glowOpacity.setValue(0)
            }
        } else {
            glowOpacity.stopAnimation()
            glowOpacity.setValue(0)
        }
    }, [showActive, glowOpacity])

    const digitColor = isDark ? '#f1f5f9' : '#0f172a'

    // Border-radius values mirrored on the Animated.View so rounded corners
    // live directly on the element being scaled — no outer wrapper to clip them.
    const borderStyle = {
        borderTopLeftRadius: index === 0 ? 12 : 0,
        borderBottomLeftRadius: index === 0 ? 12 : 0,
        borderTopRightRadius: index === context.maxLength - 1 ? 12 : 0,
        borderBottomRightRadius: index === context.maxLength - 1 ? 12 : 0,
    }

    return (
        <Animated.View
            className={cn(
                "relative flex h-16 w-12 items-center justify-center border-y border-r border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700",
                index === 0 && "border-l",
                showActive && "border-2 border-indigo-500 dark:border-indigo-400",
                className
            )}
            style={[borderStyle, { transform: [{ scale: scaleAnim }] }]}
            {...props}
        >
            {/* Indigo glow layer */}
            {showActive && (
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderTopLeftRadius: borderStyle.borderTopLeftRadius,
                        borderBottomLeftRadius: borderStyle.borderBottomLeftRadius,
                        borderTopRightRadius: borderStyle.borderTopRightRadius,
                        borderBottomRightRadius: borderStyle.borderBottomRightRadius,
                        backgroundColor: '#6366F1',
                        opacity: glowOpacity,
                    }}
                />
            )}

            {/* Digit character with smooth fade + drop */}
            {char ? (
                <Animated.Text
                    style={{
                        fontSize: 22,
                        fontWeight: '700',
                        color: digitColor,
                        opacity: charOpacity,
                        transform: [{ translateY: charTranslateY }],
                    }}
                >
                    {char}
                </Animated.Text>
            ) : null}

            {/* Blinking caret for empty active slot */}
            {showActive && !char && <BlinkingCaret />}
        </Animated.View>
    )
}

// ─── InputOTPSeparator ────────────────────────────────────────────────────────

function InputOTPSeparator({ ...props }: React.ComponentProps<typeof View>) {
    return (
        <View role="separator" className="flex items-center justify-center px-1" {...props}>
            <Minus size={16} color="#64748b" />
        </View>
    )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
