// Smart card search utilities and types
import Fuse from 'fuse.js';

export type PokemonCard = {
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
  subtypes?: string[];
  supertype?: string;
  tcgplayer?: {
    prices?: {
      normal?: { market?: number; low?: number; mid?: number; high?: number };
      holofoil?: { market?: number; low?: number; mid?: number; high?: number };
      reverseHolofoil?: { market?: number; low?: number; mid?: number; high?: number };
      '1stEditionHolofoil'?: { market?: number; low?: number; mid?: number; high?: number };
      unlimitedHolofoil?: { market?: number; low?: number; mid?: number; high?: number };
    };
  };
};

/**
 * Build API search queries - use broader queries to get more results
 * Then use Fuse.js for client-side fuzzy matching
 */
export function buildApiQueries(originalQuery: string): string[] {
  const trimmed = originalQuery.trim();
  if (!trimmed) return [];
  
  const queries: string[] = [];
  const words = trimmed.split(/\s+/).filter(w => w.length > 1);
  
  // Strategy 1: First significant word (most important for finding cards)
  // This ensures we get results even if the full query doesn't match
  if (words.length > 0) {
    const firstWord = words[0];
    if (firstWord.length > 2) {
      queries.push(firstWord);
    }
  }
  
  // Strategy 2: Original query (in case it works)
  if (trimmed.length > 2) {
    queries.push(trimmed);
  }
  
  // Strategy 3: All individual words (broader search)
  words.forEach(word => {
    if (word.length > 2 && !queries.includes(word)) {
      queries.push(word);
    }
  });
  
  return queries.length > 0 ? queries : [trimmed];
}

/**
 * Use Fuse.js for fuzzy search and ranking
 * This provides standardized, library-based fuzzy matching
 */
export function fuzzySearchCards(cards: PokemonCard[], query: string): PokemonCard[] {
  if (!query.trim() || cards.length === 0) {
    return cards;
  }
  
  // Configure Fuse.js for card search
  const fuse = new Fuse(cards, {
    keys: ['name'], // Search in the name field
    threshold: 0.4, // 0.0 = exact match, 1.0 = match anything (0.4 = fairly fuzzy)
    ignoreLocation: true, // Don't care where in the string the match is
    includeScore: true, // Include relevance score
    minMatchCharLength: 2, // Minimum characters to match
    findAllMatches: true, // Find all matches, not just first
  });
  
  // Perform fuzzy search
  const results = fuse.search(query);
  
  // Return cards sorted by relevance (best matches first)
  return results.map(result => result.item);
}

/**
 * Get price score from TCGPlayer API data
 * Uses market price if available, falls back to mid price, then high price
 */
export function getPriceScore(card: PokemonCard): number {
  if (!card.tcgplayer?.prices) return 0;
  
  const prices = card.tcgplayer.prices;
  
  // Try different price types in order of preference
  const priceTypes = [
    prices.holofoil,
    prices.reverseHolofoil,
    prices.unlimitedHolofoil,
    prices['1stEditionHolofoil'],
    prices.normal,
  ];
  
  for (const priceType of priceTypes) {
    if (priceType?.market) {
      return priceType.market;
    }
    if (priceType?.mid) {
      return priceType.mid;
    }
    if (priceType?.high) {
      return priceType.high;
    }
  }
  
  return 0;
}

/**
 * Rank and sort cards by relevance (using Fuse.js) and price/popularity
 */
export function rankCards(cards: PokemonCard[], query: string): PokemonCard[] {
  if (cards.length === 0) return [];
  if (!query.trim()) {
    // If no query, sort by price (most expensive first)
    return cards.sort((a, b) => getPriceScore(b) - getPriceScore(a));
  }
  
  // Build searchable text that includes name, subtypes, and supertype
  // This helps match "Lugia V Alt Art" even if the card name is just "Lugia V"
  const cardsWithSearchableText = cards.map(card => ({
    ...card,
    _searchableText: [
      card.name,
      ...(card.subtypes || []),
      card.supertype || '',
    ].filter(Boolean).join(' ').toLowerCase(),
  }));
  
  // Use Fuse.js for fuzzy matching - search in both name and combined searchable text
  const fuse = new Fuse(cardsWithSearchableText, {
    keys: [
      { name: 'name', weight: 0.7 }, // Name is most important
      { name: '_searchableText', weight: 0.3 }, // But also search in subtypes
    ],
    threshold: 0.4, // More lenient (0.4 = fairly fuzzy, allows "Lugia V Alt Art" to match "Lugia V")
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 1,
    findAllMatches: true,
    shouldSort: false, // We'll sort ourselves with price
  });
  
  const results = fuse.search(query);
  
  // If Fuse.js found matches, use them
  if (results.length > 0) {
    // Combine Fuse.js relevance with price score
    return results
      .map(result => ({
        card: result.item,
        fuseScore: result.score || 1, // Lower score = better match in Fuse.js
        priceScore: getPriceScore(result.item),
      }))
      .sort((a, b) => {
        // Primary sort: Fuse.js relevance (lower score = better match)
        if (Math.abs(a.fuseScore - b.fuseScore) > 0.05) {
          return a.fuseScore - b.fuseScore;
        }
        // Secondary sort: price (most expensive/popular first)
        return b.priceScore - a.priceScore;
      })
      .map(item => item.card);
  }
  
  // If Fuse.js found no matches, fall back to simple text matching
  // This handles cases where the API returned cards but Fuse.js is too strict
  const queryLower = query.toLowerCase();
  const scoredCards = cards.map(card => {
    const cardName = card.name.toLowerCase();
    const searchableText = [
      card.name,
      ...(card.subtypes || []),
      card.supertype || '',
    ].filter(Boolean).join(' ').toLowerCase();
    
    let score = 0;
    
    // Simple matching as fallback
    if (cardName.includes(queryLower)) {
      score = 1000;
    } else if (searchableText.includes(queryLower)) {
      score = 800; // Match in subtypes but not name
    } else {
      // Check if any words match
      const queryWords = queryLower.split(/\s+/);
      const matchedWords = queryWords.filter(word => 
        cardName.includes(word) || searchableText.includes(word)
      );
      score = matchedWords.length * 100;
    }
    
    return {
      card,
      score,
      priceScore: getPriceScore(card),
    };
  });
  
  return scoredCards
    .filter(item => item.score > 0) // Only cards with some match
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return b.priceScore - a.priceScore;
    })
    .map(item => item.card);
}
