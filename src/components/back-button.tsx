// @ts-nocheck
import Ionicons from '@expo/vector-icons/Ionicons'
import React from 'react'
import { useColorScheme } from 'react-native'
import { useRouter } from 'expo-router'
import ScalePressable from './scale-pressable'

export default function BackButton({ color, className = "" }: { color?: string, className?: string }) {
    const router = useRouter()
    const colorScheme = useColorScheme()

    return (
        <ScalePressable
            hapticType="light"
            scaleTo={0.9}
            className={`absolute size-12 left-6 top-2 rounded-full bg-white dark:bg-slate-800 z-50 border border-slate-300 dark:border-slate-700 items-center justify-center ${className}`}
            onPress={() => router.back()}
        >
            <Ionicons name="arrow-back" size={24} color={color || (colorScheme === 'dark' ? 'white' : 'black')} />
        </ScalePressable>
    )
}

