import { View, Keyboard, TouchableWithoutFeedback, InteractionManager } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { UserMenu } from '@/components/user-menu';
import { BalanceDisplay } from '@/components/balance-display';
import { CardsOfWeekMarquee } from '@/components/cards-of-week-marquee';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { useCardSearch } from '@/hooks/use-card-search';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, ChartLine } from 'lucide-react-native';
import { FloatingTradeButton } from '@/components/floating-trade-button';
import { useTrade } from '@/providers/trade-provider';
import type { PokemonCard } from '@/types/card';
import type { CardConditionPayload } from '@/components/card-trade-dialog';

export default function DiscoverScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  // Fetch cards once and share with CardsOfWeekMarquee and loading check
  const { cards } = useCardSearch({ pageSize: 60 });
  const { addCard } = useTrade();

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    Keyboard.dismiss();
    router.push({ pathname: '/search', params: { q } });
  };

  // When returning to discover (e.g. from search), clear input and close keyboard
  useFocusEffect(
    useCallback(() => {
      setSearchQuery('');
      // Run after transition so the keyboard is dismissed once the screen is visible
      const task = InteractionManager.runAfterInteractions(() => {
        Keyboard.dismiss();
      });
      return () => task.cancel();
    }, [])
  );

  const handleAddToTrade = ({ card, condition }: { card: PokemonCard; condition: CardConditionPayload }) => {
    addCard(card, condition);
  };

  return (
    <ScreenWrapper waitForCards={true}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View className="flex-1 bg-background">
      {/* Header with User Menu and Balance */}
      <View className="absolute top-0 left-0 right-0 p-6 pt-16 flex-row justify-between items-center z-50 bg-background"
        style={{
          elevation: 10,
        }}>
        <UserMenu />
        <BalanceDisplay />
      </View>

      {/* Main Content */}
      <View 
        className="flex-1 px-6"
        style={{ 
          paddingTop: 160,
        }}>
        <Text className="text-6xl font-PlayfairDisplayItalic text-foreground text-center">
          Find Your Next Grail
        </Text>
        
        <View className="mt-6 flex-row items-center gap-2">
          <View className="flex-1 relative">
            <View className="absolute left-3 top-0 bottom-0 justify-center z-10 pointer-events-none">
              <Icon 
                as={Search} 
                className="size-5 text-muted-foreground" 
              />
            </View>
            <Input 
              placeholder="Search for your next card..."
              className="flex-1 pl-10"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Button
            variant="ghost"
            size="icon"
            disabled={!searchQuery.trim()}
            className="rounded-full bg-black"
            onPress={handleSearch}>
            <Icon 
              as={ArrowRight} 
              className={searchQuery.trim() ? "size-5 text-white" : "size-5 text-white opacity-50"} 
            />
          </Button>
        </View>
        
        <View className="flex-row items-center justify-center gap-2 mt-8">
          <Text className="text-xl font-semibold text-foreground font-PlayfairDisplay">
            Cards of the Week
          </Text>
          <Icon 
            as={ChartLine} 
            className="size-5 text-foreground" 
          />
        </View>

        <CardsOfWeekMarquee count={10} cards={cards} onAddToTrade={handleAddToTrade} />
      </View>
      <FloatingTradeButton returnTab="discover" />
    </View>
    </TouchableWithoutFeedback>
    </ScreenWrapper>
  );
}

