import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { useInventory } from '@/hooks/use-inventory';
import { useCardSearch } from '@/hooks/use-card-search';
import { useAuthContext } from '@/hooks/use-auth-context';

type UseAppLoadingOptions = {
  /** If true, also wait for cards to load (for discover screen) */
  waitForCards?: boolean;
};

/**
 * Hook to check if all critical app data is loaded
 * Returns true if still loading, false if everything is ready
 * Only checks initial load (wallet balance, inventory, and optionally cards)
 */
export function useAppLoading(options: UseAppLoadingOptions = {}) {
  const { waitForCards = false } = options;
  const { isLoggedIn } = useAuthContext();
  const { isLoading: walletLoading } = useWallet();
  const { isLoading: inventoryLoading } = useInventory();
  
  // Always call useCardSearch (hooks must be called unconditionally)
  // But only use its result if waitForCards is true
  const { isSearching: cardsLoading, cards: cardSearchCards } = useCardSearch({ 
    pageSize: waitForCards ? 60 : 0 // Don't fetch if not needed
  });
  
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Track when initial data has loaded
  useEffect(() => {
    // For cards, wait until we have cards with images (at least 10 for the marquee)
    const cardsReady = waitForCards 
      ? (!cardsLoading && cardSearchCards.length > 0 && cardSearchCards.filter(c => c.image_small).length >= 10)
      : true;
    
    if (isLoggedIn && !walletLoading && !inventoryLoading && cardsReady) {
      // Longer delay to ensure CardsOfWeekMarquee has received the data
      // Since both hooks fetch separately, we need to wait for both to complete
      const timer = setTimeout(() => {
        setHasInitiallyLoaded(true);
      }, 300);
      return () => clearTimeout(timer);
    } else if (!isLoggedIn) {
      setHasInitiallyLoaded(false);
    }
  }, [isLoggedIn, walletLoading, inventoryLoading, waitForCards, cardsLoading, cardSearchCards]);

  // Only show loading if user is logged in and initial data hasn't loaded yet
  if (!isLoggedIn) {
    return false;
  }

  // Show loading until initial data is loaded
  // After initial load, don't show loading screen for subsequent operations
  if (hasInitiallyLoaded) {
    return false;
  }

  // Show loading if wallet, inventory, or cards (if requested) are still loading
  const cardsLoadingCheck = waitForCards ? cardsLoading : false;
  return walletLoading || inventoryLoading || cardsLoadingCheck;
}
