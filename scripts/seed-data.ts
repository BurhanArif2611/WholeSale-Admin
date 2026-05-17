// scripts/seed-data.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('🌱 Seeding sample data...');

  // 1. Seed Stores
  const stores = [
    { name: 'Raj Stores', area: 'Alkapuri', phone: '9876543210', extra_charges: 50, margin_percentage: 5 },
    { name: 'Mehta Traders', area: 'Sayajigunj', phone: '9876543211', extra_charges: 0, margin_percentage: 3 },
    { name: 'City Mart', area: 'Vasna', phone: '9876543212', extra_charges: 100, margin_percentage: 10 },
  ];

  for (const store of stores) {
    const { error } = await supabase.from('stores').insert(store);
    if (error && error.code !== '23505') { // Ignore unique constraint errors
        console.error(`Error seeding store ${store.name}:`, error.message);
    }
  }
  console.log('✅ Stores check/seed complete');

  // 2. Seed Materials
  const materials = [
    { name: 'Wheat Flour', base_price: 45, unit: 'kg' },
    { name: 'Sugar', base_price: 38, unit: 'kg' },
    { name: 'Rice', base_price: 60, unit: 'kg' },
    { name: 'Cooking Oil', base_price: 120, unit: 'ltr' },
    { name: 'Salt', base_price: 15, unit: 'pcs' },
  ];

  for (const mat of materials) {
    const { error } = await supabase.from('materials').insert(mat);
    if (error && error.code !== '23505') {
        console.error(`Error seeding material ${mat.name}:`, error.message);
    }
  }
  console.log('✅ Materials check/seed complete');

  // Fetch inserted materials to get IDs for tiers if needed
  const { data: insertedMaterials } = await supabase.from('materials').select('*');

  console.log('🚀 Seeding complete!');
}

seed();
