import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as React from 'react';
import { type TextStyle, View } from 'react-native';

const RESEND_CODE_INTERVAL_SECONDS = 30;

const TABULAR_NUMBERS_STYLE: TextStyle = { fontVariant: ['tabular-nums'] };

interface VerifyResetCodeFormProps {
  email: string;
}

export function VerifyResetCodeForm({ email }: VerifyResetCodeFormProps) {
  const router = useRouter();
  const [code, setCode] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { countdown, restartCountdown } = useCountdown(RESEND_CODE_INTERVAL_SECONDS);

  async function onSubmit() {
    if (!code || code.length === 0 || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify the OTP code with type 'recovery'
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'recovery',
      });

      if (verifyError) {
        setError(verifyError.message);
        setIsLoading(false);
        return;
      }

      // Check if session was created (recovery OTP should create a session)
      if (data?.session) {
        // Session created - navigate to reset password screen
        router.push({
          pathname: '/reset-password',
          params: { email },
        });
      } else {
        // No session - this shouldn't happen but handle it
        setError('Verification succeeded but no session was created. Please try again.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (isResending || countdown > 0) {
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      const { error: resendError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'mock-app://reset-password',
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        restartCountdown();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="bg-transparent border-border/0 sm:border-border pb-4 shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left font-PlayfairDisplayItalic">Verify reset code</CardTitle>
          <CardDescription className="text-center sm:text-left font-Inter">
            Enter the verification code sent to {email || 'your email'}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Input
                id="code"
                placeholder="Verification code"
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                returnKeyType="send"
                keyboardType="numeric"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                onSubmitEditing={onSubmit}
              />
              {error && (
                <Text className="text-sm text-destructive font-Inter text-center">
                  {error}
                </Text>
              )}
              <Button
                variant="link"
                size="sm"
                disabled={countdown > 0 || isResending}
                onPress={handleResend}>
                <Text className="text-center text-xs font-Inter">
                  {isResending ? 'Resending...' : "Didn't receive the code? Resend"}{' '}
                  {countdown > 0 ? (
                    <Text className="text-xs font-Inter" style={TABULAR_NUMBERS_STYLE}>
                      ({countdown})
                    </Text>
                  ) : null}
                </Text>
              </Button>
            </View>
            <View className="gap-3">
              <Button 
                className="w-full" 
                onPress={onSubmit}
                disabled={code.length === 0 || isLoading}>
                <Text className="font-Inter">{isLoading ? 'Verifying...' : 'Continue'}</Text>
              </Button>
            </View>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

function useCountdown(seconds = 30) {
  const [countdown, setCountdown] = React.useState(seconds);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = React.useCallback(() => {
    setCountdown(seconds);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [seconds]);

  React.useEffect(() => {
    startCountdown();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startCountdown]);

  return { countdown, restartCountdown: startCountdown };
}

