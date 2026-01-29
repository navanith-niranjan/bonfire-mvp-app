import { View, FlatList, Image, useWindowDimensions, ScrollView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react-native';

const SCREEN_OPTIONS = {
  title: 'Part B',
  headerShown: false,
};

type PokemonCard = {
  id: string;
  instanceId?: string; // Unique ID for each instance of the same card
  name: string;
  images: {
    small: string;
    large: string;
  };
  set: {
    name: string;
  };
  quantity: number;
  market_price?: number | null;
};

type ConditionType = 'Raw' | 'PSA' | 'Beckett' | 'TAG';
type ConditionGrade = '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2' | '1';
type RawCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'D';

type CardCondition = {
  type: ConditionType;
  grade?: ConditionGrade;
  rawCondition?: RawCondition;
};

export default function SubmitPartBScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardConditions, setCardConditions] = useState<Map<string, CardCondition>>(new Map());
  const flatListRef = useRef<FlatList>(null);
  
  // Check if this is for trade (has returnPath)
  const returnPath = params.returnPath as string | undefined;
  const source = params.source as string | undefined;
  const originalCards = params.originalCards as string | undefined;
  const returnTab = params.returnTab as string | undefined;

  // Parse selected cards from params
  const selectedCards = useMemo(() => {
    try {
      if (params.cards && typeof params.cards === 'string') {
        return JSON.parse(params.cards) as PokemonCard[];
      }
    } catch (error) {
      console.error('Error parsing cards:', error);
    }
    return [];
  }, [params.cards]);

  const handleBack = () => {
    router.back();
  };

  // Get current card
  const currentCard = selectedCards[currentIndex];
  
  // Get condition for current card (use instanceId if available, otherwise use id)
  const cardKey = currentCard?.instanceId || currentCard?.id || '';
  const currentCondition = cardConditions.get(cardKey);

  // Check if all cards have conditions specified
  const allCardsHaveConditions = useMemo(() => {
    if (selectedCards.length === 0) return false;
    
    return selectedCards.every(card => {
      const key = card.instanceId || card.id;
      const condition = cardConditions.get(key);
      
      // Condition is valid if:
      // - It exists
      // - It has a type
      // - If it's Raw, it must have a rawCondition
      // - If it's not Raw, it must have a grade
      if (!condition || !condition.type) return false;
      
      if (condition.type === 'Raw') {
        return condition.rawCondition !== undefined; // Raw needs a condition (NM, LP, etc.)
      }
      
      // For grading companies (PSA, Beckett, TAG), a grade is required
      return condition.grade !== undefined;
    });
  }, [selectedCards, cardConditions]);

  // Handle condition selection
  const handleConditionSelect = (type: ConditionType, grade?: ConditionGrade, rawCondition?: RawCondition) => {
    if (!currentCard) return;
    const cardKey = currentCard.instanceId || currentCard.id;
    setCardConditions(prev => {
      const newMap = new Map(prev);
      newMap.set(cardKey, { type, grade, rawCondition });
      return newMap;
    });
  };

  // Navigate to previous card
  const goToPrevious = () => {
    if (currentIndex > 0 && flatListRef.current) {
      const newIndex = currentIndex - 1;
      const offset = (width - 48) * newIndex;
      setCurrentIndex(newIndex);
      flatListRef.current.scrollToOffset({ offset, animated: true });
    }
  };

  // Navigate to next card
  const goToNext = () => {
    if (currentIndex < selectedCards.length - 1 && flatListRef.current) {
      const newIndex = currentIndex + 1;
      const offset = (width - 48) * newIndex;
      setCurrentIndex(newIndex);
      flatListRef.current.scrollToOffset({ offset, animated: true });
    }
  };

  // Render condition buttons
  const renderConditionButtons = () => {
    if (!currentCard) return null;

    const conditionTypes: ConditionType[] = ['Raw', 'PSA', 'Beckett', 'TAG'];
    const grades: ConditionGrade[] = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'];
    const rawConditions: { value: RawCondition; label: string }[] = [
      { value: 'NM', label: 'Near Mint (NM)' },
      { value: 'LP', label: 'Lightly Played (LP)' },
      { value: 'MP', label: 'Moderately Played (MP)' },
      { value: 'HP', label: 'Heavily Played (HP)' },
      { value: 'D', label: 'Damaged (D)' },
    ];
    const isRawSelected = currentCondition?.type === 'Raw';
    const hasNoCondition = !currentCondition?.type;

    return (
      <View className="gap-4">
        {/* Condition Type Selection */}
        <View>
          <Text className="text-sm font-medium mb-2">Grading Company</Text>
          <View className="flex-row flex-wrap gap-2">
            {conditionTypes.map((type) => {
              const isDisabled = type === 'Beckett' || type === 'TAG';
              return (
                <Button
                  key={type}
                  variant={currentCondition?.type === type ? 'default' : 'outline'}
                  size="sm"
                  disabled={isDisabled}
                  onPress={() => {
                    if (isDisabled) return;
                    if (type === 'Raw') {
                      handleConditionSelect('Raw', undefined, undefined);
                    } else {
                      // Set first grade when selecting a grading company
                      handleConditionSelect(type, '10');
                    }
                  }}
                  className="min-w-[80px]">
                  <Text>{type}</Text>
                </Button>
              );
            })}
          </View>
        </View>

        {/* Raw Condition Selection (shown when Raw is selected) */}
        {isRawSelected && (
          <View>
            <Text className="text-sm font-medium mb-2">Card Condition</Text>
            <View className="flex-row flex-wrap gap-2">
              {rawConditions.map((rawCond) => (
                <Button
                  key={rawCond.value}
                  variant={currentCondition?.rawCondition === rawCond.value ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => {
                    handleConditionSelect('Raw', undefined, rawCond.value);
                  }}
                  className="min-w-[100px]">
                  <Text>{rawCond.label}</Text>
                </Button>
              ))}
            </View>
          </View>
        )}

        {/* Grade Selection (shown when PSA is selected, disabled if Raw or no condition selected) */}
        {!isRawSelected && (
          <View>
            <Text className="text-sm font-medium mb-2">Grade</Text>
            <View className="flex-row flex-wrap gap-2">
              {grades.map((grade) => (
                <Button
                  key={grade}
                  variant={currentCondition?.grade === grade && !hasNoCondition ? 'default' : 'outline'}
                  size="sm"
                  disabled={hasNoCondition}
                  onPress={() => {
                    if (!hasNoCondition && currentCondition?.type) {
                      handleConditionSelect(currentCondition.type, grade);
                    }
                  }}
                  className="min-w-[50px]">
                  <Text>{grade}</Text>
                </Button>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render carousel card
  const renderCard = ({ item, index }: { item: PokemonCard; index: number }) => {
    const cardWidth = width - 48; // Full width minus padding
    const isActive = index === currentIndex;

    if (!item) {
      return null;
    }

    return (
      <View
        style={{ width: cardWidth }}
        className={`px-6 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
        <View className="items-center justify-center">
          {(() => {
            const uri = item.images?.large || item.images?.small || '';
            return typeof uri === 'string' && uri.trim() !== '' ? (
              <Image
                source={{ uri }}
                style={{ width: cardWidth * 0.65, height: cardWidth * 0.91 }}
                resizeMode="contain"
              />
            ) : (
              <View className="bg-muted" style={{ width: cardWidth * 0.65, height: cardWidth * 0.91 }} />
            );
          })()}
          <Text className="text-lg font-semibold text-center mt-3 mb-1">{item.name || 'Unknown Card'}</Text>
          <Text className="text-sm text-muted-foreground text-center">{item.set?.name || ''}</Text>
        </View>
      </View>
    );
  };

  // Format market price for display
  const formatMarketPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) {
      return 'N/A';
    }
    return `$${price.toFixed(2)}`;
  };

  const marketPrice = formatMarketPrice(currentCard?.market_price);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 bg-background">
        <ScrollView 
          contentContainerStyle={{ padding: 24, paddingTop: 80, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}>
          {/* Back arrow button */}
          <View className="mb-4">
            <Button
              variant="ghost"
              size="icon"
              onPress={handleBack}
              className="rounded-full -ml-2">
              <Icon as={ArrowLeft} className="size-5" />
            </Button>
          </View>

          {/* Progress bar */}
          <View className="mb-6">
            <Progress value={50} />
          </View>

          {/* Header title */}
          <View className="mb-2">
            <Text className="text-2xl font-bold">
              Specify Card Conditions
            </Text>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-sm text-muted-foreground">
              Swipe through your selected cards and specify the condition for each one.
            </Text>
          </View>

          {/* Card Counter */}
          {selectedCards.length > 0 && (
            <View className="mb-3">
              <Text className="text-sm text-muted-foreground">
                {currentIndex + 1} of {selectedCards.length}
              </Text>
            </View>
          )}

          {/* Carousel */}
          {selectedCards.length > 0 ? (
            <>
              <View className="mb-4 items-center relative" style={{ minHeight: width * 1.05 }}>
                {/* Left Arrow */}
                {currentIndex > 0 && (
                  <View className="absolute left-0 z-10" style={{ top: '50%', marginTop: -20 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={goToPrevious}
                      className="rounded-full bg-background/80"
                      style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.5,
                        shadowRadius: 8,
                        elevation: 8,
                      }}>
                      <Icon as={ChevronLeft} className="size-6" />
                    </Button>
                  </View>
                )}
                
                <FlatList
                  ref={flatListRef}
                  data={selectedCards}
                  renderItem={renderCard}
                  keyExtractor={(item, index) => item.instanceId || `${item.id}-${index}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScrollToIndexFailed={(info) => {
                    // Handle scroll to index failure
                    const wait = new Promise(resolve => setTimeout(resolve, 500));
                    wait.then(() => {
                      flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                    });
                  }}
                  onMomentumScrollEnd={(event) => {
                    const newIndex = Math.round(
                      event.nativeEvent.contentOffset.x / (width - 48)
                    );
                    if (newIndex >= 0 && newIndex < selectedCards.length) {
                      setCurrentIndex(newIndex);
                    }
                  }}
                  getItemLayout={(data, index) => ({
                    length: width - 48,
                    offset: (width - 48) * index,
                    index,
                  })}
                  snapToInterval={width - 48}
                  decelerationRate="fast"
                  contentContainerStyle={{ alignItems: 'center' }}
                  scrollEnabled={true}
                />
                
                {/* Right Arrow */}
                {currentIndex < selectedCards.length - 1 && (
                  <View className="absolute right-0 z-10" style={{ top: '50%', marginTop: -20 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={goToNext}
                      className="rounded-full bg-background/80"
                      style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.5,
                        shadowRadius: 8,
                        elevation: 8,
                      }}>
                      <Icon as={ChevronRight} className="size-6" />
                    </Button>
                  </View>
                )}
              </View>

              {/* Market Price */}
              <View className="mb-4 p-4 bg-muted rounded-lg">
                <Text className="text-sm text-muted-foreground mb-1">Market Price</Text>
                <Text className="text-2xl font-bold">{marketPrice}</Text>
              </View>

              {/* Condition Selection */}
              {renderConditionButtons()}
            </>
          ) : (
            <View className="py-8 items-center">
              <Text className="text-muted-foreground">No cards selected</Text>
            </View>
          )}
        </ScrollView>

        {/* Fixed Next button at bottom */}
        {selectedCards.length > 0 && (
          <View className="absolute bottom-20 left-0 right-0 items-center px-6">
            <Button
              className="w-auto min-w-[120px]"
              variant="default"
              disabled={!allCardsHaveConditions}
              onPress={() => {
                // Prepare cards data with conditions
                const cardsWithConditions = selectedCards.map(card => {
                  const cardKey = card.instanceId || card.id;
                  const condition = cardConditions.get(cardKey);
                  return {
                    ...card,
                    condition: condition ? {
                      type: condition.type,
                      grade: condition.grade,
                      rawCondition: condition.rawCondition,
                    } : null,
                  };
                });
                
                // If this is for trade, return to trade deck with cards
                if (returnPath && source === 'trade') {
                  router.push({
                    pathname: returnPath as any,
                    params: {
                      ...(returnTab && { returnTab }),
                      receiveCards: JSON.stringify(cardsWithConditions),
                      ...(originalCards && { cards: originalCards }), // Preserve original cards
                    },
                  });
                } else {
                  // Otherwise, continue to partC (normal submit flow)
                  router.push({
                    pathname: '/submit/partC',
                    params: {
                      cards: JSON.stringify(cardsWithConditions),
                    },
                  });
                }
              }}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 8,
              }}>
              <Icon as={ArrowRight} className="size-5" />
            </Button>
          </View>
        )}
      </View>
    </>
  );
}

