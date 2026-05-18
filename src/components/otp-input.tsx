// @ts-nocheck
import { useRef } from 'react';
import { TextInput, View } from 'react-native';

export default function StyledOTPInput({
    otp,
    setOtp,
    onValidate,
    onComplete,
    error,
}: {
    otp: string;
    setOtp: (otp: string) => void;
    onValidate: (otp: string) => Promise<boolean>;
    onComplete: () => void;
    error?: string | null;
}) {
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleOnChange = async (index: number, text: string) => {
        const digit = text.replace(/\D/g, '').slice(-1);
        const nextOtp = otp.substring(0, index) + digit + otp.substring(index + 1);
        setOtp(nextOtp);

        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        if (nextOtp.length === 6) {
            const isValid = await onValidate(nextOtp);
            if (isValid) {
                onComplete();
            }
        }
    };

    return (
        <View className="w-full flex-row items-center justify-evenly gap-3 rounded-2xl border border-slate-300 p-4 my-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <TextInput
                    key={i}
                    ref={(ref) => {
                        inputRefs.current[i] = ref;
                    }}
                    value={otp[i] || ''}
                    onChangeText={(text) => handleOnChange(i, text)}
                    maxLength={1}
                    keyboardType="number-pad"
                    placeholder={otp[i] ? undefined : ''}
                    placeholderTextColor="#94a3b8"
                    editable={true}
                    textAlign="center"
                    autoCorrect={false}
                    autoCapitalize="none"
                    textContentType="oneTimeCode"
                    selectionColor="#0f172a"
                    onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace') {
                            // If current has a value, clear it
                            if (otp[i]) {
                                const nextOtp = otp.substring(0, i) + '' + otp.substring(i + 1);
                                setOtp(nextOtp);
                                return;
                            }
                            // If current is empty, move to previous and clear it
                            if (i > 0) {
                                inputRefs.current[i - 1]?.focus();
                                const nextOtp = otp.substring(0, i - 1) + '' + otp.substring(i);
                                setOtp(nextOtp);
                            }
                        }
                    }}
                    className={`h-10 w-11 text-center text-2xl font-semibold text-slate-900 active:outline-0 focus:outline-0 ${error && otp[i] ? 'border-red-500' : 'border-slate-200'}`}
                />
            ))}
        </View>
    );
}
