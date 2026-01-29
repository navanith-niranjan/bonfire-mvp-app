import { PropsWithChildren } from 'react';
import { useAppLoading } from '@/hooks/use-app-loading';
import { AppLoadingScreen } from '@/components/app-loading-screen';

type ScreenWrapperProps = PropsWithChildren<{
  /** If true, also wait for cards to load (for discover screen) */
  waitForCards?: boolean;
}>;

/**
 * Wrapper component that shows loading screen until all data is loaded
 * Use this to wrap screen content
 */
export function ScreenWrapper({ children, waitForCards = false }: ScreenWrapperProps) {
  const isLoading = useAppLoading({ waitForCards });

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}
