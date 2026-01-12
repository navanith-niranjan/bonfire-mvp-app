import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export default function VaultScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-2xl font-bold">Vault</Text>
      <Text className="text-muted-foreground mt-4 text-center">
        Vault and secure content
      </Text>
    </View>
  );
}

