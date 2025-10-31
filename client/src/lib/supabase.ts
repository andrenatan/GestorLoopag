import { createClient } from '@supabase/supabase-js';

// Initialize with empty client - will be configured async
let supabaseInstance: ReturnType<typeof createClient> | null = null;

// Fetch config from server and create client
const initializeSupabase = async () => {
  try {
    const response = await fetch('/api/config/supabase');
    const config = await response.json();
    
    if (!config.url || !config.anonKey) {
      console.error('Missing Supabase configuration from server');
      return null;
    }
    
    supabaseInstance = createClient(config.url, config.anonKey);
    return supabaseInstance;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    return null;
  }
};

// Get or create supabase instance
export const getSupabase = async () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  return await initializeSupabase();
};

// Export promise-based getter
export const supabase = await initializeSupabase().then(client => {
  if (!client) {
    throw new Error('Failed to initialize Supabase client');
  }
  return client;
});
