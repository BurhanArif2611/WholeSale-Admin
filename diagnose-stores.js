const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  const targetName = 'myv'; // Example from your screen
  console.log('--- Database Diagnosis ---');
  
  // 1. Check if name exists ANYWHERE (to see if constraint is global)
  const { data: allMatches, error: allErr } = await supabase
    .from('stores')
    .select('id, name, owner_id')
    .ilike('name', targetName);
    
  if (allErr) {
    console.error('Error checking all stores:', allErr);
  } else {
    console.log(`Found ${allMatches.length} stores matching "${targetName}" globally:`, allMatches);
  }

  // 2. Check current user's stores specifically
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
      const { data: myMatches } = await supabase
        .from('stores')
        .select('id, name')
        .eq('owner_id', session.user.id)
        .ilike('name', targetName);
      console.log(`Found ${myMatches ? myMatches.length : 0} stores matching "${targetName}" for YOUR account.`);
  } else {
      console.log('No session found for current script runner.');
  }
}

diagnose();
