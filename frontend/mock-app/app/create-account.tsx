import { SignUpForm } from '@/components/sign-up-form';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as React from 'react';

const SCREEN_OPTIONS = {
  title: 'Create Account',
  headerTransparent: true,
};

export default function CreateAccountScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-1 items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
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

        <View className="w-full max-w-sm">
          <SignUpForm />
        </View>

      </ScrollView>
    </>
  );
}

