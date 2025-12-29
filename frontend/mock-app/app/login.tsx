import { SignInForm } from '@/components/sign-in-form';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ArrowLeft } from 'lucide-react-native';
import * as React from 'react';
import { Image, type ImageStyle } from 'react-native';

const LOGO = {
  light: require('@/assets/images/react-native-reusables-light.png'),
  dark: require('@/assets/images/react-native-reusables-dark.png'),
};

const IMAGE_STYLE: ImageStyle = {
    height: 120,
    width: 120,
  };

const SCREEN_OPTIONS = {
  title: 'Login',
  headerTransparent: true,
};

export default function LoginScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();

  const handleGetStarted = () => {
    router.push('/');
  };

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="sm:flex-1 items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
        keyboardDismissMode="interactive">
        
        <View className="absolute top-12 left-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.back()}
            className="rounded-full">
            <Icon as={ArrowLeft} className="size-5" />
          </Button>
        </View>

        <View className="flex-1 items-center p-12">
            <Image 
              source={LOGO[colorScheme ?? 'light']} 
              style={[IMAGE_STYLE]} 
              resizeMode="contain" 
            />
        </View>

        <View className="w-full max-w-sm">
          <SignInForm />
        </View>

      </ScrollView>
    </>
  );
}

