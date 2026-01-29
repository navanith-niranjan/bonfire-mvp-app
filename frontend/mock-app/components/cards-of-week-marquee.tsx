import { useEffect, useMemo, useState } from 'react';
import { Image, View, TouchableOpacity } from 'react-native';
import { InfiniteMarquee } from '@/components/infinite-marquee';
import { CardTradeDialog } from '@/components/card-trade-dialog';
import { Text } from '@/components/ui/text';
import { useCardSearch } from '@/hooks/use-card-search';
import type { PokemonCard } from '@/types/card';
import type { CardConditionPayload } from '@/components/card-trade-dialog';

function pickRandomN<T>(items: T[], n: number): T[] {
  if (n <= 0) return [];
  if (items.length <= n) return [...items];

  // Fisher–Yates (partial) shuffle for unbiased selection
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

type CardsOfWeekMarqueeProps = {
  count?: number;
  /** Optional: pass cards directly to avoid duplicate fetching */
  cards?: PokemonCard[];
  /** Called when user adds a card to trade (card + condition). Use to e.g. navigate to trade deck. */
  onAddToTrade?: (payload: { card: PokemonCard; condition: CardConditionPayload }) => void;
};

export function CardsOfWeekMarquee({ count = 10, cards: providedCards, onAddToTrade }: CardsOfWeekMarqueeProps) {
  // Only fetch if cards aren't provided (conditional hook call is handled via pageSize)
  // When cards are provided, pass pageSize 0 to prevent fetching
  const cardSearchResult = useCardSearch({ 
    pageSize: providedCards && providedCards.length > 0 ? 0 : 60 
  });
  const cards = providedCards && providedCards.length > 0 ? providedCards : cardSearchResult.cards;
  
  const [selected, setSelected] = useState<PokemonCard[]>([]);
  const itemGap = 14;
  const cardRadius = 6;

  // Re-pick when we get new backend results.
  useEffect(() => {
    if (!cards || cards.length === 0) return;
    setSelected(pickRandomN(cards, count));
  }, [cards, count]);

  const items = useMemo(() => selected.filter((c) => !!c.image_small), [selected]);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Generate random market analytics for each card (stable per card ID)
  const marketAnalytics = useMemo(() => {
    const analytics: Record<number, { change: number; isPositive: boolean }> = {};
    items.forEach((card) => {
      // Generate random change between -5% and +5%
      const change = (Math.random() * 10 - 5).toFixed(1);
      analytics[card.id] = {
        change: parseFloat(change),
        isPositive: parseFloat(change) >= 0,
      };
    });
    return analytics;
  }, [items]);

  // Format market price
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  // Don't show loading message - ScreenWrapper handles loading screen
  // Just return null until cards are ready
  if (items.length === 0) {
    return null;
  }

  return (
    // Full-bleed: counter parent `px-6` so cards scroll past screen edges
    <View className="mt-2" style={{ marginHorizontal: -24 }}>
      <InfiniteMarquee
        speedPxPerSecond={25}
        gap={itemGap}
        containerStyle={{ width: '100%' }}
        viewportPaddingTop={12}
        viewportPaddingBottom={60}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {items.map((card, idx) => {
            const analytic = marketAnalytics[card.id];
            const changeText = analytic 
              ? `${analytic.isPositive ? '+' : ''}${analytic.change.toFixed(1)}%`
              : '+0.0%';
            const changeColor = analytic?.isPositive ? '#22c55e' : '#ef4444'; // green-500 : red-500

            return (
              <View key={card.id} style={{ marginRight: idx === items.length - 1 ? 0 : itemGap, width: 190 }}>
                {/* Card Image - Tappable */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCard(card);
                    setDialogOpen(true);
                  }}
                  activeOpacity={0.9}>
                  <View
                    style={{
                      width: 190,
                      height: 266,
                      borderRadius: cardRadius,
                      backgroundColor: '#0A0A0A',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 12 },
                      shadowOpacity: 0.55,
                      shadowRadius: 6,
                      elevation: 14,
                    }}>
                    {/* Inner clip for rounded corners (keeps outer shadow visible) */}
                    <View
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: cardRadius,
                        overflow: 'hidden',
                      }}>
                      {typeof card.image_small === 'string' && card.image_small.trim() !== '' ? (
                        <Image
                          source={{ uri: card.image_small }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="bg-muted" style={{ width: '100%', height: '100%' }} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Card Info Below */}
                <View className="mt-2 gap-0.5 px-2">
                  {/* Card Name */}
                  <Text 
                    className="text-sm font-semibold text-foreground" 
                    numberOfLines={1}
                    style={{ fontSize: 13 }}>
                    {card.name}
                  </Text>
                  
                  {/* Set Name */}
                  {card.set_name && (
                    <Text 
                      className="text-xs text-muted-foreground" 
                      numberOfLines={1}
                      style={{ fontSize: 11 }}>
                      {card.set_name}
                    </Text>
                  )}
                  
                  {/* Market Price and Analytic */}
                  <View className="flex-row items-center justify-between">
                    <Text 
                      className="text-xs font-medium text-foreground"
                      style={{ fontSize: 12 }}>
                      {formatPrice(card.market_price)}
                    </Text>
                    <Text 
                      style={{ 
                        fontSize: 11,
                        fontWeight: '600',
                        color: changeColor,
                      }}>
                      {changeText}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </InfiniteMarquee>

      {/* Card Selection Dialog */}
      <CardTradeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        card={selectedCard}
        onAddToTrade={onAddToTrade}
      />
    </View>
  );
}

