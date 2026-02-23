import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pgqawzeejmgbwfrirtvw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Z6n7RNbiclvtK4fpx8T7aw_gkgoJ0Ej';

// Log for easier debugging if keys are missing or suspicious
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing!');
}

console.log('Supabase Client Initializing with URL:', supabaseUrl);
if (supabaseAnonKey.startsWith('sb_publishable_')) {
    console.warn('Using a new format publishable key (sb_).');
} else if (supabaseAnonKey.startsWith('eyJ')) {
    console.log('Using a legacy format JWT key (eyJ).');
} else {
    console.error('Unknown Supabase key format detected!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
