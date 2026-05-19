// @ts-nocheck
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function PremiumPayment() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const params = useLocalSearchParams();
    const { user, refreshProfile } = useAppStore();

    const plan = params.plan === 'basic' ? 'basic' : 'premium';
    const basePrice = plan === 'basic' ? 499 : 999;
    const gstPrice = Math.round(basePrice * 0.18);
    const totalPrice = basePrice + gstPrice;

    const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'net_banking'>('upi');
    const [upiId, setUpiId] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePay = async () => {
        if (payMethod === 'upi') {
            if (!upiId || !upiId.includes('@')) {
                Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g., ramesh@okicici).');
                return;
            }
        } else if (payMethod === 'card') {
            if (cardNumber.length < 16) {
                Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number.');
                return;
            }
            if (!expiry || expiry.length < 5) {
                Alert.alert('Invalid Expiry', 'Please enter MM/YY expiry date.');
                return;
            }
            if (cvv.length < 3) {
                Alert.alert('Invalid CVV', 'Please enter a 3-digit CVV.');
                return;
            }
        } else if (payMethod === 'net_banking') {
            if (!selectedBank) {
                Alert.alert('Select Bank', 'Please choose a bank to complete the payment.');
                return;
            }
        }

        setLoading(true);
        try {
            // Mock razorpay payment simulation
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Update user in DB
            if (user?.id) {
                const { error } = await insforge.database
                    .from('service_providers')
                    .update({ is_premium: true })
                    .eq('id', user.id);

                if (error) throw error;
                await refreshProfile();
            }

            Alert.alert(
                'Payment Successful',
                'Your premium subscription is now active! Enjoy premium features.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            router.replace('/(protected)/worker/settings');
                        }
                    }
                ]
            );
        } catch (err: any) {
            console.error('[Premium Payment]', err);
            Alert.alert('Payment Failed', err.message || 'An error occurred during payment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <View className="flex-row items-center px-6 py-4 justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="size-10 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700"
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Ionicons name="arrow-back" size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                </TouchableOpacity>
                <Text className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Premium payment</Text>
                <View className="w-10" />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                    {/* Selected Plan Info Card */}
                    <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6 flex-row items-center justify-between">
                        <View>
                            <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">
                                SELECTED PLAN
                            </Text>
                            <Text className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                                {plan} plan
                            </Text>
                        </View>
                        <Text className="text-xl font-black text-slate-900 dark:text-white">
                            Rs.{basePrice}
                        </Text>
                    </View>

                    {/* Pay Options Label */}
                    <Text className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">
                        PAY OPTIONS
                    </Text>

                    {/* Pay Methods Select Row */}
                    <View className="flex-row gap-2 mb-6">
                        <TouchableOpacity
                            onPress={() => setPayMethod('upi')}
                            activeOpacity={0.8}
                            className={`flex-1 py-3 rounded-2xl items-center border ${
                                payMethod === 'upi'
                                    ? 'bg-[#18181B] border-transparent dark:bg-white'
                                    : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                            }`}
                        >
                            <Text className={`font-bold text-sm ${
                                payMethod === 'upi'
                                    ? 'text-white dark:text-slate-950'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}>
                                UPI
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setPayMethod('card')}
                            activeOpacity={0.8}
                            className={`flex-1 py-3 rounded-2xl items-center border ${
                                payMethod === 'card'
                                    ? 'bg-[#18181B] border-transparent dark:bg-white'
                                    : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                            }`}
                        >
                            <Text className={`font-bold text-sm ${
                                payMethod === 'card'
                                    ? 'text-white dark:text-slate-950'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}>
                                Card
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setPayMethod('net_banking')}
                            activeOpacity={0.8}
                            className={`flex-1 py-3 rounded-2xl items-center border ${
                                payMethod === 'net_banking'
                                    ? 'bg-[#18181B] border-transparent dark:bg-white'
                                    : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                            }`}
                        >
                            <Text className={`font-bold text-sm ${
                                payMethod === 'net_banking'
                                    ? 'text-white dark:text-slate-950'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}>
                                Net banking
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Input Area Based on Selection */}
                    {payMethod === 'upi' && (
                        <View className="mb-6">
                            <Text className="text-xs font-bold text-slate-500 mb-2 ml-1">UPI ID</Text>
                            <TextInput
                                value={upiId}
                                onChangeText={setUpiId}
                                placeholder="ramesh@okicici"
                                placeholderTextColor={colorScheme === 'dark' ? '#64748b' : '#94a3b8'}
                                autoCapitalize="none"
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-semibold"
                            />
                        </View>
                    )}

                    {payMethod === 'card' && (
                        <View className="mb-6 flex-col gap-4">
                            <View>
                                <Text className="text-xs font-bold text-slate-500 mb-2 ml-1">Card number</Text>
                                <TextInput
                                    value={cardNumber}
                                    onChangeText={setCardNumber}
                                    placeholder="XXXX XXXX XXXX XXXX"
                                    placeholderTextColor={colorScheme === 'dark' ? '#64748b' : '#94a3b8'}
                                    keyboardType="numeric"
                                    maxLength={16}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-semibold"
                                />
                            </View>
                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-slate-500 mb-2 ml-1">Expiry (MM/YY)</Text>
                                    <TextInput
                                        value={expiry}
                                        onChangeText={setExpiry}
                                        placeholder="MM/YY"
                                        placeholderTextColor={colorScheme === 'dark' ? '#64748b' : '#94a3b8'}
                                        keyboardType="numeric"
                                        maxLength={5}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-semibold text-center"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-slate-500 mb-2 ml-1">CVV</Text>
                                    <TextInput
                                        value={cvv}
                                        onChangeText={setCvv}
                                        placeholder="123"
                                        placeholderTextColor={colorScheme === 'dark' ? '#64748b' : '#94a3b8'}
                                        keyboardType="numeric"
                                        secureTextEntry
                                        maxLength={3}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-semibold text-center"
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {payMethod === 'net_banking' && (
                        <View className="mb-6">
                            <Text className="text-xs font-bold text-slate-500 mb-2 ml-1">Select Bank</Text>
                            <View className="flex-col gap-2">
                                {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'].map((bank) => (
                                    <TouchableOpacity
                                        key={bank}
                                        onPress={() => setSelectedBank(bank)}
                                        activeOpacity={0.7}
                                        className={`p-4 rounded-2xl border flex-row justify-between items-center ${
                                            selectedBank === bank
                                                ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
                                                : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                                        }`}
                                    >
                                        <Text className={`font-semibold text-sm ${
                                            selectedBank === bank
                                                ? 'text-amber-800 dark:text-amber-400'
                                                : 'text-slate-700 dark:text-slate-300'
                                        }`}>
                                            {bank}
                                        </Text>
                                        {selectedBank === bank && (
                                            <Feather name="check" size={16} color="#F59E0B" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Price Summary Card */}
                    <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex-col gap-3">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Premium plan</Text>
                            <Text className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rs.{basePrice}</Text>
                        </View>
                        <View className="flex-row justify-between items-center">
                            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">GST (18%)</Text>
                            <Text className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rs.{gstPrice}</Text>
                        </View>
                        <View className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                        <View className="flex-row justify-between items-center">
                            <Text className="text-base font-black text-slate-900 dark:text-white">Total</Text>
                            <Text className="text-base font-black text-slate-900 dark:text-white">Rs.{totalPrice}</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Sticky Bottom Actions */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <TouchableOpacity
                    onPress={handlePay}
                    activeOpacity={0.8}
                    className="bg-[#18181B] dark:bg-slate-100 py-4 rounded-2xl items-center justify-center flex-row gap-2"
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colorScheme === 'dark' ? '#000' : '#fff'} />
                    ) : (
                        <>
                            <Text className="text-white dark:text-slate-950 font-black text-lg">
                                Pay Rs.{totalPrice}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
                <View className="flex-row items-center justify-center gap-1 mt-3">
                    <Feather name="lock" size={12} color="#94a3b8" />
                    <Text className="text-slate-400 text-xs font-bold text-center">
                        Secure • Razorpay encrypted
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
