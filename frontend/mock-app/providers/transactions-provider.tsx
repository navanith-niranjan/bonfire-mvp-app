import { createContext, useContext, useState, useCallback, useEffect, PropsWithChildren } from 'react';
import { useAuthContext } from '@/hooks/use-auth-context';

export type Transaction = {
  id: number;
  user_id: string;
  transaction_type: 'trade' | 'deposit' | 'withdraw' | 'submit' | 'redeem';
  description: string;
  amount: number;
  balance_after: number;
  transaction_data: Record<string, any> | null;
  created_at: string;
};

type TransactionsContextType = {
  transactions: Transaction[];
  isLoading: boolean;
  refreshTransactions: () => Promise<void>;
};

const TransactionsContext = createContext<TransactionsContextType>({
  transactions: [],
  isLoading: false,
  refreshTransactions: async () => {},
});

const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function apiRequest(endpoint: string, method: string, token: string) {
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

export function TransactionsProvider({ children }: PropsWithChildren) {
  const { session, isLoggedIn } = useAuthContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshTransactions = useCallback(async () => {
    if (!session?.access_token || !isLoggedIn) {
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiRequest('/transactions?limit=100', 'GET', session.access_token);
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Don't throw - keep existing transactions on error
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, isLoggedIn]);

  // Fetch transactions on mount and when user logs in
  useEffect(() => {
    if (isLoggedIn && session?.access_token) {
      refreshTransactions();
    } else {
      setTransactions([]);
    }
  }, [isLoggedIn, session?.access_token, refreshTransactions]);

  return (
    <TransactionsContext.Provider value={{ transactions, isLoading, refreshTransactions }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export const useTransactions = () => useContext(TransactionsContext);
