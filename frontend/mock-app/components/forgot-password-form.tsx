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
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit() {
    if (!email || isLoading) {
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Send password reset OTP code via email
      // Note: The recovery email template in Supabase dashboard needs to include {{ .Token }} to show the OTP code
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'mock-app://reset-password',
      });

      if (resetError) {
        setError(resetError.message || 'Failed to send verification code. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success - navigate to verify code screen
      router.push({
        pathname: '/verify-reset-code' as any,
        params: { email },
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="bg-transparent border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left font-PlayfairDisplayItalic">Forgot password?</CardTitle>
          <CardDescription className="text-center sm:text-left font-Inter">
            Enter your email to receive a verification code
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Input
                id="email"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
              {error && (
                <Text className="text-sm text-destructive font-Inter">
                  {error}
                </Text>
              )}
            </View>
            <Button 
              className="w-full" 
              onPress={onSubmit}
              disabled={isLoading || !email}>
              <Text className="font-Inter">{isLoading ? 'Sending...' : 'Send verification code'}</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
