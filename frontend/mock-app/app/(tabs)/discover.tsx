import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/hooks/use-auth-context';

export default function DiscoverScreen() {
  const router = useRouter();
  const { isLoggedIn } = useAuthContext();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        // Navigate to welcome page after sign out
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('Unexpected error signing out:', error);
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-2xl font-bold">Discover</Text>
      <Text className="text-muted-foreground mt-4 text-center">
        Explore and discover new content
      </Text>
      {isLoggedIn && (
        <View className="mt-8 w-full max-w-xs">
          <Button
            onPress={handleSignOut}
            className="w-full"
            variant="outline">
            <Text>Sign Out</Text>
          </Button>
        </View>
      )}
    </View>
  );
}

