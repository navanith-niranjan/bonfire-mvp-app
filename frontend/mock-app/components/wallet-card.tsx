import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, MinusCircle } from 'lucide-react-native';
import { useWallet } from '@/hooks/use-wallet';

export function WalletCard() {
  const { balance, deposit, withdraw, isLoading } = useWallet();

  const handleDeposit = () => {
    // TODO: Open deposit modal or navigate to deposit screen
    console.log('Deposit clicked');
  };

  const handleWithdraw = () => {
    // TODO: Open withdraw modal or navigate to withdraw screen
    console.log('Withdraw clicked');
  };

  return (
    <View className="w-full">
      <Card className="border-0 shadow-none bg-transparent py-6 w-full">
        <CardContent className="p-6 gap-8">
        {/* BALANCE label in top left */}
        <View className="top-6 pb-4">
          <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            My Balance
          </Text>
        </View>

        {/* Balance amount centered */}
        <View className="items-center justify-center">
          <Text className="text-4xl font-bold">
            ${balance.toFixed(2)}
          </Text>
        </View>

        {/* Deposit and Withdraw buttons */}
        <View className="flex-row gap-3">
          <Button
            onPress={handleDeposit}
            disabled={isLoading}
            className="flex-1"
            variant="default">
            <PlusCircle size={18} color="white" />
            <Text>Deposit</Text>
          </Button>
          <Button
            onPress={handleWithdraw}
            disabled={isLoading}
            className="flex-1"
            variant="outline">
            <MinusCircle size={18} color="white" />
            <Text>Withdraw</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
    </View>
  );
}

