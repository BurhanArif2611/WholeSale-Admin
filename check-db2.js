const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function diagnose() {
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );

  const cases = ['Pending', 'Completed', 'Cancelled', 'New', 'Unpaid', 'PROCESSING'];
  for (const status of cases) {
    const { error } = await supabase.from('orders').insert({
      store_id: '00000000-0000-0000-0000-000000000000',
      owner_id: '00000000-0000-0000-0000-000000000000',
      grand_total: 0,
      status: status,
      date: new Date().toISOString().split('T')[0]
    });

    if (error) {
       console.log(status + " => " + error.message);
    } else {
       console.log(status + " => SUCCESS");
    }
  }
}

diagnose();
