import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AppWalkthrough } from '@/components/walkthrough/AppWalkthrough';
import { useLanguage } from '@/hooks/useLanguage';
import { markWalkthroughComplete } from '@/lib/onboarding/walkthroughStorage';

export default function WalkthroughScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const finish = useCallback(async () => {
    await markWalkthroughComplete();
    router.replace('/login');
  }, [router]);

  return (
    <AppWalkthrough
      t={t}
      onComplete={finish}
      onSkip={finish}
    />
  );
}
