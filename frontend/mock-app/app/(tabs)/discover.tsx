import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export default function DiscoverScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-2xl font-bold">Discover</Text>
      <Text className="text-muted-foreground mt-4 text-center">
        Explore and discover new content
      </Text>
    </View>
  );
}

