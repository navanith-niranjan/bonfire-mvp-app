import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft } from 'lucide-react-native';

const SCREEN_OPTIONS = {
  title: 'Part C',
  headerShown: false,
};

export default function SubmitPartCScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleGenerateLabel = () => {
    setIsLoading(true);
    
    // Show loading for 5 seconds
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      
      // Navigate back to vault after 3 seconds
      setTimeout(() => {
        router.replace('/(tabs)/vault');
      }, 3000);
    }, 5000);
  };

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 bg-background">
        <ScrollView 
          contentContainerStyle={{ padding: 24, paddingTop: 80 }}
          showsVerticalScrollIndicator={false}>
          {/* Back arrow button */}
          <View className="mb-4">
            <Button
              variant="ghost"
              size="icon"
              onPress={handleBack}
              className="rounded-full -ml-2">
              <Icon as={ArrowLeft} className="size-5" />
            </Button>
          </View>

          {/* Progress bar */}
          <View className="mb-6">
            <Progress value={100} />
          </View>

          {/* Header title */}
          <View className="mb-2">
            <Text className="text-2xl font-bold">
              Final Step
            </Text>
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-sm text-muted-foreground">
              Generate your shipping label to send your cards to BONFIRE.
            </Text>
          </View>
        </ScrollView>

        {/* Centered button */}
        <View className="absolute inset-0 items-center justify-center">
          {isLoading ? (
            <View className="items-center gap-4">
              <ActivityIndicator size="large" color="#fff" />
              <Text className="text-muted-foreground">Generating shipping label...</Text>
            </View>
          ) : isSuccess ? (
            <View className="items-center gap-4">
              <Text className="text-lg font-semibold">Sent to email!</Text>
            </View>
          ) : (
            <Button
              variant="outline"
              onPress={handleGenerateLabel}
              className="min-w-[200px]">
              <Text>Generate Shipping Label</Text>
            </Button>
          )}
        </View>
      </View>
    </>
  );
}

