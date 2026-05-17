const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testStatus() {
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@wholesale.com', // just guessing or we can use the anon key if RLS allows or we use service role...
    password: 'password123'
  }); // I might not need auth if I can just catch the check constraint error before RLS. Wait, RLS might block insert before check constraint.
  
  const statuses = ['New', 'new', 'NEW', 'Pending', 'pending', 'PENDING', 'Unpaid', 'unpaid', 'Paid', 'paid'];
  
  for (const status of statuses) {
     const { error } = await supabase.from('orders').insert({
        store_id: '11111111-1111-1111-1111-111111111111',
        owner_id: '11111111-1111-1111-1111-111111111111',
        status: status,
        grand_total: 100,
        date: '2026-04-03'
     });

     if (error) {
        console.log("Status: " + status + " -> " + error.message);
     } else {
        console.log("Status: " + status + " -> SUCCESS!");
     }
  }
}
testStatus();
