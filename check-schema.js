const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

// Load .env
const envFile = fs.readFileSync('.env', 'utf8');
const env = dotenv.parse(envFile);

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log('Checking stores table...');
  const { data: storeData, error: storeError } = await supabase.from('stores').select('*').limit(1);
  if (storeError) {
    console.error('Stores Error:', storeError.message);
  } else if (storeData && storeData[0]) {
    console.log('Stores Columns:', Object.keys(storeData[0]));
  } else {
    console.log('Stores table empty or inaccessible.');
  }

  console.log('\nChecking orders table...');
  const { data: orderData, error: orderError } = await supabase.from('orders').select('*').limit(1);
  if (orderError) {
    console.error('Orders Error:', orderError.message);
  } else if (orderData && orderData[0]) {
    console.log('Orders Columns:', Object.keys(orderData[0]));
  }

  console.log('\nChecking materials table...');
  const { data: matData, error: matError } = await supabase.from('materials').select('*').limit(1);
  if (matError) {
    console.error('Materials Error:', matError.message);
  } else if (matData && matData[0]) {
    console.log('Materials Columns:', Object.keys(matData[0]));
  }
}

checkSchema();
