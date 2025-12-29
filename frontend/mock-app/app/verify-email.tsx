import { VerifyEmailForm } from '@/components/verify-email-form';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ScrollView, View } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as React from 'react';

const SCREEN_OPTIONS = {
  title: 'Verify Email',
  headerTransparent: true,
};

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

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
          <VerifyEmailForm email={email || ''} />
        </View>

      </ScrollView>
    </>
  );
}

