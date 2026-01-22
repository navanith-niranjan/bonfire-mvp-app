import { View, ScrollView, FlatList, TouchableOpacity, Image, useWindowDimensions, TextInput, ActivityIndicator, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Search, X, Plus, Minus, Camera, Scan } from 'lucide-react-native';

const SCREEN_OPTIONS = {
  title: 'Select One or More Cards',
  headerShown: false,
};

type PokemonCard = {
  id: string;
  name: string;
  images: {
    small: string;
    large: string;
  };
  set: {
    name: string;
  };
  rarity?: string;
};

const POKEMON_TCG_API = process.env.EXPO_PUBLIC_POKEMON_TCG_API_URL;
const POKEMON_TCG_API_KEY = process.env.EXPO_PUBLIC_POKEMON_TCG_API_KEY;

// Simple cache for API responses
const apiCache = new Map<string, { data: PokemonCard[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function SubmitPartAScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [cardQuantities, setCardQuantities] = useState<Map<string, number>>(new Map()); // Track quantities for each card
  const [selectedCards, setSelectedCards] = useState<Map<string, PokemonCard>>(new Map());
  const [isSearching, setIsSearching] = useState(true); // Start with loading state
  const [currentSearchQuery, setCurrentSearchQuery] = useState(''); // Track which query the current cards represent
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track initial load
  const inputRef = useRef<TextInput>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef(0);

  const handleBack = () => {
    router.back();
  };

  // Initialize with existing receive cards if editing
  useEffect(() => {
    if (params.existingReceiveCards && typeof params.existingReceiveCards === 'string') {
      try {
        const existingCards = JSON.parse(params.existingReceiveCards) as PokemonCard[];
        // Pre-select the existing cards
        const newSelectedCards = new Map<string, PokemonCard>();
        const newCardQuantities = new Map<string, number>();
        
        existingCards.forEach(card => {
          const cardId = card.id;
          newSelectedCards.set(cardId, card);
          // Count how many instances of this card exist
          const quantity = existingCards.filter(c => c.id === cardId).length;
          newCardQuantities.set(cardId, quantity);
        });
        
        setSelectedCards(newSelectedCards);
        setCardQuantities(newCardQuantities);
        
        // Also add these cards to the display so they're visible
        setCards(prevCards => {
          const existingIds = new Set(prevCards.map(c => c.id));
          const cardsToAdd = existingCards.filter(card => !existingIds.has(card.id));
          return [...prevCards, ...cardsToAdd];
        });
      } catch (error) {
        console.error('Error parsing existing receive cards:', error);
      }
    }
  }, [params.existingReceiveCards]);

  // Debounce the search query - reduced delay for faster response
  useEffect(() => {
    // Clear cards immediately when user types (before debounce)
    // This ensures old cards don't show while new search is happening
    if (searchQuery.trim() !== debouncedQuery.trim()) {
      setCards([]);
      setIsSearching(true);
    }

    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150); // Reduced to 150ms for faster response

    return () => clearTimeout(timeoutId);
  }, [searchQuery, debouncedQuery]);

  // Search Pokemon TCG API with request cancellation and caching
  useEffect(() => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const query = debouncedQuery.trim();
    const cacheKey = query || '__random__';
    const cached = apiCache.get(cacheKey);
    
    // Check cache first - if cached, use it immediately
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setCards(cached.data);
      setCurrentSearchQuery(query);
      setIsSearching(false);
      setIsInitialLoad(false);
      return;
    }

    // Create new abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Increment request ID to track latest request
    const requestId = ++latestRequestIdRef.current;

    if (!query) {
      // Fetch random cards when search is empty
      setIsSearching(true);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (POKEMON_TCG_API_KEY) {
        headers['X-Api-Key'] = POKEMON_TCG_API_KEY;
      }
      
      fetch(
        `${POKEMON_TCG_API}/cards?pageSize=24&orderBy=-set.releaseDate&select=id,name,images,set`,
        { 
          signal: controller.signal,
          headers,
        }
      )
        .then(response => {
          if (controller.signal.aborted) return null;
          return response.json();
        })
        .then(data => {
          if (controller.signal.aborted || !data) return;
          
          const cardsData = data.data || [];
          
          // Only update if this is still the latest request
          if (latestRequestIdRef.current === requestId) {
            setCards(cardsData);
            setCurrentSearchQuery(query);
            setIsSearching(false);
            setIsInitialLoad(false);
            apiCache.set(cacheKey, { data: cardsData, timestamp: Date.now() });
          }
        })
        .catch((error: any) => {
          if (error.name === 'AbortError') {
            // Request was cancelled, ignore
            return;
          }
          console.error('Error fetching random cards:', error);
          // Use cached data if available, even if expired
          if (latestRequestIdRef.current === requestId) {
            if (cached) {
              setCards(cached.data);
              setCurrentSearchQuery(query);
            } else {
              setCards([]);
              setCurrentSearchQuery(query);
            }
            setIsSearching(false);
            setIsInitialLoad(false);
          }
        });
      return;
    }

    // Show loading immediately when searching
    setIsSearching(true);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (POKEMON_TCG_API_KEY) {
      headers['X-Api-Key'] = POKEMON_TCG_API_KEY;
    }
    
    fetch(
      `${POKEMON_TCG_API}/cards?q=name:*${encodeURIComponent(query)}*&pageSize=50&select=id,name,images,set`,
      { 
        signal: controller.signal,
        headers,
      }
    )
      .then(response => {
        if (controller.signal.aborted) return null;
        return response.json();
      })
      .then(data => {
        if (controller.signal.aborted || !data) return;
        
        const cardsData = data.data || [];
        
          // Only update if this is still the latest request
          if (latestRequestIdRef.current === requestId) {
            setCards(cardsData);
            setCurrentSearchQuery(query);
            setIsSearching(false);
            setIsInitialLoad(false);
            apiCache.set(cacheKey, { data: cardsData, timestamp: Date.now() });
          }
      })
        .catch((error: any) => {
          if (error.name === 'AbortError') {
            // Request was cancelled, ignore
            return;
          }
          console.error('Error searching cards:', error);
          // Use cached data if available, even if expired
          if (latestRequestIdRef.current === requestId) {
            if (cached) {
              setCards(cached.data);
              setCurrentSearchQuery(query);
            } else {
              setCards([]);
              setCurrentSearchQuery(query);
            }
            setIsSearching(false);
            setIsInitialLoad(false);
          }
        })
        .finally(() => {
          // Only update loading state if this is still the latest request
          if (latestRequestIdRef.current === requestId) {
            setIsSearching(false);
            setIsInitialLoad(false);
          }
        });

    // Cleanup: abort request if query changes
    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  // Toggle card selection - adds card with quantity 1 if not selected
  const toggleCardSelection = (card: PokemonCard) => {
    setCardQuantities(prev => {
      const newMap = new Map(prev);
      if (newMap.has(card.id)) {
        // If already selected, remove it
        newMap.delete(card.id);
        setSelectedCards(prevCards => {
          const newMap = new Map(prevCards);
          newMap.delete(card.id);
          return newMap;
        });
      } else {
        // If not selected, add with quantity 1
        newMap.set(card.id, 1);
        setSelectedCards(prevCards => {
          const newMap = new Map(prevCards);
          newMap.set(card.id, card);
          return newMap;
        });
      }
      return newMap;
    });
  };

  // Increment card quantity
  const incrementQuantity = useCallback((cardId: string) => {
    setCardQuantities(prev => {
      const newMap = new Map(prev);
      const currentQty = newMap.get(cardId) || 0;
      newMap.set(cardId, currentQty + 1);
      return newMap;
    });
  }, []);

  // Decrement card quantity (removes if reaches 0)
  const decrementQuantity = useCallback((cardId: string) => {
    setCardQuantities(prev => {
      const newMap = new Map(prev);
      const currentQty = newMap.get(cardId) || 0;
      if (currentQty <= 1) {
        // Remove if quantity would be 0
        newMap.delete(cardId);
        setSelectedCards(prevCards => {
          const newMap = new Map(prevCards);
          newMap.delete(cardId);
          return newMap;
        });
      } else {
        newMap.set(cardId, currentQty - 1);
      }
      return newMap;
    });
  }, []);

  // Clear search input
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    // Maintain focus on input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Organize cards: selected first, then others
  // Always include selected cards, even when searching
  const organizedCards = useCallback(() => {
    let displayCards = [...cards];
    
    // Always include selected cards that might not be in current results
    const selectedCardsArray = Array.from(selectedCards.values());
    const existingIds = new Set(cards.map(c => c.id));
    // Add selected cards that aren't already in the results
    selectedCardsArray.forEach(card => {
      if (!existingIds.has(card.id)) {
        displayCards.push(card);
      }
    });
    
    // Sort: selected first, then others
    return displayCards.sort((a, b) => {
      const aSelected = cardQuantities.has(a.id);
      const bSelected = cardQuantities.has(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [cards, cardQuantities, selectedCards]);

  // Determine if we should show loading
  // Show loading if: initial load OR user is typing (searchQuery !== debouncedQuery) OR actively searching OR cards don't match current query
  const shouldShowLoading = useMemo(() => {
    if (isInitialLoad) return true;
    const queryMismatch = searchQuery.trim() !== debouncedQuery.trim();
    const cardsMismatch = currentSearchQuery.trim() !== debouncedQuery.trim();
    return queryMismatch || isSearching || cardsMismatch;
  }, [isInitialLoad, searchQuery, debouncedQuery, currentSearchQuery, isSearching]);

  // Combine actual cards with loading placeholders
  type DisplayItem = PokemonCard | { id: string; isPlaceholder: true };
  
  const displayData = useMemo((): DisplayItem[] => {
    const cards = organizedCards();
    if (shouldShowLoading) {
      // Show placeholder cards when loading
      // If we have cards, show them + a few placeholders
      // If no cards, show 9 placeholders
      const placeholderCount = cards.length === 0 ? 9 : 6;
      const placeholders = Array.from({ length: placeholderCount }, (_, i) => ({ 
        id: `placeholder-${i}`, 
        isPlaceholder: true as const 
      }));
      return [...cards, ...placeholders];
    }
    return cards;
  }, [organizedCards, shouldShowLoading]);

  const renderItem = ({ item, index }: { item: DisplayItem; index: number }) => {
    if ('isPlaceholder' in item && item.isPlaceholder) {
      return <LoadingPlaceholderCard index={index} />;
    }
    return renderCard({ item: item as PokemonCard });
  };

  // Calculate card width for 3-column grid
  const cardWidth = (width - 48 - 16) / 3; // 48px padding, 16px gap
  const cardHeight = cardWidth * 1.4; // Card aspect ratio
  
  // Optimized getItemLayout for FlatList performance
  const getItemLayout = useCallback((data: any, index: number) => {
    const itemsPerRow = 3;
    const rowIndex = Math.floor(index / itemsPerRow);
    const itemHeight = cardHeight + 16; // card height + margin bottom
    return {
      length: itemHeight,
      offset: rowIndex * itemHeight,
      index,
    };
  }, [cardHeight]);

  // Loading placeholder component with fade animation
  const LoadingPlaceholderCard = ({ index }: { index: number }) => {
    const fadeAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      // Add delay based on index for staggered effect
      const timeout = setTimeout(() => {
        animation.start();
      }, index * 100);
      return () => {
        animation.stop();
        clearTimeout(timeout);
      };
    }, [fadeAnim, index]);

    return (
      <View style={{ width: cardWidth }} className="mb-4">
        <Animated.View
          className="overflow-hidden bg-muted"
          style={{
            width: cardWidth,
            height: cardWidth * 1.4,
            opacity: fadeAnim,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 8,
          }}
        />
      </View>
    );
  };

  // Memoized card component for performance
  const CardComponent = React.memo(({ item, quantity, cardWidth, onPress, onIncrement, onDecrement }: {
    item: PokemonCard;
    quantity: number;
    cardWidth: number;
    onPress: () => void;
    onIncrement: () => void;
    onDecrement: () => void;
  }) => {
    const isSelected = quantity > 0;
    return (
      <View style={{ width: cardWidth }} className="mb-4">
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}>
          <View
            className={`overflow-hidden relative ${
              isSelected ? 'border-2 border-white' : ''
            }`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 8,
            }}>
            <Image
              source={{ uri: item.images.small }}
              style={{ width: cardWidth, height: cardWidth * 1.4 }}
              resizeMode="cover"
            />
            {/* Quantity badge */}
            {isSelected && (
              <View className="absolute top-1 right-1">
                <Badge className="bg-primary text-primary-foreground min-w-[24px] h-6 items-center justify-center">
                  <Text className="text-xs font-bold">{quantity}</Text>
                </Badge>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {/* Increment/Decrement buttons */}
        {isSelected && (
          <View className="flex-row items-center justify-center gap-2 mt-2">
            <TouchableOpacity
              onPress={onDecrement}
              className="bg-muted rounded-full p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon as={Minus} className="size-4" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onIncrement}
              className="bg-muted rounded-full p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon as={Plus} className="size-4" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, (prevProps, nextProps) => {
    // Only re-render if item, quantity, or cardWidth changes
    return prevProps.item.id === nextProps.item.id &&
           prevProps.quantity === nextProps.quantity &&
           prevProps.cardWidth === nextProps.cardWidth;
  });

  const renderCard = useCallback(({ item }: { item: PokemonCard }) => {
    const quantity = cardQuantities.get(item.id) || 0;
    return (
      <CardComponent
        item={item}
        quantity={quantity}
        cardWidth={cardWidth}
        onPress={() => toggleCardSelection(item)}
        onIncrement={() => incrementQuantity(item.id)}
        onDecrement={() => decrementQuantity(item.id)}
      />
    );
  }, [cardQuantities, cardWidth, incrementQuantity, decrementQuantity]);

  const ListHeader = useMemo(() => (
    <>
      {/* Header row with back arrow and scan button */}
      <View className="mb-4 flex-row items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onPress={handleBack}
          className="rounded-full -ml-2">
          <Icon as={ArrowLeft} className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={true}
          className="rounded-full -mr-2">
          <Icon as={Scan} className="size-5" />
        </Button>
      </View>

      {/* Progress bar */}
      <View className="mb-6">
        <Progress value={25} />
      </View>

      {/* Header title */}
      <View className="mb-2">
        <Text className="text-2xl font-bold">
          Select One or More Cards
        </Text>
      </View>

      {/* Description */}
      <View className="mb-6">
        <Text className="text-sm text-muted-foreground">
          Search for the card you want to ship to BONFIRE. Once authenticated, digital trading will be available.
        </Text>
      </View>

      {/* Input field */}
      <View className="mb-6">
        <View className="relative w-full flex-row items-center">
          <View className="absolute left-3 z-10">
            <Search size={18} color="#999" />
          </View>
          <Input
            ref={inputRef}
            placeholder="Lugia V Alt Art"
            className="w-full pl-10 pr-10"
            value={searchQuery}
            onChangeText={setSearchQuery}
            blurOnSubmit={false}
          />
          {searchQuery.length > 0 && !isSearching && (
            <TouchableOpacity
              onPress={clearSearch}
              className="absolute right-3 z-10"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  ), [searchQuery, handleBack, clearSearch, isSearching]);


  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}>
        <View className="flex-1 bg-background">
          <FlatList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            !shouldShowLoading ? (
              <View className="py-8 items-center">
                <Text className="text-muted-foreground">No cards found</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ padding: 24, paddingTop: 80, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          removeClippedSubviews={true}
          getItemLayout={getItemLayout}
          initialNumToRender={12}
          maxToRenderPerBatch={6}
          windowSize={5}
          updateCellsBatchingPeriod={50}
        />

          {/* Fixed Next button at bottom */}
          <View className="absolute bottom-20 left-0 right-0 items-center px-6">
            <Button
              className="w-auto min-w-[120px]"
              variant="default"
              disabled={cardQuantities.size === 0}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={() => {
                // Prepare selected cards data - create separate entry for each quantity
                // Each card instance needs its own entry since conditions can differ
                const selectedCardsData: any[] = [];
                Array.from(cardQuantities.entries()).forEach(([cardId, quantity]) => {
                  const card = selectedCards.get(cardId);
                  if (card) {
                    // Create a separate entry for each quantity
                    for (let i = 0; i < quantity; i++) {
                      selectedCardsData.push({
                        ...card,
                        instanceId: `${cardId}-${i}`, // Unique ID for each instance
                        quantity: 1, // Each instance has quantity 1
                      });
                    }
                  }
                });
                
                router.push({
                  pathname: '/submit/partB',
                  params: {
                    cards: JSON.stringify(selectedCardsData),
                    ...(params.returnPath && { returnPath: params.returnPath as string }),
                    ...(params.source && { source: params.source as string }),
                    ...(params.originalCards && { originalCards: params.originalCards as string }),
                  },
                });
              }}>
              <Icon as={ArrowRight} className="size-5" />
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

