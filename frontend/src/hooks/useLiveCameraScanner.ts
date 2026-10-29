/**
 * Nirikshan AI - Custom React Hook for Live Camera Scanning
 *
 * Coordinates:
 * 1. navigator.mediaDevices.getUserMedia() stream lifecycle
 * 2. Request throttling and strict overlap prevention (no concurrent requests)
 * 3. Offscreen canvas frame extraction to JPEG Blob
 * 4. Submission to the backend POST /api/v1/scan/image endpoint
 * 5. Meaningful result comparison to stabilize UI and prevent unnecessary flickering
 * 6. Full MediaStream track cleanup on stop/pause/unmount
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { scanFoodLabelImage } from '../services/api'
import type { CameraScanOptions, CameraStatus, LiveCameraState } from '../types/camera'
import type { ScanImageResponse, UserProfileConfig } from '../types/scan'
import {
  captureVideoFrameAsBlob,
  formatCameraError,
  hasMeaningfulResultChanged,
  stopMediaStream,
} from '../utils/cameraUtils'

const DEFAULT_OPTIONS: CameraScanOptions = {
  intervalMs: 2000,
  targetFacingMode: 'environment',
  idealWidth: 1280,
  idealHeight: 720,
  jpegQuality: 0.85,
}

export interface UseLiveCameraScannerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  profile: UserProfileConfig
  options?: Partial<CameraScanOptions>
  onScanResult: (result: ScanImageResponse, isNew: boolean) => void
  onScanError?: (error: string) => void
}

export function useLiveCameraScanner({
  videoRef,
  profile,
  options = {},
  onScanResult,
  onScanError,
}: UseLiveCameraScannerProps) {
  const mergedOptions: CameraScanOptions = { ...DEFAULT_OPTIONS, ...options }

  const [cameraState, setCameraState] = useState<LiveCameraState>({
    status: 'OFF',
    errorMessage: null,
    isEvaluatingFrame: false,
    lastScanTimestamp: null,
    totalFramesEvaluated: 0,
    hasStableResult: false,
  })

  const [intervalMs, setIntervalMs] = useState<number>(mergedOptions.intervalMs)

  // Internal references to avoid stale closure issues in timer loops
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRequestInFlightRef = useRef<boolean>(false)
  const lastResultRef = useRef<ScanImageResponse | null>(null)
  const isComponentMountedRef = useRef<boolean>(true)
  const statusRef = useRef<CameraStatus>('OFF')
  const profileRef = useRef<UserProfileConfig>(profile)

  // Keep profileRef synchronized
  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  // Keep statusRef synchronized
  const updateStatus = useCallback((newStatus: CameraStatus, errMsg: string | null = null) => {
    statusRef.current = newStatus
    setCameraState((prev) => ({
      ...prev,
      status: newStatus,
      errorMessage: errMsg,
    }))
  }, [])

  /**
   * Captures the current video frame and sends it to the backend scan endpoint.
   * Ensures that overlapping requests never execute concurrently.
   */
  const processFrame = useCallback(async () => {
    // 1. Guard against non-scanning status or absent video
    if (statusRef.current !== 'SCANNING') {
      return
    }

    const videoEl = videoRef.current
    if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth || !videoEl.videoHeight) {
      return
    }

    // 2. Strict In-Flight Lock: never allow overlapping requests
    if (isRequestInFlightRef.current) {
      return
    }

    isRequestInFlightRef.current = true
    setCameraState((prev) => ({ ...prev, isEvaluatingFrame: true }))

    try {
      const blob = await captureVideoFrameAsBlob(videoEl, mergedOptions.jpegQuality)
      if (!blob || !isComponentMountedRef.current) {
        return
      }

      const frameFile = new File([blob], `live_frame_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      })

      // Send to existing backend endpoint
      const response = await scanFoodLabelImage(frameFile, profileRef.current)

      if (!isComponentMountedRef.current) {
        return
      }

      // 3. Meaningful Change Comparison
      const isNewMeaningfulData = hasMeaningfulResultChanged(lastResultRef.current, response)
      if (isNewMeaningfulData) {
        lastResultRef.current = response
      }

      setCameraState((prev) => ({
        ...prev,
        lastScanTimestamp: Date.now(),
        totalFramesEvaluated: prev.totalFramesEvaluated + 1,
        hasStableResult: !isNewMeaningfulData,
      }))

      onScanResult(response, isNewMeaningfulData)
    } catch (err: unknown) {
      if (!isComponentMountedRef.current) return
      const msg = err instanceof Error ? err.message : 'Live scan evaluation failed'
      if (onScanError) {
        onScanError(msg)
      }
    } finally {
      isRequestInFlightRef.current = false
      if (isComponentMountedRef.current) {
        setCameraState((prev) => ({ ...prev, isEvaluatingFrame: false }))
      }
    }
  }, [videoRef, mergedOptions.jpegQuality, onScanResult, onScanError])

  /**
   * Schedule the next frame capture tick after the specified interval.
   */
  const scheduleNextTick = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (statusRef.current !== 'SCANNING') {
      return
    }

    timerRef.current = setTimeout(async () => {
      await processFrame()
      if (statusRef.current === 'SCANNING') {
        scheduleNextTick()
      }
    }, intervalMs)
  }, [intervalMs, processFrame])

  /**
   * Starts the browser camera stream and initiates the live OCR capture loop.
   */
  const startCamera = useCallback(async () => {
    // Check browser support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      updateStatus(
        'CAMERA_UNAVAILABLE',
        'Camera API (getUserMedia) is not supported by your browser or environment. Please use Image Upload mode or connect over HTTPS/localhost.'
      )
      return
    }

    // Stop any existing stream
    if (streamRef.current) {
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }

    updateStatus('REQUESTING_PERMISSION', null)

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: mergedOptions.targetFacingMode },
        width: { ideal: mergedOptions.idealWidth },
        height: { ideal: mergedOptions.idealHeight },
      },
      audio: false,
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (!isComponentMountedRef.current) {
        stopMediaStream(stream)
        return
      }

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch {
          // Play request might be interrupted by stop
        }
      }

      updateStatus('SCANNING', null)
    } catch (err: unknown) {
      if (!isComponentMountedRef.current) return
      const { status, message } = formatCameraError(err)
      updateStatus(status, message)
      if (onScanError) {
        onScanError(message)
      }
    }
  }, [mergedOptions, updateStatus, videoRef, onScanError])

  /**
   * Stops the camera stream, turns off camera hardware light, and clears all timers.
   */
  const stopCamera = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (streamRef.current) {
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    isRequestInFlightRef.current = false
    updateStatus('OFF', null)
  }, [updateStatus, videoRef])

  /**
   * Pauses the OCR evaluation loop while maintaining the live video preview.
   */
  const pauseScanning = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    updateStatus('PAUSED', null)
  }, [updateStatus])

  /**
   * Resumes the OCR evaluation loop on the existing video preview.
   */
  const resumeScanning = useCallback(() => {
    if (statusRef.current === 'PAUSED' && streamRef.current) {
      updateStatus('SCANNING', null)
    }
  }, [updateStatus])

  /**
   * Triggers an immediate one-off frame capture.
   */
  const triggerManualScan = useCallback(async () => {
    if (statusRef.current === 'SCANNING' || statusRef.current === 'PAUSED') {
      const prevStatus = statusRef.current
      statusRef.current = 'SCANNING'
      await processFrame()
      statusRef.current = prevStatus
    }
  }, [processFrame])

  // When status transitions to SCANNING, start scheduling ticks
  useEffect(() => {
    if (cameraState.status === 'SCANNING') {
      scheduleNextTick()
    } else if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [cameraState.status, scheduleNextTick])

  // Lifecycle cleanup on unmount
  useEffect(() => {
    isComponentMountedRef.current = true
    return () => {
      isComponentMountedRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (streamRef.current) {
        stopMediaStream(streamRef.current)
        streamRef.current = null
      }
    }
  }, [])

  return {
    cameraState,
    intervalMs,
    setIntervalMs,
    startCamera,
    stopCamera,
    pauseScanning,
    resumeScanning,
    triggerManualScan,
  }
}
