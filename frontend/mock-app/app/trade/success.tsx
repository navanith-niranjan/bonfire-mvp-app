import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { CheckCircle2 } from 'lucide-react-native';
import { useTransactions } from '@/hooks/use-transactions';

const SCREEN_OPTIONS = {
  title: 'Trade Success',
  headerShown: false,
};

export default function TradeSuccessScreen() {
  const router = useRouter();
  const { refreshTransactions } = useTransactions();

  // Refresh transactions and auto-navigate to vault after 3 seconds
  useEffect(() => {
    // Refresh transactions to show the new trade
    refreshTransactions();
    
    const timer = setTimeout(() => {
      router.replace('/(tabs)/vault');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router, refreshTransactions]);

  const handleGoToVault = () => {
    router.replace('/(tabs)/vault');
  };

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 bg-background items-center justify-center px-6">
        {/* Success Icon - Ready for custom animation */}
        <View className="mb-8">
          <View className="bg-green-500 rounded-full p-6">
            <Icon as={CheckCircle2} className="size-16 text-white" />
          </View>
          {/* TODO: Add custom animation here */}
        </View>

        {/* Success Message */}
        <View className="items-center gap-4 mb-8">
          <Text className="text-3xl font-bold text-foreground text-center">
            Trade Successful!
          </Text>
          <Text className="text-base text-muted-foreground text-center max-w-sm">
            Your exchange has been completed successfully. Your inventory and wallet have been updated.
          </Text>
        </View>

        {/* Action Button */}
        <Button
          variant="default"
          onPress={handleGoToVault}
          className="w-full max-w-xs"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 8,
          }}>
          <Text>Go to Vault</Text>
        </Button>

        {/* Auto-navigate hint */}
        <Text className="text-xs text-muted-foreground mt-4 text-center">
          Redirecting to vault in a few seconds...
        </Text>
      </View>
    </>
  );
}
