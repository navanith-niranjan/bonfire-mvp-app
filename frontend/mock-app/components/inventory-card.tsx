import { View } from 'react-native';
import { useState, useMemo } from 'react';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ArrowLeftRight, Gift, Send } from 'lucide-react-native';
import { useInventory } from '@/hooks/use-inventory';

export function InventoryCard() {
  const { cards } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter cards based on search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) {
      return cards;
    }
    const query = searchQuery.toLowerCase().trim();
    return cards.filter(card => 
      card.name.toLowerCase().includes(query) ||
      card.condition.toLowerCase().includes(query)
    );
  }, [cards, searchQuery]);

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

        {/* Search results message */}
        {searchQuery.trim() && filteredCards.length === 0 && (
          <View className="pb-4">
            <Text className="text-muted-foreground text-sm text-center">
              No results found.
            </Text>
          </View>
        )}

        {/* Empty state message (only show when no search query) */}
        {!searchQuery.trim() && cards.length === 0 && (
          <View className="pb-4">
            <Text className="text-muted-foreground text-sm text-center">
              You have no cards in your inventory. Click submit to send in your cards or click trade to purchase a card with your balance.
            </Text>
          </View>
        )}

        {/* Trade, Redeem, and Submit buttons */}
        <View className="flex-row gap-3 pt-4">
          <Button
            className=""
            variant="default">
            <ArrowLeftRight size={18} color="white" />
            {/* <Text>Trade</Text> */}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            disabled={filteredCards.length === 0}>
            <Gift size={18} color="white" />
            <Text>Redeem</Text>
          </Button>
          <Button
            className="flex-1"
            variant="outline">
            <Send size={18} color="white" />
            <Text>Submit</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

