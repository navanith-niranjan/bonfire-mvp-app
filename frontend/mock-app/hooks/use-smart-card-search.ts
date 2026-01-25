import { useState, useEffect, useRef, useCallback } from 'react';
import type { PokemonCard } from '@/lib/smart-card-search';
import { buildApiQueries, rankCards, getPriceScore } from '@/lib/smart-card-search';

const POKEMON_TCG_API = process.env.EXPO_PUBLIC_POKEMON_TCG_API_URL;
const POKEMON_TCG_API_KEY = process.env.EXPO_PUBLIC_POKEMON_TCG_API_KEY;

// Simple cache for API responses
const apiCache = new Map<string, { data: PokemonCard[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface UseSmartCardSearchOptions {
  debounceMs?: number;
  pageSize?: number;
  onResultsChange?: (cards: PokemonCard[]) => void;
}

export interface UseSmartCardSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cards: PokemonCard[];
  isSearching: boolean;
  clearSearch: () => void;
}

/**
 * Hook for smart card search with query parsing, multi-strategy search, and ranking
 */
export function useSmartCardSearch(options: UseSmartCardSearchOptions = {}): UseSmartCardSearchReturn {
  const { debounceMs = 150, pageSize = 50, onResultsChange } = options;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef(0);
  const inputRef = useRef<any>(null);

  // Debounce the search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, debounceMs]);

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
      const rankedCards = rankCards(cached.data, query);
      setCards(rankedCards);
      setIsSearching(false);
      onResultsChange?.(rankedCards);
      return;
    }

    // Create new abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Increment request ID to track latest request
    const requestId = ++latestRequestIdRef.current;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (POKEMON_TCG_API_KEY) {
      headers['X-Api-Key'] = POKEMON_TCG_API_KEY;
    }

    if (!query) {
      // Fetch most popular cards when search is empty
      // Popularity = cards with highest market prices (most valuable = most popular)
      setIsSearching(true);
      
      // Fetch a larger set to get good selection of popular cards
      // Filter for cards with price data and sort by price
      fetch(
        `${POKEMON_TCG_API}/cards?pageSize=250&orderBy=-set.releaseDate&select=id,name,images,set,rarity,subtypes,supertype,tcgplayer`,
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
          
          // Filter to only cards with price data (cards without prices are less popular/valuable)
          // Then sort by price to get most popular cards
          const cardsWithPrices = cardsData.filter((card: PokemonCard) => {
            return card.tcgplayer?.prices && getPriceScore(card) > 0;
          });
          
          // Only update if this is still the latest request
          if (latestRequestIdRef.current === requestId) {
            // Rank by price (most expensive/popular first)
            // Limit to pageSize for display
            const rankedCards = rankCards(cardsWithPrices, '').slice(0, pageSize);
            setCards(rankedCards);
            setIsSearching(false);
            apiCache.set(cacheKey, { data: rankedCards, timestamp: Date.now() });
            onResultsChange?.(rankedCards);
          }
        })
        .catch((error: any) => {
          if (error.name === 'AbortError') {
            return;
          }
          console.error('Error fetching random cards:', error);
          if (latestRequestIdRef.current === requestId) {
            if (cached) {
              const rankedCards = rankCards(cached.data, query);
              setCards(rankedCards);
              onResultsChange?.(rankedCards);
            } else {
              setCards([]);
              onResultsChange?.([]);
            }
            setIsSearching(false);
          }
        });
      return;
    }

    // Show loading immediately when searching
    setIsSearching(true);

    // Build broader API queries (get more results, filter client-side)
    const apiQueries = buildApiQueries(query);
    
    // Try all API queries in parallel to get a broad set of results
    // Use broader queries - Fuse.js will handle the fuzzy matching client-side
    const searchPromises = apiQueries.map(async (apiQuery) => {
      try {
        const searchTerm = apiQuery.trim();
        // Use simple wildcard format - API should handle this
        const response = await fetch(
          `${POKEMON_TCG_API}/cards?q=name:*${encodeURIComponent(searchTerm)}*&pageSize=${Math.max(pageSize, 100)}&select=id,name,images,set,rarity,subtypes,supertype,tcgplayer`,
          { 
            signal: controller.signal,
            headers,
          }
        );
        
        if (controller.signal.aborted) return [];
        
        const data = await response.json();
        return data.data || [];
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn(`API query "${apiQuery}" failed:`, err);
        }
        return [];
      }
    });
    
    Promise.all(searchPromises)
      .then((resultsArrays) => {
        if (controller.signal.aborted) return;
        
        // Combine all results and remove duplicates
        const allCards = new Map<string, PokemonCard>();
        resultsArrays.forEach(cards => {
          cards.forEach((card: PokemonCard) => {
            if (!allCards.has(card.id)) {
              allCards.set(card.id, card);
            }
          });
        });
        
        const uniqueCards = Array.from(allCards.values());
        
        // Use Fuse.js for client-side fuzzy matching and ranking
        // This handles "Lugia V Alt Art" even if card name is just "Lugia V"
        const rankedCards = uniqueCards.length > 0 
          ? rankCards(uniqueCards, query)
          : [];
        
        // Only update if this is still the latest request
        if (latestRequestIdRef.current === requestId) {
          setCards(rankedCards);
          setIsSearching(false);
          apiCache.set(cacheKey, { data: rankedCards, timestamp: Date.now() });
          onResultsChange?.(rankedCards);
        }
      })
      .catch((error: any) => {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('Error searching cards:', error);
        if (latestRequestIdRef.current === requestId) {
          if (cached) {
            const rankedCards = rankCards(cached.data, query);
            setCards(rankedCards);
            onResultsChange?.(rankedCards);
          } else {
            setCards([]);
            onResultsChange?.([]);
          }
          setIsSearching(false);
        }
      });

    // Cleanup: abort request if query changes
    return () => {
      controller.abort();
    };
  }, [debouncedQuery, pageSize, onResultsChange]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    cards,
    isSearching,
    clearSearch,
  };
}
