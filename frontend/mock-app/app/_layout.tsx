import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useFonts } from 'expo-font';
import AuthProvider from '@/providers/auth-provider';
import { WalletProvider } from '@/providers/wallet-provider';
import { InventoryProvider } from '@/providers/inventory-provider';
import { SplashScreenController } from '@/components/splash-screen-controller';
import { useAuthContext } from '@/hooks/use-auth-context';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Separate RootNavigator so we can access the AuthContext
function RootNavigator() {
  const { isLoggedIn } = useAuthContext();

  return (
    <Stack screenOptions={{ 
      headerShown: false,
      gestureEnabled: false,
    }}>
      {/* Root index - handles auth redirect */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      
      {/* Auth screens - shown before login */}
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-reset-code" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="google-auth" />
      
      {/* Main app with tabs - shown after login */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
            {/* Submit flow */}
            <Stack.Screen name="submit/partA" options={{ headerShown: false }} />
            <Stack.Screen name="submit/partB" options={{ headerShown: false }} />
            <Stack.Screen name="submit/partC" options={{ headerShown: false }} />
      
      {/* Trade flow */}
      <Stack.Screen name="trade/deck" options={{ headerShown: false }} />
      <Stack.Screen name="trade/select-inventory" options={{ headerShown: false }} />
      
      {/* Fallback */}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  const [loaded] = useFonts({
    'Gloock-Regular': require('../assets/fonts/Gloock-Regular.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter_24pt-Regular.ttf'),
    'Inter-Light': require('../assets/fonts/Inter_24pt-Light.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter_24pt-Bold.ttf'),
    'PlayfairDisplay-Regular': require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
    'PlayfairDisplay-Bold': require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
    'PlayfairDisplay-Italic': require('../assets/fonts/PlayfairDisplay-Italic.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <AuthProvider>
        <WalletProvider>
          <InventoryProvider>
            <SplashScreenController />
            <RootNavigator />
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <PortalHost />
          </InventoryProvider>
        </WalletProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
