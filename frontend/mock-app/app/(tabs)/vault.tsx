import { View, FlatList } from 'react-native';
import { useRef, useState } from 'react';
import { WalletCard } from '@/components/wallet-card';
import { InventoryCard } from '@/components/inventory-card';

const WALLET_CARD_HEIGHT = 260;

export default function VaultScreen() {
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<FlatList>(null);
  
  // When inventory has scrolled over wallet, inventory blocks touches
  const isInventoryOverWallet = scrollY > 0;

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollY(offsetY);
  };

  const renderContent = () => (
    <View>
      {/* Spacer to push inventory below wallet initially */}
      <View style={{ height: WALLET_CARD_HEIGHT }} />
      {/* Inventory card that scrolls up */}
      <InventoryCard />
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
    </View>
  );
}
