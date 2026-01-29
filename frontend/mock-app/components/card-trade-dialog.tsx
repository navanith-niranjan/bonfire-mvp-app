import { useState } from 'react';
import { View, Image } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { PokemonCard } from '@/types/card';

type ConditionType = 'Raw' | 'PSA' | 'Beckett' | 'TAG';
type ConditionGrade = '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2' | '1';
type RawCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'D';

export type CardConditionPayload = {
  type: ConditionType;
  grade?: ConditionGrade;
  rawCondition?: RawCondition;
};

type CardTradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: PokemonCard | null;
  onAddToTrade?: (payload: { card: PokemonCard; condition: CardConditionPayload }) => void;
};

const CONDITION_TYPES: ConditionType[] = ['Raw', 'PSA', 'Beckett', 'TAG'];
const GRADES: ConditionGrade[] = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'];
const RAW_CONDITIONS: { value: RawCondition; label: string }[] = [
  { value: 'NM', label: 'Near Mint (NM)' },
  { value: 'LP', label: 'Lightly Played (LP)' },
  { value: 'MP', label: 'Moderately Played (MP)' },
  { value: 'HP', label: 'Heavily Played (HP)' },
  { value: 'D', label: 'Damaged (D)' },
];

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'N/A';
  return `$${price.toFixed(2)}`;
}

export function CardTradeDialog({ open, onOpenChange, card, onAddToTrade }: CardTradeDialogProps) {
  const [conditionType, setConditionType] = useState<ConditionType | null>(null);
  const [grade, setGrade] = useState<ConditionGrade | null>(null);
  const [rawCondition, setRawCondition] = useState<RawCondition | null>(null);

  const isRawSelected = conditionType === 'Raw';
  const canAddToTrade = conditionType && (isRawSelected ? rawCondition : grade);

  // Fake market analytic (stable per card id)
  const fakeChange = ((card?.id ?? 0) % 11) - 5; // -5 to +5
  const analyticText = `${fakeChange >= 0 ? '+' : ''}${fakeChange.toFixed(1)}%`;
  const analyticColor = fakeChange >= 0 ? '#22c55e' : '#ef4444';

  const handleClose = () => {
    setConditionType(null);
    setGrade(null);
    setRawCondition(null);
    onOpenChange(false);
  };

  const handleAddToTrade = () => {
    if (!card || !conditionType || !canAddToTrade) return;
    const conditionPayload: CardConditionPayload = {
      type: conditionType,
      grade: isRawSelected ? undefined : grade ?? undefined,
      rawCondition: isRawSelected ? rawCondition ?? undefined : undefined,
    };
    onAddToTrade?.({ card, condition: conditionPayload });
    handleClose();
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Card to Trade</DialogTitle>
          <DialogDescription>
            Select the condition or grading for this card.
          </DialogDescription>
        </DialogHeader>

        <View className="gap-6">
          {/* Card + Info row: image left, info right */}
          <View className="flex-row gap-4">
            {card.image_small && (
              <Image
                source={{ uri: card.image_small }}
                style={{ width: 120, height: 168, borderRadius: 8 }}
                resizeMode="cover"
              />
            )}
            <View className="flex-1 justify-center gap-1 min-w-0">
              <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
                {card.name}
              </Text>
              {card.set_name && (
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {card.set_name}
                </Text>
              )}
              <Text className="text-xs font-medium text-foreground mt-1">
                {formatPrice(card.market_price)}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: analyticColor }}>
                {analyticText}
              </Text>
            </View>
          </View>

          {/* Condition Type Selection (no label, same as part B) */}
          <View>
            <View className="flex-row flex-nowrap gap-2">
              {CONDITION_TYPES.map((type) => {
                const isDisabled = type === 'Beckett' || type === 'TAG';
                return (
                  <Button
                    key={type}
                    variant={conditionType === type ? 'default' : 'outline'}
                    size="sm"
                    disabled={isDisabled}
                    onPress={() => {
                      if (isDisabled) return;
                      setConditionType(type);
                      if (type === 'Raw') {
                        setGrade(null);
                      } else {
                        setRawCondition(null);
                        setGrade('10');
                      }
                    }}
                    className="min-w-[80px] shrink-0">
                    <Text numberOfLines={1}>{type}</Text>
                  </Button>
                );
              })}
            </View>
          </View>

          {/* Raw Condition Selection */}
          {isRawSelected && (
            <View className="gap-2">
              <Text className="text-sm font-medium mb-2">Card Condition</Text>
              <View className="flex-row flex-wrap gap-2">
                {RAW_CONDITIONS.map((condition) => (
                  <Button
                    key={condition.value}
                    variant={rawCondition === condition.value ? 'default' : 'outline'}
                    size="sm"
                    onPress={() => setRawCondition(condition.value)}
                    className="min-w-[100px]">
                    <Text>{condition.label}</Text>
                  </Button>
                ))}
              </View>
            </View>
          )}

          {/* Grade Selection (label "Grade" like part B) */}
          {conditionType && !isRawSelected && (
            <View className="gap-2">
              <Text className="text-sm font-medium mb-2">Grade</Text>
              <View className="flex-row flex-wrap gap-2">
                {GRADES.map((g) => (
                  <Button
                    key={g}
                    variant={grade === g ? 'default' : 'outline'}
                    size="sm"
                    onPress={() => setGrade(g)}
                    className="min-w-[50px]">
                    <Text>{g}</Text>
                  </Button>
                ))}
              </View>
            </View>
          )}
        </View>

        <DialogFooter>
          <Button onPress={handleAddToTrade} disabled={!canAddToTrade}>
            <Text>Add to Trade</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
