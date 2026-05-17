const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = dotenv.parse(envFile);
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function diagnostic() {
  console.log('--- Diagnostic Report ---');
  
  const tables = ['stores', 'materials', 'orders'];
  for (const table of tables) {
    const { count: total, error: e1 } = await supabase.from(table).select('*', { count: 'exact', head: true });
    const { count: nullOwner, error: e2 } = await supabase.from(table).select('*', { count: 'exact', head: true }).is('owner_id', null);
    
    console.log(`${table}: Total=${total}, NULL owner_id=${nullOwner}`);
    if (e1) console.error(`  Error total: ${e1.message}`);
    if (e2) console.error(`  Error null: ${e2.message}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  console.log('\nCurrent Auth User ID:', user?.id);
  
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    console.log('Profile owner_id:', profile?.owner_id);
    
    for (const table of tables) {
       const { count: scoped, error: e3 } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('owner_id', profile?.owner_id || user.id);
       console.log(`${table} scoped for this user: ${scoped}`);
    }
  }
}

diagnostic();
