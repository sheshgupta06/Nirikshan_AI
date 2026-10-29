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
 * Uploads a food label image to POST /api/v1/scan/image with multipart/form-data.
 */
export async function scanFoodLabelImage(
  imageFile: File,
  profile: UserProfileConfig
): Promise<ScanImageResponse> {
  const url = `${API_BASE_URL}/api/v1/scan/image`
  const formData = new FormData()

  // The backend expects the file parameter named exactly "file"
  formData.append('file', imageFile)
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

