/**
 * Simplified card search hook
 * Calls your backend API instead of external Pokemon TCG API
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { PokemonCard } from '@/types/card';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface UseCardSearchOptions {
  debounceMs?: number;
  pageSize?: number;
  onResultsChange?: (cards: PokemonCard[]) => void;
  /** Initial search query (e.g. from route params). Skips debounce for first fetch. */
  initialQuery?: string;
}

export interface UseCardSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cards: PokemonCard[];
  isSearching: boolean;
  clearSearch: () => void;
}

/**
 * Hook for card search with debouncing
 * Much simpler than the old implementation - just calls your backend
 */
export function useCardSearch(options: UseCardSearchOptions = {}): UseCardSearchReturn {
  const { debounceMs = 300, pageSize = 50, onResultsChange, initialQuery = '' } = options;
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, debounceMs]);

  // Search cards
  useEffect(() => {
    // Skip fetching if pageSize is 0 (cards are provided externally)
    if (pageSize === 0) {
      setIsSearching(false);
      setCards([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const query = debouncedQuery.trim();
    
    if (!query) {
      // Fetch popular cards when search is empty
      setIsSearching(true);
      fetch(`${API_URL}/cards/popular?limit=${pageSize}`, {
        signal: controller.signal,
      })
        .then(res => {
          if (controller.signal.aborted) return null;
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (controller.signal.aborted || !data) return;
          setCards(data);
          setIsSearching(false);
          onResultsChange?.(data);
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          console.error('Error fetching popular cards:', err);
          if (!controller.signal.aborted) {
            setCards([]);
            setIsSearching(false);
            onResultsChange?.([]);
          }
        });
      return;
    }

    // Search cards
    setIsSearching(true);
    const params = new URLSearchParams({
      q: query,
      limit: pageSize.toString(),
      sort_by: 'relevance',
    });

    fetch(`${API_URL}/cards/search?${params}`, {
      signal: controller.signal,
    })
      .then(res => {
        if (controller.signal.aborted) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (controller.signal.aborted || !data) return;
        setCards(data);
        setIsSearching(false);
        onResultsChange?.(data);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('Error searching cards:', err);
        if (!controller.signal.aborted) {
          setCards([]);
          setIsSearching(false);
          onResultsChange?.([]);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, pageSize, onResultsChange]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    cards,
    isSearching,
    clearSearch,
  };
}
