import { View, Image, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';

const LOGO = {
  light: require('@/assets/images/react-native-reusables-light.png'),
  dark: require('@/assets/images/react-native-reusables-dark.png'),
};

export function AppLoadingScreen() {
  const { colorScheme } = useColorScheme();

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Image 
        source={LOGO[colorScheme ?? 'light']} 
        style={{ 
          width: 200, 
          height: 200,
          marginBottom: 32,
        }} 
        resizeMode="contain" 
      />
      <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#000'} />
    </View>
  );
}
