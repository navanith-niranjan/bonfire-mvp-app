import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useColorScheme } from 'nativewind';
import { Image, Platform, View, Text } from 'react-native';
import { GoogleSignInButton } from '@/components/google-sign-in-button';

export function SocialConnections() {
  const { colorScheme } = useColorScheme();

  return (
    <View className="flex-row gap-3 w-full justify-center">

      {/* 1. GOOGLE BUTTON (Primary - Big & Active) */}
      <GoogleSignInButton variant="icon" />

      {/* 2. APPLE BUTTON (Secondary - Small & Disabled) */}
      <Button
        disabled={true} // <--- Disables interaction
        variant="outline"
        className='p-5'
      >
        <Image
          className="size-5"
          tintColor={colorScheme === 'dark' ? 'white' : 'black'}
          source={{ uri: 'https://img.clerk.com/static/apple.png?width=160' }}
        />
      </Button>
    </View>
  );
}