const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findOwner() {
  const prefix = 'a8d875';
  console.log('Searching for prefix:', prefix);
  
  // Try finding ALL profiles and filter locally to see if it exists at all
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role');
    
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  
  console.log('Total profiles found:', data.length);
  const matching = data.filter(p => p.id.toLowerCase().startsWith(prefix));
  
  if (matching.length > 0) {
    console.log('Matching profiles found:', matching);
  } else {
    console.log('No profiles matching prefix found.');
    // List first 5 profiles to see format
    console.log('First 5 profiles:', data.slice(0, 5));
  }
}

findOwner();
