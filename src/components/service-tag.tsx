// @ts-nocheck
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

interface ServiceTagProps {
    label: string;
    selected: boolean;
    onPress: () => void;
}

export default function ServiceTag({ label, selected, onPress }: ServiceTagProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className={`px-3 py-1.5 rounded-full border mr-2 mb-2 ${selected
                ? 'bg-black dark:bg-blue-600 border-black dark:border-blue-600'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                }`}
        >
            <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-slate-700 dark:text-slate-350'}`}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}
