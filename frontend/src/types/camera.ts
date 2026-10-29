/**
 * Nirikshan AI - Live Camera Scanning Types
 */


export type CameraStatus =
  | 'OFF'
  | 'REQUESTING_PERMISSION'
  | 'SCANNING'
  | 'PAUSED'
  | 'PERMISSION_DENIED'
  | 'CAMERA_UNAVAILABLE'
  | 'ERROR'

export interface CameraScanOptions {
  intervalMs: number // Throttle interval in milliseconds (default 2000ms)
  targetFacingMode: 'environment' | 'user'
  idealWidth: number
  idealHeight: number
  jpegQuality: number
}

export interface LiveCameraState {
  status: CameraStatus
  errorMessage: string | null
  isEvaluatingFrame: boolean
  lastScanTimestamp: number | null
  totalFramesEvaluated: number
  hasStableResult: boolean
}

export interface LiveScanResultSignature {
  ingredientCount: number
  containsAllergens: string
  mayContainAllergens: string
  incompletePrecautionary: boolean
  ingredientTokens: string
  status: string
}
