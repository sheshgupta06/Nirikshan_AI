/**
 * Nirikshan AI - Backend API Client
 */

import type { ScanImageResponse, UserProfileConfig } from '../types/scan'

// Base URL is configurable via environment variable VITE_API_BASE_URL.
// Defaults to empty string to use Vite dev server proxy (/api -> http://127.0.0.1:8000).
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

/**
 * Checks the status of the FastAPI backend health gateway.
 */
export async function checkHealth(): Promise<{ status: string; message?: string }> {
  const url = `${API_BASE_URL}/api/v1/health`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Health check failed with HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Uploads one or multiple food label images to POST /api/v1/analyze (PRD Section 12.3) with multipart/form-data.
 * Supports both single file and multi-file (e.g. Front & Back packaging panels) analysis.
 */
export async function scanFoodLabelImage(
  imageInput: File | File[],
  profile: UserProfileConfig,
  modules: 'both' | 'legal_metrology' | 'ingredient_safety' = 'both',
  jurisdiction: string = 'IN'
): Promise<ScanImageResponse> {
  const url = `${API_BASE_URL}/api/v1/analyze`
  const formData = new FormData()

  const files = Array.isArray(imageInput) ? imageInput : [imageInput]
  if (files.length === 1) {
    formData.append('file', files[0])
    formData.append('files', files[0])
  } else {
    // Append each file to 'files' array for multi-panel extraction
    files.forEach((f) => {
      formData.append('files', f)
    })
    // Backwards compatibility fallback with primary file
    if (files[0]) {
      formData.append('file', files[0])
    }
  }

  formData.append('modules', modules)
  formData.append('jurisdiction', jurisdiction)
  formData.append('profile_name', profile.profile_name || 'Default')

  if (profile.allergies.trim()) {
    formData.append('allergies', profile.allergies.trim())
  }
  if (profile.health_conditions && profile.health_conditions.length > 0) {
    formData.append('health_conditions', profile.health_conditions.join(','))
  }
  if (profile.dietary_preference.trim()) {
    formData.append('dietary_preference', profile.dietary_preference.trim())
  }
  if (profile.watchlist.trim()) {
    formData.append('watchlist', profile.watchlist.trim())
  }

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}: ${res.statusText}`
    try {
      const errorJson = await res.json()
      if (errorJson && errorJson.detail) {
        errorDetail = errorJson.detail
      }
    } catch {
      // Non-JSON error payload, retain HTTP statusText
    }
    throw new Error(errorDetail)
  }

  return res.json()
}

/**
 * Looks up reference product details from Open Food Facts by barcode.
 */
export async function lookupProductByBarcode(barcode: string): Promise<import('../types/scan').OFFProductReference> {
  const url = `${API_BASE_URL}/api/v1/scan/barcode/${encodeURIComponent(barcode)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Barcode lookup failed with HTTP ${res.status}`)
  }
  return res.json()
}

