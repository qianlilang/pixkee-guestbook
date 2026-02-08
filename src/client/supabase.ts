// @ts-ignore
import { createClient } from '@supabase/supabase-js';

// Avoid standard Node types validation issues
declare const process: {
    env: {
        [key: string]: string | undefined;
    }
};

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
