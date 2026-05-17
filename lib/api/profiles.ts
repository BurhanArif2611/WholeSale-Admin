// lib/api/profiles.ts
import { supabase } from '../supabase';
import { throwOnError } from './helpers';
import type { Profile, CreateProfilePayload } from '@/types';

/**
 * Fetch a user profile by ID.
 */
export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Expected for new users
    console.error('[api] fetchProfile error:', error);
    throw error;
  }
  return data;
}

/**
 * Create or update a user profile record.
 */
export async function createProfile(payload: CreateProfilePayload): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
      
  if (error) {
    console.error('[api] createProfile error:', error);
    throw error;
  }
  return data as Profile;
}

/**
 * Fetch all salesmen belonging to a specific owner.
 */
export async function fetchSalesmen(ownerId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('role', 'salesman');

  throwOnError(data, error);
  return (data as Profile[]) || [];
}

/**
 * Disconnect a salesman from a firm.
 */
export async function removeSalesmanFromFirm(salesmanId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      owner_id: null,
      role: null // Reset role so they go back to onboarding
    })
    .eq('id', salesmanId);

  if (error) {
    console.error('[api] removeSalesmanFromFirm error:', error);
    throw new Error('Failed to remove salesman');
  }
}

/**
 * Fetch statistics for all salesmen in a firm.
 */
export async function fetchSalesmenStats(ownerId: string): Promise<any[]> {
  const { data: salesmen, error: se } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('owner_id', ownerId)
    .eq('role', 'salesman');
  
  if (se) throw se;

  const stats = await Promise.all(salesmen.map(async (s) => {
    // Note: requires 'salesman_id' in 'orders' table for real stats in prod
    return { ...s, total_sales: 0 };
  }));

  return stats;
}

/**
 * Resolve an owner profile by their 6-character firm code prefix.
 */
export async function fetchOwnerByFirmCode(code: string): Promise<Profile | null> {
  if (!code || code.length < 6) return null;
  
  const prefix = code.trim().toLowerCase();
  
  // Surgical UUID range search (most reliable for prefix-matching UUIDs in Postgres)
  const minID = `${prefix}00000000-0000-0000-0000-000000000000`.slice(0, 8) + '-0000-0000-0000-000000000000';
  const maxID = `${prefix}ffffffff-ffff-ffff-ffff-ffffffffffff`.slice(0, 8) + '-ffff-ffff-ffff-ffffffffffff';

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .gte('id', minID)
    .lte('id', maxID)
    .limit(1);

  if (error) {
    console.error('[api] fetchOwnerByFirmCode error:', error);
    return null;
  }
  
  const owner = data && data.length > 0 ? data[0] : null;
  
  if (owner) {
     if (owner.role !== 'owner') {
       throw new Error('This firm owner has not completed their setup yet.');
     }
     return owner as Profile;
  }

  return null;
}
