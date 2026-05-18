import { useColorScheme } from 'react-native';

export const Colors = {
    light: {
        background: '#ffffff',
        text: '#0f172a', // slate-900
        textMuted: '#64748b', // slate-500
        card: '#f8fafc', // slate-50
        border: '#e2e8f0', // slate-200
        active: '#000000',
        inactive: '#94a3b8', // slate-400
        tint: '#3b82f6', // blue-500
    },
    dark: {
        background: '#090d16', // slate-950/darker background
        text: '#f8fafc', // slate-50
        textMuted: '#94a3b8', // slate-400
        card: '#0f172a', // slate-900
        border: '#1e293b', // slate-800
        active: '#ffffff',
        inactive: '#64748b', // slate-500
        tint: '#60a5fa', // blue-400
    }
};

export function useTheme() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;

    return {
        isDark,
        colors,
        scheme,
    };
}
