import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  try {
    console.log('Testing login with credentials...');
    console.log('Email: admin@operations.com');
    console.log('Password: AdminPassword123!\n');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@operations.com',
      password: 'AdminOperations1234',
    });

    if (error) {
      console.error('Login failed:', error.message);
      console.log('\nPossible causes:');
      console.log('1. Email/password incorrect');
      console.log('2. Email not confirmed');
      console.log('3. User not created');
      return;
    }

    console.log('✅ Login successful!');
    console.log('\nUser details:');
    console.log('- ID:', data.user.id);
    console.log('- Email:', data.user.email);
    console.log('- Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('\nSession token:', data.session.access_token.substring(0, 20) + '...');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();