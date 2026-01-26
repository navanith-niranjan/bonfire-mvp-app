import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthContext } from '@/hooks/use-auth-context';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';

export default function Index() {
  const { isLoggedIn, isLoading } = useAuthContext();
  const router = useRouter();
  const segments = useSegments();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (isLoading) {
      hasRedirected.current = false;
      return;
    }

    // Prevent multiple redirects
    if (hasRedirected.current) return;

    // If user is logged in, redirect to discover screen (root of tabs)
    if (isLoggedIn) {
      // Redirect if not in tabs or not on discover screen
      if (segments[0] !== '(tabs)' || segments[1] !== 'discover') {
        hasRedirected.current = true;
        router.replace('/(tabs)/discover');
      }
    } else {
      // If user is not logged in, redirect to welcome
      if (segments[0] !== 'welcome') {
        hasRedirected.current = true;
        router.replace('/welcome');
      }
    }
  }, [isLoggedIn, isLoading, segments, router]);

  // Show loading indicator while checking auth
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  return null;
}

