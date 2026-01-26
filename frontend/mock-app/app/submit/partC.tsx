import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft } from 'lucide-react-native';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useInventory } from '@/hooks/use-inventory';

const SCREEN_OPTIONS = {
  title: 'Part C',
  headerShown: false,
};

type PokemonCard = {
  id: string;
  instanceId?: string;
  name: string;
  images: {
    small: string;
    large: string;
  };
  set: {
    name: string;
  };
  condition: {
    type: 'Raw' | 'PSA' | 'Beckett' | 'TAG';
    grade?: string;
    rawCondition?: 'NM' | 'LP' | 'MP' | 'HP' | 'D';
  } | null;
  market_price?: number | null;
};

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
        // Handle different error response formats
        if (typeof errorJson === 'string') {
          errorDetail = errorJson;
        } else if (errorJson.detail) {
          // FastAPI validation errors have 'detail' field
          if (Array.isArray(errorJson.detail)) {
            // Validation errors are arrays of objects
            errorDetail = errorJson.detail.map((err: any) => 
              `${err.loc?.join('.')}: ${err.msg}`
            ).join(', ');
          } else {
            errorDetail = String(errorJson.detail);
          }
        } else {
          errorDetail = JSON.stringify(errorJson, null, 2);
        }
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

export default function SubmitPartCScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session } = useAuthContext();
  const { refreshInventory } = useInventory();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Parse cards from params
  const selectedCards = useMemo(() => {
    try {
      if (params.cards && typeof params.cards === 'string') {
        return JSON.parse(params.cards) as PokemonCard[];
      }
    } catch (error) {
      console.error('Error parsing cards:', error);
    }
    return [];
  }, [params.cards]);

  const handleBack = () => {
    router.back();
  };

  const handleGenerateLabel = async () => {
    if (!session?.access_token) {
      console.error('Not authenticated');
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      // Prepare inventory items from selected cards
      const inventoryItems = selectedCards.map(card => {
        // Format condition string for display
        let conditionStr = 'Unknown';
        if (card.condition) {
          if (card.condition.type === 'Raw' && card.condition.rawCondition) {
            // Map raw conditions to full names
            const rawConditionMap: Record<string, string> = {
              'NM': 'Near Mint',
              'LP': 'Lightly Played',
              'MP': 'Moderately Played',
              'HP': 'Heavily Played',
              'D': 'Damaged',
            };
            conditionStr = `Raw - ${rawConditionMap[card.condition.rawCondition] || card.condition.rawCondition}`;
          } else if (card.condition.grade) {
            conditionStr = `${card.condition.type} ${card.condition.grade}`;
          } else {
            conditionStr = card.condition.type;
          }
        }
        
        // Prepare item_data object
        const itemData: Record<string, any> = {
          // Store full condition structure for flexibility
          condition: conditionStr, // Human-readable string
          condition_type: card.condition?.type || null,
          condition_grade: card.condition?.grade || null,
          condition_raw: card.condition?.rawCondition || null, // NM, LP, MP, HP, D
          set: card.set.name,
        };
        
        // Only include market_price if it's a valid number
        if (card.market_price !== null && card.market_price !== undefined && typeof card.market_price === 'number') {
          itemData.market_price = card.market_price;
        }
        
        return {
          name: card.name,
          image_url: card.images.large || card.images.small,
          collectible_type: 'card',
          external_id: String(card.id), // Convert to string (backend expects string)
          external_api: 'pokemontcg',
          item_data: itemData,
        };
      });

      // Send to backend
      await apiRequest('/inventory/items', 'POST', session.access_token, {
        items: inventoryItems,
      });

      // Ensure loading shows for at least 5 seconds total
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 5000 - elapsed);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      setIsLoading(false);
      setIsSuccess(true);
      
      // Refresh inventory to show newly added cards
      await refreshInventory();
      
      // Navigate back to vault after 3 seconds
      setTimeout(() => {
        router.replace('/(tabs)/vault');
      }, 3000);
    } catch (error) {
      console.error('Error creating inventory items:', error);
      setIsLoading(false);
      // Still show success for mock MVP, but log the error
      setIsSuccess(true);
      setTimeout(() => {
        router.replace('/(tabs)/vault');
      }, 3000);
    }
  };

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 bg-background">
        <ScrollView 
          contentContainerStyle={{ padding: 24, paddingTop: 80 }}
          showsVerticalScrollIndicator={false}>
          {/* Back arrow button */}
          <View className="mb-4">
            <Button
              variant="ghost"
              size="icon"
              onPress={handleBack}
              className="rounded-full -ml-2">
              <Icon as={ArrowLeft} className="size-5" />
            </Button>
          </View>

          {/* Progress bar */}
          <View className="mb-6">
            <Progress value={100} />
          </View>

          {/* Header title */}
          <View className="mb-2">
            <Text className="text-2xl font-bold">
              Final Step
            </Text>
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-sm text-muted-foreground">
              Generate your shipping label to send your cards to BONFIRE.
            </Text>
          </View>
        </ScrollView>

        {/* Centered button */}
        <View className="absolute inset-0 items-center justify-center">
          {isLoading ? (
            <View className="items-center gap-4">
              <ActivityIndicator size="large" color="#fff" />
              <Text className="text-muted-foreground">Generating shipping label...</Text>
            </View>
          ) : isSuccess ? (
            <View className="items-center gap-4">
              <Text className="text-lg font-semibold">Sent to email!</Text>
            </View>
          ) : (
            <Button
              variant="outline"
              onPress={handleGenerateLabel}
              className="min-w-[200px]">
              <Text>Generate Shipping Label</Text>
            </Button>
          )}
        </View>
      </View>
    </>
  );
}

