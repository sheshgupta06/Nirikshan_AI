/**
 * Nirikshan AI - Live Camera Scanning Utility Functions
 */

import type { CameraStatus, LiveScanResultSignature } from '../types/camera'
import type { ScanImageResponse } from '../types/scan'

/**
 * Computes a deterministic string signature of meaningful scan result fields.
 * Used to avoid unnecessary UI flickering or re-renders when consecutive camera frames yield identical results.
 */
export function extractResultSignature(res: ScanImageResponse | null): LiveScanResultSignature | null {
  if (!res) return null

  const contains = [...(res.allergen_report?.contains_allergens || [])].sort().join(',')
  const mayContain = [...(res.allergen_report?.may_contain_allergens || [])].sort().join(',')
  const tokens = (res.evaluation?.items || [])
    .map((item) => `${item.ingredient?.canonical_name || item.ingredient?.raw_text || ''}:${item.ingredient?.status || ''}`)
    .sort()
    .join('|')

  return {
    status: res.status,
    ingredientCount: res.sections_summary?.ingredients_detected_count || 0,
    containsAllergens: contains,
    mayContainAllergens: mayContain,
    incompletePrecautionary: Boolean(res.allergen_report?.incomplete_precautionary_advisory),
    ingredientTokens: tokens,
  }
}

/**
 * Determines whether the new scan result contains meaningful changes compared to the previous result.
 * If true, the UI should update; if false, the result is considered stabilized.
 */
export function hasMeaningfulResultChanged(
  prev: ScanImageResponse | null,
  next: ScanImageResponse | null
): boolean {
  if (!prev && !next) return false
  if (!prev && next) return true
  if (prev && !next) return true

  const sigPrev = extractResultSignature(prev)
  const sigNext = extractResultSignature(next)

  if (!sigPrev || !sigNext) return true

  return (
    sigPrev.status !== sigNext.status ||
    sigPrev.ingredientCount !== sigNext.ingredientCount ||
    sigPrev.containsAllergens !== sigNext.containsAllergens ||
    sigPrev.mayContainAllergens !== sigNext.mayContainAllergens ||
    sigPrev.incompletePrecautionary !== sigNext.incompletePrecautionary ||
    sigPrev.ingredientTokens !== sigNext.ingredientTokens
  )
}

/**
 * Maps browser MediaDevices DOMExceptions to friendly user-actionable messages.
 */
export function formatCameraError(err: unknown): { status: CameraStatus; message: string } {
  if (!err) {
    return { status: 'ERROR', message: 'An unknown camera error occurred.' }
  }

  const name = typeof err === 'object' && err !== null && 'name' in err ? String(err.name) : ''
  const rawMsg = err instanceof Error ? err.message : String(err)

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      status: 'PERMISSION_DENIED',
      message:
        'Camera access was denied. Please allow camera permissions in your browser address bar or site settings to use live scanning.',
    }
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      status: 'CAMERA_UNAVAILABLE',
      message:
        'No camera hardware detected on this device. You can still scan packaging using the Image Upload mode.',
    }
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      status: 'ERROR',
      message:
        'Camera is currently in use by another application or tab. Please close other camera apps and try again.',
    }
  }

  if (name === 'OverconstrainedError') {
    return {
      status: 'ERROR',
      message:
        'The requested camera resolution or facing mode is not supported by your camera hardware.',
    }
  }

  return {
    status: 'ERROR',
    message: rawMsg || 'Failed to initialize camera stream. Please try again or use Image Upload.',
  }
}

/**
 * Stops all tracks associated with a MediaStream to ensure the camera hardware light turns off.
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return
  try {
    const tracks = stream.getTracks()
    tracks.forEach((track) => {
      try {
        track.stop()
      } catch {
        // Ignore errors on individual track stop
      }
    })
  } catch {
    // Ignore stream access errors during teardown
  }
}

/**
 * Captures the current video frame onto an offscreen canvas and converts it to a JPEG Blob.
 */
export async function captureVideoFrameAsBlob(
  video: HTMLVideoElement,
  quality: number = 0.85
): Promise<Blob | null> {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return null
  }

  const width = video.videoWidth
  const height = video.videoHeight

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, width, height)

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob)
      },
      'image/jpeg',
      quality
    )
  })
}
