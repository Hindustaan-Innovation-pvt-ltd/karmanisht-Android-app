// @ts-nocheck
import * as React from "react"
import { View, TextInput, Pressable, Platform, Text } from "react-native"
import { Minus } from "lucide-react-native"

import { cn } from "@/lib/utils"

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
                        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})
                    }}
                    caretHidden
                    {...props}
                />
            </Pressable>
        </OTPContext.Provider>
    )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<typeof View>) {
    return (
        <View
            className={cn("flex flex-row items-center", className)}
            {...props}
        />
    )
}

function InputOTPSlot({
    index,
    className,
    ...props
}: React.ComponentProps<typeof View> & {
    index: number
}) {
    const context = React.useContext(OTPContext)
    const char = context.value[index]
    const isActive = context.focused && context.value.length === index
    const isFilled = context.focused && index === context.maxLength - 1 && context.value.length === context.maxLength

    const showActive = isActive || isFilled

    return (
        <View
            className={cn(
                "relative flex h-16 w-12 items-center justify-center border-y border-r border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700",
                index === 0 && "rounded-l-lg border-l",
                index === context.maxLength - 1 && "rounded-r-lg",
                showActive && "z-10 border-blue-500 border-2 dark:border-blue-400", // Simplified active ring equivalent
                className
            )}
            {...props}
        >
            <View>
                <Text className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {char || ""}
                </Text>
            </View>
            {showActive && !char && (
                <View 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ pointerEvents: 'none' }}
                >
                    <View className="h-6 w-[2px] bg-slate-900 dark:bg-slate-100" />
                </View>
            )}
        </View>
    )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<typeof View>) {
    return (
        <View role="separator" className="flex items-center justify-center px-1" {...props}>
            <Minus size={16} color="#64748b" />
        </View>
    )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
