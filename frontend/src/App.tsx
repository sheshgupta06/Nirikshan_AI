import React, { useEffect, useRef, useState } from 'react'
import './App.css'
import { LiveCameraScanner } from './components/LiveCameraScanner'
import { API_BASE_URL, checkHealth, scanFoodLabelImage } from './services/api'
import type {
  ScanImageResponse,
  ScanLifecycleStatus,
  UserProfileConfig,
} from './types/scan'

interface HealthState {
  loading: boolean
  status: 'idle' | 'connected' | 'error'
  data: { status?: string; message?: string } | null
  error: string | null
  latencyMs: number | null
}

const ALLERGY_CHIPS = [
  { id: 'soy', label: 'Soy' },
  { id: 'wheat', label: 'Wheat' },
  { id: 'milk', label: 'Milk' },
  { id: 'peanut', label: 'Peanut' },
  { id: 'tree_nut', label: 'Tree Nuts' },
  { id: 'mustard', label: 'Mustard' },
]

const CONDITION_CHIPS = [
  { id: 'celiac', label: 'Coeliac Disease', desc: 'Autoimmune gluten avoidance (wheat, barley, rye)' },
  { id: 'diabetes', label: 'Diabetes', desc: 'Blood-glucose & carbohydrate monitoring' },
  { id: 'hypertension', label: 'Hypertension', desc: 'Sodium-restricted diet (<2000 mg/day)' },
  { id: 'ckd', label: 'Chronic Kidney Disease (CKD)', desc: 'Individualized renal sodium filtration' },
]

const DEFAULT_PROFILE: UserProfileConfig = {
  profile_name: 'Default Profile',
  allergies: '',
  health_conditions: [],
  dietary_preference: '',
  watchlist: '',
}

