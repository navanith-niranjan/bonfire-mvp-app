import { createContext, useContext, useState, useCallback, useEffect, PropsWithChildren } from 'react';
import type { UserCard } from '@/types/inventory';
import { useAuthContext } from '@/hooks/use-auth-context';

type InventoryContextType = {
  cards: UserCard[];
  isLoading: boolean;
  addCards: (newCards: UserCard[]) => void;
  removeCard: (cardId: number) => void;
  removeCards: (cardIds: number[]) => Promise<void>;
  refreshInventory: () => Promise<void>;
};

const InventoryContext = createContext<InventoryContextType>({
  cards: [],
  isLoading: false,
  addCards: () => {},
  removeCard: () => {},
  removeCards: async () => {},
  refreshInventory: async () => {},
});

const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function apiRequest(endpoint: string, method: string, token: string, body?: any) {
  if (!API_URL) {
    throw new Error('API URL is not configured. Please set EXPO_PUBLIC_API_URL in your .env file');
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || JSON.stringify(errorJson);
      } catch {
        try {
          errorDetail = await response.text();
        } catch {}
      }
      throw new Error(`HTTP ${response.status}: ${errorDetail}`);
    }

    return response.json();
  } catch (error: any) {
    if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to backend at ${API_URL}. Is the server running?`);
    }
    throw error;
  }
}

export function InventoryProvider({ children }: PropsWithChildren) {
  const { session, isLoggedIn } = useAuthContext();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshInventory = useCallback(async () => {
    if (!session?.access_token || !isLoggedIn) {
      setCards([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiRequest('/inventory/vault', 'GET', session.access_token);
      setCards(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      // Don't throw - keep existing cards on error
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, isLoggedIn]);

  // Fetch inventory on mount and when user logs in
  useEffect(() => {
    if (isLoggedIn && session?.access_token) {
      refreshInventory();
    } else {
      setCards([]);
    }
  }, [isLoggedIn, session?.access_token, refreshInventory]);

  const addCards = useCallback((newCards: UserCard[]) => {
    setCards(prev => [...prev, ...newCards]);
  }, []);

  const removeCard = useCallback((cardId: number) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
  }, []);

  const removeCards = useCallback(async (cardIds: number[]) => {
    if (!session?.access_token || cardIds.length === 0) {
      return;
    }

    try {
      // Send DELETE request with item IDs as query params
      const idsParam = cardIds.join(',');
      await apiRequest(`/inventory/items?item_ids=${idsParam}`, 'DELETE', session.access_token);
      
      // Remove cards from local state
      setCards(prev => prev.filter(card => !cardIds.includes(card.id)));
    } catch (error) {
      console.error('Error removing cards:', error);
      throw error;
    }
  }, [session?.access_token]);

  return (
    <InventoryContext.Provider value={{ cards, isLoading, addCards, removeCard, removeCards, refreshInventory }}>
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => useContext(InventoryContext);

