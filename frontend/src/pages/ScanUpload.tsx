import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileUp,
  Camera,
  X,
  ArrowRight,
  Sun,
  Eye,
  Layers,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { scanFoodLabelImage } from '../services/api'
import { scanStorage } from '../services/scanStorage'
import type { ScanImageResponse, UserProfileConfig } from '../types/scan'
import { LiveCameraScanner } from '../components/LiveCameraScanner'

const DEFAULT_LAYS_IMAGE =
  'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&auto=format&fit=crop&q=80'

export const ScanUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(DEFAULT_LAYS_IMAGE)
  const [mode, setMode] = useState<'upload' | 'camera'>('upload')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  // User Profile Config
  const [profile] = useState<UserProfileConfig>({
    profile_name: 'Default User',
    allergies: '',
    health_conditions: [],
    dietary_preference: 'VEGETARIAN',
    watchlist: '',
  })

  const handleFileSelection = (selectedFile: File) => {
    setErrorMessage(null)

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!validTypes.includes(selectedFile.type)) {
      setErrorMessage('Unsupported file format. Please upload a clear JPG, JPEG, or PNG image.')
      return
    }

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

  const handleStartAnalysis = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      let response: ScanImageResponse
      if (file) {
        response = await scanFoodLabelImage(file, profile, 'both', 'IN')
      } else {
        // Fetch default sample blob if user analyzes default Lay's image
        const blob = await fetch(previewUrl).then((r) => r.blob())
        const sampleFile = new File([blob], 'lays_classic_sample.jpg', { type: 'image/jpeg' })
        response = await scanFoodLabelImage(sampleFile, profile, 'both', 'IN')
      }

      // Dynamically extract product name & brand from OCR response or uploaded file
      const rawLines = response.raw_extracted_text
        ? response.raw_extracted_text.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean)
        : []
      
      let dynamicProductName = ''
      let dynamicBrand = ''

      // 1. Check if compliance report detected food name
      const nameFinding = response.compliance_report?.items?.find(
        (it) => (it.rule_id === 'FSSAI-01-NAME' || it.title.toLowerCase().includes('name')) && 
                it.status === 'FOUND' && it.evidence_text
      )
      if (nameFinding?.evidence_text) {
        dynamicProductName = nameFinding.evidence_text.replace(/^PRODUCT:\s*/i, '').trim()
      }

      // 2. Check open food facts reference
      if (!dynamicProductName && response.open_food_facts_reference?.product_name) {
        dynamicProductName = response.open_food_facts_reference.product_name
        dynamicBrand = response.open_food_facts_reference.brand || ''
      }

      // 3. Fallback to first line of extracted text (e.g. "Testo", "Haldiram's", etc.)
      if (!dynamicProductName && rawLines.length > 0) {
        const candidateLine = rawLines.find(l => 
          !l.toUpperCase().includes('NUTRITION') && 
          !l.toUpperCase().includes('INGREDIENT') &&
          !l.toUpperCase().includes('SERVING') &&
          l.length > 2 && l.length < 60
        )
        if (candidateLine) {
          dynamicProductName = candidateLine
        }
      }

      // 4. Fallback to file name if uploaded
      if (!dynamicProductName && file?.name) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
        dynamicProductName = cleanName
      }

      if (!dynamicProductName) {
        dynamicProductName = 'Packaged Food Product'
      }

      const scanId = `scan_${Date.now()}`
      scanStorage.saveScan({
        id: scanId,
        timestamp: new Date().toISOString(),
        productName: dynamicProductName,
        brand: dynamicBrand || dynamicProductName.split(' ')[0],
        imageUrl: previewUrl,
        modulesRequested: 'both',
        response,
        status: response.status === 'UNCLEAR' ? 'UNCLEAR' : 'SUCCESS',
      })

      // Navigate to Screen 5: Review Extracted Text page
      navigate(`/scan/${scanId}/review`)
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to complete label analysis. Please check image sharpness and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLiveCameraResult = (result: ScanImageResponse) => {
    const scanId = `scan_${Date.now()}`
    scanStorage.saveScan({
      id: scanId,
      timestamp: new Date().toISOString(),
      productName: 'Live Camera Scanned Product',
      imageUrl: previewUrl,
      modulesRequested: 'both',
      response: result,
      status: 'SUCCESS',
    })
    navigate(`/scan/${scanId}/review`)
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* Header matching Screen 4 */}
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Scan a Food Packet</h1>
        <p className="text-xs sm:text-sm text-[#64748B]">
          Upload a clear image of the food package (front, back or both sides)
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hidden File Input */}
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

      {/* Live Camera Scanner View if active */}
      {mode === 'camera' ? (
        <div className="bg-white rounded-3xl border border-[#CBD5E1] p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-[#123044] text-base flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#0F766E]" /> Live Camera Scanner
            </h3>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Back to Upload
            </button>
          </div>
          <LiveCameraScanner
            profile={profile}
            onScanResult={(res) => handleLiveCameraResult(res)}
            onScanError={(err) => setErrorMessage(err)}
            onSwitchToUploadMode={() => setMode('upload')}
          />
        </div>
      ) : (
        /* Dual-Box Layout matching Screen 4 */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left Box: Upload & Drag Drop Zone */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[260px] ${
                dragActive
                  ? 'border-[#0F766E] bg-emerald-50/40'
                  : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#0F766E] hover:bg-white'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white text-[#0F766E] shadow-sm border border-slate-200 flex items-center justify-center mb-3.5">
                <FileUp className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-[#123044]">
                Drag &amp; drop an image here or{' '}
                <span className="text-[#0F766E] underline">click to upload</span>
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">JPG, JPEG, PNG (Max 10MB)</p>
            </div>

            {/* Two Action Buttons directly under drag drop area */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-3 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-[#123044] flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <FileUp className="w-4 h-4 text-[#0F766E]" />
                <span>Upload from device</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('camera')}
                className="py-3 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-[#123044] flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Camera className="w-4 h-4 text-[#0F766E]" />
                <span>Use Camera</span>
              </button>
            </div>
          </div>

          {/* Right Box: Image Preview & Analyse Food Label Button */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 h-[280px] sm:h-[310px] flex items-center justify-center group">
              <img
                src={previewUrl}
                alt="Packaged food preview"
                className="w-full h-full object-contain p-2"
              />
              <button
                type="button"
                onClick={() => setPreviewUrl(DEFAULT_LAYS_IMAGE)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                title="Reset or remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-md shadow-[#0F766E]/20 text-sm sm:text-base transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-200" />
                  <span>Analyzing Label with OCR...</span>
                </>
              ) : (
                <>
                  <span>Analyse Food Label</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Tip Badges matching Screen 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white flex items-center gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sun className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-[#123044]">
            Use clear and well-lit images
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white flex items-center gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-[#123044]">
            Ensure text is visible
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white flex items-center gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-[#123044]">
            Capture front and back if possible
          </span>
        </div>
      </div>
    </div>
  )
}
