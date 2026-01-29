import { View, FlatList, Image, useWindowDimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ArrowLeft } from 'lucide-react-native';
import { useCardSearch } from '@/hooks/use-card-search';
import { CardTradeDialog } from '@/components/card-trade-dialog';
import { useTrade } from '@/providers/trade-provider';
import type { PokemonCard } from '@/types/card';
import type { CardConditionPayload } from '@/components/card-trade-dialog';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { width } = useWindowDimensions();
  const query = (params.q ?? '').trim();
  const { cards, isSearching } = useCardSearch({
    pageSize: 50,
    initialQuery: query,
  });
  const { addCard } = useTrade();
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const cardWidth = (width - 48 - 16) / 3;
  const cardHeight = cardWidth * 1.4;

  const handleAddToTrade = ({ card, condition }: { card: PokemonCard; condition: CardConditionPayload }) => {
    addCard(card, condition);
    setDialogOpen(false);
    setSelectedCard(null);
    router.back();
  };

  const renderCard = ({ item }: { item: PokemonCard }) => {
    const uri = item.image_small || item.image_large || '';
    const hasImage = typeof uri === 'string' && uri.trim() !== '';
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedCard(item);
          setDialogOpen(true);
        }}
        activeOpacity={0.9}
        style={{ width: cardWidth, marginBottom: 16 }}>
        <View
          style={{
            width: cardWidth,
            height: cardHeight,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            overflow: 'hidden',
            borderRadius: 8,
          }}>
          {hasImage ? (
            <Image
              source={{ uri }}
              style={{ width: cardWidth, height: cardHeight }}
              resizeMode="cover"
            />
          ) : (
            <View className="bg-muted" style={{ width: cardWidth, height: cardHeight }} />
          )}
        </View>
        <Text className="text-xs font-semibold text-foreground mt-1" numberOfLines={2}>
          {item.name}
        </Text>
        {item.set_name && (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {item.set_name}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-background">
        <View className="px-6 pt-16 pb-4 flex-row items-center gap-4">
          <Button variant="ghost" size="icon" onPress={() => router.back()} className="rounded-full -ml-2">
            <Icon as={ArrowLeft} className="size-5" />
          </Button>
          <Text className="text-xl font-semibold text-foreground flex-1" numberOfLines={1}>
            {query ? `Results for "${query}"` : 'Search results'}
          </Text>
        </View>

        {isSearching && cards.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-4">Searching...</Text>
          </View>
        ) : cards.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-muted-foreground text-center">No cards found</Text>
            <Text className="text-sm text-muted-foreground mt-2 text-center">
              Try a different search term
            </Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            renderItem={renderCard}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            numColumns={3}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
            columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
          />
        )}

        <CardTradeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          card={selectedCard}
          onAddToTrade={handleAddToTrade}
        />
      </View>
    </>
  );
}
