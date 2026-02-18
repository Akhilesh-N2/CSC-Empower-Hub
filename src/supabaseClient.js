import { createClient } from '@supabase/supabase-js'

// Load variables from .env file (Vite uses import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Error handling to help you debug if keys are missing
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Anon Key. Check your .env file!')
}

export const supabase = createClient(supabaseUrl, supabaseKey)