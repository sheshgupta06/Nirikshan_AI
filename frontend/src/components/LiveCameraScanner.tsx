/**
 * Nirikshan AI - Dedicated Live Camera Scanning Component
 */

import { useRef } from 'react'
import { useLiveCameraScanner } from '../hooks/useLiveCameraScanner'
import type { ScanImageResponse, UserProfileConfig } from '../types/scan'

export interface LiveCameraScannerProps {
  profile: UserProfileConfig
  onScanResult: (result: ScanImageResponse, isNew: boolean) => void
  onScanError: (error: string) => void
  onSwitchToUploadMode: () => void
}

export function LiveCameraScanner({
  profile,
  onScanResult,
  onScanError,
  onSwitchToUploadMode,
}: LiveCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const {
    cameraState,
    intervalMs,
    setIntervalMs,
    startCamera,
    stopCamera,
    pauseScanning,
    resumeScanning,
    triggerManualScan,
  } = useLiveCameraScanner({
    videoRef,
    profile,
    options: { intervalMs: 2000 },
    onScanResult,
    onScanError,
  })

  const isLive = cameraState.status === 'SCANNING' || cameraState.status === 'PAUSED'

  return (
    <div className="live-camera-scanner-wrapper">
      {/* Viewfinder Viewport */}
      <div className={`camera-viewport-card ${isLive ? 'viewport-live' : 'viewport-idle'}`}>
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`live-video-element ${isLive ? 'video-active' : 'video-hidden'}`}
        />

        {/* Reticle & Overlay (Visible when streaming) */}
        {isLive ? (
          <div className="viewfinder-overlay">
            {/* Viewfinder Frame / Reticle */}
            <div className={`scanning-reticle ${cameraState.status === 'SCANNING' ? 'reticle-active' : 'reticle-paused'}`}>
              <div className="reticle-corner corner-tl"></div>
              <div className="reticle-corner corner-tr"></div>
              <div className="reticle-corner corner-bl"></div>
              <div className="reticle-corner corner-br"></div>

              {cameraState.status === 'SCANNING' && (
                <div className="scanning-laser-line"></div>
              )}

              <div className="reticle-guide-pill">
                <span>Align ingredient &amp; allergen panel inside frame • Hold steady</span>
              </div>
            </div>

            {/* Top Telemetry Overlay */}
            <div className="viewfinder-top-bar">
              <div className="live-badge-group">
                {cameraState.status === 'SCANNING' && (
                  <span className="live-status-pill pill-active">
                    <span className="pulse-indicator"></span>
                    <span>Live Scanning (Every {(intervalMs / 1000).toFixed(1)}s)</span>
                  </span>
                )}
                {cameraState.status === 'PAUSED' && (
                  <span className="live-status-pill pill-paused">
                    <span>⏸️ Scanner Paused</span>
                  </span>
                )}
                {cameraState.isEvaluatingFrame && (
                  <span className="live-evaluating-pill">
                    <span className="spinner-mini"></span>
                    <span>Evaluating live frame...</span>
                  </span>
                )}
              </div>

              <div className="frame-counter-pill">
                <span>Frames scanned: {cameraState.totalFramesEvaluated}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Placeholder View before camera is active */
          <div className="camera-placeholder-ui">
            <div className="camera-icon-large">📹</div>
            <h3 className="camera-placeholder-title">Live Zero-Click Food Label Scanner</h3>
            <p className="camera-placeholder-desc">
              Point your camera at the packaged food ingredient panel. Nirikshan AI will evaluate ingredients and detect allergens continuously without requiring photo snaps.
            </p>
            <div className="camera-feature-badges">
              <span>Auto-capture frame</span>
              <span>2.0s OCR Throttle</span>
              <span>FSSAI Rules Engine</span>
            </div>
            <button
              type="button"
              className="start-camera-cta-btn"
              onClick={startCamera}
              disabled={cameraState.status === 'REQUESTING_PERMISSION'}
              id="start-camera-main-btn"
            >
              {cameraState.status === 'REQUESTING_PERMISSION' ? (
                <>
                  <span className="spinner-border"></span>
                  <span>Requesting Camera Permission...</span>
                </>
              ) : (
                <>
                  <span>📹</span>
                  <span>Start Live Camera Scan</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Camera Controls Bar */}
      {isLive && (
        <div className="camera-controls-bar">
          <div className="controls-left">
            {cameraState.status === 'SCANNING' ? (
              <button
                type="button"
                className="control-btn pause-btn"
                onClick={pauseScanning}
                id="pause-camera-btn"
              >
                <span>⏸️</span>
                <span>Pause Scanning</span>
              </button>
            ) : (
              <button
                type="button"
                className="control-btn resume-btn"
                onClick={resumeScanning}
                id="resume-camera-btn"
              >
                <span>▶️</span>
                <span>Resume Scanning</span>
              </button>
            )}

            <button
              type="button"
              className="control-btn manual-snap-btn"
              onClick={triggerManualScan}
              disabled={cameraState.isEvaluatingFrame}
              id="manual-frame-scan-btn"
              title="Immediately evaluate the current video frame"
            >
              <span>⚡</span>
              <span>Scan Current Frame</span>
            </button>

            <button
              type="button"
              className="control-btn stop-btn"
              onClick={stopCamera}
              id="stop-camera-btn"
            >
              <span>⏹️</span>
              <span>Stop Camera</span>
            </button>
          </div>

          <div className="controls-right">
            <label htmlFor="scan-interval-select" className="interval-label">
              Frequency:
            </label>
            <select
              id="scan-interval-select"
              className="interval-select"
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
            >
              <option value={1500}>1.5s (Faster)</option>
              <option value={2000}>2.0s (Default)</option>
              <option value={3000}>3.0s (Steady)</option>
            </select>
          </div>
        </div>
      )}

      {/* Helpful Live Scan Guide Banner */}
      <div className="live-guidance-banner">
        <span className="guidance-icon">💡</span>
        <div className="guidance-text">
          <strong>Live Scanning Tips:</strong> Hold the packaging steady with good lighting. Live OCR thrives on sharp focus and readable fonts. For medical or clinical decisions, always physically inspect packaging directly.
        </div>
      </div>

      {/* Error or Permission Denied Message */}
      {cameraState.errorMessage && (
        <div className="camera-error-banner" role="alert">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h4 className="error-title">
              {cameraState.status === 'PERMISSION_DENIED'
                ? 'Camera Access Denied'
                : cameraState.status === 'CAMERA_UNAVAILABLE'
                ? 'Camera Device Unavailable'
                : 'Camera Stream Error'}
            </h4>
            <p className="error-desc">{cameraState.errorMessage}</p>
            <div className="error-actions-group">
              <button
                type="button"
                className="retry-camera-btn"
                onClick={startCamera}
              >
                🔄 Retry Camera
              </button>
              <button
                type="button"
                className="switch-upload-btn"
                onClick={onSwitchToUploadMode}
              >
                📁 Switch to Image Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
