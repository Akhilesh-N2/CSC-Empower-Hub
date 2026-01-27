import { createClient } from '@supabase/supabase-js'

// GO TO: Supabase Dashboard -> Settings (Gear Icon) -> API
// Copy "Project URL" and "anon" (public) Key
const supabaseUrl = 'https://tpvrauyvtnogsygkkwlz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwdnJhdXl2dG5vZ3N5Z2trd2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTQ1NDUsImV4cCI6MjA4NTA5MDU0NX0.aHtWuPL2R82o4DJnAvzw9hxBhTyVEnxkO-njft2cxwg'

export const supabase = createClient(supabaseUrl, supabaseKey)