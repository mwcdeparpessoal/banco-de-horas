import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isValid = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL';

export const supabase = isValid
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        signInWithOAuth: () => Promise.resolve({ error: new Error('Supabase não configurado') }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null })
      }
    };
