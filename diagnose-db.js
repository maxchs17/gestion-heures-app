const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Fetching users...');
    const { data, error } = await supabase
      .from('users')
      .select('username, password_hash');

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      console.log('Success! Found users:', data.length);
      data.forEach(u => {
        console.log(`- User: ${u.username}`);
        console.log(`  Hash starts with: ${u.password_hash.substring(0, 10)}...`);
      });
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();
