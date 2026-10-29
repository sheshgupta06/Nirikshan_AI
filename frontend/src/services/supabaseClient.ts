/**
 * Nirikshan AI - Supabase Cloud Database & Authentication Client
 *
 * Supports both environment-defined credentials (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 * and in-app configured credentials (stored in localStorage for instantaneous zero-restart connection).
 */

import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js'
import type { StoredScan, UserOCRCorrections } from './scanStorage'
import type { ScanImageResponse, UserProfileConfig } from '../types/scan'

// Storage keys for in-app configuration override
const LS_SUPABASE_URL = 'nirikshan_supabase_url'
const LS_SUPABASE_KEY = 'nirikshan_supabase_anon_key'

/**
 * Returns current Supabase credentials from environment or runtime localStorage.
 */
export function getSupabaseCredentials(): { url: string; key: string; isRuntime: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

  const lsUrl = (localStorage.getItem(LS_SUPABASE_URL) || '').trim()
  const lsKey = (localStorage.getItem(LS_SUPABASE_KEY) || '').trim()

  if (lsUrl && lsKey) {
    return { url: lsUrl, key: lsKey, isRuntime: true }
  }

  // Treat placeholder templates as unconfigured
  const isPlaceholderUrl = !envUrl || envUrl.includes('your-project-ref') || envUrl.includes('example.com')
  const isPlaceholderKey = !envKey || envKey.includes('your-anon-public-key')

  if (!isPlaceholderUrl && !isPlaceholderKey) {
    return { url: envUrl, key: envKey, isRuntime: false }
  }

  return { url: '', key: '', isRuntime: false }
}

/**
 * Checks whether valid Supabase credentials have been configured.
 */
export function isSupabaseConfigured(): boolean {
  const creds = getSupabaseCredentials()
  return Boolean(creds.url && creds.key && creds.url.startsWith('https://'))
}

// Global cached client instance
let cachedClient: SupabaseClient | null = null
let lastConfigKey = ''

/**
 * Returns the active Supabase client singleton, or null if unconfigured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials()
  if (!creds.url || !creds.key) {
    cachedClient = null
    return null
  }

  const currentKey = `${creds.url}:::${creds.key}`
  if (!cachedClient || lastConfigKey !== currentKey) {
    try {
      cachedClient = createClient(creds.url, creds.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
      lastConfigKey = currentKey
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e)
      cachedClient = null
    }
  }

  return cachedClient
}

/**
 * Allows the user to save/update their Supabase credentials right from the UI modal.
 */
export function saveRuntimeCredentials(url: string, key: string): void {
  const cleanUrl = url.trim().replace(/\/+$/, '')
  const cleanKey = key.trim()
  if (cleanUrl && cleanKey) {
    localStorage.setItem(LS_SUPABASE_URL, cleanUrl)
    localStorage.setItem(LS_SUPABASE_KEY, cleanKey)
    cachedClient = null
  }
}

/**
 * Clears any runtime credentials and reverts to environment defaults.
 */
export function clearRuntimeCredentials(): void {
  localStorage.removeItem(LS_SUPABASE_URL)
  localStorage.removeItem(LS_SUPABASE_KEY)
  cachedClient = null
}

