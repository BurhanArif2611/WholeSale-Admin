// lib/api/materials.ts
import { supabase } from '../supabase';
import { throwOnError } from './helpers';
import type { Material, CreateMaterialPayload } from '@/types';

/**
 * Fetch all materials for a specific owner.
 */
export async function fetchMaterials(ownerId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materials')
    .select(`id, name, base_price, unit, created_at`)
    .eq('owner_id', ownerId)
    .order('name', { ascending: true });
  const mats = throwOnError(data, error) as Material[];
  return mats;
}

/**
 * Create a new material record.
 */
export async function createMaterial(payload: CreateMaterialPayload): Promise<Material> {
  const { data: mat, error: me } = await supabase
    .from('materials')
    .insert({ 
      name: payload.name, 
      base_price: payload.base_price, 
      unit: payload.unit,
      owner_id: payload.owner_id
    })
    .select().single();
  throwOnError(mat, me);

  return mat as Material;
}

/**
 * Update an existing material record.
 */
export async function updateMaterial(id: string, payload: Partial<CreateMaterialPayload>): Promise<void> {
  if (payload.name || payload.base_price || payload.unit) {
    const { error } = await supabase.from('materials')
      .update({ name: payload.name, base_price: payload.base_price, unit: payload.unit })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }
}

/**
 * Delete a single material by ID.
 */
export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Bulk delete all materials for a specific owner.
 */
export async function deleteAllMaterials(ownerId: string): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
}
