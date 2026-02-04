import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { TouchableOpacity, View, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

type GoogleSignInButtonProps = {
  variant?: 'full' | 'icon';
};

export function GoogleSignInButton({ variant = 'full' }: GoogleSignInButtonProps = {}) {
  const router = useRouter();
  
  // Use interstitial (Railway) when EXPO_PUBLIC_OAUTH_CALLBACK_URL is set so Android isn't stuck in the browser.
  // In Expo Go, append ?scheme=exp so "Open app" uses exp:// and opens Expo Go; in dev/prod builds use default mock-app.
  const isExpoGo = Constants.appOwnership === 'expo';
  let oauthCallbackUrl = process.env.EXPO_PUBLIC_OAUTH_CALLBACK_URL?.trim();
  if (oauthCallbackUrl && !/^https?:\/\//i.test(oauthCallbackUrl)) {
    oauthCallbackUrl = 'https://' + oauthCallbackUrl;
  }
  const schemeValue = Constants.expoConfig?.scheme;
  const scheme: string = Array.isArray(schemeValue) ? schemeValue[0] : (schemeValue || 'mock-app');

  const redirectToResult = makeRedirectUri(isExpoGo ? undefined : { scheme });
  let redirectTo: string = Array.isArray(redirectToResult) ? redirectToResult[0] : redirectToResult;
  if (oauthCallbackUrl) {
    redirectTo = isExpoGo ? `${oauthCallbackUrl}?scheme=exp` : oauthCallbackUrl;
  } else if (!isExpoGo && (redirectTo.startsWith('exp://') || redirectTo.includes('localhost') || redirectTo.includes('192.168'))) {
    redirectTo = `${scheme}://`;
  }

  const createSessionFromUrl = async (
    url: string,
    preParsedParams?: Record<string, string> | null
  ) => {
    let params = preParsedParams;
    if (params == null) {
      try {
        const result = QueryParams.getQueryParams(url);
        if (result.errorCode) throw new Error(result.errorCode);
        params = result.params;
      } catch (err) {
        const hashIdx = url.indexOf('#');
        if (hashIdx >= 0) {
          const searchParams = new URLSearchParams(url.slice(hashIdx + 1));
          params = Object.fromEntries(searchParams.entries());
        } else {
          throw err;
        }
      }
    }
    const { access_token, refresh_token } = params;
    if (!access_token) return;

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
    return data.session;
  };

  // Handle deep links from OAuth callbacks only
  // Only process URLs that contain OAuth tokens (access_token)
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;
    let params: Record<string, string> | null = null;
    try {
      const result = QueryParams.getQueryParams(url);
      params = result.params;
    } catch (err) {
      // Android can throw from URL() with custom schemes (exp://); fallback: parse fragment manually
      console.warn('getQueryParams failed, trying fragment parse:', err);
      const hashIdx = url.indexOf('#');
      if (hashIdx >= 0) {
        const searchParams = new URLSearchParams(url.slice(hashIdx + 1));
        params = Object.fromEntries(searchParams.entries());
      }
    }
    if (!params?.access_token) return;
    console.debug('Processing OAuth callback from deep link:', url);
    createSessionFromUrl(url, params)
      .then(() => router.replace('/'))
      .catch((error) => {
        console.error('Error processing OAuth callback:', error);
      });
  }, [url, router]);

  async function onSignInButtonPress() {
    console.debug('onSignInButtonPress - start', { redirectTo });
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        return;
      }

      if (!data?.url) {
        console.error('no oauth url found!');
        return;
      }

      console.debug('Opening OAuth URL:', data.url);

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      ).catch((err: any) => {
        console.error('onSignInButtonPress - openAuthSessionAsync - error', { err });
        return null;
      });

      console.debug('onSignInButtonPress - openAuthSessionAsync - result', { result });

      if (result?.type === 'success' && result.url) {
        console.debug('onSignInButtonPress - openAuthSessionAsync - success');
        await createSessionFromUrl(result.url);
        // Navigate to home on successful sign in
        router.replace('/');
      } else if (result?.type === 'cancel') {
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

