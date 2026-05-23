import React from 'react';
import { Modal, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScalePressable from '@/components/scale-pressable';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'error' | 'success' | 'info' | 'warning';
    onClose: () => void;
    buttonText?: string;
}

export default function CustomAlert({
    visible,
    title,
    message,
    type = 'error',
    onClose,
    buttonText = 'OK'
}: CustomAlertProps) {
    
    // Choose colors and icons based on alert type
    const getConfig = () => {
        switch (type) {
            case 'success':
                return {
                    iconName: 'checkmark-circle-outline' as const,
                    iconColor: '#22C55E', // emerald-500
                    iconBg: 'bg-green-50 dark:bg-green-950/30',
                    iconBorder: 'border-green-100 dark:border-green-900/30',
                    buttonBg: 'bg-green-600 dark:bg-green-500',
                };
            case 'warning':
                return {
                    iconName: 'warning-outline' as const,
                    iconColor: '#EAB308', // amber-500
                    iconBg: 'bg-amber-50 dark:bg-amber-950/30',
                    iconBorder: 'border-amber-100 dark:border-amber-900/30',
                    buttonBg: 'bg-amber-600 dark:bg-amber-500',
                };
            case 'info':
                return {
                    iconName: 'information-circle-outline' as const,
                    iconColor: '#3B82F6', // blue-500
                    iconBg: 'bg-blue-50 dark:bg-blue-950/30',
                    iconBorder: 'border-blue-100 dark:border-blue-900/30',
                    buttonBg: 'bg-blue-600 dark:bg-blue-500',
                };
            case 'error':
            default:
                return {
                    iconName: 'alert-circle-outline' as const,
                    iconColor: '#EF4444', // red-500
                    iconBg: 'bg-red-50 dark:bg-red-950/30',
                    iconBorder: 'border-red-100 dark:border-red-900/30',
                    buttonBg: 'bg-red-600 dark:bg-red-500',
                };
        }
    };

    const config = getConfig();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60 items-center justify-center p-6">
                <View 
                    style={styles.cardShadow}
                    className="bg-white dark:bg-slate-900 w-full max-w-[320px] rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 items-center"
                >
                    {/* Icon Container */}
                    <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 border ${config.iconBg} ${config.iconBorder}`}>
                        <Ionicons name={config.iconName} size={36} color={config.iconColor} />
                    </View>

                    {/* Alert Title */}
                    <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
                        {title}
                    </Text>

                    {/* Alert Message */}
                    <Text className="text-slate-500 dark:text-slate-400 text-center text-sm leading-relaxed mb-6 px-1">
                        {message}
                    </Text>

                    {/* Action Button */}
                    <ScalePressable
                        onPress={onClose}
                        hapticType="medium"
                        className={`w-full py-3.5 rounded-2xl items-center justify-center ${config.buttonBg}`}
                        scaleTo={0.96}
                    >
                        <Text className="text-white font-bold text-base">
                            {buttonText}
                        </Text>
                    </ScalePressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    }
});
