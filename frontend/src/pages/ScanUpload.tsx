import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  Camera,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  HeartPulse,
  Scale,
  RefreshCw
} from 'lucide-react'
import { scanFoodLabelImage } from '../services/api'
import { scanStorage } from '../services/scanStorage'
import type { ScanImageResponse, UserProfileConfig } from '../types/scan'
import { LiveCameraScanner } from '../components/LiveCameraScanner'

const SAMPLE_IMAGES = [
  {
    name: "Haldiram's Bhujia Sev",
    category: 'Savory Namkeen',
    description: 'Wheat, Palmolein, Citric Acid (INS 330), Salt & Rule 6 Declarations',
    url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop&q=80',
    filename: 'haldirams_bhujia_sample.jpg'
  },
  {
    name: 'Britannia Marie Gold',
    category: 'Biscuits & Cookies',
    description: 'Refined Wheat Flour, Sugar, Invert Syrup, Emulsifiers & FSSAI Table',
    url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80',
    filename: 'britannia_marie_gold.jpg'
  },
  {
    name: 'Classic Dark Chocolate',
    category: 'Confectionery',
    description: 'Cocoa solids, Soy Lecithin (INS 322), Milk Solids (Cross-Contact)',
    url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800&auto=format&fit=crop&q=80',
    filename: 'dark_chocolate_label.jpg'
  }
]

