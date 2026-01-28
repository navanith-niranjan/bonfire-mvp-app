import { Text } from '@/components/ui/text';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTransactions } from '@/hooks/use-transactions';
import { ActivityIndicator } from 'react-native';
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef } from 'react';

export default function ActivityScreen() {
  const { transactions, isLoading, refreshTransactions } = useTransactions();
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-refresh when screen comes into focus and reset scroll position
  useFocusEffect(
    useCallback(() => {
      refreshTransactions();
      // Reset scroll position to top when screen comes into focus
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [refreshTransactions])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Always show timestamp
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (diffMins < 1) return `Just now • ${timeStr}`;
    if (diffMins < 60) return `${diffMins}m ago • ${timeStr}`;
    if (diffHours < 24) return `${diffHours}h ago • ${timeStr}`;
    if (diffDays < 7) return `${diffDays}d ago • ${timeStr}`;
    
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    return `${dateStr} • ${timeStr}`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return ArrowUpRight;
      case 'withdraw':
        return ArrowDownRight;
      case 'trade':
        return ArrowLeftRight;
      case 'submit':
        return ArrowUpRight; // Use same icon as deposit for submissions
      case 'redeem':
        return ArrowDownRight; // Use same icon as withdraw for redemptions
      default:
        return ArrowLeftRight;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (type === 'deposit' || type === 'submit' || (type === 'trade' && amount > 0)) {
      return 'text-green-500';
    }
    if (type === 'withdraw' || type === 'redeem' || (type === 'trade' && amount < 0)) {
      return 'text-red-500';
    }
    return 'text-foreground';
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pt-20 pb-4">
        <Text className="text-2xl font-bold">Activity</Text>
      </View>

      {isLoading && transactions.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground mt-4">Loading transactions...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-muted-foreground text-center">
            No transactions yet
          </Text>
          <Text className="text-sm text-muted-foreground mt-2 text-center">
            Your transaction history will appear here
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshTransactions} />
          }>
          {transactions.map((transaction) => {
            const IconComponent = getTransactionIcon(transaction.transaction_type);
            const amountColor = getTransactionColor(transaction.transaction_type, transaction.amount);
            const isPositive = transaction.amount > 0;
            
            return (
              <View
                key={transaction.id}
                className="bg-black rounded-lg p-4 mb-3"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start flex-1 gap-3">
                    <View className={`rounded-full p-2 ${
                      transaction.transaction_type === 'deposit' || transaction.transaction_type === 'submit' || (transaction.transaction_type === 'trade' && transaction.amount > 0)
                        ? 'bg-green-500/20'
                        : transaction.transaction_type === 'withdraw' || transaction.transaction_type === 'redeem' || (transaction.transaction_type === 'trade' && transaction.amount < 0)
                        ? 'bg-red-500/20'
                        : 'bg-muted'
                    }`}>
                      <Icon
                        as={IconComponent}
                        className={`size-5 ${
                          transaction.transaction_type === 'deposit' || transaction.transaction_type === 'submit' || (transaction.transaction_type === 'trade' && transaction.amount > 0)
                            ? 'text-green-500'
                            : transaction.transaction_type === 'withdraw' || transaction.transaction_type === 'redeem' || (transaction.transaction_type === 'trade' && transaction.amount < 0)
                            ? 'text-red-500'
                            : 'text-foreground'
                        }`}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">
                        {transaction.description}
                      </Text>
                      <Text className="text-xs text-muted-foreground mt-1">
                        {formatDate(transaction.created_at)}
                      </Text>
                      
                      {/* Display card details for trades */}
                      {transaction.transaction_type === 'trade' && transaction.transaction_data && (
                        <View className="mt-3 space-y-2">
                          {/* Cards given */}
                          {transaction.transaction_data.give_items_details && 
                           Array.isArray(transaction.transaction_data.give_items_details) &&
                           transaction.transaction_data.give_items_details.length > 0 && (
                            <View>
                              <Text className="text-xs text-muted-foreground mb-1">Cards Given:</Text>
                              {transaction.transaction_data.give_items_details.map((card: any, idx: number) => (
                                <View key={idx} className="flex-row items-center justify-between mb-1">
                                  <Text className="text-xs text-foreground flex-1" numberOfLines={1}>
                                    {card.name || 'Unknown Card'}
                                  </Text>
                                  {card.value > 0 && (
                                    <Text className="text-xs text-muted-foreground ml-2">
                                      ${card.value.toFixed(2)}
                                    </Text>
                                  )}
                                </View>
                              ))}
                            </View>
                          )}
                          
                          {/* Cards received */}
                          {transaction.transaction_data.receive_items_details && 
                           Array.isArray(transaction.transaction_data.receive_items_details) &&
                           transaction.transaction_data.receive_items_details.length > 0 && (
                            <View>
                              <Text className="text-xs text-muted-foreground mb-1">Cards Received:</Text>
                              {transaction.transaction_data.receive_items_details.map((card: any, idx: number) => (
                                <View key={idx} className="flex-row items-center justify-between mb-1">
                                  <Text className="text-xs text-foreground flex-1" numberOfLines={1}>
                                    {card.name || 'Unknown Card'}
                                  </Text>
                                  {card.value > 0 && (
                                    <Text className="text-xs text-muted-foreground ml-2">
                                      ${card.value.toFixed(2)}
                                    </Text>
                                  )}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                      
                      {/* Display card details for submissions */}
                      {transaction.transaction_type === 'submit' && transaction.transaction_data && (
                        <View className="mt-3">
                          {transaction.transaction_data.items_details && 
                           Array.isArray(transaction.transaction_data.items_details) &&
                           transaction.transaction_data.items_details.length > 0 && (
                            <View>
                              <Text className="text-xs text-muted-foreground mb-1">Items Submitted:</Text>
                              {transaction.transaction_data.items_details.map((item: any, idx: number) => (
                                <View key={idx} className="flex-row items-center justify-between mb-1">
                                  <Text className="text-xs text-foreground flex-1" numberOfLines={1}>
                                    {item.name || 'Unknown Item'}
                                  </Text>
                                  {item.value > 0 && (
                                    <Text className="text-xs text-muted-foreground ml-2">
                                      ${item.value.toFixed(2)}
                                    </Text>
                                  )}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                      
                      {/* Display card details for redemptions */}
                      {transaction.transaction_type === 'redeem' && transaction.transaction_data && (
                        <View className="mt-3">
                          {transaction.transaction_data.items_details && 
                           Array.isArray(transaction.transaction_data.items_details) &&
                           transaction.transaction_data.items_details.length > 0 && (
                            <View>
                              <Text className="text-xs text-muted-foreground mb-1">Items Redeemed:</Text>
                              {transaction.transaction_data.items_details.map((item: any, idx: number) => (
                                <View key={idx} className="flex-row items-center justify-between mb-1">
                                  <Text className="text-xs text-foreground flex-1" numberOfLines={1}>
                                    {item.name || 'Unknown Item'}
                                  </Text>
                                  {item.value > 0 && (
                                    <Text className="text-xs text-muted-foreground ml-2">
                                      ${item.value.toFixed(2)}
                                    </Text>
                                  )}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className={`text-lg font-bold ${amountColor}`}>
                      {isPositive ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1">
                      Balance: ${transaction.balance_after.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

