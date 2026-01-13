import { createContext, useContext, useState, useCallback, PropsWithChildren } from 'react';

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

export function WalletProvider({ children }: PropsWithChildren) {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshBalance = useCallback(async () => {
    setIsLoading(true);
    // TODO: Replace with actual API call to fetch wallet balance
    // Example: const { data } = await supabase.from('wallets').select('balance').eq('user_id', userId).single();
    // setBalance(data.balance);
    
    // Placeholder for now
    await new Promise(resolve => setTimeout(resolve, 500));
    setBalance(0);
    setIsLoading(false);
  }, []);

  const deposit = useCallback(async (amount: number) => {
    setIsLoading(true);
    // TODO: Replace with actual API call to deposit money
    // Example: await supabase.from('wallets').update({ balance: balance + amount });
    
    // Placeholder for now
    await new Promise(resolve => setTimeout(resolve, 500));
    setBalance(prev => prev + amount);
    setIsLoading(false);
  }, []);

  const withdraw = useCallback(async (amount: number) => {
    setIsLoading(true);
    // TODO: Replace with actual API call to withdraw money
    // Example: await supabase.from('wallets').update({ balance: balance - amount });
    
    // Placeholder for now
    await new Promise(resolve => setTimeout(resolve, 500));
    setBalance(prev => Math.max(0, prev - amount));
    setIsLoading(false);
  }, []);

  return (
    <WalletContext.Provider value={{ balance, isLoading, deposit, withdraw, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);

