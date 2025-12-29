import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { TouchableOpacity, View, Image } from 'react-native';
import Constants from 'expo-constants';
import { Image as ExpoImage } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

type GoogleSignInButtonProps = {
  variant?: 'full' | 'icon';
};

export function GoogleSignInButton({ variant = 'full' }: GoogleSignInButtonProps = {}) {
  const router = useRouter();
  const schemeValue = Constants.expoConfig?.scheme;
  const scheme: string = Array.isArray(schemeValue) ? schemeValue[0] : (schemeValue || 'mock-app');
  const redirectToResult = makeRedirectUri({
    scheme: scheme,
    path: 'google-auth',
  });
  
  // Ensure redirectUrl is a string (makeRedirectUri can return string | string[])
  const redirectUrl: string = Array.isArray(redirectToResult) ? redirectToResult[0] : redirectToResult;

  function extractParamsFromUrl(url: string) {
    try {
      const parsedUrl = new URL(url);
      const hash = parsedUrl.hash.substring(1); // Remove the leading '#'
      const params = new URLSearchParams(hash);

      return {
        access_token: params.get('access_token'),
        expires_in: parseInt(params.get('expires_in') || '0'),
        refresh_token: params.get('refresh_token'),
        token_type: params.get('token_type'),
        provider_token: params.get('provider_token'),
        code: params.get('code'),
      };
    } catch (error) {
      console.error('Error extracting params from URL:', error);
      return {
        access_token: null,
        expires_in: 0,
        refresh_token: null,
        token_type: null,
        provider_token: null,
        code: null,
      };
    }
  }

  async function onSignInButtonPress() {
    console.debug('onSignInButtonPress - start', { redirectUrl });
    
    try {
      const res = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: true,
        },
      });

      if (res.error) {
        console.error('OAuth error:', res.error);
        return;
      }

      const googleOAuthUrl = res.data.url;

      if (!googleOAuthUrl) {
        console.error('no oauth url found!');
        return;
      }

      console.debug('Opening OAuth URL:', googleOAuthUrl);

      // Use openAuthSessionAsync with proper configuration
      const result = await WebBrowser.openAuthSessionAsync(
        googleOAuthUrl,
        redirectUrl,
        {
          showInRecents: false, // Don't show in browser recents
          preferEphemeralSession: false, // Allow cookies/session
        }
      ).catch((err: any) => {
        console.error('onSignInButtonPress - openAuthSessionAsync - error', { err });
        return null;
      });

      console.debug('onSignInButtonPress - openAuthSessionAsync - result', { result });

      if (result && result.type === 'success' && result.url) {
        console.debug('onSignInButtonPress - openAuthSessionAsync - success');
        const params = extractParamsFromUrl(result.url);
        console.debug('onSignInButtonPress - extracted params', { 
          hasAccessToken: !!params.access_token,
          hasRefreshToken: !!params.refresh_token 
        });

        if (params.access_token && params.refresh_token) {
          console.debug('onSignInButtonPress - setSession');
          const { data, error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          console.debug('onSignInButtonPress - setSession - result', { 
            hasSession: !!data.session,
            error 
          });
          
          if (error) {
            console.error('onSignInButtonPress - setSession - error', error);
          } else if (data.session) {
            // Navigate to home on successful sign in
            router.replace('/');
          }
          return;
        } else {
          console.error('onSignInButtonPress - setSession - failed: missing tokens', params);
        }
      } else if (result && result.type === 'cancel') {
        console.log('User cancelled OAuth flow');
      } else {
        console.error('onSignInButtonPress - openAuthSessionAsync - failed', result);
      }
    } catch (error) {
      console.error('onSignInButtonPress - unexpected error', error);
    }
  }

  // to warm up the browser
  useEffect(() => {
    WebBrowser.warmUpAsync();

    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  if (variant === 'icon') {
    return (
      <Button
        variant="outline"
        className="p-5"
        onPress={onSignInButtonPress}
      >
        <Image
          className="size-5"
          source={{ uri: 'https://img.clerk.com/static/google.png?width=160' }}
        />
      </Button>
    );
  }

  return (
    <TouchableOpacity
      onPress={onSignInButtonPress}
      className="flex-row items-center justify-center bg-white border border-border rounded-md py-2.5 px-4"
      activeOpacity={0.8}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2, // For Android shadow
      }}
    >
      <ExpoImage
        source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
        style={{ width: 24, height: 24, marginRight: 10 }}
      />
      <Text className="text-base text-muted-foreground font-Inter" style={{ fontWeight: '500' }}>
        Sign in with Google
      </Text>
    </TouchableOpacity>
  );
}

