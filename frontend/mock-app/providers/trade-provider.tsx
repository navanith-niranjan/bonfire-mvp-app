import { createContext, useContext, useState, useCallback, PropsWithChildren } from 'react';
import type { PokemonCard } from '@/types/card';
import type { UserCard } from '@/types/inventory';
import type { CardConditionPayload } from '@/components/card-trade-dialog';

type PendingTradeCard = {
  card: PokemonCard;
  condition: CardConditionPayload;
};

type TradeContextValue = {
  pendingCards: PendingTradeCard[];
  giveCards: UserCard[];
  addCard: (card: PokemonCard, condition: CardConditionPayload) => void;
  clearCards: () => void;
  setGiveCards: (cards: UserCard[]) => void;
  /** Sync receive list from deck (e.g. after editing in partA). Pass raw JSON string. */
  setReceiveCardsFromDeck: (receiveCardsJson: string) => void;
  getReceiveCardsPayload: () => any[];
  getGiveCards: () => UserCard[];
};

const TradeContext = createContext<TradeContextValue | undefined>(undefined);

export function TradeProvider({ children }: PropsWithChildren) {
  const [pendingCards, setPendingCards] = useState<PendingTradeCard[]>([]);
  const [giveCards, setGiveCardsState] = useState<UserCard[]>([]);

  const addCard = useCallback((card: PokemonCard, condition: CardConditionPayload) => {
    setPendingCards((prev) => [...prev, { card, condition }]);
  }, []);

  const clearCards = useCallback(() => {
    setPendingCards([]);
  }, []);

  const setGiveCards = useCallback((cards: UserCard[]) => {
    setGiveCardsState(cards);
  }, []);

  const setReceiveCardsFromDeck = useCallback((receiveCardsJson: string) => {
    try {
      const arr = receiveCardsJson ? JSON.parse(receiveCardsJson) : [];
      if (!Array.isArray(arr)) {
        setPendingCards([]);
        return;
      }
      const next: PendingTradeCard[] = arr.map((item: any) => ({
        card: {
          id: item.id,
          name: item.name ?? '',
          set_name: item.set?.name ?? item.set_name ?? null,
          image_small: item.images?.small ?? null,
          image_large: item.images?.large ?? null,
          market_price: item.market_price ?? null,
        } as PokemonCard,
        condition: item.condition ?? { type: 'Raw' as const, rawCondition: 'NM' as const },
      }));
      setPendingCards(next);
    } catch {
      setPendingCards([]);
    }
  }, []);

  const getReceiveCardsPayload = useCallback(() => {
    return pendingCards.map(({ card, condition }) => ({
      id: card.id,
      name: card.name,
      set: { name: card.set_name ?? '' },
      set_name: card.set_name,
      images: { small: card.image_small ?? '', large: card.image_large ?? '' },
      market_price: card.market_price,
      condition: {
        type: condition.type,
        grade: condition.grade,
        rawCondition: condition.rawCondition,
      },
    }));
  }, [pendingCards]);

  const getGiveCards = useCallback(() => giveCards, [giveCards]);

  return (
    <TradeContext.Provider
      value={{
        pendingCards,
        giveCards,
        addCard,
        clearCards,
        setGiveCards,
        setReceiveCardsFromDeck,
        getReceiveCardsPayload,
        getGiveCards,
      }}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTrade() {
  const context = useContext(TradeContext);
  if (context === undefined) {
    throw new Error('useTrade must be used within a TradeProvider');
  }
  return context;
}