export const ScanUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mode, setMode] = useState<'upload' | 'camera'>('upload')
  const [selectedModules, setSelectedModules] = useState<'both' | 'legal_metrology' | 'ingredient_safety'>('both')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  // User Profile Config for Allergen & Condition Matching
  const [profile, setProfile] = useState<UserProfileConfig>({
    profile_name: 'Default User',
    allergies: '',
    health_conditions: [],
    dietary_preference: 'VEGETARIAN',
    watchlist: ''
  })

  const commonAllergens = ['Wheat / Gluten', 'Soy / Soya', 'Milk / Dairy', 'Peanuts', 'Tree Nuts', 'Mustard', 'Sesame']
  const commonConditions = ['Diabetes', 'Hypertension (High Blood Pressure)', 'Coeliac Disease', 'Cardiovascular Disease']

  const handleFileSelection = (selectedFile: File) => {
    setErrorMessage(null)

    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!validTypes.includes(selectedFile.type)) {
      setErrorMessage('Unsupported file format. Please upload a clear JPG, JPEG, or PNG image.')
      return
    }

    // Size limit 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('Image file is too large. Maximum supported size is 10 MB.')
      return
    }

    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const clearSelectedImage = () => {
    setFile(null)
    setPreviewUrl(null)
    setErrorMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleLoadSample = async (sample: typeof SAMPLE_IMAGES[0]) => {
    try {
      setErrorMessage(null)
      setLoading(true)
      const res = await fetch(sample.url)
      const blob = await res.blob()
      const sampleFile = new File([blob], sample.filename, { type: blob.type || 'image/jpeg' })
      handleFileSelection(sampleFile)
    } catch {
      setErrorMessage('Could not load sample image from remote URL. Please choose a local image.')
    } finally {
      setLoading(false)
    }
  }

  const toggleAllergy = (allergen: string) => {
    const list = profile.allergies ? profile.allergies.split(',').map((s) => s.trim()).filter(Boolean) : []
    const exists = list.includes(allergen)
    const updated = exists ? list.filter((a) => a !== allergen) : [...list, allergen]
    setProfile({ ...profile, allergies: updated.join(', ') })
  }

  const toggleCondition = (cond: string) => {
    const exists = profile.health_conditions.includes(cond)
    const updated = exists ? profile.health_conditions.filter((c) => c !== cond) : [...profile.health_conditions, cond]
    setProfile({ ...profile, health_conditions: updated })
  }

  const handleStartAnalysis = async () => {
    if (!file) {
      setErrorMessage('Please select or upload a food packaging label image first.')
      return
    }

    setLoading(true)
    setErrorMessage(null)

    // Simulate step progression for UX
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 5 ? prev + 1 : prev))
    }, 450)

    try {
      const response: ScanImageResponse = await scanFoodLabelImage(
        file,
        profile,
        selectedModules,
        'IN'
      )

      clearInterval(stepInterval)
      setLoadingStep(5)

      // Generate scan record
      const scanId = `scan_${Date.now()}`
      const productName =
        response.evaluation?.items?.[0]?.ingredient?.canonical_name ||
        file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') ||
        'Scanned Food Label'

      scanStorage.saveScan({
        id: scanId,
        timestamp: new Date().toISOString(),
        productName,
        imageUrl: previewUrl || '',
        modulesRequested: selectedModules,
        response,
        status: response.status === 'UNCLEAR' ? 'UNCLEAR' : 'SUCCESS'
      })

      // Navigate to OCR review page per user specification
      navigate(`/scan/${scanId}/review`)
    } catch (err) {
      clearInterval(stepInterval)
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to complete label analysis. Please check image sharpness and try again.'
      )
    } finally {
      setLoading(false)
      setLoadingStep(0)
    }
  }

  const handleLiveCameraResult = (result: ScanImageResponse) => {
    const scanId = `scan_${Date.now()}`
    scanStorage.saveScan({
      id: scanId,
      timestamp: new Date().toISOString(),
      productName: 'Live Camera Scanned Product',
      imageUrl: '',
      modulesRequested: selectedModules,
      response: result,
      status: 'SUCCESS'
    })
    navigate(`/scan/${scanId}/results`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F766E]/10 text-[#0F766E] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Computer Vision Label Workspace</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#123044]">Scan Food Label</h1>
        <p className="text-sm sm:text-base text-[#64748B]">
          Upload or capture a sharp photograph of the ingredient panel, nutrition table, and mandatory declaration marks.
        </p>
      </div>

      {/* Screen 1: PRD Module Scope Selector */}
      <div className="bg-white rounded-2xl border border-[#DCE5E5] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#123044] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#0F766E]" />
            Screening Scope Selection
          </span>
          <span className="text-xs text-[#64748B]">PRD Section 5 &amp; 11</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Both */}
          <button
            type="button"
            onClick={() => setSelectedModules('both')}
            className={`p-4 rounded-xl text-left border-2 transition-all ${
              selectedModules === 'both'
                ? 'border-[#0F766E] bg-[#E6F4F2] shadow-sm'
                : 'border-[#DCE5E5] bg-white hover:bg-[#F4F8F8]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-[#123044]">Both Modules (Combined)</span>
              {selectedModules === 'both' && <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />}
            </div>
            <p className="text-xs text-[#64748B]">
              Full screening: Legal Metrology Rule 6 + Ingredient Safety &amp; Allergens.
            </p>
          </button>

          {/* Module A */}
          <button
            type="button"
            onClick={() => setSelectedModules('legal_metrology')}
            className={`p-4 rounded-xl text-left border-2 transition-all ${
              selectedModules === 'legal_metrology'
                ? 'border-[#9A6712] bg-[#FFF9DB] shadow-sm'
                : 'border-[#DCE5E5] bg-white hover:bg-[#F4F8F8]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-[#9A6712] flex items-center gap-1.5">
                <Scale className="w-4 h-4" /> Module A: Legal Metrology
              </span>
              {selectedModules === 'legal_metrology' && <CheckCircle2 className="w-4 h-4 text-[#9A6712]" />}
            </div>
            <p className="text-xs text-[#64748B]">
              Packaged Commodities Rules 2011 Rule 6 &amp; FSSAI mandatory declarations.
            </p>
          </button>

          {/* Module B */}
          <button
            type="button"
            onClick={() => setSelectedModules('ingredient_safety')}
            className={`p-4 rounded-xl text-left border-2 transition-all ${
              selectedModules === 'ingredient_safety'
                ? 'border-[#087F5B] bg-[#EBFBEE] shadow-sm'
                : 'border-[#DCE5E5] bg-white hover:bg-[#F4F8F8]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-[#087F5B] flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4" /> Module B: Ingredient Safety
              </span>
              {selectedModules === 'ingredient_safety' && <CheckCircle2 className="w-4 h-4 text-[#087F5B]" />}
            </div>
            <p className="text-xs text-[#64748B]">
              Canonical ingredients, INS additive status, allergens &amp; health benchmarks.
            </p>
          </button>
        </div>
      </div>

      {/* Upload & Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload / Camera Workspace */}
        <div className="lg:col-span-7 space-y-6">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-[#DCE5E5] w-fit">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'upload'
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#123044]'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              File Upload / Drag &amp; Drop
            </button>
            <button
              type="button"
              onClick={() => setMode('camera')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'camera'
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#123044]'
              }`}
            >
              <Camera className="w-4 h-4" />
              Live Camera Scanner
            </button>
          </div>

          {/* Upload View */}
          {mode === 'upload' ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelection(e.target.files[0])
                  }
                }}
              />

              {!previewUrl ? (
                /* Dropzone */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-[#0F766E] bg-[#E6F4F2]'
                      : 'border-[#DCE5E5] bg-white hover:border-[#0F766E] hover:bg-[#F4F8F8]'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center mx-auto mb-4">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-[#123044]">
                    Drag and drop your food label image here
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 mb-4">
                    Supports high-resolution JPG, JPEG, and PNG (up to 10 MB)
                  </p>
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-sm inline-flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Browse From Computer
                  </button>
                </div>
              ) : (
                /* Preview Container */
                <div className="bg-white rounded-2xl border border-[#DCE5E5] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#123044]">{file?.name}</h4>
                      <p className="text-xs text-[#64748B]">
                        {(file?.size ? file.size / (1024 * 1024) : 0).toFixed(2)} MB • Ready for analysis
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      className="p-1.5 text-[#64748B] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-[#DCE5E5] bg-[#123044] max-h-96 flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Uploaded label preview"
                      className="max-h-96 w-auto object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-[#0F766E] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Replace with different photo
                    </button>
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ Image Loaded
                    </span>
                  </div>
                </div>
              )}

              {/* Sample Images for Immediate Testing */}
              <div className="bg-white rounded-xl border border-[#DCE5E5] p-4 space-y-3">
                <span className="text-xs font-bold text-[#123044] uppercase tracking-wide block">
                  Or test immediately with a curated Indian food label:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SAMPLE_IMAGES.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleLoadSample(sample)}
                      className="p-2.5 rounded-lg border border-[#DCE5E5] bg-[#F4F8F8] hover:bg-white hover:border-[#0F766E] text-left transition-all group"
                    >
                      <span className="text-xs font-bold text-[#123044] group-hover:text-[#0F766E] block">
                        {sample.name}
                      </span>
                      <span className="text-[11px] text-[#64748B] block">{sample.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Live Camera View */
            <div className="bg-white rounded-2xl border border-[#DCE5E5] p-5 shadow-sm">
              <LiveCameraScanner
                profile={profile}
                onScanResult={handleLiveCameraResult}
                onScanError={(err) => setErrorMessage(err)}
                onSwitchToUploadMode={() => setMode('upload')}
              />
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-red-900">Upload / Screening Notice</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: User Profile Filters & 6-Step Progress Stepper */}
        <div className="lg:col-span-5 space-y-6">
          {/* Allergen & Health Profile Customization */}
          <div className="bg-white rounded-2xl border border-[#DCE5E5] p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#123044]">Screening Health Profile</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Flag personal allergens and health sensitivities in the scanned food label.
              </p>
            </div>

            {/* Allergens */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#123044] block">Allergy Watchlist:</span>
              <div className="flex flex-wrap gap-1.5">
                {commonAllergens.map((alg) => {
                  const active = profile.allergies.includes(alg)
                  return (
                    <button
                      key={alg}
                      type="button"
                      onClick={() => toggleAllergy(alg)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        active
                          ? 'bg-red-50 border-red-300 text-red-700 font-semibold'
                          : 'bg-[#F4F8F8] border-[#DCE5E5] text-[#123044] hover:bg-white'
                      }`}
                    >
                      {active ? '✓ ' : '+ '} {alg}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Health Conditions */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#123044] block">Health Conditions:</span>
              <div className="flex flex-wrap gap-1.5">
                {commonConditions.map((cond) => {
                  const active = profile.health_conditions.includes(cond)
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => toggleCondition(cond)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        active
                          ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                          : 'bg-[#F4F8F8] border-[#DCE5E5] text-[#123044] hover:bg-white'
                      }`}
                    >
                      {active ? '✓ ' : '+ '} {cond}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-3 border-t border-[#DCE5E5]">
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={loading || !file}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-200" />
                    <span>Processing Food Label...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-emerald-200" />
                    <span>Analyse Food Label</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Screen 3: 6-Step Visual Screening Progress (PRD Section 11) */}
          {loading && (
            <div className="bg-white rounded-2xl border border-[#0F766E]/30 p-5 shadow-lg space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#DCE5E5] pb-2">
                <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wide">
                  Screening Pipeline Active
                </span>
                <span className="text-xs font-mono text-[#64748B]">Step {loadingStep + 1} of 6</span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  'Step 1: OpenCV Image Quality & Blur Check',
                  'Step 2: OCR Optical Character Recognition',
                  'Step 3: Text Tokenization & Section Boundary Detection',
                  'Step 4: Canonical Ingredient & INS Synonym Matching',
                  'Step 5: Legal Metrology Rule 6 & FSSAI Compliance',
                  'Step 6: Evidence Report Assembly & Verification'
                ].map((stepText, idx) => {
                  const isDone = loadingStep > idx
                  const isCurrent = loadingStep === idx
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                        isCurrent
                          ? 'bg-[#E6F4F2] text-[#0F766E] font-semibold'
                          : isDone
                          ? 'text-emerald-700'
                          : 'text-[#94A3B8]'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-[#0F766E] shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 inline-block shrink-0"></span>
                      )}
                      <span>{stepText}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