/**
 * Tests connection to the configured Supabase database by attempting a lightweight query.
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean
  message: string
  latencyMs?: number
}> {
  const client = getSupabaseClient()
  if (!client) {
    return {
      success: false,
      message: 'Supabase credentials are not configured. Please add your Project URL and Anon Key.',
    }
  }

  const start = performance.now()
  try {
    // Attempt to query the scans table or fallback to auth health
    const { error } = await client.from('scans').select('id').limit(1)
    const latency = Math.round(performance.now() - start)

    if (error) {
      // If table does not exist yet, remind user to run the schema script
      if (error.code === '42P01' || error.message.includes('relation "public.scans" does not exist')) {
        return {
          success: true,
          latencyMs: latency,
          message:
            'Connected to Supabase project! Note: Tables are not created yet. Please execute supabase_schema.sql in the Supabase SQL Editor.',
        }
      }
      return {
        success: false,
        latencyMs: latency,
        message: `Supabase error (${error.code || 'UNKNOWN'}): ${error.message}`,
      }
    }

    return {
      success: true,
      latencyMs: latency,
      message: `Successfully connected to Supabase Cloud (${latency}ms)! Ready to store and sync scans.`,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Connection failed: ${errorMsg}`,
    }
  }
}

// ============================================================================
// SUPABASE AUTHENTICATION HELPERS
// ============================================================================

export async function supabaseSignUp(email: string, password: string, fullName: string) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase is not configured.')

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

export async function supabaseSignIn(email: string, password: string) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase is not configured.')

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function supabaseSignOut() {
  const client = getSupabaseClient()
  if (!client) return
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function supabaseGetCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient()
  if (!client) return null
  const { data } = await client.auth.getUser()
  return data.user
}

export async function supabaseGetSession(): Promise<Session | null> {
  const client = getSupabaseClient()
  if (!client) return null
  const { data } = await client.auth.getSession()
  return data.session
}

// ============================================================================
// DATABASE SCAN OPERATIONS
// ============================================================================

interface RawScanRow {
  id: string
  user_id: string | null
  product_name: string
  brand: string | null
  image_url: string | null
  status: 'SUCCESS' | 'UNCLEAR' | 'ERROR'
  modules_requested: 'both' | 'legal_metrology' | 'ingredient_safety'
  raw_extracted_text: string | null
  created_at: string
  updated_at: string
  scan_results?: {
    response_payload: ScanImageResponse
    health_score?: number
    fssai_compliant?: boolean
    legal_metrology_compliant?: boolean
  }[]
  scan_corrections?: {
    corrections: UserOCRCorrections
  }[]
}

/**
 * Fetches all scans from Supabase Cloud with full results and corrections.
 */
