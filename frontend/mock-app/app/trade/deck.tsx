import { View, Image, useWindowDimensions, FlatList, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo, useRef } from 'react';
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
import type { UserCard } from '@/types/inventory';

const SCREEN_OPTIONS = {
  title: 'Trade Deck',
  headerShown: false,
};

export default function TradeDeckScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const { balance, deposit } = useWallet();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [giveMoneyAmount, setGiveMoneyAmount] = useState('');
  const [moneyError, setMoneyError] = useState('');
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);
  const [giveCardIndex, setGiveCardIndex] = useState(0);
  const [receiveCardIndex, setReceiveCardIndex] = useState(0);
  
  const giveFlatListRef = useRef<FlatList>(null);
  const receiveFlatListRef = useRef<FlatList>(null);

  // Parse selected cards from params
  const selectedCards = useMemo(() => {
    try {
      if (params.cards && typeof params.cards === 'string') {
        return JSON.parse(params.cards) as UserCard[];
      }
    } catch (error) {
      console.error('Error parsing cards:', error);
    }
    return [];
  }, [params.cards]);

  // Parse receive cards from params (returned from partB)
  const receiveCards = useMemo(() => {
    try {
      if (params.receiveCards && typeof params.receiveCards === 'string') {
        const cards = JSON.parse(params.receiveCards);
        // Convert PokemonCard format to UserCard format for display
        return cards.map((card: any, index: number) => {
          // Handle condition - it can be an object with type and grade, or a string
          let conditionString: string | null = null;
          if (card.condition) {
            if (typeof card.condition === 'object' && card.condition.type) {
              // Format: "PSA 10" or "Raw" or "Beckett 9.5"
              if (card.condition.type === 'Raw') {
                conditionString = 'Raw';
              } else if (card.condition.grade) {
                conditionString = `${card.condition.type} ${card.condition.grade}`;
              } else {
                conditionString = card.condition.type;
              }
            } else if (typeof card.condition === 'string') {
              conditionString = card.condition;
            }
          }
          
          // Generate a unique ID - use instanceId if available, otherwise create one from id and index
          let uniqueId: number;
          if (card.instanceId) {
            const parts = card.instanceId.split('-');
            const parsed = parts.length > 0 ? parseInt(parts[0]) : NaN;
            uniqueId = isNaN(parsed) ? index + 1000000 : parsed; // Use large offset to avoid conflicts
          } else if (card.id) {
            const parsed = typeof card.id === 'string' ? parseInt(card.id) : (typeof card.id === 'number' ? card.id : NaN);
            uniqueId = isNaN(parsed) ? index + 2000000 : parsed + index; // Add index to ensure uniqueness
          } else {
            uniqueId = index + 3000000; // Use large offset for fallback
          }
          
          return {
            id: uniqueId,
            user_id: '',
            name: card.name || 'Unknown Card',
            image_url: card.images?.large || card.images?.small || null,
            status: 'trading' as const,
            collectible_type: 'pokemon',
            external_id: card.id || null,
            external_api: 'pokemon-tcg',
            item_data: {
              condition: conditionString,
              set: card.set?.name || null,
              grade: card.condition?.grade || null,
            },
            submitted_at: null,
            vaulted_at: null,
            created_at: null,
          };
        }) as UserCard[];
      }
    } catch (error) {
      console.error('Error parsing receive cards:', error);
    }
    return [];
  }, [params.receiveCards]);

  // Get card price (placeholder - would fetch from API in production)
  const getCardPrice = (card: UserCard): number => {
    // Check if price exists in item_data
    if (card.item_data?.price && typeof card.item_data.price === 'number') {
      return card.item_data.price;
    }
    // Price API not yet provided - return NaN
    return NaN;
  };

  // Calculate totals
  const giveTotal = useMemo(() => {
    const cardsTotal = selectedCards.reduce((sum, card) => {
      const price = getCardPrice(card);
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
    const moneyTotal = parseFloat(giveMoneyAmount) || 0;
    return cardsTotal + moneyTotal;
  }, [selectedCards, giveMoneyAmount]);

  const receiveTotal = useMemo(() => {
    return receiveCards.reduce((sum, card) => {
      const price = getCardPrice(card);
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  }, [receiveCards]);

  // Calculate spread
  const spread = useMemo(() => {
    if (giveTotal === 0 || receiveTotal === 0) return 0;
    const difference = receiveTotal - giveTotal;
    const percentage = (difference / giveTotal) * 100;
    return percentage;
  }, [giveTotal, receiveTotal]);

  // Check if spread is within acceptable range (-20% to +20%)
  const isSpreadValid = useMemo(() => {
    return spread >= -20 && spread <= 20;
  }, [spread]);

  // Calculate cash to receive (when giveTotal > receiveTotal)
  const cashToReceive = useMemo(() => {
    if (giveTotal > receiveTotal) {
      return giveTotal - receiveTotal;
    }
    return 0;
  }, [giveTotal, receiveTotal]);

  const handleCancel = () => {
    router.push('/(tabs)/vault');
  };

  const handleMoneyChange = (text: string) => {
    setGiveMoneyAmount(text);
    const amount = parseFloat(text);
    if (text && !isNaN(amount)) {
      if (amount > balance) {
        setMoneyError(`Amount exceeds your balance of $${balance.toFixed(2)}`);
      } else {
        setMoneyError('');
      }
    } else {
      setMoneyError('');
    }
  };

  const resetAndClose = (setter: (open: boolean) => void) => {
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

  const handleTrade = () => {
    if (!isConfirmed || selectedCards.length === 0) return;
    // TODO: Implement trade logic
    console.log('Trading cards:', selectedCards);
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
    const displayPrice = isNaN(cardPrice) ? 'NaN' : `$${cardPrice.toFixed(2)}`;
    
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
            {item.image_url ? (
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
    const displayPrice = isNaN(cardPrice) ? 'NaN' : `$${cardPrice.toFixed(2)}`;
    
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
            {item.image_url ? (
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
          <View className="items-end">
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
              {/* Edit Button - Top Right */}
              {selectedCards.length > 0 && (
                <View className="absolute top-4 right-4 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    style={{ width: 24, height: 24 }}
                    onPress={() => {
                      router.push({
                        pathname: '/trade/select-inventory',
                        params: {
                          cards: params.cards as string | undefined,
                          ...(params.receiveCards && { receiveCards: params.receiveCards as string }),
                        },
                      });
                    }}>
                    <Icon as={Edit2} className="size-3 text-foreground" />
                  </Button>
                </View>
              )}
              {/* Swipeable Card Container */}
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
                <View style={{ minHeight: 100 }} className="items-center justify-center">
                  <Text className="text-muted-foreground text-sm">No cards selected</Text>
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
                <Text className="text-xs text-muted-foreground mb-1">Add Money (Optional)</Text>
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
                {moneyError ? (
                  <Text className="text-xs text-red-500 mt-1">{moneyError}</Text>
                ) : null}
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
                      // Navigate to partA to add/remove cards
                      router.push({
                        pathname: '/submit/partA',
                        params: {
                          returnPath: '/trade/deck',
                          source: 'trade',
                          originalCards: params.cards as string | undefined,
                          existingReceiveCards: params.receiveCards as string | undefined,
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
                          returnPath: '/trade/deck',
                          source: 'trade',
                          originalCards: params.cards as string | undefined, // Preserve original cards
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
            {!isSpreadValid && giveTotal > 0 && receiveTotal > 0 && (
              <View className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <Text className="text-xs text-yellow-500 text-center">
                  Spread must be within ±20%. Current: {spread >= 0 ? '+' : ''}{spread.toFixed(2)}%
                </Text>
              </View>
            )}
            <Button
              className="w-full"
              variant="default"
              disabled={!isConfirmed || selectedCards.length === 0 || receiveCards.length === 0 || !isSpreadValid}
              onPress={handleTrade}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 8,
              }}>
              <Text>Confirm Exchange</Text>
            </Button>
          </View>
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
