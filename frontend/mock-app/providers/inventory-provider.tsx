import { createContext, useContext, useState, useCallback, PropsWithChildren } from 'react';
import type { UserCard } from '@/types/inventory';

type InventoryContextType = {
  cards: UserCard[];
  isLoading: boolean;
  addCards: (newCards: UserCard[]) => void;
  removeCard: (cardId: string) => void;
  refreshInventory: () => Promise<void>;
};

const InventoryContext = createContext<InventoryContextType>({
  cards: [],
  isLoading: false,
  addCards: () => {},
  removeCard: () => {},
  refreshInventory: async () => {},
});

export function InventoryProvider({ children }: PropsWithChildren) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshInventory = useCallback(async () => {
    setIsLoading(true);
    // TODO: Replace with actual API call to fetch user's inventory
    // Example: const { data } = await supabase.from('inventory').select('*').eq('user_id', userId);
    // setCards(data);
    
    // Placeholder for now
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  }, []);

  const addCards = useCallback((newCards: UserCard[]) => {
    setCards(prev => [...prev, ...newCards]);
  }, []);

  const removeCard = useCallback((cardId: string) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
  }, []);

  return (
    <InventoryContext.Provider value={{ cards, isLoading, addCards, removeCard, refreshInventory }}>
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => useContext(InventoryContext);

