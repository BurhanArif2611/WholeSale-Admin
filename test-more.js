const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testMore() {
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@wholesale.com',
    password: 'password123'
  });
  
  const statuses = ['Pending', 'pending', 'Completed', 'completed', 'Cancelled', 'cancelled', 'New', 'new', 'Processing', 'processing', 'Delivered', 'delivered', 'Returned', 'returned'];
  
  for (const status of statuses) {
     const { error } = await supabase.from('orders').insert({
        store_id: 'cec2cf8f-8983-48c2-95aa-5965065951a8',
        owner_id: user ? user.id : '11111111-1111-1111-1111-111111111111',
        status: status,
        grand_total: 100,
        date: '2026-04-03'
     });

     if (error) {
        console.log(status + " -> " + error.message);
     } else {
        console.log(status + " -> SUCCESS!");
     }
  }
}
testMore();
