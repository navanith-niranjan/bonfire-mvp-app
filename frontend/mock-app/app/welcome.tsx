import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { SocialConnections } from '@/components/social-connections';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Image, type ImageStyle, View } from 'react-native';

const LOGO = {
  light: require('@/assets/images/react-native-reusables-light.png'),
  dark: require('@/assets/images/react-native-reusables-dark.png'),
};

const SCREEN_OPTIONS = {
  title: 'Welcome',
  headerTransparent: true,
};

const IMAGE_STYLE: ImageStyle = {
  height: 240,
  width: 240,
};

export default function WelcomeScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();

  const handleContinueWithEmail = () => {
    router.push('/login');
  };

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1">
        {/* Logo container - centered */}
        <View className="flex-1 items-center justify-center">
          <Image 
            source={LOGO[colorScheme ?? 'light']} 
            style={[IMAGE_STYLE, { marginTop: 250 }]} 
            resizeMode="contain" 
          />
        </View>
        
        {/* Content at the bottom */}
        <View className="flex-1 items-center justify-end pb-32 gap-8 p-4">
          <View className="gap-2 items-center -mt-16">
            <Text className="text-5xl font-Gloock text-center text-muted-foreground">
              BONFIRE
            </Text>
            <Text className="text-5xl font-PlayfairDisplayItalic text-center">
              Secure & Instant Digital Trading
            </Text>
          </View>
          <View className="w-full max-w-xs gap-4">
            <Button
              onPress={handleContinueWithEmail}
              className="w-full max-w-xs"
              size="lg">
              <Text className="text-md font-InterBold">Continue with Email</Text>
            </Button>
            <SocialConnections />
          </View>
        </View>
      </View>
    </>
  );
}

