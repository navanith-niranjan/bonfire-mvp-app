import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowUpDown } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTrade } from '@/providers/trade-provider';

export function FloatingTradeButton() {
  const router = useRouter();
  const { pendingCards, getReceiveCardsPayload, getGiveCards } = useTrade();
  const count = pendingCards.length;

  const handlePress = () => {
    const receiveCards = getReceiveCardsPayload();
    const giveCards = getGiveCards();
    router.push({
      pathname: '/trade/deck',
      params: {
        receiveCards: JSON.stringify(receiveCards),
        cards: giveCards.length > 0 ? JSON.stringify(giveCards) : undefined,
      },
    });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#ef4444', // red-500
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 12,
      }}>
      <Icon as={ArrowUpDown} className="size-6 text-white" />
      {count > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            minWidth: 24,
            height: 24,
            paddingHorizontal: 6,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#ef4444',
              lineHeight: 24,
              includeFontPadding: false,
            }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
