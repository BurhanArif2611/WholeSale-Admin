const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function getStats() {
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@wholesale.com',
    password: 'password123'
  }); // I might fail this

  const { data, error } = await supabase.from('orders').select('status').limit(100);
  if (data) {
     const st = new Set(data.map(d => d.status));
     console.log("Existing DB Statuses: ", Array.from(st));
  } else {
     console.log(error);
  }
}
getStats();
