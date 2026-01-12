import { useAuthContext } from '@/hooks/use-auth-context';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export function SplashScreenController() {
  const { isLoading } = useAuthContext();

  useEffect(() => {
    // Prevent auto-hide when component mounts
    SplashScreen.preventAutoHideAsync().catch(() => {
      // Ignore errors - might already be prevented
    });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Hide splash screen when auth is done loading
      // Use a small delay to ensure native splash is ready, especially on iOS
      const timer = setTimeout(async () => {
        try {
          await SplashScreen.hideAsync();
        } catch (error: any) {
          // Silently catch errors - splash screen might already be hidden
          // This is common in development, on web, or when expo-router manages it
          // The error "No native splash screen registered" is harmless and can be ignored
          if (__DEV__ && error?.message?.includes('No native splash screen')) {
            // This is expected in some scenarios, don't log it
            return;
          }
          if (__DEV__) {
            console.debug('Splash screen hide error (can be ignored):', error);
          }
        }
      }, Platform.OS === 'ios' ? 300 : 150);

      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return null;
}

