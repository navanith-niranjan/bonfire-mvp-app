import { View, Image, useWindowDimensions, FlatList, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Plus, ArrowUpDown, Edit2 } from 'lucide-react-native';
import { useWallet } from '@/hooks/use-wallet';
import { BalanceDisplay } from '@/components/balance-display';
import { useInventory } from '@/hooks/use-inventory';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useTransactions } from '@/hooks/use-transactions';
import { useTrade } from '@/providers/trade-provider';
import type { UserCard } from '@/types/inventory';
import { ActivityIndicator } from 'react-native';

const SCREEN_OPTIONS = {
  title: 'Trade Deck',
  headerShown: false,
};

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function TradeDeckScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const { balance, refreshBalance } = useWallet();
  const { refreshInventory } = useInventory();
  const { session } = useAuthContext();
  const { refreshTransactions } = useTransactions();
  const { giveCards, setGiveCards, getReceiveCardsPayload, setReceiveCardsFromDeck, clearCards } = useTrade();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [giveMoneyAmount, setGiveMoneyAmount] = useState('');
  const [moneyError, setMoneyError] = useState('');
  const [giveCardIndex, setGiveCardIndex] = useState(0);
  const [receiveCardIndex, setReceiveCardIndex] = useState(0);
  const [isProcessingTrade, setIsProcessingTrade] = useState(false);
  
  const giveFlatListRef = useRef<FlatList>(null);
  const receiveFlatListRef = useRef<FlatList>(null);

  // Global You Give list from provider
  const selectedCards = giveCards;

  // Convert receive payload to UserCard[] for display (global You Receive from provider)
  const receiveCards = useMemo(() => {
    const cards = getReceiveCardsPayload();
    return cards.map((card: any, index: number) => {
      let conditionString: string | null = null;
      if (card.condition) {
        if (typeof card.condition === 'object' && card.condition.type) {
          if (card.condition.type === 'Raw' && card.condition.rawCondition) {
            const rawConditionMap: Record<string, string> = {
              'NM': 'Near Mint',
              'LP': 'Lightly Played',
              'MP': 'Moderately Played',
              'HP': 'Heavily Played',
              'D': 'Damaged',
            };
            const rawConditionName = rawConditionMap[card.condition.rawCondition] || card.condition.rawCondition;
            conditionString = `Raw - ${rawConditionName}`;
          } else if (card.condition.grade) {
            conditionString = `${card.condition.type} ${card.condition.grade}`;
          } else {
            conditionString = card.condition.type;
          }
        } else if (typeof card.condition === 'string') {
          conditionString = card.condition;
        }
      }
      let uniqueId: number;
      if (card.instanceId) {
        const parts = String(card.instanceId).split('-');
        const parsed = parts.length > 0 ? parseInt(parts[0], 10) : NaN;
        uniqueId = isNaN(parsed) ? index + 1000000 : parsed;
      } else if (card.id !== undefined) {
        const parsed = typeof card.id === 'string' ? parseInt(card.id, 10) : (typeof card.id === 'number' ? card.id : NaN);
        uniqueId = isNaN(parsed) ? index + 2000000 : parsed + index;
      } else {
        uniqueId = index + 3000000;
      }
      const itemData: Record<string, any> = {
        condition: conditionString,
        set: card.set?.name || null,
        grade: card.condition?.grade || null,
      };
      if (card.market_price !== null && card.market_price !== undefined && typeof card.market_price === 'number') {
        itemData.market_price = card.market_price;
      }
      const imageUrl = card.images?.large || card.images?.small || card.image_large || card.image_small || null;
      const imageUrlNormalized = typeof imageUrl === 'string' && imageUrl.trim() !== '' ? imageUrl : null;
      return {
        id: uniqueId,
        user_id: '',
        name: card.name || 'Unknown Card',
        image_url: imageUrlNormalized,
        status: 'trading' as const,
        collectible_type: 'pokemon',
        external_id: card.id ?? null,
        external_api: 'pokemon-tcg',
        item_data: itemData,
        submitted_at: null,
        vaulted_at: null,
        created_at: null,
      };
    }) as UserCard[];
  }, [getReceiveCardsPayload]);

  // Sync navigation params into provider when deck is opened with params (e.g. from vault or returning from partA)
  useEffect(() => {
    if (params.cards && typeof params.cards === 'string') {
      try {
        setGiveCards(JSON.parse(params.cards) as UserCard[]);
      } catch {
        setGiveCards([]);
      }
    }
    if (params.receiveCards !== undefined) {
      const raw = typeof params.receiveCards === 'string' ? params.receiveCards : '[]';
      setReceiveCardsFromDeck(raw);
    }
  }, [params.cards, params.receiveCards, setGiveCards, setReceiveCardsFromDeck]);

  // Get card price from item_data
  // TODO: In future, fetch condition/grade-specific prices from pricing API
  // Different conditions (NM, LP, MP, HP, D) and grades (PSA 10, 9, etc.) have different market values
  const getCardPrice = (card: UserCard): number => {
    // Check if market_price exists in item_data (stored when card was submitted)
    if (card.item_data?.market_price && typeof card.item_data.market_price === 'number') {
      return card.item_data.market_price;
    }
    // Fallback: check legacy 'price' field
    if (card.item_data?.price && typeof card.item_data.price === 'number') {
      return card.item_data.price;
    }
    // No price available
    return NaN;
  };

  // Calculate card totals (without money)
  const cardsTotal = useMemo(() => {
    return selectedCards.reduce((sum, card) => {
      const price = getCardPrice(card);
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  }, [selectedCards]);

  const receiveTotal = useMemo(() => {
    return receiveCards.reduce((sum, card) => {
      const price = getCardPrice(card);
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  }, [receiveCards]);

  // Calculate total including money
  const giveTotal = useMemo(() => {
    const moneyTotal = parseFloat(giveMoneyAmount) || 0;
    return cardsTotal + moneyTotal;
  }, [cardsTotal, giveMoneyAmount]);

  // Calculate spread
  const spread = useMemo(() => {
    if (giveTotal === 0 || receiveTotal === 0) return 0;
    const difference = receiveTotal - giveTotal;
    const percentage = (difference / giveTotal) * 100;
    return percentage;
  }, [giveTotal, receiveTotal]);

  // Check if spread is within acceptable range (0% to -10%)
  const isSpreadValid = useMemo(() => {
    return spread <= 0 && spread >= -10;
  }, [spread]);

  // Calculate cash to receive (when giveTotal > receiveTotal)
  const cashToReceive = useMemo(() => {
    if (giveTotal > receiveTotal) {
      return giveTotal - receiveTotal;
    }
    return 0;
  }, [giveTotal, receiveTotal]);

  // Calculate required money based on card values only (not including entered money)
  // This ensures the requirement stays constant as user types
  const requiredMoney = useMemo(() => {
    if (cardsTotal < receiveTotal) {
      return receiveTotal - cardsTotal;
    }
    return 0;
  }, [cardsTotal, receiveTotal]);

  // Check if money is required and provided
  const isMoneyRequirementMet = useMemo(() => {
    if (requiredMoney === 0) return true; // No money required
    const providedMoney = parseFloat(giveMoneyAmount) || 0;
    return providedMoney >= requiredMoney;
  }, [requiredMoney, giveMoneyAmount]);

  // Tab to return to when closing trade (discover, activity, or vault)
  const returnTab = (params.returnTab as string) || 'discover';

  const handleCancel = () => {
    router.replace(`/(tabs)/${returnTab}` as any);
  };

  const handleMoneyChange = (text: string) => {
    setGiveMoneyAmount(text);
    const amount = parseFloat(text) || 0;
    
    // Check if money is required
    if (requiredMoney > 0) {
      if (amount < requiredMoney) {
        setMoneyError(`At least $${requiredMoney.toFixed(2)} required to complete this trade`);
      } else if (amount > balance) {
        setMoneyError(`Amount exceeds your balance of $${balance.toFixed(2)}`);
      } else {
        setMoneyError('');
      }
    } else if (text && !isNaN(amount)) {
      if (amount > balance) {
        setMoneyError(`Amount exceeds your balance of $${balance.toFixed(2)}`);
      } else {
        setMoneyError('');
      }
    } else {
      setMoneyError('');
    }
  };

  const handleTrade = async () => {
    if (!isConfirmed || receiveCards.length === 0 || !isSpreadValid || !isMoneyRequirementMet) return;
    if (!session?.access_token) {
      console.error('Not authenticated');
      return;
    }
    if (!API_URL) {
      console.error('API URL not configured');
      return;
    }
    
    // Additional validation: ensure money requirement is met
    if (requiredMoney > 0) {
      const providedMoney = parseFloat(giveMoneyAmount) || 0;
      if (providedMoney < requiredMoney) {
        alert(`You must provide at least $${requiredMoney.toFixed(2)} to complete this trade.`);
        return;
      }
    }

    setIsProcessingTrade(true);
    try {
      // Prepare trade data
      const tradeData = {
        give_items: selectedCards.map(card => card.id),
        receive_items: receiveCards.map(card => ({
          external_id: card.external_id ? String(card.external_id) : null,
          name: card.name,
          image_url: card.image_url,
          item_data: card.item_data,
        })),
        give_money: parseFloat(giveMoneyAmount) || 0,
        receive_money: cashToReceive,
      };

      console.log('[Trade] Sending trade request:', JSON.stringify(tradeData, null, 2));

      // Make API request
      const response = await fetch(`${API_URL}/trade/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(tradeData),
      });

      if (!response.ok) {
        console.log(`[Trade] Error response status: ${response.status}`);
        let errorDetail = `HTTP ${response.status}`;
        try {
          const errorJson = await response.json();
          console.log('[Trade] Error response JSON:', errorJson);
          // Handle FastAPI error format
          if (errorJson.detail) {
            // Check if detail is an array (validation errors)
            if (Array.isArray(errorJson.detail)) {
              errorDetail = errorJson.detail.map((err: any) => 
                `${err.loc?.join('.')}: ${err.msg}`
              ).join(', ');
            } else {
              errorDetail = String(errorJson.detail);
            }
          } else if (errorJson.message) {
            errorDetail = String(errorJson.message);
          } else {
            errorDetail = JSON.stringify(errorJson, null, 2);
          }
        } catch (parseError) {
          console.log('[Trade] Failed to parse error JSON:', parseError);
          try {
            const text = await response.text();
            errorDetail = text || `HTTP ${response.status}`;
          } catch {
            errorDetail = `HTTP ${response.status}: Request failed`;
          }
        }
        console.log('[Trade] Final error detail:', errorDetail);
        throw new Error(errorDetail);
      }

      const result = await response.json();
      console.log('Trade successful:', result);

      // Refresh inventory, wallet, and transactions to get updated data
      await Promise.all([
        refreshInventory(),
        refreshBalance(),
        refreshTransactions(),
      ]);

      // Reset trade state so deck is empty when user returns
      setGiveCards([]);
      clearCards();

      // Navigate to success screen
      router.push('/trade/success');
    } catch (error) {
      console.error('Trade error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : 'Unknown error occurred';
      alert(`Trade failed: ${errorMessage}`);
    } finally {
      setIsProcessingTrade(false);
    }
  };

  // Card dimensions for left side - ensure full card is visible
  const cardWidth = Math.min(width * 0.35, 180);
  const cardHeight = cardWidth * 1.4; // Standard card aspect ratio

  // Swipeable card container width - account for padding inside the card container
  const containerWidth = width - 48 - 32; // Full width minus outer padding minus inner padding (p-4 = 16px each side)

  const handleGiveScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / containerWidth);
    if (newIndex >= 0 && newIndex < selectedCards.length) {
      setGiveCardIndex(newIndex);
    }
  };

  const handleGiveScrollUpdate = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / containerWidth);
    if (newIndex >= 0 && newIndex < selectedCards.length && newIndex !== giveCardIndex) {
      setGiveCardIndex(newIndex);
    }
  };

  const handleReceiveScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / containerWidth);
    if (newIndex >= 0 && newIndex < receiveCards.length) {
      setReceiveCardIndex(newIndex);
    }
  };

  const handleReceiveScrollUpdate = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / containerWidth);
    if (newIndex >= 0 && newIndex < receiveCards.length && newIndex !== receiveCardIndex) {
      setReceiveCardIndex(newIndex);
    }
  };

  const scrollToGiveCard = (index: number) => {
    if (giveFlatListRef.current && index >= 0 && index < selectedCards.length) {
      giveFlatListRef.current.scrollToIndex({ index, animated: true });
      setGiveCardIndex(index);
    }
  };

  const scrollToReceiveCard = (index: number) => {
    if (receiveFlatListRef.current && index >= 0 && index < receiveCards.length) {
      receiveFlatListRef.current.scrollToIndex({ index, animated: true });
      setReceiveCardIndex(index);
    }
  };

  const renderGiveCard = ({ item, index }: { item: UserCard; index: number }) => {
    const cardPrice = getCardPrice(item);
    const displayPrice = isNaN(cardPrice) ? 'N/A' : `$${cardPrice.toFixed(2)}`;
    
    return (
      <View style={{ width: containerWidth }} className="flex-row gap-4">
        {/* Card Image on Left */}
        <View className="flex-shrink-0">
          <View
            style={{
              width: cardWidth,
              height: cardHeight,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}>
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
          </View>
        </View>

        {/* Card Info on Right */}
        <View className="flex-1 justify-center gap-2" style={{ paddingRight: 8 }}>
          <View>
            <Text className="text-sm font-bold text-foreground mb-1" numberOfLines={1}>
              {item.name}
            </Text>
            {item.item_data?.set && (
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {item.item_data.set}
              </Text>
            )}
          </View>

          <View className="gap-1.5">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-muted-foreground">Market Price:</Text>
              <Text className="text-base font-bold text-foreground">
                {displayPrice}
              </Text>
            </View>
            
            {item.item_data?.condition && (
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-muted-foreground">Condition:</Text>
                <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
                  {item.item_data.condition}
                </Text>
              </View>
            )}
          </View>

        </View>
      </View>
    );
  };

  const renderReceiveCard = ({ item, index }: { item: UserCard; index: number }) => {
    const cardPrice = getCardPrice(item);
    const displayPrice = isNaN(cardPrice) ? 'N/A' : `$${cardPrice.toFixed(2)}`;
    
    return (
      <View style={{ width: containerWidth }} className="flex-row gap-4">
        {/* Card Image on Left */}
        <View className="flex-shrink-0" style={{ height: cardHeight }}>
          <View
            style={{
              width: cardWidth,
              height: cardHeight,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}>
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
          </View>
        </View>

        {/* Card Info on Right */}
        <View className="flex-1 justify-center gap-2" style={{ paddingRight: 8 }}>
          <View>
            <Text className="text-sm font-bold text-foreground mb-1" numberOfLines={1}>
              {item.name}
            </Text>
            {item.item_data?.set && (
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {item.item_data.set}
              </Text>
            )}
          </View>

          <View className="gap-1.5">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-muted-foreground">Market Price:</Text>
              <Text className="text-base font-bold text-foreground">
                {displayPrice}
              </Text>
            </View>
            
            {item.item_data?.condition && (
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-muted-foreground">Condition:</Text>
                <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
                  {item.item_data.condition}
                </Text>
              </View>
            )}
          </View>

        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 bg-background">
        {/* Top bar with Cancel and Wallet Balance */}
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
          <BalanceDisplay />
        </View>

        {/* Main Content */}
        <ScrollView 
          className="flex-1 px-6"
          contentContainerStyle={{ 
            paddingTop: 140,
            paddingBottom: (!isSpreadValid && giveTotal > 0 && receiveTotal > 0) ? 400 : 300,
          }}
          showsVerticalScrollIndicator={false}>
          
          {/* You Give Section */}
          <View className="mb-0">
            <Text className="text-lg font-bold mb-4 text-center">What You Give</Text>
            
            {/* Container with background for card and indicator */}
            <View className="bg-black rounded-lg p-4">
              {/* Edit Button - Top Right (when has cards) */}
              {selectedCards.length > 0 && (
                <View className="absolute top-4 right-4 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    style={{ width: 24, height: 24 }}
                    onPress={() => {
                      const receivePayload = getReceiveCardsPayload();
                      router.push({
                        pathname: '/trade/select-inventory',
                        params: {
                          returnTab,
                          cards: selectedCards.length > 0 ? JSON.stringify(selectedCards) : undefined,
                          receiveCards: receivePayload.length > 0 ? JSON.stringify(receivePayload) : undefined,
                        },
                      });
                    }}>
                    <Icon as={Edit2} className="size-3 text-foreground" />
                  </Button>
                </View>
              )}
              {/* Swipeable Card Container or centered Plus */}
              {selectedCards.length > 0 ? (
                <View className="relative">
                  <FlatList
                    ref={giveFlatListRef}
                    data={selectedCards}
                    renderItem={renderGiveCard}
                    keyExtractor={(item, index) => `give-${item.id}-${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleGiveScrollUpdate}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={handleGiveScroll}
                    onScrollToIndexFailed={(info) => {
                      const wait = new Promise(resolve => setTimeout(resolve, 500));
                      wait.then(() => {
                        giveFlatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                      });
                    }}
                    getItemLayout={(data, index) => ({
                      length: containerWidth,
                      offset: containerWidth * index,
                      index,
                    })}
                    snapToInterval={containerWidth}
                    decelerationRate="fast"
                    scrollEnabled={selectedCards.length > 1}
                    contentContainerStyle={{ alignItems: 'flex-start' }}
                  />
                </View>
              ) : (
                <View style={{ minHeight: cardHeight }} className="items-center justify-center py-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-12 h-12"
                    onPress={() => {
                      const receivePayload = getReceiveCardsPayload();
                      router.push({
                        pathname: '/trade/select-inventory',
                        params: {
                          returnTab,
                          receiveCards: receivePayload.length > 0 ? JSON.stringify(receivePayload) : undefined,
                        },
                      });
                    }}>
                    <Icon as={Plus} className="size-6" />
                  </Button>
                </View>
              )}
              
              {/* Card Indicator - Underneath container */}
              {selectedCards.length > 1 && (
                <View className="flex-row justify-center gap-2 mt-2">
                  {selectedCards.map((_, idx) => (
                    <View
                      key={idx}
                      className={`h-2 rounded-full ${
                        idx === giveCardIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30 w-2'
                      }`}
                    />
                  ))}
                </View>
              )}

              {/* Money Input for You Give - Below indicator */}
              <View className="mt-4">
                <Text className="text-xs text-muted-foreground mb-1">Add Money</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm">$</Text>
                  <Input
                    placeholder="0.00"
                    value={giveMoneyAmount}
                    onChangeText={handleMoneyChange}
                    keyboardType="decimal-pad"
                    className="flex-1 h-9"
                  />
                </View>
                {requiredMoney > 0 && !isMoneyRequirementMet && (
                  <Text className="text-xs text-red-500 mt-1">
                    Required: ${requiredMoney.toFixed(2)} to complete this trade
                  </Text>
                )}
                {moneyError && requiredMoney === 0 && (
                  <Text className="text-xs text-red-500 mt-1">{moneyError}</Text>
                )}
                {moneyError && requiredMoney > 0 && isMoneyRequirementMet && (
                  <Text className="text-xs text-red-500 mt-1">{moneyError}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Separator */}
          <View className="flex-row justify-center items-center py-4">
            <Icon as={ArrowUpDown} className="size-6 text-muted-foreground" />
          </View>

          {/* You Receive Section */}
          <View>
            {/* Swipeable Card Container */}
            {receiveCards.length > 0 ? (
              <View className="bg-black rounded-lg p-4">
                {/* Edit/Remove Button - Top Right */}
                <View className="absolute top-4 right-4 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    style={{ width: 24, height: 24 }}
                    onPress={() => {
                      const receivePayload = getReceiveCardsPayload();
                      router.push({
                        pathname: '/submit/partA',
                        params: {
                          returnTab,
                          returnPath: '/trade/deck',
                          source: 'trade',
                          originalCards: selectedCards.length > 0 ? JSON.stringify(selectedCards) : undefined,
                          existingReceiveCards: receivePayload.length > 0 ? JSON.stringify(receivePayload) : undefined,
                        },
                      });
                    }}>
                    <Icon as={Edit2} className="size-3 text-foreground" />
                  </Button>
                </View>
                <View className="relative">
                  <FlatList
                    ref={receiveFlatListRef}
                    data={receiveCards}
                    renderItem={renderReceiveCard}
                    keyExtractor={(item, index) => `receive-${item.id}-${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleReceiveScrollUpdate}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={handleReceiveScroll}
                    onScrollToIndexFailed={(info) => {
                      const wait = new Promise(resolve => setTimeout(resolve, 500));
                      wait.then(() => {
                        receiveFlatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                      });
                    }}
                    getItemLayout={(data, index) => ({
                      length: containerWidth,
                      offset: containerWidth * index,
                      index,
                    })}
                    snapToInterval={containerWidth}
                    decelerationRate="fast"
                    scrollEnabled={receiveCards.length > 1}
                    contentContainerStyle={{ alignItems: 'flex-start' }}
                  />
                </View>
              
              {/* Card Indicator - Underneath container */}
              {receiveCards.length > 1 && (
                <View className="flex-row justify-center gap-2 mt-2">
                    {receiveCards.map((_, idx) => (
                      <View
                        key={idx}
                        className={`h-2 rounded-full ${
                          idx === receiveCardIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30 w-2'
                        }`}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View className="bg-black rounded-lg p-4" style={{ minHeight: cardHeight + 60 }}>
                <View className="flex-1 items-center justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-12 h-12"
                    onPress={() => {
                      router.push({
                        pathname: '/submit/partA',
                        params: {
                          returnTab,
                          returnPath: '/trade/deck',
                          source: 'trade',
                          originalCards: selectedCards.length > 0 ? JSON.stringify(selectedCards) : undefined,
                        },
                      });
                    }}>
                    <Icon as={Plus} className="size-6" />
                  </Button>
                </View>
              </View>
            )}
            
            <Text className="text-lg font-bold mt-4 text-center">What You Receive</Text>
          </View>
        </ScrollView>

        {/* Trade Summary at bottom */}
        <View className="absolute bottom-0 left-0 right-0 p-6 pt-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
            zIndex: 100,
          }}>
          <View className="gap-3 mb-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs font-semibold text-foreground">Your Trade Value:</Text>
              <Text className="text-base font-bold text-foreground">${giveTotal.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-xs font-semibold text-foreground">Recipient's Trade Value:</Text>
              <Text className="text-base font-bold text-foreground">${receiveTotal.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-xs font-semibold text-foreground">Spread:</Text>
              <Text className={`text-base font-bold ${isSpreadValid ? 'text-green-500' : 'text-red-500'}`}>
                {spread >= 0 ? '+' : ''}{spread.toFixed(2)}%
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-xs font-semibold text-foreground">Money to Receive:</Text>
              <Text className="text-base font-bold text-green-500">
                ${cashToReceive.toFixed(2)}
              </Text>
            </View>
            {!isSpreadValid && giveTotal > 0 && receiveTotal > 0 && (
              <View className="mt-1">
                <Text className="text-xs text-red-500">
                  {spread > 0 
                    ? 'Spread cannot be positive' 
                    : 'Spread must be between 0% and -10%'}
                </Text>
              </View>
            )}
          </View>
          
          <View className="items-center gap-4">
            <View className="flex-row items-center gap-3">
              <Checkbox 
                checked={isConfirmed} 
                onCheckedChange={setIsConfirmed}
              />
              <Text className="text-sm text-muted-foreground">
                I confirm this trade and understand the terms
              </Text>
            </View>
            <Button
              className="w-full"
              variant="default"
              disabled={!isConfirmed || receiveCards.length === 0 || !isSpreadValid || !isMoneyRequirementMet || isProcessingTrade}
              onPress={handleTrade}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 8,
              }}>
              {isProcessingTrade ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="white" />
                  <Text>Processing...</Text>
                </View>
              ) : (
                <Text>Confirm Exchange</Text>
              )}
            </Button>
          </View>
        </View>

      </View>

      {/* Loading Overlay */}
      {isProcessingTrade && (
        <View 
          className="absolute inset-0 bg-black/70 items-center justify-center z-50"
          style={{ elevation: 20 }}>
          <View className="bg-background rounded-lg p-6 items-center gap-4 min-w-[200px]">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-lg font-semibold text-foreground">Processing Trade...</Text>
            <Text className="text-sm text-muted-foreground text-center">
              Please wait while we complete your exchange
            </Text>
          </View>
        </View>
      )}

    </>
  );
}
