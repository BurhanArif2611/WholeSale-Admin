import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { loadUserProfile, type UserProfileData } from '@/lib/auth/userProfile';
import { DEFAULT_SHOP, type ShopInfo } from '@/lib/receipt/receiptTypes';

export function useShopProfile() {
  const { user } = useAuth();
  const [shop, setShop] = useState<ShopInfo>(DEFAULT_SHOP);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setShop(DEFAULT_SHOP);
      setLoading(false);
      return;
    }
    setLoading(true);
    const profile: UserProfileData | null = await loadUserProfile(user.id);
    setShop({
      name: profile?.businessName?.trim() || DEFAULT_SHOP.name,
      address: profile?.address?.trim() || '',
      phone: profile?.phone?.trim() || '',
    });
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { shop, loading, reload };
}
