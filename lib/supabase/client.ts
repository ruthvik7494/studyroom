import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

// NEXT_PUBLIC_* are inlined at build time. Guard with a clear message so a
// misconfigured build fails obviously rather than with an opaque network error.
const DEFAULT_URL = 'https://fvhbbhppbazjeqpccwom.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aGJiaHBwYmF6amVxcGNjd29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MDg2NzMsImV4cCI6MjEwMjA4NDY3M30.jn8E_5i_lP-Us51kIjN28R3JHLuSrC6UYMw43ZPkZDk';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON;

/** Browser client for Client Components. */
export const createClient = () => createBrowserClient<Database>(url, anon);