export async function fetchScansFromSupabase(): Promise<StoredScan[]> {
  const client = getSupabaseClient()
  if (!client) return []

  try {
    const { data, error } = await client
      .from('scans')
      .select(`
        id,
        user_id,
        product_name,
        brand,
        image_url,
        status,
        modules_requested,
        raw_extracted_text,
        created_at,
        updated_at,
        scan_results (
          response_payload,
          health_score,
          fssai_compliant,
          legal_metrology_compliant
        ),
        scan_corrections (
          corrections
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Could not fetch scans from Supabase:', error.message)
      return []
    }

    const rows = (data || []) as unknown as RawScanRow[]

    return rows.map((row) => {
      const resultObj = row.scan_results && row.scan_results.length > 0 ? row.scan_results[0] : null
      const corrObj = row.scan_corrections && row.scan_corrections.length > 0 ? row.scan_corrections[0] : null

      const sanitizedStatus: 'SUCCESS' | 'UNCLEAR' | 'EMPTY' =
        row.status === 'SUCCESS' ? 'SUCCESS' : row.status === 'UNCLEAR' ? 'UNCLEAR' : 'UNCLEAR'

      // If response_payload was stored, use it; otherwise build a compliant fallback
      const responsePayload: ScanImageResponse =
        resultObj?.response_payload || {
          status: sanitizedStatus,
          image_metadata: {},
          ocr_detected_boxes: [],
          raw_extracted_text: row.raw_extracted_text || '',
          sections_summary: {
            ingredients_detected_count: 0,
            contains_clause_found: false,
            may_contain_clause_found: false,
            may_contain_incomplete: false,
            non_ingredient_lines_filtered: 0,
            raw_ingredients_text: '',
          },
          allergen_report: {
            contains_allergens: [],
            may_contain_allergens: [],
            profile_matches_contains: [],
            profile_matches_may_contain: [],
            incomplete_precautionary_advisory: false,
          },
          evaluation: {
            profile_name: 'Default',
            summary: {
              total_detected: 0,
              allergens_flagged: 0,
              dietary_violations: 0,
              unverified_count: 0,
              unclear_count: 0,
            },
            items: [],
            disclaimer: 'Nirikshan AI screening result.',
          },
          disclaimer: 'For educational and statutory screening purposes only.',
        }

      return {
        id: row.id,
        timestamp: row.created_at,
        productName: row.product_name,
        brand: row.brand || undefined,
        imageUrl: row.image_url || '',
        modulesRequested: row.modules_requested,
        response: responsePayload,
        corrections: corrObj?.corrections,
        status: row.status,
      }
    })
  } catch (err) {
    console.error('Error fetching scans from Supabase:', err)
    return []
  }
}

/**
 * Persists or updates a scan in Supabase Cloud database.
 */
export async function saveScanToSupabase(scan: StoredScan): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const user = (await client.auth.getUser()).data.user
    const userId = user?.id || null

    // 1. Upsert scans master row
    const { error: scanErr } = await client.from('scans').upsert(
      {
        id: scan.id,
        user_id: userId,
        product_name: scan.productName || 'Unknown Packaged Food',
        brand: scan.brand || null,
        image_url: scan.imageUrl || null,
        status: scan.status,
        modules_requested: scan.modulesRequested || 'both',
        raw_extracted_text: scan.response?.raw_extracted_text || '',
        created_at: scan.timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (scanErr) {
      console.error('Failed to upsert scan to Supabase:', scanErr.message)
      return false
    }

    // 2. Upsert scan_results payload
    if (scan.response) {
      const healthScore = scan.response.health_impact_report?.summary_counts?.allergens_flagged !== undefined
        ? Math.max(0, 100 - scan.response.health_impact_report.summary_counts.allergens_flagged * 15)
        : 75
      const fssaiCompliant = scan.response.compliance_report?.summary_counts?.non_compliant_missing === 0
      const metrologyCompliant = scan.response.legal_metrology?.summary_counts?.non_compliant_missing === 0

      const { error: resErr } = await client.from('scan_results').upsert(
        {
          scan_id: scan.id,
          response_payload: scan.response,
          health_score: healthScore,
          fssai_compliant: fssaiCompliant,
          legal_metrology_compliant: metrologyCompliant,
        },
        { onConflict: 'scan_id' }
      )

      if (resErr) {
        console.warn('Failed to upsert scan_results to Supabase:', resErr.message)
      }
    }

    // 3. Upsert scan_corrections if present
    if (scan.corrections && Object.keys(scan.corrections).length > 0) {
      const { error: corrErr } = await client.from('scan_corrections').upsert(
        {
          scan_id: scan.id,
          corrections: scan.corrections,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'scan_id' }
      )

      if (corrErr) {
        console.warn('Failed to upsert scan_corrections to Supabase:', corrErr.message)
      }
    }

    return true
  } catch (err) {
    console.error('Error saving scan to Supabase:', err)
    return false
  }
}

/**
 * Deletes a scan from Supabase Cloud. Foreign key cascade removes scan_results and scan_corrections.
 */
export async function deleteScanFromSupabase(scanId: string): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { error } = await client.from('scans').delete().eq('id', scanId)
    if (error) {
      console.error('Failed to delete scan from Supabase:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Error deleting scan from Supabase:', err)
    return false
  }
}

// ============================================================================
// USER HEALTH PROFILE SYNC
// ============================================================================

export async function fetchSupabaseProfile(userId: string): Promise<Partial<UserProfileConfig> | null> {
  const client = getSupabaseClient()
  if (!client || !userId) return null

  try {
    const { data, error } = await client
      .from('profiles')
      .select('allergies, health_conditions, dietary_preference, watchlist')
      .eq('id', userId)
      .single()

    if (error || !data) return null

    return {
      allergies: data.allergies || '',
      health_conditions: (data.health_conditions || []) as UserProfileConfig['health_conditions'],
      dietary_preference: (data.dietary_preference || '') as UserProfileConfig['dietary_preference'],
      watchlist: data.watchlist || '',
    }
  } catch {
    return null
  }
}

export async function saveSupabaseProfile(userId: string, profile: Partial<UserProfileConfig>): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client || !userId) return false

  try {
    const { error } = await client.from('profiles').upsert(
      {
        id: userId,
        allergies: profile.allergies ?? '',
        health_conditions: profile.health_conditions ?? [],
        dietary_preference: profile.dietary_preference ?? '',
        watchlist: profile.watchlist ?? '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    return !error
  } catch {
    return false
  }
}
