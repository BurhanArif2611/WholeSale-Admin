
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking Supabase connection...');
  
  const { data: stores, error: se } = await supabase.from('stores').select('*').limit(1);
  if (se) return console.error('Error fetching stores:', se.message);
  console.log('Stores table accessible. Columns:', Object.keys(stores[0] || {}).join(', '));

  const { data: materials, error: me } = await supabase.from('materials').select('*').limit(1);
  if (me) return console.error('Error fetching materials:', me.message);
  console.log('Materials table accessible. Columns:', Object.keys(materials[0] || {}).join(', '));

  const { data: orders, error: oe } = await supabase.from('orders').select('*').limit(1);
  if (oe) return console.error('Error fetching orders:', oe.message);
  console.log('Orders table accessible. Columns:', Object.keys(orders[0] || {}).join(', '));

  const { data: items, error: ie } = await supabase.from('order_items').select('*').limit(1);
  if (ie) return console.error('Error fetching order_items:', ie.message);
  console.log('Order Items table accessible. Columns:', Object.keys(items[0] || {}).join(', '));

  const { data: profiles, error: pe } = await supabase.from('profiles').select('*').limit(1);
  if (pe) return console.error('Error fetching profiles:', pe.message);
  console.log('Profiles table accessible. Columns:', Object.keys(profiles[0] || {}).join(', '));
}

checkSchema().catch(console.error);
