import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pgqawzeejmgbwfrirtvw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Z6n7RNbiclvtK4fpx8T7aw_gkgoJ0Ej';

// Log for easier debugging if keys are missing or suspicious
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing!');
}

if (supabaseAnonKey.startsWith('sb_publishable_')) {
    console.warn('Using a publishable key. Ensure your Supabase project supports this or switch to a legacy anon key if you encounter issues.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
