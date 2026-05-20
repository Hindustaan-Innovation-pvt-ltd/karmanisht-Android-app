// @ts-nocheck
import React from 'react';
import { Text } from 'react-native';
import { CheckIcon } from '@/svg/icons';
import ScalePressable from './scale-pressable';

interface CategoryChipProps {
    label: string;
    selected: boolean;
    onPress: () => void;
    icon?: React.ReactNode;
}

export default function CategoryChip({ label, selected, onPress, icon }: CategoryChipProps) {
    return (
        <ScalePressable
            onPress={onPress}
            hapticType="selection"
            scaleTo={0.96}
            className={`flex-row items-center gap-2 px-3 py-2.5 rounded-xl border ${selected
                ? 'bg-black dark:bg-blue-600 border-black dark:border-blue-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
        >
            {icon}
            <Text
                className={`text-sm font-medium flex-1 ${selected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}
                numberOfLines={1}
            >
                {label}
            </Text>
            {selected && <CheckIcon size={14} color="#fff" />}
        </ScalePressable>
    );
}

