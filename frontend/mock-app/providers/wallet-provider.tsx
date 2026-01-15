import { createContext, useContext, useState, useCallback, useEffect, PropsWithChildren } from 'react';
import { useAuthContext } from '@/hooks/use-auth-context';

type WalletContextType = {
  balance: number;
  isLoading: boolean;
  deposit: (amount: number) => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
  refreshBalance: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType>({
  balance: 0,
  isLoading: false,
  deposit: async () => {},
  withdraw: async () => {},
  refreshBalance: async () => {},
});

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  console.warn('⚠️ EXPO_PUBLIC_API_URL is not set. API calls will fail.');
}

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
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    // Provide more helpful error messages
    if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to backend at ${API_URL}. Is the server running?`);
    }
    throw error;
  }
}

export function WalletProvider({ children }: PropsWithChildren) {
  const { session, isLoggedIn } = useAuthContext();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasFetched, setHasFetched] = useState<boolean>(false);

  const refreshBalance = useCallback(async () => {
    if (!session?.access_token) {
      setBalance(0);
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiRequest('/wallet/balance', 'GET', session.access_token);
      setBalance(data.balance || 0);
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Don't throw - keep existing balance on error
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  // Fetch balance on mount when user is authenticated
  useEffect(() => {
    if (isLoggedIn && session?.access_token && !hasFetched) {
      refreshBalance();
    } else if (!isLoggedIn) {
      // Reset on logout
      setBalance(0);
      setHasFetched(false);
    }
  }, [isLoggedIn, session?.access_token, hasFetched, refreshBalance]);

  const deposit = useCallback(async (amount: number) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    try {
      const data = await apiRequest('/wallet/deposit', 'POST', session.access_token, { amount });
      setBalance(data.balance || 0);
    } catch (error) {
      console.error('Error depositing:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  const withdraw = useCallback(async (amount: number) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    try {
      const data = await apiRequest('/wallet/withdraw', 'POST', session.access_token, { amount });
      setBalance(data.balance || 0);
    } catch (error) {
      console.error('Error withdrawing:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  return (
    <WalletContext.Provider value={{ balance, isLoading, deposit, withdraw, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);

