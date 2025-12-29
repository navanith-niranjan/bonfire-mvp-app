import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export default function GoogleAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // The OAuth flow is handled in the GoogleSignInButton component
    // via openAuthSessionAsync, so this route is mainly a fallback.
    // If we reach here, the session should already be set.
    // Navigate to home after a brief delay to allow session to be processed.
    const timer = setTimeout(() => {
      router.replace('/');
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center">
      <Text>Completing sign in...</Text>
    </View>
  );
}

