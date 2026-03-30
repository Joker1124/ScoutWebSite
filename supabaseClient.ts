import { createClient } from '@supabase/supabase-js';

// Configuration provided by user
const supabaseUrl = 'https://ogtqwjoczzvqeezngwnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ndHF3am9jenp2cWVlem5nd25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODgwNzUsImV4cCI6MjA4MDk2NDA3NX0.cdDCU2057PdDrIH7vWzeUNvyB2_tBvh9z4K4g6cIKjs';

export const supabase = createClient(supabaseUrl, supabaseKey);