import { View, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useState } from 'react';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react-native';
import { useWallet } from '@/hooks/use-wallet';

export function BalanceDisplay() {
  const { balance, deposit } = useWallet();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);

  const resetAndClose = (setter: (open: boolean) => void) => {
    Keyboard.dismiss();
    setDepositAmount('');
    setter(false);
  };

  const handleDepositSubmit = async () => {
    const numAmount = parseFloat(depositAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }
    setIsProcessingDeposit(true);
    try {
      await deposit(numAmount);
      setDepositAmount('');
      setDepositDialogOpen(false);
    } catch (error) {
      console.error('Deposit error:', error);
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  return (
    <>
      <View className="items-end ml-auto">
        <Text className="text-sm text-muted-foreground">Your Balance</Text>
        <View className="flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-white bg-transparent"
            style={{ width: 18, height: 18 }}
            onPress={() => setDepositDialogOpen(true)}>
            <Icon as={Plus} className="size-2.5" />
          </Button>
          <Text className="text-lg font-bold">${balance.toFixed(2)}</Text>
        </View>
      </View>

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
                    value={depositAmount}
                    onChangeText={setDepositAmount}
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
                  disabled={isProcessingDeposit || !depositAmount || parseFloat(depositAmount) <= 0}
                  className="w-full">
                  <Text>Deposit</Text>
                </Button>
              </DialogFooter>
            </View>
          </TouchableWithoutFeedback>
        </DialogContent>
      </Dialog>
    </>
  );
}
