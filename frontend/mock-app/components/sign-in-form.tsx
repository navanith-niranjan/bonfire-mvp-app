import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import * as React from 'react';
import { type TextInput, View } from 'react-native';

export function SignInForm() {
  const router = useRouter();
  const passwordInputRef = React.useRef<TextInput>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function onSubmit() {
    if (!email || !password || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      // Navigation will happen automatically via auth state change
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  function onCreateAccount() {
    router.push('/create-account');
  }

  return (
    <View className="gap-6">
      <Card className="bg-transparent border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
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
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
              />
            </View>
            <View className="gap-1.5">
              <Input
                ref={passwordInputRef}
                id="password"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
              {error && (
                <Text className="text-sm text-destructive font-Inter">
                  {error}
                </Text>
              )}
            </View>
            <Button className="w-full" onPress={onSubmit} disabled={isLoading || !email || !password}>
              <Text>{isLoading ? 'Signing in...' : 'Log in'}</Text>
            </Button>
            <View className="flex-row items-center h-4 py-0">
                <Button
                  variant="link"
                  size="sm"
                  className="w-full items-center"
                  onPress={() => router.push('/forgot-password')}>
                  <Text className="font-normal font-Inter">Forgot your password?</Text>
                </Button>
            </View>
            <View className="flex-row items-center pt-10">
              <Separator className="flex-1" />
              <Text className="text-muted-foreground px-4 text-sm">or</Text>
              <Separator className="flex-1" />
            </View>
          </View>
          <Button 
            className="w-full" 
            onPress={onCreateAccount} 
            variant="outline"
          >
            <Text>Create new account</Text>
          </Button>
        </CardContent>
      </Card>
    </View>
  );
}
