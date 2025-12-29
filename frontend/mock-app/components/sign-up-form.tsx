import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as React from 'react';
import { TextInput, View, Pressable, Alert } from 'react-native';

export function SignUpForm() {
  const router = useRouter();
  const passwordInputRef = React.useRef<TextInput>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = email.length > 0 ? emailRegex.test(email) : true;
  const showEmailError = email.length > 0 && !isValidEmail;

  // Password validation
  const passwordLength = password.length >= 6;
  const hasSymbolOrNumber = /[!@#$%^&*(),.?":{}|<>0-9]/.test(password);
  const emailLocalPart = email.split('@')[0]?.toLowerCase() || '';
  const containsEmail = emailLocalPart.length > 0 && password.toLowerCase().includes(emailLocalPart);
  const noSpaces = !/\s/.test(password);
  const isPasswordValid = passwordLength && hasSymbolOrNumber && !containsEmail && noSpaces;

  async function onSubmit() {
    if (!isPasswordValid || !isValidEmail || !email || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message || 'Failed to create account. Please try again.');
        setIsLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (!session) {
        // Navigate to verify email screen
        router.push({
          pathname: '/verify-email',
          params: { email },
        });
      } else {
        // User is automatically signed in (email confirmation disabled)
        router.replace('/');
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }
  
  const passwordStrength = React.useMemo(() => {
    if (password.length === 0) return 0;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (hasSymbolOrNumber) strength++;
    if (noSpaces) strength++;
    return Math.min(strength, 4); // Cap at 4 for display purposes
  }, [password, hasSymbolOrNumber, noSpaces]);

  const getStrengthText = () => {
    if (passwordStrength === 0) return 'Weak';
    if (passwordStrength <= 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'text-destructive';
    if (passwordStrength === 2) return 'text-yellow-500';
    if (passwordStrength === 3) return 'text-blue-500';
    return 'text-green-500';
  };

  return (
    <View className="gap-6">
      <Card className="bg-transparent border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left font-PlayfairDisplayItalic">Create your account</CardTitle>
          <CardDescription className="text-center sm:text-left font-Inter">
            Please fill in the details to get started
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
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
                className={showEmailError ? 'border-destructive' : ''}
              />
              {showEmailError && (
                <Text className="text-sm text-destructive font-Inter">
                  Please enter a valid email address
                </Text>
              )}
              {error && (
                <Text className="text-sm text-destructive font-Inter">
                  {error}
                </Text>
              )}
            </View>
            <View className="gap-1.5">
              <View className="relative">
                <Input
                  ref={passwordInputRef}
                  id="password"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="send"
                  onSubmitEditing={onSubmit}
                  className="pr-12"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Icon as={showPassword ? EyeOff : Eye} className="size-5 text-muted-foreground" />
                </Pressable>
              </View>
            </View>
            
            {/* Password Rules */}
            <View className="gap-2 mt-2">
              <View className="flex-row items-center gap-2">
                <View className={`size-1.5 rounded-full ${passwordLength ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <Text className={`text-sm font-Inter ${passwordLength ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Must be at least 6 characters
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className={`size-1.5 rounded-full ${hasSymbolOrNumber ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <Text className={`text-sm font-Inter ${hasSymbolOrNumber ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Must have at least one symbol or number
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className={`size-1.5 rounded-full ${emailLocalPart.length > 0 ? (!containsEmail ? 'bg-green-500' : 'bg-muted-foreground') : 'bg-muted-foreground'}`} />
                <Text className={`text-sm font-Inter ${emailLocalPart.length > 0 ? (!containsEmail ? 'text-foreground' : 'text-muted-foreground') : 'text-muted-foreground'}`}>
                  Can't include your email address
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className={`size-1.5 rounded-full ${noSpaces ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <Text className={`text-sm font-Inter ${noSpaces ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Can't contain spaces
                </Text>
              </View>
              {password.length > 0 && (
                <View className="mt-2">
                  <Text className="text-sm font-Inter">
                    Password strength: <Text className={`font-semibold font-Inter ${getStrengthColor()}`}>{getStrengthText()}</Text>
                  </Text>
                </View>
              )}
            </View>

            <Button 
              className="w-full mt-4" 
              onPress={onSubmit}
              disabled={!isPasswordValid || !isValidEmail || !email || isLoading}>
              <Text>{isLoading ? 'Creating account...' : 'Continue'}</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
