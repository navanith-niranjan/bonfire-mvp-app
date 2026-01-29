import { View, Image, useWindowDimensions, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { X, Search, Check } from 'lucide-react-native';
import { useInventory } from '@/hooks/use-inventory';
import type { UserCard } from '@/types/inventory';

const SCREEN_OPTIONS = {
  title: 'Select Cards',
  headerShown: false,
};

export default function SelectInventoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const { cards: allCards, isLoading } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Parse initially selected cards from params
  const initialSelectedCards = useMemo(() => {
    try {
      if (params.cards && typeof params.cards === 'string') {
        return JSON.parse(params.cards) as UserCard[];
      }
    } catch (error) {
      console.error('Error parsing cards:', error);
    }
    return [];
  }, [params.cards]);

  // Track selected card IDs
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(
    new Set(initialSelectedCards.map(card => card.id))
  );

  // Filter cards based on search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCards;
    }
    const query = searchQuery.toLowerCase().trim();
    return allCards.filter(card => {
      const nameMatch = card.name.toLowerCase().includes(query);
      const conditionMatch = card.item_data?.condition?.toLowerCase().includes(query);
      const setMatch = card.item_data?.set?.toLowerCase().includes(query);
      return nameMatch || conditionMatch || setMatch;
    });
  }, [allCards, searchQuery]);

  // Separate selected and unselected cards
  const selectedCards = useMemo(() => {
    return filteredCards.filter(card => selectedCardIds.has(card.id));
  }, [filteredCards, selectedCardIds]);

  const unselectedCards = useMemo(() => {
    return filteredCards.filter(card => !selectedCardIds.has(card.id));
  }, [filteredCards, selectedCardIds]);

  // Calculate card width: 3 columns with 8px gaps (4px margin on each side)
  // Total width - padding (48px) - gaps (16px for 2 gaps between 3 cards)
  const cardWidth = (width - 48 - 16) / 3;
  const cardHeight = cardWidth * 1.4;

  const toggleCardSelection = (cardId: number) => {
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const returnTab = (params.returnTab as string) || 'discover';

  const handleCancel = () => {
    router.back();
  };

  const handleContinue = () => {
    const selectedCardsData = allCards.filter(card => selectedCardIds.has(card.id));
    router.push({
      pathname: '/trade/deck',
      params: {
        returnTab,
        cards: JSON.stringify(selectedCardsData),
        ...(params.receiveCards && { receiveCards: params.receiveCards as string }),
      },
    });
  };

  // Get market price from item_data
  // TODO: In future, fetch condition/grade-specific prices from pricing API
  // Different conditions (NM, LP, MP, HP, D) and grades (PSA 10, 9, etc.) have different market values
  const getMarketPrice = (card: UserCard): string => {
    const price = card.item_data?.market_price;
    if (price === null || price === undefined || typeof price !== 'number') {
      return 'N/A';
    }
    return `$${price.toFixed(2)}`;
  };

  const renderCard = ({ item }: { item: UserCard }) => {
    const isSelected = selectedCardIds.has(item.id);
    const marketPrice = getMarketPrice(item);
    
    return (
      <TouchableOpacity
        onPress={() => toggleCardSelection(item.id)}
        style={{ width: cardWidth, marginBottom: 16 }}
        activeOpacity={0.7}>
        <View className="relative">
          {typeof item.image_url === 'string' && item.image_url.trim() !== '' ? (
            <Image
              source={{ uri: item.image_url }}
              style={{ width: cardWidth, height: cardHeight }}
              resizeMode="contain"
            />
          ) : (
            <View
              className="bg-muted"
              style={{ width: cardWidth, height: cardHeight }}
            />
          )}
          {isSelected && (
            <View className="absolute top-2 right-2 bg-primary rounded-full p-1">
              <Icon as={Check} className="size-4 text-primary-foreground" />
            </View>
          )}
        </View>
        <View className="mt-2">
          <Text className="text-xs text-center font-semibold" numberOfLines={2}>
            {item.name}
          </Text>
          {item.item_data?.condition && (
            <Text className="text-xs text-center text-muted-foreground mt-1" numberOfLines={1}>
              {item.item_data.condition}
            </Text>
          )}
          <Text className="text-xs text-center font-bold mt-1">
            {marketPrice}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 bg-background">
        {/* Top bar with X and Continue */}
        <View className="absolute top-0 left-0 right-0 p-6 pt-16 flex-row justify-between items-center z-50 bg-background"
          style={{
            elevation: 10,
          }}>
          <Button
            variant="ghost"
            size="icon"
            onPress={handleCancel}
            className="rounded-full">
            <Icon as={X} className="size-5" />
          </Button>
          <Button
            variant="default"
            onPress={handleContinue}
            disabled={selectedCardIds.size === 0}>
            <Text>Continue</Text>
          </Button>
        </View>

        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{
            paddingTop: 140,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}>
          
          {/* Search Bar */}
          <View className="mb-6">
            <View className="relative flex-row items-center">
              <View className="absolute left-3 z-10">
                <Icon as={Search} className="size-5 text-muted-foreground" />
              </View>
              <Input
                placeholder="Search cards..."
                className="pl-10 flex-1"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Selected Cards Section */}
          <View className="mb-6">
            <Text className="text-lg font-bold mb-4">Selected Cards ({selectedCards.length})</Text>
            {selectedCards.length > 0 ? (
              <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
                {selectedCards.map((card) => (
                  <View key={card.id} style={{ width: cardWidth, marginHorizontal: 4, marginBottom: 16 }}>
                    {renderCard({ item: card })}
                  </View>
                ))}
              </View>
            ) : (
              <View className="py-8 items-center">
                <Text className="text-muted-foreground">No cards selected</Text>
              </View>
            )}
          </View>

          {/* All Cards Section */}
          <View>
            <Text className="text-lg font-bold mb-4">
              {selectedCards.length > 0 ? 'All Cards' : 'Your Inventory'}
            </Text>
            {isLoading ? (
              <View className="py-8 items-center">
                <Text className="text-muted-foreground">Loading cards...</Text>
              </View>
            ) : unselectedCards.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-muted-foreground">
                  {searchQuery ? 'No cards found' : 'No cards available'}
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
                {unselectedCards.map((card) => (
                  <View key={card.id} style={{ width: cardWidth, marginHorizontal: 4, marginBottom: 16 }}>
                    {renderCard({ item: card })}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
