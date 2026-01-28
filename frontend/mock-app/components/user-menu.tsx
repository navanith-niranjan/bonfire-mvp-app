import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { TriggerRef } from '@rn-primitives/popover';
import { LogOutIcon, SettingsIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/hooks/use-auth-context';

export function UserMenu() {
  const popoverTriggerRef = React.useRef<TriggerRef>(null);
  const router = useRouter();
  const { session, profile } = useAuthContext();

  // Get user info from session
  const userAvatarUrl = session?.user?.user_metadata?.avatar_url || 
                       session?.user?.user_metadata?.picture || 
                       null;
  const userName = session?.user?.user_metadata?.full_name || 
                  session?.user?.user_metadata?.name ||
                  session?.user?.email?.split('@')[0] ||
                  'User';
  
  // Get initials for fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  const initials = getInitials(userName);

  async function onSignOut() {
    popoverTriggerRef.current?.close();
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
  }

  return (
    <Popover>
      <PopoverTrigger asChild ref={popoverTriggerRef}>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <UserAvatar avatarUrl={userAvatarUrl} initials={initials} userName={userName} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        alignOffset={8}
        side="bottom" 
        sideOffset={12}
        className="w-56 p-4 border-0"
        style={{
          backgroundColor: '#000000',
          borderWidth: 0,
        }}>
        <View className="gap-5">
          <Text className="font-medium text-white text-xl">{userName}</Text>
          
          <View className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="justify-start px-0 opacity-50"
              onPress={() => {
                // Disabled - no action
              }}>
              <Icon as={SettingsIcon} className="size-4 text-white/60" />
              <Text className="text-white/60">Manage Account</Text>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="justify-start px-0"
              onPress={onSignOut}>
              <Icon as={LogOutIcon} className="size-4 text-white" />
              <Text className="text-white">Sign Out</Text>
            </Button>
          </View>
        </View>
      </PopoverContent>
    </Popover>
  );
}

function UserAvatar({ 
  avatarUrl, 
  initials, 
  userName,
  className, 
  ...props 
}: { 
  avatarUrl: string | null;
  initials: string;
  userName: string;
  className?: string;
} & Omit<React.ComponentProps<typeof Avatar>, 'alt'>) {
  return (
    <Avatar alt={`${userName}'s avatar`} className={cn('size-8', className)} {...props}>
      {avatarUrl ? (
        <AvatarImage source={{ uri: avatarUrl }} />
      ) : null}
      <AvatarFallback className="bg-muted">
        <Text className="text-xs font-medium">{initials}</Text>
      </AvatarFallback>
    </Avatar>
  );
}
