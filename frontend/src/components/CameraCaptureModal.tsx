import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, X, RotateCcw, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react'

interface CameraCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File, previewUrl: string) => void
  slotLabel?: string
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  slotLabel = 'Food Packet Side',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isStartingCamera, setIsStartingCamera] = useState(false)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    stopStream()
    setCameraError(null)
    setIsStartingCamera(true)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser. Please upload an image file instead.')
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err: unknown) {
      console.warn('Camera stream request failed:', err)
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not access camera. Please allow camera permissions in your browser or upload an image file.'
      setCameraError(msg)
    } finally {
      setIsStartingCamera(false)
    }
  }, [facingMode, stopStream])

  // Start stream when modal opens; clean up on close
  useEffect(() => {
    if (isOpen) {
      setCapturedBlobUrl(null)
      setCapturedFile(null)
      startCamera()
    } else {
      stopStream()
    }

    return () => {
      stopStream()
    }
  }, [isOpen, startCamera, stopStream])

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw the current video frame onto canvas
    ctx.drawImage(video, 0, 0, width, height)

    // Convert canvas snapshot to high-quality JPEG Blob
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const timestamp = Date.now()
        const cleanName = `${slotLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.jpg`
        const file = new File([blob], cleanName, { type: 'image/jpeg' })
        const url = URL.createObjectURL(blob)

        setCapturedFile(file)
        setCapturedBlobUrl(url)
        stopStream()
      },
      'image/jpeg',
      0.92
    )
  }

  const handleRetake = () => {
    if (capturedBlobUrl) {
      URL.revokeObjectURL(capturedBlobUrl)
    }
    setCapturedBlobUrl(null)
    setCapturedFile(null)
    startCamera()
  }

  const handleConfirmPhoto = () => {
    if (capturedFile && capturedBlobUrl) {
      onCapture(capturedFile, capturedBlobUrl)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0B1522] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between text-white bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Capture {slotLabel}</h3>
              <p className="text-xs text-slate-400">Position the packet clearly under good lighting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 bg-black min-h-[320px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          {/* Hidden Canvas for Drawing Snapshot */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Live Video Preview (when not frozen) */}
          {!capturedBlobUrl && (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full max-h-[55vh] object-contain"
              />

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-emerald-400/60 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                <div className="flex justify-between">
                  <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400"></span>
                  <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400"></span>
                </div>
                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-emerald-300 text-xs font-medium border border-emerald-500/30">
                    Align {slotLabel} here
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400"></span>
                  <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400"></span>
                </div>
              </div>
            </>
          )}

          {/* Frozen Snapshot Preview */}
          {capturedBlobUrl && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedBlobUrl}
                alt="Captured food packet"
                className="w-full h-full max-h-[55vh] object-contain"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-emerald-500/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Photo Captured</span>
              </div>
            </div>
          )}

          {/* Camera Starting / Loading Indicator */}
          {isStartingCamera && !capturedBlobUrl && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3 text-white">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm font-medium">Opening camera stream...</p>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && !capturedBlobUrl && (
            <div className="absolute inset-0 p-6 bg-slate-950/95 flex flex-col items-center justify-center gap-3 text-center text-white">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <p className="text-sm font-bold text-rose-400">Camera Access Error</p>
              <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4">
          {!capturedBlobUrl ? (
            <>
              {/* Flip camera button */}
              <button
                type="button"
                onClick={handleFlipCamera}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-2 text-xs font-medium"
                title="Switch Camera (Front/Back)"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Flip Camera</span>
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={isStartingCamera || !!cameraError}
                className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 disabled:opacity-40"
                title="Take Photo"
              >
                <div className="w-13 h-13 rounded-full border-2 border-white/80 group-hover:border-white flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white group-hover:scale-90 transition-transform" />
                </div>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {/* Retake Button */}
              <button
                type="button"
                onClick={handleRetake}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold transition-colors border border-slate-700 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Photo</span>
              </button>

              {/* Use This Photo Button */}
              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Use This Photo</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

