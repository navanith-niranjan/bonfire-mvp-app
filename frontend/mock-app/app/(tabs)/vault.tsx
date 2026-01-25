import { View, FlatList } from 'react-native';
import { useRef, useState, useCallback } from 'react';
import { WalletCard } from '@/components/wallet-card';
import { InventoryCard } from '@/components/inventory-card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ActivityIndicator } from 'react-native';
import { ArrowDownUp, Gift, Send, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInventory } from '@/hooks/use-inventory';

const WALLET_CARD_HEIGHT = 260;

export default function VaultScreen() {
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<FlatList>(null);
  const [redeemMode, setRedeemMode] = useState(false);
  const [tradeMode, setTradeMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set());
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemingCardIds, setRedeemingCardIds] = useState<Set<number>>(new Set());
  const router = useRouter();
  const { removeCards, cards } = useInventory();
   
  // When inventory has scrolled over wallet, inventory blocks touches
  const isInventoryOverWallet = scrollY > 0;

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollY(offsetY);
  };

  const handleRedeemClick = () => {
    if (redeemMode) {
      setRedeemMode(false);
      setSelectedCardIds(new Set());
    } else {
      setRedeemMode(true);
    }
  };

  const handleConfirmRedeem = async () => {
    if (selectedCardIds.size === 0 || isRedeeming) return;

    setIsRedeeming(true);
    setRedeemingCardIds(new Set(selectedCardIds));

    try {
      await removeCards(Array.from(selectedCardIds));
      setSelectedCardIds(new Set());
      setRedeemMode(false);
    } catch (error) {
      console.error('Error redeeming cards:', error);
      setSelectedCardIds(new Set());
      setRedeemMode(false);
    } finally {
      setIsRedeeming(false);
      setRedeemingCardIds(new Set());
    }
  };

  const toggleCardSelection = useCallback((cardId: number) => {
    if ((!redeemMode && !tradeMode) || isRedeeming) return;
    
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, [redeemMode, tradeMode, isRedeeming]);

  const handleTradeClick = () => {
    if (tradeMode) {
      setTradeMode(false);
      setSelectedCardIds(new Set());
    } else {
      setTradeMode(true);
    }
  };

  const handleContinueTrade = () => {
    if (selectedCardIds.size === 0) return;
    
    // Get selected cards data
    const selectedCardsData = cards.filter(card => selectedCardIds.has(card.id));
    
    // Navigate to trade deck with selected cards
    router.push({
      pathname: '/trade/deck',
      params: { cards: JSON.stringify(selectedCardsData) },
    });
  };

  const handleSubmit = () => {
    router.push('/submit/partA');
  };

  const renderContent = () => (
    <View>
      {/* Spacer to push inventory below wallet initially */}
      <View style={{ height: WALLET_CARD_HEIGHT }} />
      {/* Inventory card that scrolls up */}
      <InventoryCard
        redeemMode={redeemMode}
        tradeMode={tradeMode}
        selectedCardIds={selectedCardIds}
        isRedeeming={isRedeeming}
        redeemingCardIds={redeemingCardIds}
        onCardSelect={toggleCardSelection}
      />
      {/* Spacer for fixed buttons */}
      <View style={{ height: 100 }} />
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      {/* Fixed Wallet Card at top */}
      <View
        className="absolute top-0 left-0 right-0"
        style={{ 
          zIndex: isInventoryOverWallet ? 1 : 10,
          elevation: isInventoryOverWallet ? 1 : 10,
        }}
        pointerEvents={isInventoryOverWallet ? 'none' : 'auto'}
        collapsable={false}
      >
        <WalletCard />
      </View>

      {/* Scrollable Inventory - scrolls over wallet */}
      <FlatList
        ref={scrollViewRef}
        data={[1]} // Single item to render
        renderItem={renderContent}
        keyExtractor={() => 'inventory'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 16,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ 
          flex: 1,
          zIndex: isInventoryOverWallet ? 10 : 2,
          elevation: isInventoryOverWallet ? 10 : 2,
        }}
        // Allow scrolling to start even when touching wallet area initially
        scrollEnabled={true}
        nestedScrollEnabled={true}
      />

      {/* Fixed Trade, Redeem, and Submit buttons at bottom of screen */}
      {redeemMode ? (
        <View className="absolute bottom-0 left-0 right-0 p-6 pt-4 bg-black"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
            zIndex: 100,
          }}>
          <View className="flex-row gap-3">
            <Button
              className="flex-1"
              variant="outline"
              onPress={handleRedeemClick}
              disabled={isRedeeming}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}>
              <X size={18} color="white" />
              <Text>Cancel</Text>
            </Button>
            <Button
              className="flex-1"
              variant="default"
              onPress={handleConfirmRedeem}
              disabled={selectedCardIds.size === 0 || isRedeeming}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}>
              {isRedeeming ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Gift size={18} color="white" />
                  <Text>Confirm</Text>
                </>
              )}
            </Button>
          </View>
        </View>
      ) : tradeMode ? (
        <View className="absolute bottom-0 left-0 right-0 p-6 pt-4 bg-black"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
            zIndex: 100,
          }}>
          <View className="flex-row gap-3">
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Button
                variant="outline"
                onPress={handleTradeClick}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                  width: '100%',
                }}>
                <X size={18} color="white" />
                <Text>Cancel</Text>
              </Button>
            </View>
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Button
                variant="default"
                onPress={handleContinueTrade}
                disabled={selectedCardIds.size === 0}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                  width: '100%',
                }}>
                <Text>Continue</Text>
              </Button>
            </View>
          </View>
        </View>
      ) : (
        <View className="absolute bottom-0 left-0 right-0 p-6 pt-4 bg-black"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
            zIndex: 100,
          }}>
          <View className="flex-row gap-3">
            <Button
              className=""
              variant="default"
              onPress={handleTradeClick}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}>
              <ArrowDownUp size={18} color="white" />
              <Text>Trade</Text>
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onPress={handleRedeemClick}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}>
              <Gift size={18} color="white" />
              <Text>Redeem</Text>
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onPress={handleSubmit}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}>
              <Send size={18} color="white" />
              <Text>Submit</Text>
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
