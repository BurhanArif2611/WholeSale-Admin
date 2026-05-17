const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = dotenv.parse(envFile);
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function diagnostic() {
  let report = '--- Diagnostic Report ---\n';
  
  const tables = ['stores', 'materials', 'orders'];
  for (const table of tables) {
    const { count: total } = await supabase.from(table).select('*', { count: 'exact', head: true });
    const { count: nullOwner } = await supabase.from(table).select('*', { count: 'exact', head: true }).is('owner_id', null);
    
    report += `${table}: Total=${total}, NULL owner_id=${nullOwner}\n`;
  }

  const session = await supabase.auth.getSession();
  const user = session.data.session?.user;
  report += `\nCurrent Auth User ID: ${user?.id}\n`;
  
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    report += `Profile owner_id: ${profile?.owner_id}\n`;
    
    for (const table of tables) {
       const { count: scoped } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('owner_id', profile?.owner_id || user.id);
       report += `${table} scoped for this user: ${scoped}\n`;
    }
  }
  
  fs.writeFileSync('diagnostic_report.txt', report);
  console.log('Report saved to diagnostic_report.txt');
}

diagnostic();
