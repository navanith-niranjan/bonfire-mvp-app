import { View, FlatList, Image, useWindowDimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Check } from 'lucide-react-native';
import { useInventory } from '@/hooks/use-inventory';
import type { UserCard } from '@/types/inventory';

type InventoryCardProps = {
  redeemMode?: boolean;
  tradeMode?: boolean;
  selectedCardIds?: Set<number>;
  isRedeeming?: boolean;
  redeemingCardIds?: Set<number>;
  onCardSelect?: (cardId: number) => void;
};

export function InventoryCard({
  redeemMode = false,
  tradeMode = false,
  selectedCardIds: externalSelectedCardIds,
  isRedeeming = false,
  redeemingCardIds: externalRedeemingCardIds,
  onCardSelect,
}: InventoryCardProps = {}) {
  const { cards, isLoading } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const { width } = useWindowDimensions();

  // Use external props if provided
  const selectedCardIds = externalSelectedCardIds || new Set<number>();
  const redeemingCardIds = externalRedeemingCardIds || new Set<number>();

  // Filter cards based on search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) {
      return cards;
    }
    const query = searchQuery.toLowerCase().trim();
    return cards.filter(card => {
      const nameMatch = card.name.toLowerCase().includes(query);
      const conditionMatch = card.item_data?.condition?.toLowerCase().includes(query);
      const statusMatch = card.status.toLowerCase().includes(query);
      return nameMatch || conditionMatch || statusMatch;
    });
  }, [cards, searchQuery]);

  const cardWidth = (width - 48 - 16) / 3; // 48px padding, 16px gap

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vaulted':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'authenticating':
        return 'bg-blue-500';
      case 'authenticated':
        return 'bg-purple-500';
      case 'rejected':
        return 'bg-red-500';
      case 'trading':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Format status text
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Get market price from item_data
  // TODO: In future, fetch condition/grade-specific prices from pricing API
  // Different conditions (NM, LP, MP, HP, D) and grades (PSA 10, 9, etc.) have different market values
  const getMarketPrice = useCallback((card: UserCard): string => {
    const price = card.item_data?.market_price;
    if (price === null || price === undefined || typeof price !== 'number') {
      return 'N/A';
    }
    return `$${price.toFixed(2)}`;
  }, []);

  const toggleCardSelection = useCallback((cardId: number) => {
    if ((!redeemMode && !tradeMode) || isRedeeming) return;
    onCardSelect?.(cardId);
  }, [redeemMode, tradeMode, isRedeeming, onCardSelect]);

  const renderCard = useCallback(({ item }: { item: UserCard }) => {
    const isSelected = selectedCardIds.has(item.id);
    const isRedeemingCard = redeemingCardIds.has(item.id);
    const isDisabled = isRedeemingCard;
    const condition = item.item_data?.condition || 'Unknown';
    const marketPrice = getMarketPrice(item);
    
    return (
      <View style={{ width: cardWidth }} className="mb-4">
        <TouchableOpacity
          onPress={() => toggleCardSelection(item.id)}
          disabled={isDisabled || (!redeemMode && !tradeMode)}>
          <View
            className={`overflow-hidden relative ${
              isSelected && (redeemMode || tradeMode) ? 'border-2 border-white' : ''
            } ${isDisabled ? 'opacity-50' : ''}`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 8,
            }}>
            {typeof item.image_url === 'string' && item.image_url.trim() !== '' ? (
              <Image
                source={{ uri: item.image_url }}
                style={{ width: cardWidth, height: cardWidth * 1.4 }}
                resizeMode="cover"
              />
            ) : (
              <View 
                className="bg-muted"
                style={{ width: cardWidth, height: cardWidth * 1.4 }}
              />
            )}
            
            {/* Loading overlay */}
            {isRedeemingCard && (
              <View className="absolute inset-0 bg-black/50 items-center justify-center">
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            
            {/* Selection indicator */}
            {isSelected && (redeemMode || tradeMode) && !isRedeemingCard && (
              <View className="absolute top-1 left-1">
                <View className="bg-primary rounded-full p-1">
                  <Check size={16} color="white" />
                </View>
              </View>
            )}
            
            {/* Status badge */}
            <View className="absolute top-1 right-1">
              <Badge className={`${getStatusColor(item.status)} text-white min-w-[60px] h-5 items-center justify-center`}>
                <Text className="text-xs font-bold">{formatStatus(item.status)}</Text>
              </Badge>
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Card Info - Minimal */}
        <View className="mt-2 gap-1">
          <Text className="text-xs font-medium text-foreground" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {condition}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {marketPrice}
          </Text>
        </View>
      </View>
    );
  }, [cardWidth, selectedCardIds, redeemMode, tradeMode, redeemingCardIds, toggleCardSelection, getMarketPrice]);

  const getItemLayout = useCallback(
    (data: ArrayLike<UserCard> | null | undefined, index: number) => {
      // Card height: image (cardWidth * 1.4) + info section (~50px) + margins
      const itemHeight = cardWidth * 1.4 + 50 + 16; // Image + info + margin
      return {
        length: itemHeight,
        offset: itemHeight * Math.floor(index / 3), // Account for 3 columns
        index,
      };
    },
    [cardWidth]
  );

  return (
    <Card className="border-0 shadow-lg bg-black min-h-full" style={{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 20,
    }} pointerEvents="auto">
      <CardContent className="p-6 gap-6">
        {/* Search input in center */}
        <View className="items-center pb-4">
          <View className="relative w-full flex-row items-center">
            <View className="absolute left-3 z-10">
              <Search size={18} color="#999" />
            </View>
            <Input
              placeholder="Search Vault"
              className="pl-10 flex-1 rounded-sm"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* My Collectibles label */}
        <View className="pb-4">
          <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            My Collectibles
          </Text>
        </View>

        {/* Redeem mode instructions */}
        {redeemMode && (
          <View className="pb-4">
            <Text className="text-sm text-muted-foreground text-center">
              Select cards to redeem. {selectedCardIds.size > 0 && `${selectedCardIds.size} selected`}
            </Text>
          </View>
        )}

        {/* Trade mode instructions */}
        {tradeMode && (
          <View className="pb-4">
            <Text className="text-sm text-muted-foreground text-center">
              Select cards to trade. {selectedCardIds.size > 0 && `${selectedCardIds.size} selected`}
            </Text>
          </View>
        )}

        {/* Search results message */}
        {searchQuery.trim() && filteredCards.length === 0 && (
          <View className="pb-4">
            <Text className="text-muted-foreground text-sm text-center">
              No results found.
            </Text>
          </View>
        )}

        {/* Empty state message (only show when no search query) */}
        {!searchQuery.trim() && cards.length === 0 && !isLoading && (
          <View className="pb-4">
            <Text className="text-muted-foreground text-sm text-center">
              You have no cards in your inventory. Click submit to send in your cards or click trade to purchase a card with your balance.
            </Text>
          </View>
        )}

        {/* Cards Grid */}
        {filteredCards.length > 0 && (
          <View className="pb-4">
            <FlatList
              data={filteredCards}
              renderItem={renderCard}
              keyExtractor={(item) => item.id.toString()}
              numColumns={3}
              columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
              scrollEnabled={false}
              getItemLayout={getItemLayout}
              initialNumToRender={12}
              maxToRenderPerBatch={6}
            />
          </View>
        )}
      </CardContent>
    </Card>
  );
}
