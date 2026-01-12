import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Image, type ImageStyle, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/hooks/use-auth-context';

const LOGO = {
  light: require('@/assets/images/react-native-reusables-light.png'),
  dark: require('@/assets/images/react-native-reusables-dark.png'),
};

const IMAGE_STYLE: ImageStyle = {
  height: 76,
  width: 76,
};

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const { isLoggedIn } = useAuthContext();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        // Navigate to welcome page after sign out
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('Unexpected error signing out:', error);
    }
  };

  return (
    <View className="flex-1 items-center justify-center gap-8 p-4">
      <Image source={LOGO[colorScheme ?? 'light']} style={IMAGE_STYLE} resizeMode="contain" />
      <View className="gap-2 p-4">
        <Text className="ios:text-foreground font-mono text-sm text-muted-foreground">
          Home Screen
        </Text>
      </View>
      {isLoggedIn ? (
        <Button
          onPress={handleSignOut}
          className="w-full max-w-xs"
          variant="outline">
          <Text>Sign Out</Text>
        </Button>
      ) : (
        <Button
          onPress={() => router.replace('/welcome')}
          className="w-full max-w-xs"
          variant="outline">
          <Text>Go to Welcome</Text>
        </Button>
      )}
    </View>
  );
}

