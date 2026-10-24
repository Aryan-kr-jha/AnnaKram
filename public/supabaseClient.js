// public/supabaseClient.js - Centralized Supabase Client for AnnaKram iPDS Portal

(function (window) {
  'use strict';

  // Default configuration fallback (mirrored from backend environment)
  const DEFAULT_SUPABASE_URL = 'https://ehqztjogzwevtugixynv.supabase.co';
  const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocXp0am9nd3dldnR1Z2l4eW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkzNTk4OTIsImV4cCI6MjA1NTkzNTg5Mn0.placeholder_anon_key';

  window.SUPABASE_CONFIG = window.SUPABASE_CONFIG || {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY
  };

  let supabaseInstance = null;
  let initPromise = null;

  /**
   * Initialize or retrieve the global Supabase client instance.
   * Loads config dynamically from Express /api/auth/config when possible.
   */
  async function initSupabase() {
    if (supabaseInstance) return supabaseInstance;

    // Verify @supabase/supabase-js CDN is loaded
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.warn('[SUPABASE] @supabase/supabase-js library is not loaded. Please include the CDN script tag.');
      return null;
    }

    try {
      // Direct config check: if running on separate local dev port (e.g. port 3002, 5500), target Express port 9765
      const isLocalDevServer = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
        window.location.port !== '9765';
      const configUrl = isLocalDevServer
        ? 'http://localhost:9765/api/auth/config'
        : '/api/auth/config';

      const res = await fetch(configUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.supabaseUrl) window.SUPABASE_CONFIG.url = data.supabaseUrl;
        if (data.supabaseAnonKey) window.SUPABASE_CONFIG.anonKey = data.supabaseAnonKey;
      }
    } catch (err) {
      // Expected when static server is isolated or backend isn't immediately reachable
    }

    const { url, anonKey } = window.SUPABASE_CONFIG;
    window.SUPABASE_CONFIG.isPlaceholder = (!anonKey || anonKey.includes('placeholder_anon_key') || anonKey.length < 50);

    try {
      supabaseInstance = window.supabase.createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });
      window.supabaseClient = supabaseInstance;
      return supabaseInstance;
    } catch (err) {
      console.warn('[SUPABASE] Initialization notice:', err.message);
      return null;
    }
  }

  /**
   * Asynchronous getter ensuring Supabase client is ready
   */
  window.getSupabaseClient = function () {
    if (!initPromise) {
      initPromise = initSupabase();
    }
    return initPromise;
  };

  /**
   * Helper to retrieve active session from Supabase
   */
  window.getSupabaseSession = async function () {
    const sb = await window.getSupabaseClient();
    if (!sb) return null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        console.warn('[SUPABASE] getSession error:', error.message);
        return null;
      }
      return data?.session || null;
    } catch (e) {
      return null;
    }
  };

  /**
   * Helper to construct Authorization header for secure backend fetches
   */
  window.getAuthHeaders = async function () {
    const session = await window.getSupabaseSession();
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` };
    }
    const token = sessionStorage.getItem('ipds_auth_token');
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  };

  /**
   * Unified Sign Out helper
   */
  window.signOutUser = async function () {
    try {
      const sb = await window.getSupabaseClient();
      if (sb) {
        await sb.auth.signOut();
      }
    } catch (e) {
      console.warn('[SUPABASE] signOut notice:', e.message);
    }
    sessionStorage.clear();
    window.location.replace('login.html');
  };

  // Automatic Authorization header injection for backend API requests
  const originalFetch = window.fetch;
  window.fetch = async function (input, init = {}) {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      // Only attach to internal /api/ routes, excluding auth config endpoint
      if (url.includes('/api/') && !url.includes('/api/auth/config')) {
        init = init || {};
        let headers = init.headers ? new Headers(init.headers) : new Headers();
        if (!headers.has('Authorization')) {
          const authHeaders = await window.getAuthHeaders();
          if (authHeaders.Authorization) {
            headers.set('Authorization', authHeaders.Authorization);
          }
        }
        init.headers = headers;
      }
    } catch (e) {
      // Non-blocking fallback
    }
    return originalFetch.call(this, input, init);
  };

  // Account-Based Namespacing Helpers (Zero Backend Touch)
  window.getAccountStorageKey = function (prefix) {
    let email = 'default';
    try {
      const u = JSON.parse(sessionStorage.getItem('ipds_auth_user') || '{}');
      if (u.email) email = u.email;
      else if (u.entity_id) email = u.entity_id;
    } catch (e) {}
    const safeId = String(email).toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `annakram_${prefix}_${safeId}`;
  };

  window.getAccountData = function (prefix, fallback = []) {
    try {
      const key = window.getAccountStorageKey(prefix);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  window.saveAccountData = function (prefix, data) {
    try {
      const key = window.getAccountStorageKey(prefix);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('[STORAGE] Failed to save account isolated state:', e);
    }
  };

  // Eagerly trigger client initialization
  if (typeof window.supabase !== 'undefined') {
    window.getSupabaseClient();
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      window.getSupabaseClient();
    });
  }

})(window);