export default function App() {
  // Mode: 'upload' or 'camera'
  const [activeScanMode, setActiveScanMode] = useState<'upload' | 'camera'>('upload')

  // Backend Health Telemetry
  const [health, setHealth] = useState<HealthState>({
    loading: false,
    status: 'idle',
    data: null,
    error: null,
    latencyMs: null,
  })

  // Profile Configuration (Session memory only, never stored on disk or logged)
  const [profile, setProfile] = useState<UserProfileConfig>(DEFAULT_PROFILE)
  const [showProfileDrawer, setShowProfileDrawer] = useState<boolean>(false)

  const toggleAllergy = (allergyId: string) => {
    const current = profile.allergies
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean)
    const exists = current.includes(allergyId)
    const updated = exists ? current.filter((a) => a !== allergyId) : [...current, allergyId]
    setProfile((prev) => ({ ...prev, allergies: updated.join(', ') }))
  }

  const toggleCondition = (conditionId: string) => {
    const current = profile.health_conditions || []
    const exists = current.includes(conditionId)
    const updated = exists ? current.filter((c) => c !== conditionId) : [...current, conditionId]
    setProfile((prev) => ({ ...prev, health_conditions: updated }))
  }

  // Scan State & Explicit Lifecycle Status
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [scanLifecycle, setScanLifecycle] = useState<ScanLifecycleStatus>('IDLE')
  const [scanResult, setScanResult] = useState<ScanImageResponse | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [showOcrBoxes, setShowOcrBoxes] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const pingHealth = async () => {
    setHealth((prev) => ({ ...prev, loading: true, error: null }))
    const start = performance.now()
    try {
      const data = await checkHealth()
      const latency = Math.round(performance.now() - start)
      setHealth({
        loading: false,
        status: 'connected',
        data,
        error: null,
        latencyMs: latency,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      setHealth({
        loading: false,
        status: 'error',
        data: null,
        error: message,
        latencyMs: null,
      })
    }
  }

  useEffect(() => {
    pingHealth()
  }, [])

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanError('Please select a valid image file (JPEG, PNG, or WebP).')
      setScanLifecycle('ERROR')
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    const objectUrl = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(objectUrl)
    // Clear previous results on selecting a different image
    setScanResult(null)
    setScanError(null)
    setScanLifecycle('READY_FOR_ANALYSIS')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleResetScan = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    setScanResult(null)
    setScanError(null)
    setScanLifecycle('IDLE')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const loadSampleLabel = async () => {
    try {
      const res = await fetch('/sample_label.png')
      if (!res.ok) {
        throw new Error('Sample label image not found')
      }
      const blob = await res.blob()
      const file = new File([blob], 'sample_label.png', { type: 'image/png' })
      handleFileSelect(file)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load sample label image.'
      setScanError(msg)
      setScanLifecycle('ERROR')
    }
  }

  const executeScan = async () => {
    if (!selectedFile) {
      setScanError('Please select or drop a product label image first.')
      setScanLifecycle('ERROR')
      return
    }

    setIsScanning(true)
    setScanLifecycle('SCANNING')
    setScanError(null)

    try {
      const response = await scanFoodLabelImage(selectedFile, profile)
      setScanResult(response)
      setScanLifecycle('SCAN_COMPLETE')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image scan request failed'
      setScanError(msg)
      setScanLifecycle('ERROR')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="nirikshan-container">
      {/* Top Banner / Disclaimer */}
      <div className="disclaimer-ribbon">
        <span className="ribbon-pill">FSSAI Reference Mode</span>
        <span>
          Educational label analysis tool. Always verify physical packaging for clinical dietary and medical decisions.
        </span>
      </div>

      {/* Main Header */}
      <header className="nirikshan-header">
        <div className="brand-group">
          <div className="brand-logo">
            <span className="logo-symbol">🔍</span>
          </div>
          <div>
            <h1 className="brand-title">
              Nirikshan AI <span className="devanagari">(निरीक्षण)</span>
            </h1>
            <p className="brand-tagline">
              India-First Live Food Label &amp; Ingredient Intelligence Platform
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="profile-toggle-btn"
            onClick={() => setShowProfileDrawer(!showProfileDrawer)}
          >
            <span>👤 Profile: {profile.profile_name}</span>
            <span className="toggle-chevron">{showProfileDrawer ? '▲' : '▼'}</span>
          </button>
          <div className="phase-badge">
            <span className="badge-dot"></span>
            <span>Phase 3 Health Impact</span>
          </div>
        </div>
      </header>

      {/* Allergies & Health Conditions Profile Configuration Panel (Collapsible) */}
      {showProfileDrawer && (
        <section className="profile-drawer-card">
          <div className="drawer-header">
            <div>
              <h3 className="drawer-title">Allergies &amp; Health Conditions Profile</h3>
              <p className="drawer-subtitle">
                Configure personalized sensitivity and condition filters. If left unconfigured, label-declared recipe allergens and factory warnings are still parsed accurately without assuming safety.
              </p>
            </div>
            <button
              type="button"
              className="text-btn"
              onClick={() => setProfile(DEFAULT_PROFILE)}
            >
              Clear / Reset to Default
            </button>
          </div>

          <div className="profile-privacy-banner">
            <span className="privacy-icon">🔒</span>
            <span>
              <strong>Privacy Assurance:</strong> Your selections are kept strictly in local browser session memory for the current analysis and are never persisted, stored in databases, or logged.
            </span>
          </div>

          <div className="profile-form-grid">
            <div className="form-group form-col-full">
              <label htmlFor="profile_name">Profile Name / Identifier</label>
              <input
                id="profile_name"
                type="text"
                className="form-input"
                placeholder="e.g. Aarav, Grandma, Personal"
                value={profile.profile_name}
                onChange={(e) => setProfile({ ...profile, profile_name: e.target.value })}
              />
            </div>

            {/* QUICK-SELECT FOOD ALLERGIES */}
            <div className="form-group form-col-full">
              <label>Select Known Food Allergies</label>
              <div className="chips-grid">
                {ALLERGY_CHIPS.map((chip) => {
                  const active = profile.allergies
                    .split(',')
                    .map((a) => a.trim().toLowerCase())
                    .includes(chip.id)
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      className={`chip-button ${active ? 'chip-active' : ''}`}
                      onClick={() => toggleAllergy(chip.id)}
                    >
                      <span className="chip-check">{active ? '✓' : '+'}</span>
                      <span>{chip.label}</span>
                    </button>
                  )
                })}
              </div>
              <input
                id="allergies"
                type="text"
                className="form-input mt-2"
                placeholder="Or type custom comma-separated allergens (e.g. sesame, egg, fish)"
                value={profile.allergies}
                onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
              />
              <span className="form-hint">Matches against FSSAI mandatory allergen declarations</span>
            </div>

            {/* QUICK-SELECT HEALTH CONDITIONS */}
            <div className="form-group form-col-full">
              <label>Select Relevant Health Conditions</label>
              <div className="condition-chips-grid">
                {CONDITION_CHIPS.map((cond) => {
                  const active = (profile.health_conditions || []).includes(cond.id)
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      className={`condition-card-btn ${active ? 'condition-card-active' : ''}`}
                      onClick={() => toggleCondition(cond.id)}
                    >
                      <div className="condition-card-header">
                        <span className="condition-title">{cond.label}</span>
                        <span className="condition-status-pill">{active ? 'SELECTED' : 'OFF'}</span>
                      </div>
                      <p className="condition-desc">{cond.desc}</p>
                    </button>
                  )
                })}
              </div>
              <span className="form-hint">Evidence-based deterministic rules (NIDDK, CDC, WHO)</span>
            </div>

            <div className="form-group">
              <label htmlFor="dietary_preference">Dietary Preference</label>
              <select
                id="dietary_preference"
                className="form-select"
                value={profile.dietary_preference}
                onChange={(e) => setProfile({ ...profile, dietary_preference: e.target.value })}
              >
                <option value="">None (Standard Omnivore)</option>
                <option value="vegetarian">Vegetarian (Flag animal ingredients)</option>
                <option value="vegan">Vegan (Flag dairy, honey, animal derivatives)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="watchlist">Custom Watchlist</label>
              <input
                id="watchlist"
                type="text"
                className="form-input"
                placeholder="e.g. avoid_palm_oil"
                value={profile.watchlist}
                onChange={(e) => setProfile({ ...profile, watchlist: e.target.value })}
              />
              <span className="form-hint">Flag specific oils or ingredients</span>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <main className="nirikshan-main">
        {/* Mode Selector Tabs */}
        <div className="scan-mode-tabs-container">
          <button
            type="button"
            className={`scan-mode-tab ${activeScanMode === 'upload' ? 'tab-active' : ''}`}
            onClick={() => setActiveScanMode('upload')}
            id="tab-mode-upload"
          >
            <span>📁</span>
            <span>Image Upload Mode</span>
          </button>
          <button
            type="button"
            className={`scan-mode-tab ${activeScanMode === 'camera' ? 'tab-active' : ''}`}
            onClick={() => setActiveScanMode('camera')}
            id="tab-mode-camera"
          >
            <span className="camera-tab-icon">📹</span>
            <span>Live Camera Scan</span>
            <span className="live-tab-badge">Live</span>
          </button>
        </div>

        {activeScanMode === 'camera' ? (
          /* Dedicated Live Camera Scan Component */
          <LiveCameraScanner
            profile={profile}
            onScanResult={(result) => {
              setScanResult(result)
              setScanLifecycle('SCAN_COMPLETE')
              setScanError(null)
            }}
            onScanError={(err) => {
              setScanError(err)
            }}
            onSwitchToUploadMode={() => setActiveScanMode('upload')}
          />
        ) : (
          /* Upload & Scan Card */
          <section className="scan-hero-card">
            <div className="scan-card-header">
              <div>
                <span className="section-label">FSSAI Packaging Analysis</span>
                <h2 className="section-title">Upload Product Label Image</h2>
              </div>
              <div className="header-btn-group">
                <button
                  type="button"
                  className="sample-label-btn"
                  onClick={loadSampleLabel}
                  disabled={isScanning}
                  id="load-sample-label-btn"
                >
                  🏷️ Load Sample Label (Chaap)
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleResetScan}
                    disabled={isScanning}
                    id="reset-scan-btn"
                  >
                    Clear &amp; Scan Another
                  </button>
                )}
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              className={`dropzone-container ${isDragging ? 'dropzone-active' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                id="food-label-file-input"
                data-testid="food-label-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden-file-input"
                onChange={handleInputChange}
              />

              {previewUrl ? (
                <div className="preview-layout" onClick={(e) => e.stopPropagation()}>
                  <div className="preview-image-wrap">
                    <img src={previewUrl} alt="Product label preview" className="preview-thumbnail" />
                  </div>
                  <div className="preview-meta">
                    {/* Status Badge reflecting exact lifecycle state */}
                    {scanLifecycle === 'READY_FOR_ANALYSIS' && (
                      <span className="file-badge status-ready-badge" id="scan-status-badge">
                        READY FOR ANALYSIS
                      </span>
                    )}
                    {scanLifecycle === 'SCANNING' && (
                      <span className="file-badge status-scanning-badge" id="scan-status-badge">
                        <span className="pulse-indicator"></span> SCANNING...
                      </span>
                    )}
                    {scanLifecycle === 'SCAN_COMPLETE' && (
                      <span className="file-badge status-complete-badge" id="scan-status-badge">
                        ✓ SCAN COMPLETE
                      </span>
                    )}
                    {scanLifecycle === 'ERROR' && (
                      <span className="file-badge status-error-badge" id="scan-status-badge">
                        ⚠️ SCAN FAILED
                      </span>
                    )}

                    <h4 className="file-name">{selectedFile?.name}</h4>
                    <p className="file-size">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ''} • {selectedFile?.type}
                    </p>
                    <div className="preview-actions">
                      <button
                        type="button"
                        className="change-image-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isScanning}
                      >
                        Choose Different Image
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dropzone-placeholder">
                  <div className="upload-icon-circle">📷</div>
                  <h3 className="dropzone-heading">Drag and drop packaging image here</h3>
                  <p className="dropzone-text">
                    Or click to browse from your device. Supports high-resolution JPEG, PNG, or WebP.
                  </p>
                  <div className="supported-formats-pills">
                    <span>PNG</span>
                    <span>JPEG</span>
                    <span>WebP</span>
                  </div>
                  <button
                    type="button"
                    className="sample-pill-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      loadSampleLabel()
                    }}
                    disabled={isScanning}
                  >
                    ✨ Or click here to test with sample label image
                  </button>
                </div>
              )}
            </div>

            {/* Action Trigger */}
            {selectedFile && (
              <div className="scan-actions-bar">
                <button
                  type="button"
                  className="primary-scan-btn"
                  onClick={executeScan}
                  disabled={isScanning}
                  id="execute-scan-btn"
                >
                  {isScanning ? (
                    <>
                      <span className="spinner-border"></span>
                      <span>Extracting Text &amp; Evaluating Allergens...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Scan Product Label</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Error Banner with Retry Action */}
            {scanError && (
              <div className="scan-error-banner" role="alert">
                <div className="error-icon">⚠️</div>
                <div className="error-content">
                  <div className="error-headline">
                    <strong>Analysis Failed:</strong> {scanError}
                  </div>
                  <p className="error-suggestion">
                    Ensure the image clearly shows the ingredient panel, or verify that the FastAPI server is running at{' '}
                    <code>{API_BASE_URL || 'http://127.0.0.1:8000'}</code>.
                  </p>
                  <div className="error-actions">
                    <button
                      type="button"
                      className="retry-scan-btn"
                      onClick={executeScan}
                      disabled={isScanning}
                    >
                      🔄 Retry Scan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Scan Results Section - Rendered only on SCAN_COMPLETE */}
        {scanResult && (
          <section className="results-container" id="scan-results-container">
            {/* Header / Summary Bar */}
            <div className="results-hero-header">
              <div>
                <span className="section-label">Inspection Verdict</span>
                <h2 className="section-title">Label Analysis Summary</h2>
              </div>
              <div className="result-status-badge">
                <span className="status-pill status-complete">
                  ✓ SCAN COMPLETE
                </span>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-label">Ingredients Identified</span>
                <span className="metric-number">
                  {scanResult.sections_summary.ingredients_detected_count}
                </span>
                <span className="metric-sub">Separated from package text</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Declared Allergens (CONTAINS)</span>
                <span className="metric-number text-crimson">
                  {scanResult.allergen_report.contains_allergens.length}
                </span>
                <span className="metric-sub">Declared in CONTAINS statement</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Precautionary Advisories (MAY CONTAIN)</span>
                <span className="metric-number text-amber">
                  {scanResult.allergen_report.may_contain_allergens.length}
                </span>
                <span className="metric-sub">Factory cross-contact advisory</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Filtered Non-Ingredients</span>
                <span className="metric-number">
                  {scanResult.sections_summary.non_ingredient_lines_filtered}
                </span>
                <span className="metric-sub">Nutrition/Mfg/Date headers</span>
              </div>
            </div>

            {/* ALLERGEN INTELLIGENCE PANEL */}
            <div className="allergen-intelligence-card">
              <h3 className="card-subheading">Allergen Safety Analysis</h3>

              {/* 1. Precautionary Incomplete Warning */}
              {scanResult.allergen_report.incomplete_precautionary_advisory && (
                <div className="incomplete-alert-banner">
                  <div className="alert-icon">⚠️</div>
                  <div>
                    <h4 className="alert-title">Incomplete Precautionary Advisory Detected</h4>
                    <p className="alert-desc">
                      A <strong>&quot;MAY CONTAIN&quot;</strong> advisory clause was identified on the packaging, but specific allergen names could not be legibly recognized by OCR. Please physically inspect the package before consumption.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Side-by-side Allergen Declarations */}
              <div className="allergen-split-grid">
                {/* Declared Allergens (CONTAINS) */}
                <div className="allergen-box declared-box">
                  <div className="box-header">
                    <span className="box-badge badge-contains">CONTAINS Statement</span>
                    <h4>Declared Allergens (CONTAINS)</h4>
                    <p className="box-note">
                      Direct recipe ingredients identified in label CONTAINS advisory.
                    </p>
                  </div>
                  <div className="allergen-items-list">
                    {scanResult.allergen_report.contains_allergens.length > 0 ? (
                      scanResult.allergen_report.contains_allergens.map((item, idx) => (
                        <div key={idx} className="allergen-pill pill-contains">
                          <span className="pill-dot red-dot"></span>
                          <span className="pill-name">{item}</span>
                          <span className="pill-meta">Direct Ingredient</span>
                        </div>
                      ))
                    ) : (
                      <p className="empty-advisory-msg">
                        {scanResult.sections_summary.contains_clause_found
                          ? 'CONTAINS clause detected, no specific allergens recognized.'
                          : 'No declared CONTAINS allergen statement found on visible label.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Precautionary Cross-Contact Advisories (MAY CONTAIN) */}
                <div className="allergen-box advisory-box">
                  <div className="box-header">
                    <span className="box-badge badge-may-contain">MAY CONTAIN Advisory</span>
                    <h4>Cross-Contact Warning (MAY CONTAIN)</h4>
                    <p className="box-note">
                      Potential shared facility or equipment risk declared on packaging. Not listed as direct recipe ingredients.
                    </p>
                  </div>
                  <div className="allergen-items-list">
                    {scanResult.allergen_report.may_contain_allergens.length > 0 ? (
                      scanResult.allergen_report.may_contain_allergens.map((item, idx) => (
                        <div key={idx} className="allergen-pill pill-may-contain">
                          <span className="pill-dot amber-dot"></span>
                          <span className="pill-name">{item}</span>
                          <span className="pill-meta">Potential Cross-Contact</span>
                        </div>
                      ))
                    ) : (
                      <p className="empty-advisory-msg">
                        {scanResult.sections_summary.may_contain_clause_found
                          ? scanResult.allergen_report.incomplete_precautionary_advisory
                            ? 'Advisory clause detected but allergen text was unreadable.'
                            : 'No specific precautionary allergens listed.'
                          : 'No precautionary MAY CONTAIN advisory detected on visible label.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Safety Notice regarding Empty Profile */}
              <div className="safety-profile-banner">
                <span className="safety-icon">🛡️</span>
                <div className="safety-text">
                  <strong>Dietary Sensitivity Verification:</strong>{' '}
                  {profile.allergies.trim() ? (
                    <span>
                      Matching against profile <strong>{profile.profile_name}</strong> (Filters: {profile.allergies}).
                      {scanResult.allergen_report.profile_matches_contains.length > 0 && (
                        <span className="text-crimson">
                          {' '}Matches declared allergen: {scanResult.allergen_report.profile_matches_contains.join(', ')}!
                        </span>
                      )}
                      {scanResult.allergen_report.profile_matches_may_contain.length > 0 && (
                        <span className="text-amber">
                          {' '}Matches precautionary warning: {scanResult.allergen_report.profile_matches_may_contain.join(', ')}!
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>
                      Using default profile without custom allergen restrictions. Notice: An empty allergy profile does <em>NOT</em> indicate product safety. Always review the declared allergens and precautionary advisories above.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* HEALTH IMPACT ANALYSIS (DETERMINISTIC REGULATORY & HEALTH ENGINE) */}
            {scanResult.health_impact_report && (
              <div className="health-impact-card">
                <div className="card-header-flex">
                  <div>
                    <div className="phase-pill-mini">Deterministic Health &amp; Regulatory Engine</div>
                    <h3 className="card-subheading">Health Impact &amp; Global Regulatory Analysis</h3>
                    <p className="card-desc">
                      Universal evidence-based evaluation of recipe ingredients, international regulatory bans (India FSSAI, EU EFSA, US FDA), cookware chemical safety, and optional personalized allergy/condition profiles.
                    </p>
                  </div>
                  <div className="health-summary-badges">
                    <span className="summary-badge badge-critical">
                      Critical: {scanResult.health_impact_report.summary_counts.critical || 0}
                    </span>
                    <span className="summary-badge badge-warning">
                      Warning: {scanResult.health_impact_report.summary_counts.warning || 0}
                    </span>
                    <span className="summary-badge badge-caution">
                      Caution: {scanResult.health_impact_report.summary_counts.caution || 0}
                    </span>
                    {scanResult.health_impact_report.summary_counts.international_bans ? (
                      <span className="summary-badge badge-banned">
                        Banned (EU/Intl): {scanResult.health_impact_report.summary_counts.international_bans}
                      </span>
                    ) : null}
                    <span className="summary-badge badge-insufficient">
                      Data Insufficient: {scanResult.health_impact_report.summary_counts.data_insufficient || 0}
                    </span>
                  </div>
                </div>

                {/* 1. CRITICAL PACKAGING CHEMICAL SAFETY BANNER (e.g. Copper/Brass utensils) */}
                {scanResult.health_impact_report.packaging_caution_detected && (
                  <div className="packaging-caution-banner">
                    <div className="caution-icon">⚠️</div>
                    <div className="caution-body">
                      <div className="caution-badge">CRITICAL COOKWARE REACTION CAUTION</div>
                      <h4 className="caution-title">Do Not Prepare or Store in Copper, Brass, Nickel, or Silver Cookware</h4>
                      <p className="caution-desc">
                        {scanResult.health_impact_report.packaging_caution_detected}
                      </p>
                      <p className="caution-sub">
                        <em>Scientific Reason:</em> Tamarind, tartaric acid, and citric acid naturally leach metallic ions from unlined copper or brass vessels, producing toxic copper tartrate / verdigris salts that can cause severe gastrointestinal irritation.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. INTERNATIONAL REGULATORY BANS ALERT (EFSA / FDA / FSSAI) */}
                {scanResult.health_impact_report.international_bans_detected && scanResult.health_impact_report.international_bans_detected.length > 0 ? (
                  <div className="ban-alert-banner">
                    <div className="ban-icon">🚫</div>
                    <div className="ban-body">
                      <div className="ban-badge">INTERNATIONAL REGULATORY RESTRICTION</div>
                      <h4 className="ban-title">Internationally Banned / Restricted Food Additives Detected</h4>
                      <ul className="ban-list">
                        {scanResult.health_impact_report.international_bans_detected.map((ban, idx) => (
                          <li key={idx} className="ban-list-item">
                            <strong>{ban}</strong>
                          </li>
                        ))}
                      </ul>
                      <p className="ban-note">
                        Regulatory standards vary across jurisdictions. An additive permitted in one country may be restricted or banned in another based on independent toxicological risk evaluations by authorities like EFSA (Europe) or FDA (USA).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="no-ban-notice">
                    <span className="no-ban-icon">✓</span>
                    <span>No internationally banned or prohibited food additives detected among identified INS codes.</span>
                  </div>
                )}

                {/* 3. UNIVERSAL PRODUCT HEALTH CONCERNS (Palmolein, Maida, Sugar, Gluten) */}
                {scanResult.health_impact_report.general_health_insights && scanResult.health_impact_report.general_health_insights.length > 0 && (
                  <div className="impact-section">
                    <h4 className="impact-section-title text-amber">
                      🥗 Key Recipe Ingredients &amp; Nutritional Health Concerns
                    </h4>
                    <div className="insights-grid">
                      {scanResult.health_impact_report.general_health_insights.map((insight, i) => (
                        <div key={i} className={`insight-card insight-${insight.severity.toLowerCase()}`}>
                          <div className="insight-top">
                            <span className={`severity-tag severity-${insight.severity.toLowerCase()}`}>
                              {insight.severity}
                            </span>
                            <span className="concern-tag">{insight.ingredient_name}</span>
                          </div>
                          <h5 className="insight-title">{insight.title}</h5>
                          <p className="insight-explanation">{insight.explanation}</p>
                          {insight.explanation_hi && (
                            <p className="finding-hindi">{insight.explanation_hi}</p>
                          )}
                          <div className="finding-meta">
                            <div className="meta-line">
                              <span className="meta-label">Guideline Source:</span>
                              <a
                                href={insight.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="evidence-link"
                              >
                                {insight.authority} ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. GLOBAL REGULATORY STATUS OF ADDITIVES (FSSAI 🇮🇳, EU EFSA 🇪🇺, US FDA 🇺🇸) */}
                {scanResult.health_impact_report.regulatory_additive_findings && scanResult.health_impact_report.regulatory_additive_findings.length > 0 && (
                  <div className="impact-section">
                    <h4 className="impact-section-title text-cyan">
                      🏛️ Food Additives: Global Regulatory &amp; Safety Matrix
                    </h4>
                    <div className="regulatory-cards-container">
                      {scanResult.health_impact_report.regulatory_additive_findings.map((add, i) => (
                        <div key={i} className="regulatory-card">
                          <div className="reg-card-header">
                            <div>
                              <div className="reg-badge-row">
                                <span className="reg-ins-badge">INS {add.ins_number}</span>
                                {add.e_number && <span className="reg-e-badge">{add.e_number}</span>}
                              </div>
                              <h5 className="reg-canonical-title">{add.canonical_name}</h5>
                              <span className="reg-class-sub">{add.functional_class}</span>
                            </div>
                            <div className="reg-jurisdictions-group">
                              <div className="reg-jur-item">
                                <span className="jur-flag">🇮🇳 FSSAI</span>
                                <span className={`jur-status status-${add.fssai_status.toLowerCase()}`}>
                                  {add.fssai_status}
                                </span>
                              </div>
                              <div className="reg-jur-item">
                                <span className="jur-flag">🇪🇺 EU EFSA</span>
                                <span className={`jur-status status-${add.eu_efsa_status.toLowerCase()}`}>
                                  {add.eu_efsa_status}
                                </span>
                              </div>
                              <div className="reg-jur-item">
                                <span className="jur-flag">🇺🇸 US FDA</span>
                                <span className={`jur-status status-${add.us_fda_status.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}>
                                  {add.us_fda_status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="reg-card-body">
                            <div className="reg-concern-line">
                              <strong>Health Concern:</strong> {add.health_concern}
                            </div>
                            <p className="reg-plain-desc">{add.plain_english}</p>
                            {add.hindi_explanation && (
                              <p className="finding-hindi">{add.hindi_explanation}</p>
                            )}
                            {add.is_banned_internationally && (
                              <div className="reg-ban-flag">
                                ⚠️ Banned or restricted in: {add.banned_in_jurisdictions.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. EVALUATED PROFILE STATUS BANNER */}
                <div className="profile-context-banner">
                  <span className="context-icon">🌐</span>
                  <div>
                    <strong>Universal Product Evaluation:</strong>{' '}
                    <span>
                      Product-level health insights, additive safety across <strong>India (FSSAI)</strong>, <strong>European Union (EFSA)</strong>, and <strong>USA (FDA)</strong>, and cookware cautions are analyzed automatically on every scan.
                    </span>
                    {scanResult.health_impact_report.profile_conditions_evaluated.length > 0 ? (
                      <div className="profile-active-note">
                        <span>Personalized Profile Active:</span>
                        <span className="profile-tags-inline">
                          {scanResult.health_impact_report.profile_conditions_evaluated.map((c, i) => (
                            <span key={i} className="evaluated-tag">{c.toUpperCase()}</span>
                          ))}
                        </span>
                      </div>
                    ) : (
                      <div className="profile-idle-note">
                        <em>(Optional: Use &quot;Configure Profile&quot; in the header to highlight family-specific allergies or medical conditions.)</em>
                      </div>
                    )}
                  </div>
                </div>


                {/* 1. CONFIRMED LABEL ALLERGEN DECLARATIONS */}
                {scanResult.health_impact_report.allergy_findings.filter(f => f.declaration_type === 'CONTAINS').length > 0 && (
                  <div className="impact-section">
                    <h4 className="impact-section-title text-crimson">
                      ⚠️ Confirmed Label Allergen Declarations (CONTAINS)
                    </h4>
                    <div className="findings-grid">
                      {scanResult.health_impact_report.allergy_findings
                        .filter(f => f.declaration_type === 'CONTAINS')
                        .map((f, i) => (
                          <div key={i} className="finding-card finding-critical">
                            <div className="finding-top">
                              <span className="severity-tag severity-critical">{f.severity}</span>
                              <span className="rule-tag">{f.rule_id}</span>
                            </div>
                            <h5 className="finding-title">{f.title}</h5>
                            <p className="finding-explanation">{f.explanation}</p>
                            {f.explanation_hi && <p className="finding-hindi">{f.explanation_hi}</p>}
                            <div className="finding-meta">
                              <div className="meta-line">
                                <span className="meta-label">Trigger:</span>
                                <code>{f.triggering_text}</code>
                              </div>
                              <div className="meta-line">
                                <span className="meta-label">Action:</span>
                                <span>{f.recommended_action}</span>
                              </div>
                              <div className="meta-line">
                                <span className="meta-label">Official Source:</span>
                                <a href={f.evidence_url} target="_blank" rel="noopener noreferrer" className="evidence-link">
                                  {f.evidence_title} ↗
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 2. PRECAUTIONARY CROSS-CONTACT ADVISORIES */}
                {scanResult.health_impact_report.allergy_findings.filter(f => f.declaration_type === 'MAY_CONTAIN').length > 0 && (
                  <div className="impact-section">
                    <h4 className="impact-section-title text-amber">
                      ⚡ Precautionary Allergen Advisories (MAY CONTAIN)
                    </h4>
                    <div className="findings-grid">
                      {scanResult.health_impact_report.allergy_findings
                        .filter(f => f.declaration_type === 'MAY_CONTAIN')
                        .map((f, i) => (
                          <div key={i} className="finding-card finding-warning">
                            <div className="finding-top">
                              <span className="severity-tag severity-warning">{f.severity}</span>
                              <span className="rule-tag">{f.rule_id}</span>
                            </div>
                            <h5 className="finding-title">{f.title}</h5>
                            <p className="finding-explanation">{f.explanation}</p>
                            {f.explanation_hi && <p className="finding-hindi">{f.explanation_hi}</p>}
                            <div className="finding-meta">
                              <div className="meta-line">
                                <span className="meta-label">Trigger:</span>
                                <code>{f.triggering_text}</code>
                              </div>
                              <div className="meta-line">
                                <span className="meta-label">Action:</span>
                                <span>{f.recommended_action}</span>
                              </div>
                              <div className="meta-line">
                                <span className="meta-label">Official Source:</span>
                                <a href={f.evidence_url} target="_blank" rel="noopener noreferrer" className="evidence-link">
                                  {f.evidence_title} ↗
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 3. CONDITION-RELATED NUTRITIONAL & HEALTH FINDINGS */}
                {scanResult.health_impact_report.condition_findings.length > 0 && (
                  <div className="impact-section">
                    <h4 className="impact-section-title text-cyan">
                      🩺 Condition-Specific Health &amp; Nutritional Findings
                    </h4>
                    <div className="findings-grid">
                      {scanResult.health_impact_report.condition_findings.map((f, i) => (
                        <div key={i} className={`finding-card finding-${f.severity.toLowerCase()}`}>
                          <div className="finding-top">
                            <span className={`severity-tag severity-${f.severity.toLowerCase()}`}>{f.severity}</span>
                            <span className="rule-tag">{f.rule_id}</span>
                          </div>
                          <h5 className="finding-title">{f.title}</h5>
                          <p className="finding-explanation">{f.explanation}</p>
                          {f.explanation_hi && <p className="finding-hindi">{f.explanation_hi}</p>}
                          <div className="finding-meta">
                            <div className="meta-line">
                              <span className="meta-label">Trigger:</span>
                              <code>{f.triggering_text}</code>
                            </div>
                            <div className="meta-line">
                              <span className="meta-label">Clinical Action:</span>
                              <span>{f.recommended_action}</span>
                            </div>
                            <div className="meta-line">
                              <span className="meta-label">Authority Source:</span>
                              <a href={f.evidence_url} target="_blank" rel="noopener noreferrer" className="evidence-link">
                                {f.evidence_title} ↗
                              </a>
                            </div>
                            {f.limitations && (
                              <div className="meta-line">
                                <span className="meta-label">Limitations:</span>
                                <span className="text-muted">{f.limitations}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. DATA INSUFFICIENT NOTICES */}
                {scanResult.health_impact_report.data_insufficient_notices.length > 0 && (
                  <div className="impact-section">
                    <h4 className="impact-section-title text-gray">
                      ℹ️ Incomplete Detection &amp; Insufficient Information Notices
                    </h4>
                    <div className="findings-grid">
                      {scanResult.health_impact_report.data_insufficient_notices.map((f, i) => (
                        <div key={i} className="finding-card finding-insufficient">
                          <div className="finding-top">
                            <span className="severity-tag severity-insufficient">DATA INSUFFICIENT</span>
                            <span className="rule-tag">{f.rule_id}</span>
                          </div>
                          <h5 className="finding-title">{f.title}</h5>
                          <p className="finding-explanation">{f.explanation}</p>
                          {f.explanation_hi && <p className="finding-hindi">{f.explanation_hi}</p>}
                          <div className="finding-meta">
                            <div className="meta-line">
                              <span className="meta-label">Reason:</span>
                              <span>{f.triggering_text}</span>
                            </div>
                            <div className="meta-line">
                              <span className="meta-label">Verification Step:</span>
                              <span>{f.recommended_action}</span>
                            </div>
                            <div className="meta-line">
                              <span className="meta-label">Reference:</span>
                              <a href={f.evidence_url} target="_blank" rel="noopener noreferrer" className="evidence-link">
                                {f.evidence_title} ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. PARSED NUTRITION FACTS PANEL */}
                {scanResult.health_impact_report.nutrition_facts && scanResult.health_impact_report.nutrition_facts.is_reliably_parsed && (
                  <div className="nutrition-panel-card">
                    <div className="nutrition-panel-header">
                      <h5 className="nutrition-panel-title">📊 Extracted Nutritional Facts</h5>
                      <span className="nutrition-basis-pill">
                        Basis: {scanResult.health_impact_report.nutrition_facts.measurement_basis || 'Unspecified'}
                      </span>
                    </div>
                    <div className="nutrition-grid">
                      <div className="nutrition-stat">
                        <span className="stat-label">Serving Size</span>
                        <span className="stat-value">{scanResult.health_impact_report.nutrition_facts.serving_size || 'N/A'}</span>
                      </div>
                      <div className="nutrition-stat">
                        <span className="stat-label">Energy</span>
                        <span className="stat-value">
                          {scanResult.health_impact_report.nutrition_facts.energy_kcal != null
                            ? `${scanResult.health_impact_report.nutrition_facts.energy_kcal} kcal`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="nutrition-stat">
                        <span className="stat-label">Carbohydrates</span>
                        <span className="stat-value">
                          {scanResult.health_impact_report.nutrition_facts.carbohydrates_g != null
                            ? `${scanResult.health_impact_report.nutrition_facts.carbohydrates_g} g`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="nutrition-stat">
                        <span className="stat-label">Total Sugars</span>
                        <span className="stat-value">
                          {scanResult.health_impact_report.nutrition_facts.sugars_g != null
                            ? `${scanResult.health_impact_report.nutrition_facts.sugars_g} g`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="nutrition-stat">
                        <span className="stat-label">Sodium</span>
                        <span className="stat-value">
                          {scanResult.health_impact_report.nutrition_facts.sodium_mg != null
                            ? `${scanResult.health_impact_report.nutrition_facts.sodium_mg.toFixed(0)} mg`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. EDUCATIONAL DISCLAIMER */}
                <div className="health-disclaimer-box">
                  <span className="disclaimer-icon">⚕️</span>
                  <p className="disclaimer-text">{scanResult.health_impact_report.disclaimer}</p>
                </div>
              </div>
            )}

            {/* MODULE 3: FSSAI LABEL MANDATORY COMPLIANCE CHECKER */}
            {scanResult.compliance_report && (
              <div className="compliance-card" id="fssai-compliance-section">
                <div className="card-header-flex">
                  <div>
                    <div className="phase-pill-mini statutory-pill">Module 3: FSSAI Statutory Compliance</div>
                    <h3 className="card-subheading">FSSAI Label Mandatory Compliance Checklist</h3>
                    <p className="card-desc">
                      Independent evaluation against the 11 mandatory labelling declarations specified under the{' '}
                      <strong>Food Safety and Standards (Labelling and Display) Regulations, 2020</strong>.
                    </p>
                  </div>
                  <div className="compliance-score-badge-group">
                    <div className="score-circle">
                      <span className="score-val">{scanResult.compliance_report.compliance_score_percent}%</span>
                      <span className="score-label">Compliance</span>
                    </div>
                    <div className="compliance-counts-col">
                      <span className="summary-badge badge-compliant">
                        Compliant: {scanResult.compliance_report.summary_counts.compliant || 0}
                      </span>
                      <span className="summary-badge badge-missing">
                        Missing: {scanResult.compliance_report.summary_counts.non_compliant_missing || 0}
                      </span>
                      <span className="summary-badge badge-unclear">
                        Review Needed: {scanResult.compliance_report.summary_counts.unclear_needs_review || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="compliance-items-grid">
                  {scanResult.compliance_report.items.map((item, idx) => (
                    <div key={idx} className={`compliance-item-card comp-${item.status.toLowerCase()}`}>
                      <div className="comp-item-header">
                        <span className={`comp-status-pill pill-${item.status.toLowerCase()}`}>
                          {item.status === 'COMPLIANT' && '✓ COMPLIANT'}
                          {item.status === 'NON_COMPLIANT_MISSING' && '✗ MISSING'}
                          {item.status === 'UNCLEAR_NEEDS_REVIEW' && '⚠️ REVIEW NEEDED'}
                          {item.status === 'EXEMPTED' && '— EXEMPTED'}
                        </span>
                        <span className="comp-clause">{item.clause}</span>
                      </div>
                      <h4 className="comp-item-title">
                        {item.title}
                        {item.title_hi && <span className="comp-item-hi"> ({item.title_hi})</span>}
                      </h4>
                      <div className="comp-evidence-box">
                        <span className="evidence-tag">Evidence</span>
                        <code>{item.evidence_text}</code>
                      </div>
                      <p className="comp-explanation">{item.explanation}</p>
                      {item.explanation_hi && <p className="finding-hindi">{item.explanation_hi}</p>}
                      {item.exemptions && (
                        <div className="comp-exemption-note">
                          <em>Exemption:</em> {item.exemptions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="compliance-disclaimer-box">
                  <span className="disclaimer-icon">📜</span>
                  <div>
                    <strong>Statutory Reference:</strong> {scanResult.compliance_report.statutory_reference}.
                    <p className="disclaimer-sub">{scanResult.compliance_report.disclaimer}</p>
                  </div>
                </div>
              </div>
            )}

            {/* OPEN FOOD FACTS REFERENCE COMPARISON CARD */}
            {scanResult.open_food_facts_reference && scanResult.open_food_facts_reference.found && (
              <div className="off-reference-card">
                <div className="off-header">
                  <div>
                    <span className="off-badge">Open Food Facts Community Reference</span>
                    <h4 className="off-product-title">
                      {scanResult.open_food_facts_reference.product_name || 'Matched Product'}{' '}
                      {scanResult.open_food_facts_reference.brand && (
                        <span className="off-brand">by {scanResult.open_food_facts_reference.brand}</span>
                      )}
                    </h4>
                    <span className="off-meta-barcode">Barcode: {scanResult.open_food_facts_reference.barcode}</span>
                  </div>
                  {scanResult.open_food_facts_reference.reference_url && (
                    <a
                      href={scanResult.open_food_facts_reference.reference_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="off-link-btn"
                    >
                      View on Open Food Facts ↗
                    </a>
                  )}
                </div>
                <div className="off-body">
                  <div className="off-ingredients-line">
                    <strong>Reference Ingredients:</strong>{' '}
                    <span>{scanResult.open_food_facts_reference.ingredients_text || 'No reference ingredient text stored.'}</span>
                  </div>
                  <p className="off-note">
                    <em>Notice:</em> This is community-sourced reference data for comparison against your live OCR label scan.
                  </p>
                </div>
              </div>
            )}


            {/* DETECTED INGREDIENTS TABLE */}
            <div className="ingredients-table-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-subheading">Detected Ingredients &amp; Additives</h3>
                  <p className="card-desc">
                    Normalized against verified INS/E-numbers and Indian vernacular aliases without generative AI guessing.
                  </p>
                </div>
                <div className="legend-pills">
                  <span className="legend-item"><span className="legend-dot dot-normalized"></span>NORMALIZED (Curated FSSAI)</span>
                  <span className="legend-item"><span className="legend-dot dot-unverified"></span>UNVERIFIED (Genuine ingredient)</span>
                  <span className="legend-item"><span className="legend-dot dot-unclear"></span>UNCLEAR (Needs review)</span>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="ingredients-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Raw Extracted Text</th>
                      <th>Canonical Ingredient</th>
                      <th>Status &amp; Category</th>
                      <th>INS / Additive</th>
                      <th>Curated Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.evaluation.items.map((item, idx) => {
                      const ing = item.ingredient
                      const isNormalizedDifferently =
                        Boolean(ing.canonical_name) &&
                        ing.canonical_name?.trim().toLowerCase() !== ing.raw_text.trim().toLowerCase()

                      return (
                        <tr key={idx} className={`row-status-${ing.status.toLowerCase()}`}>
                          <td className="col-idx">{idx + 1}</td>
                          <td className="col-raw">
                            <div className="raw-cell">
                              <span className="raw-tag">RAW OCR</span>
                              <code className="raw-code">{ing.raw_text}</code>
                            </div>
                          </td>
                          <td className="col-canonical">
                            <div className="canonical-cell">
                              <strong className="canonical-name">{ing.canonical_name || ing.raw_text}</strong>
                              {isNormalizedDifferently && (
                                <span className="normalized-pill" title={`Normalized from '${ing.raw_text}'`}>
                                  Normalized
                                </span>
                              )}
                            </div>
                            {ing.allergens && ing.allergens.length > 0 && (
                              <div className="mini-tags">
                                {ing.allergens.map((a, i) => (
                                  <span key={i} className="mini-allergen-tag">
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="col-status">
                            <span className={`status-badge badge-${ing.status.toLowerCase()}`}>
                              {ing.status}
                            </span>
                            {ing.category && <span className="category-sub">{ing.category}</span>}
                          </td>
                          <td className="col-ins">
                            {ing.ins_code ? (
                              <span className="ins-pill">{ing.ins_code}</span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="col-evidence">
                            {ing.evidence && (ing.evidence.title || ing.evidence.url) ? (
                              <div className="evidence-cell">
                                {ing.evidence.title && (
                                  <div className="evidence-title">{ing.evidence.title}</div>
                                )}
                                {ing.evidence.section && (
                                  <div className="evidence-section">{ing.evidence.section}</div>
                                )}
                                {ing.evidence.url ? (
                                  <a
                                    href={ing.evidence.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="evidence-link"
                                    title={`Open source: ${ing.evidence.url}`}
                                  >
                                    <span>View Reference</span>
                                    <span className="link-arrow">↗</span>
                                  </a>
                                ) : null}
                              </div>
                            ) : ing.uncertainty_reason ? (
                              <div className="evidence-cell">
                                <span className="unclear-reason">{ing.uncertainty_reason}</span>
                              </div>
                            ) : (
                              <div className="evidence-cell">
                                <span className="text-muted">Direct label text</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RAW OCR TRANSPARENCY DRAWER (Collapsible) */}
            <div className="ocr-raw-card">
              <button
                type="button"
                className="collapsible-header-btn"
                onClick={() => setShowOcrBoxes(!showOcrBoxes)}
              >
                <span>🔍 Inspect Raw OCR Extracted Text &amp; Bounding Boxes ({scanResult.ocr_detected_boxes.length} boxes)</span>
                <span>{showOcrBoxes ? '▲ Hide' : '▼ Expand'}</span>
              </button>

              {showOcrBoxes && (
                <div className="ocr-raw-content">
                  <div className="raw-text-block">
                    <span className="block-label">Full Raw Extracted Text</span>
                    <pre className="raw-text-pre">{scanResult.raw_extracted_text}</pre>
                  </div>

                  <div className="ocr-boxes-list">
                    <span className="block-label">Detected Text Bounding Boxes</span>
                    <div className="boxes-grid">
                      {scanResult.ocr_detected_boxes.map((box, bIdx) => (
                        <div key={bIdx} className="ocr-box-item">
                          <div className="box-meta-line">
                            <span className="box-idx">Box #{bIdx + 1}</span>
                            <span className="box-conf">Confidence: {(box.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div className="box-text-val">&quot;{box.text}&quot;</div>
                          <div className="box-coords-val">
                            Polygon: {JSON.stringify(box.bounding_box)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Backend Health Telemetry (Transparent Developer Gateway) */}
        <section className="status-hero-card">
          <div className="status-hero-header">
            <div>
              <span className="section-label">Backend Service Telemetry</span>
              <h2 className="section-title">FastAPI Health Gateway</h2>
            </div>
            <button
              type="button"
              className="refresh-btn"
              onClick={pingHealth}
              disabled={health.loading}
            >
              {health.loading ? 'Pinging...' : 'Test Health Endpoint'}
            </button>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-box">
              <span className="telemetry-label">Target Endpoint</span>
              <code className="telemetry-code">GET /api/v1/health</code>
            </div>

            <div className="telemetry-box">
              <span className="telemetry-label">Connection Status</span>
              <div className="status-display">
                {health.status === 'connected' && (
                  <span className="status-pill status-online">
                    <span className="pulse-indicator"></span>
                    Online (HTTP 200)
                  </span>
                )}
                {health.status === 'error' && (
                  <span className="status-pill status-offline">
                    <span className="error-dot"></span>
                    Offline / Unreachable
                  </span>
                )}
                {health.status === 'idle' && (
                  <span className="status-pill status-idle">Checking...</span>
                )}
              </div>
            </div>

            <div className="telemetry-box">
              <span className="telemetry-label">Response Latency</span>
              <span className="telemetry-value">
                {health.latencyMs !== null ? `${health.latencyMs} ms` : '—'}
              </span>
            </div>

            <div className="telemetry-box">
              <span className="telemetry-label">Payload Output</span>
              <code className="telemetry-payload">
                {health.data
                  ? JSON.stringify(health.data)
                  : health.error
                  ? `Error: ${health.error}`
                  : 'Waiting for response...'}
              </code>
            </div>
          </div>

          {health.status === 'error' && (
            <div className="troubleshoot-banner">
              <strong>💡 Backend not running?</strong> Start the FastAPI server using PowerShell:
              <pre className="inline-command">uvicorn backend.app.main:app --reload</pre>
            </div>
          )}
        </section>

        {/* Core System Pillars */}
        <section className="features-section">
          <h3 className="section-heading">Core System Pillars (Architecture Roadmap)</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📷</div>
              <h4>Zero-Click Image Scanning</h4>
              <p>
                Processes packaged food label images via OpenCV image normalization, bounding-box geometry, and column separation.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h4>PaddleOCR Detection</h4>
              <p>
                DBNet + SVTR/CRNN text detection with coordinate tracking and per-token confidence gating on Indian packaging typography.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🏷️</div>
              <h4>INS &amp; Alias Normalizer</h4>
              <p>
                Converts cryptic INS/E-numbers (e.g. INS 330, INS 621) and vernacular synonyms into canonical ingredients without guessing.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h4>FSSAI Deterministic Rules</h4>
              <p>
                Curated 8 mandatory allergens and category limits backed by official gazette records. Never relies on generative LLMs for legal verdicts.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">👨‍👩‍👧‍👦</div>
              <h4>Family Dietary Profiles</h4>
              <p>
                Independent alert watchlists (Jain diet, Gluten, Peanut, Palm Oil, Sodium thresholds) to protect multi-generational households.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚠️</div>
              <h4>Explicit Uncertainty Handling</h4>
              <p>
                Transparent <code>UNCLEAR</code> and <code>UNVERIFIED</code> fallback badges when labels are degraded or database entries are absent.
              </p>
            </div>
          </div>
        </section>

        {/* Resources & Quick Links */}
        <section className="docs-section">
          <div className="docs-card">
            <h4>API Explorer</h4>
            <p>Access the interactive Swagger documentation and test endpoints directly.</p>
            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="action-link"
            >
              Open Swagger UI (localhost:8000/docs) →
            </a>
          </div>
          <div className="docs-card">
            <h4>Architecture Blueprint</h4>
            <p>Review the comprehensive architecture and data flow specification.</p>
            <span className="doc-reference">ARCHITECTURE.md in project root</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="nirikshan-footer">
        <p>Nirikshan AI • Phase 1C Full OCR Integration • Compliant with PRD Safety Principles</p>
      </footer>
    </div>
  )
}
