const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'bbf29153-c6ab-4e78-b6f1-b45fc4697b8a';

async function testUpsert() {
  console.log('Testing upsert for user:', userId);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert([{
        id: userId,
        role: 'owner',
        full_name: 'Debug User'
      }])
      .select();

    if (error) {
      console.error('Upsert error:', error);
    } else {
      console.log('Upsert success:', data);
    }
  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

testUpsert();
