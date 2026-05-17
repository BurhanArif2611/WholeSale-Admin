
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function diagnose() {
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log("Checking for valid store...");
  const { data: stores } = await supabase.from('stores').select('id').limit(1);
  if (!stores || stores.length === 0) {
    console.log("No stores found to test with.");
    return;
  }
  const storeId = stores[0].id;
  console.log(`Testing with Store ID: ${storeId}`);

  const cases = ['New', 'Pending', 'Delivered', 'Completed', 'Cancelled', 'Processing'];
  for (const status of cases) {
    console.log(`Trying status: '${status}'...`);
    const { error } = await supabase.from('orders').insert({
      store_id: storeId,
      grand_total: 0,
      status: status,
      date: new Date().toISOString().split('T')[0]
    }).select();

    if (error) {
      console.log(`  FAILED: ${error.message}`);
    } else {
      console.log(`  SUCCESS!`);
      // Clean up the test row
      await supabase.from('orders').delete().eq('status', status).eq('grand_total', 0);
    }
  }
}

diagnose();
