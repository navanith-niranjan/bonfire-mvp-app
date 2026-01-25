import { View, TouchableOpacity, TextInput } from 'react-native';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react-native';
import { useRef } from 'react';

export interface SmartCardSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  isSearching?: boolean;
  className?: string;
}

/**
 * Reusable smart card search input component with search icon and clear button
 */
export function SmartCardSearchInput({
  value,
  onChangeText,
  onClear,
  placeholder = "Lugia V Alt Art",
  isSearching = false,
  className = "w-full",
}: SmartCardSearchInputProps) {
  const inputRef = useRef<TextInput>(null);

  const handleClear = () => {
    onChangeText('');
    onClear?.();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <View className={`relative ${className} flex-row items-center`}>
      <View className="absolute left-3 z-10">
        <Search size={18} color="#999" />
      </View>
      <Input
        ref={inputRef}
        placeholder={placeholder}
        className={`${className} pl-10 pr-10`}
        value={value}
        onChangeText={onChangeText}
        blurOnSubmit={false}
      />
      {value.length > 0 && !isSearching && (
        <TouchableOpacity
          onPress={handleClear}
          className="absolute right-3 z-10"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={18} color="#999" />
        </TouchableOpacity>
      )}
    </View>
  );
}
