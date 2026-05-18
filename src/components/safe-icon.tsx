import React from 'react';
import {
    Ionicons,
    MaterialCommunityIcons,
    Feather,
    AntDesign,
    Entypo,
    EvilIcons,
    FontAwesome,
    FontAwesome5,
    Foundation,
    MaterialIcons,
    Octicons,
    SimpleLineIcons,
    Zocial
} from '@expo/vector-icons';

interface SafeIconProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
}

// Complete static mapping of all 40 category icons to verified safe vector icons
const ICON_MAPPING: Record<string, { family: string; name: string }> = {
    'zap': { family: 'Ionicons', name: 'flash' },
    'droplet': { family: 'Ionicons', name: 'water' },
    'wind': { family: 'MaterialCommunityIcons', name: 'weather-windy' },
    'refrigerator': { family: 'MaterialCommunityIcons', name: 'fridge' },
    'washing-machine': { family: 'MaterialCommunityIcons', name: 'washing-machine' },
    'tv': { family: 'Ionicons', name: 'tv' },
    'monitor': { family: 'Ionicons', name: 'desktop' },
    'microwave': { family: 'MaterialCommunityIcons', name: 'microwave' },
    'flame': { family: 'Ionicons', name: 'flame' },
    'hammer': { family: 'Ionicons', name: 'hammer' },
    'brick': { family: 'MaterialCommunityIcons', name: 'wall' },
    'paint-bucket': { family: 'MaterialCommunityIcons', name: 'format-paint' },
    'shield-check': { family: 'Ionicons', name: 'shield-checkmark' },
    'layout': { family: 'MaterialCommunityIcons', name: 'page-layout-sidebar-left' },
    'construction': { family: 'Ionicons', name: 'construct' },
    'container': { family: 'MaterialCommunityIcons', name: 'database' },
    'filter': { family: 'Ionicons', name: 'funnel' },
    'bug': { family: 'Ionicons', name: 'bug' },
    'sparkles': { family: 'Ionicons', name: 'sparkles' },
    'fan': { family: 'MaterialCommunityIcons', name: 'fan' },
    'leaf': { family: 'Ionicons', name: 'leaf' },
    'scissors': { family: 'Ionicons', name: 'cut' },
    'dumbbell': { family: 'Ionicons', name: 'dumbbell' },
    'stethoscope': { family: 'Ionicons', name: 'medical' },
    'utensils': { family: 'MaterialCommunityIcons', name: 'silverware-fork-knife' },
    'users': { family: 'Ionicons', name: 'people' },
    'car': { family: 'Ionicons', name: 'car' },
    'shield': { family: 'Ionicons', name: 'shield' },
    'shirt': { family: 'MaterialCommunityIcons', name: 'hanger' },
    'package': { family: 'MaterialCommunityIcons', name: 'package-variant' },
    'key': { family: 'Ionicons', name: 'key' },
    'waves': { family: 'Ionicons', name: 'water' },
    'antenna': { family: 'MaterialCommunityIcons', name: 'antenna' },
    'sun': { family: 'Ionicons', name: 'sunny' },
    'battery-charging': { family: 'Ionicons', name: 'battery-charging' },
    'wrench': { family: 'Ionicons', name: 'build' },
    'palette': { family: 'Ionicons', name: 'color-palette' },
    'calendar': { family: 'Ionicons', name: 'calendar' },
    'file-text': { family: 'Ionicons', name: 'document-text' },
    'truck': { family: 'Ionicons', name: 'bus' }
};

const providers = [
    { family: 'Ionicons', component: Ionicons },
    { family: 'MaterialCommunityIcons', component: MaterialCommunityIcons },
    { family: 'Feather', component: Feather },
    { family: 'AntDesign', component: AntDesign },
    { family: 'Entypo', component: Entypo },
    { family: 'EvilIcons', component: EvilIcons },
    { family: 'FontAwesome', component: FontAwesome },
    { family: 'FontAwesome5', component: FontAwesome5 },
    { family: 'Foundation', component: Foundation },
    { family: 'MaterialIcons', component: MaterialIcons },
    { family: 'Octicons', component: Octicons },
    { family: 'SimpleLineIcons', component: SimpleLineIcons },
    { family: 'Zocial', component: Zocial }
];

export default function SafeIcon({ name, size = 24, color = 'black', style }: SafeIconProps) {
    if (!name) {
        return <Ionicons name="help-circle-outline" size={size} color={color} style={style} />;
    }

    const trimmedName = name.trim();
    const lowerName = trimmedName.toLowerCase();

    // 1. Exact Match in ICON_MAPPING
    const mapped = ICON_MAPPING[lowerName];
    if (mapped) {
        const prov = providers.find(p => p.family === mapped.family);
        if (prov) {
            const IconComp = prov.component;
            return <IconComp name={mapped.name as any} size={size} color={color} style={style} />;
        }
    }

    // 2. Search exact match across ALL provider glyphMaps dynamically!
    for (const provider of providers) {
        const glyphMap = (provider.component as any).glyphMap;
        if (glyphMap && (trimmedName in glyphMap)) {
            const IconComp = provider.component;
            return <IconComp name={trimmedName as any} size={size} color={color} style={style} />;
        }
    }

    // 3. Search case-insensitive match across ALL provider glyphMaps dynamically!
    for (const provider of providers) {
        const glyphMap = (provider.component as any).glyphMap;
        if (glyphMap) {
            const exactKey = Object.keys(glyphMap).find(k => k.toLowerCase() === lowerName);
            if (exactKey) {
                const IconComp = provider.component;
                return <IconComp name={exactKey as any} size={size} color={color} style={style} />;
            }
        }
    }

    // 4. Fuzzy search across ALL provider glyphMaps dynamically (part of name / replacement-friendly)!
    const strippedLowerName = lowerName.replace(/[^a-z0-9]/g, '');
    for (const provider of providers) {
        const glyphMap = (provider.component as any).glyphMap;
        if (glyphMap) {
            const fuzzyKey = Object.keys(glyphMap).find(k => {
                const strippedKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                return strippedKey === strippedLowerName || strippedKey.includes(strippedLowerName) || strippedLowerName.includes(strippedKey);
            });
            if (fuzzyKey) {
                const IconComp = provider.component;
                return <IconComp name={fuzzyKey as any} size={size} color={color} style={style} />;
            }
        }
    }

    // Absolute fallback: Question Mark Icon
    return <Ionicons name="help-circle-outline" size={size} color={color} style={style} />;
}
