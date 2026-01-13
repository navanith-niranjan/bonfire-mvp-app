import { View, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useState } from 'react';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlusCircle, MinusCircle } from 'lucide-react-native';
import { useWallet } from '@/hooks/use-wallet';

export function WalletCard() {
  const { balance, deposit, withdraw, isLoading } = useWallet();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeposit = () => {
    setDepositDialogOpen(true);
  };

  const handleWithdraw = () => {
    setWithdrawDialogOpen(true);
  };

  const handleDepositSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }
    setIsProcessing(true);
    try {
      await deposit(numAmount);
      setAmount('');
      setDepositDialogOpen(false);
    } catch (error) {
      console.error('Deposit error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > balance) {
      return;
    }
    setIsProcessing(true);
    try {
      await withdraw(numAmount);
      setAmount('');
      setWithdrawDialogOpen(false);
    } catch (error) {
      console.error('Withdraw error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAndClose = (setter: (open: boolean) => void) => {
    Keyboard.dismiss();
    setAmount('');
    setter(false);
  };

  return (
    <View className="w-full">
      <Card className="border-0 shadow-none bg-transparent py-6 w-full">
        <CardContent className="p-6 gap-8">
        {/* BALANCE label in top left */}
        <View className="top-6 pb-4">
          <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            My Cash Balance
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

    {/* Deposit Dialog */}
    <Dialog open={depositDialogOpen} onOpenChange={(open) => {
      if (!open) {
        Keyboard.dismiss();
        resetAndClose(setDepositDialogOpen);
      } else {
        setDepositDialogOpen(open);
      }
    }}>
      <DialogContent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            <DialogHeader>
              <DialogTitle>Deposit Funds</DialogTitle>
              <DialogDescription>
                Enter the amount you want to deposit to your wallet.
              </DialogDescription>
            </DialogHeader>
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-sm font-medium">Amount ($)</Text>
                <Input
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
              <View className="bg-muted/50 rounded-md p-3">
                <Text className="text-xs text-muted-foreground text-center">
                  ⚠️ This is for demo purposes only. No real cash is being added to your account.
                </Text>
              </View>
            </View>
            <DialogFooter>
              <Button
                onPress={handleDepositSubmit}
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                className="w-full">
                <Text>Deposit</Text>
              </Button>
            </DialogFooter>
          </View>
        </TouchableWithoutFeedback>
      </DialogContent>
    </Dialog>

    {/* Withdraw Dialog */}
    <Dialog open={withdrawDialogOpen} onOpenChange={(open) => {
      if (!open) {
        Keyboard.dismiss();
        resetAndClose(setWithdrawDialogOpen);
      } else {
        setWithdrawDialogOpen(open);
      }
    }}>
      <DialogContent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            <DialogHeader>
              <DialogTitle>Withdraw Funds</DialogTitle>
              <DialogDescription>
                Enter the amount you want to withdraw from your wallet.
              </DialogDescription>
            </DialogHeader>
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-sm font-medium">Amount ($)</Text>
                <Input
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                {amount && parseFloat(amount) > balance && (
                  <Text className="text-xs text-destructive">
                    Insufficient balance. Available: ${balance.toFixed(2)}
                  </Text>
                )}
              </View>
              <View className="bg-muted/50 rounded-md p-3">
                <Text className="text-xs text-muted-foreground text-center">
                  ⚠️ This is for demo purposes only. No real cash is being withdrawn from your account.
                </Text>
              </View>
            </View>
            <DialogFooter>
              <Button
                onPress={handleWithdrawSubmit}
                disabled={
                  isProcessing ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  parseFloat(amount) > balance
                }
                className="w-full">
                <Text>Withdraw</Text>
              </Button>
            </DialogFooter>
          </View>
        </TouchableWithoutFeedback>
      </DialogContent>
    </Dialog>
    </View>
  );
}

