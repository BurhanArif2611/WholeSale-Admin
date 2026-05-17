// hooks/useRefreshOnFocus.ts
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

export function useRefreshOnFocus(refreshFn: () => void | Promise<void>) {
  useFocusEffect(
    useCallback(() => {
      let isStillFocused = true;
      
      const trigger = async () => {
        try {
          await refreshFn();
        } catch (e) {
          console.warn('[useRefreshOnFocus] Refresh failed:', e);
        }
      };

      if (isStillFocused) trigger();
      
      return () => {
        isStillFocused = false;
      };
    }, [refreshFn])
  );
}
