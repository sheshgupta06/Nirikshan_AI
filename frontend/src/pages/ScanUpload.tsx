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
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react'
import { scanFoodLabelImage } from '../services/api'
import { scanStorage } from '../services/scanStorage'
import type { ScanImageResponse, UserProfileConfig } from '../types/scan'
import { CameraCaptureModal } from '../components/CameraCaptureModal'

interface ImageSlotState {
  file: File
  previewUrl: string
}

export const ScanUpload: React.FC = () => {
  const [frontImage, setFrontImage] = useState<ImageSlotState | null>(null)
  const [backImage, setBackImage] = useState<ImageSlotState | null>(null)

  const [activeCameraSlot, setActiveCameraSlot] = useState<'front' | 'back' | null>(null)
  const [dragActiveSlot, setDragActiveSlot] = useState<'front' | 'back' | null>(null)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const frontInputRef = useRef<HTMLInputElement | null>(null)
  const backInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  // User Profile Config
  const [profile] = useState<UserProfileConfig>({
    profile_name: 'Default User',
    allergies: '',
    health_conditions: [],
    dietary_preference: 'VEGETARIAN',
    watchlist: '',
  })

  const validateAndProcessFile = (
    selectedFile: File,
    slot: 'front' | 'back'
  ) => {
    setErrorMessage(null)

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!validTypes.includes(selectedFile.type)) {
      setErrorMessage('Unsupported file format. Please upload a clear JPG, JPEG, or PNG image.')
      return
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setErrorMessage('Image file is too large. Maximum supported size is 15 MB.')
      return
    }

    const url = URL.createObjectURL(selectedFile)
    if (slot === 'front') {
      setFrontImage({ file: selectedFile, previewUrl: url })
    } else {
      setBackImage({ file: selectedFile, previewUrl: url })
    }
  }

  const handleSlotDrop = (e: React.DragEvent, slot: 'front' | 'back') => {
    e.preventDefault()
    e.stopPropagation()
    setDragActiveSlot(null)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0], slot)
    }
  }

  const handleCameraCapture = (file: File, previewUrl: string) => {
    if (activeCameraSlot === 'front') {
      setFrontImage({ file, previewUrl })
    } else if (activeCameraSlot === 'back') {
      setBackImage({ file, previewUrl })
    }
    setActiveCameraSlot(null)
  }

  const handleStartAnalysis = async () => {
    const filesToUpload: File[] = []
    if (frontImage) filesToUpload.push(frontImage.file)
    if (backImage) filesToUpload.push(backImage.file)

    if (filesToUpload.length === 0) {
      setErrorMessage('Please upload or capture at least one side (preferably both Front & Back) of the food packet.')
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const response: ScanImageResponse = await scanFoodLabelImage(
        filesToUpload,
        profile,
        'both',
        'IN'
      )

      // Dynamically extract product name & brand from OCR response or uploaded file
      const rawLines = response.raw_extracted_text
        ? response.raw_extracted_text.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean)
        : []

      let dynamicProductName = ''
      let dynamicBrand = ''

      // 1. Check if compliance report detected food name
      const nameFinding = response.compliance_report?.items?.find(
        (it) =>
          (it.rule_id === 'FSSAI-01-NAME' || it.title.toLowerCase().includes('name')) &&
          it.status === 'FOUND' &&
          it.evidence_text
      )
      if (nameFinding?.evidence_text) {
        dynamicProductName = nameFinding.evidence_text.replace(/^PRODUCT:\s*/i, '').trim()
      }

      // 2. Check open food facts reference
      if (!dynamicProductName && response.open_food_facts_reference?.product_name) {
        dynamicProductName = response.open_food_facts_reference.product_name
        dynamicBrand = response.open_food_facts_reference.brand || ''
      }

      // 3. Fallback to candidate line from OCR text
      if (!dynamicProductName && rawLines.length > 0) {
        const candidateLine = rawLines.find(
          (l) =>
            !l.toUpperCase().includes('NUTRITION') &&
            !l.toUpperCase().includes('INGREDIENT') &&
            !l.toUpperCase().includes('SERVING') &&
            !l.startsWith('---') &&
            l.length > 2 &&
            l.length < 60
        )
        if (candidateLine) {
          dynamicProductName = candidateLine
        }
      }

      // 4. Fallback to front image filename
      if (!dynamicProductName && frontImage?.file.name) {
        const cleanName = frontImage.file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
        dynamicProductName = cleanName
      }

      if (!dynamicProductName) {
        dynamicProductName = 'Packaged Food Product'
      }

      const scanId = `scan_${Date.now()}`
      const primaryUrl = frontImage?.previewUrl || backImage?.previewUrl || ''
      const secondaryUrl = backImage?.previewUrl || undefined
      const allUrls = [frontImage?.previewUrl, backImage?.previewUrl].filter(Boolean) as string[]

      scanStorage.saveScan({
        id: scanId,
        timestamp: new Date().toISOString(),
        productName: dynamicProductName,
        brand: dynamicBrand || dynamicProductName.split(' ')[0],
        imageUrl: primaryUrl,
        secondaryImageUrl: secondaryUrl,
        imageUrls: allUrls,
        modulesRequested: 'both',
        response,
        status: response.status === 'UNCLEAR' ? 'UNCLEAR' : 'SUCCESS',
      })

      // Navigate to Review Extracted Text page
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

  const uploadedCount = (frontImage ? 1 : 0) + (backImage ? 1 : 0)

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header & Guidance */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#0F766E] border border-emerald-200/60 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dual-Panel Packaging Scan (Front &amp; Back)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Scan Food Packet</h1>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl">
            Upload or capture <strong>both Front and Back sides</strong> of the package for 100% accurate FSSAI compliance verification and ingredient safety evaluation.
          </p>
        </div>

        {/* Progress Tracker Pill */}
        <div className="flex items-center gap-2">
          {uploadedCount === 2 ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>2 of 2 Photos Ready (Front &amp; Back)</span>
            </div>
          ) : uploadedCount === 1 ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-2 shadow-xs">
              <Info className="w-4 h-4 text-amber-600" />
              <span>1 of 2 Photos Uploaded — Add second side</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Minimum 2 Photos Required (Front + Back)</span>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={frontInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            validateAndProcessFile(e.target.files[0], 'front')
          }
        }}
      />
      <input
        ref={backInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            validateAndProcessFile(e.target.files[0], 'back')
          }
        }}
      />

      {/* Dual Upload / Capture Cards: Front Panel & Back Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* SLOT 1: Front Panel */}
        <div className="bg-white rounded-3xl border border-[#CBD5E1] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
          {/* Slot Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0F766E] text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="font-bold text-[#123044] text-base">Front Side (सामने का भाग)</h3>
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5 ml-8">
                Brand Name, Product Title, Veg/Non-Veg logo, Net Weight
              </p>
            </div>
            {frontImage && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Ready
              </span>
            )}
          </div>

          {/* Slot Body: Image Preview OR Placeholder */}
          {frontImage ? (
            <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 h-[280px] sm:h-[320px] flex items-center justify-center group">
              <img
                src={frontImage.previewUrl}
                alt="Front panel preview"
                className="w-full h-full object-contain p-2"
              />
              <button
                type="button"
                onClick={() => setFrontImage(null)}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white transition-colors shadow-md"
                title="Remove this photo"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] flex items-center justify-between">
                <span className="truncate max-w-[200px]">{frontImage.file.name}</span>
                <span className="text-emerald-300 font-semibold">Front Panel</span>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActiveSlot('front')
              }}
              onDragLeave={() => setDragActiveSlot(null)}
              onDrop={(e) => handleSlotDrop(e, 'front')}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all flex flex-col items-center justify-center min-h-[280px] sm:min-h-[320px] ${
                dragActiveSlot === 'front'
                  ? 'border-[#0F766E] bg-emerald-50/50'
                  : 'border-[#CBD5E1] bg-[#F8FAFC]'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white text-[#0F766E] shadow-sm border border-slate-200 flex items-center justify-center mb-3">
                <Layers className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-[#123044]">Your Image (Front Side)</p>
              <p className="text-xs text-[#64748B] mt-1 max-w-xs">
                Upload or capture the front cover of the packet showing the food name and brand.
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-2">JPG, JPEG, PNG (Max 15MB)</p>
            </div>
          )}

          {/* Action Buttons for Front Slot */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => frontInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-[#123044] flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <FileUp className="w-4 h-4 text-[#0F766E]" />
              <span>{frontImage ? 'Change File' : 'Upload File'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCameraSlot('front')}
              className="py-2.5 px-3 rounded-xl border border-emerald-600/30 bg-emerald-50/50 hover:bg-emerald-50 text-xs sm:text-sm font-semibold text-[#0F766E] flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Camera className="w-4 h-4 text-[#0F766E]" />
              <span>{frontImage ? 'Retake Photo' : 'Open Camera'}</span>
            </button>
          </div>
        </div>

        {/* SLOT 2: Back Panel / Nutrition Facts */}
        <div className="bg-white rounded-3xl border border-[#CBD5E1] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
          {/* Slot Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0F766E] text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="font-bold text-[#123044] text-base">Back Side (सामग्री व पोषण)</h3>
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5 ml-8">
                Ingredients List, Nutrition Facts, FSSAI Lic #, MRP, Dates
              </p>
            </div>
            {backImage && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Ready
              </span>
            )}
          </div>

          {/* Slot Body: Image Preview OR Placeholder */}
          {backImage ? (
            <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 h-[280px] sm:h-[320px] flex items-center justify-center group">
              <img
                src={backImage.previewUrl}
                alt="Back panel preview"
                className="w-full h-full object-contain p-2"
              />
              <button
                type="button"
                onClick={() => setBackImage(null)}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white transition-colors shadow-md"
                title="Remove this photo"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] flex items-center justify-between">
                <span className="truncate max-w-[200px]">{backImage.file.name}</span>
                <span className="text-emerald-300 font-semibold">Nutrition &amp; Ingredients</span>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActiveSlot('back')
              }}
              onDragLeave={() => setDragActiveSlot(null)}
              onDrop={(e) => handleSlotDrop(e, 'back')}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all flex flex-col items-center justify-center min-h-[280px] sm:min-h-[320px] ${
                dragActiveSlot === 'back'
                  ? 'border-[#0F766E] bg-emerald-50/50'
                  : 'border-[#CBD5E1] bg-[#F8FAFC]'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white text-[#0F766E] shadow-sm border border-slate-200 flex items-center justify-center mb-3">
                <FileUp className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-[#123044]">Your Image (Back Side / Nutrition)</p>
              <p className="text-xs text-[#64748B] mt-1 max-w-xs">
                Upload or capture the back panel with ingredients, nutrition table, and FSSAI number.
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-2">JPG, JPEG, PNG (Max 15MB)</p>
            </div>
          )}

          {/* Action Buttons for Back Slot */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => backInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-[#123044] flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <FileUp className="w-4 h-4 text-[#0F766E]" />
              <span>{backImage ? 'Change File' : 'Upload File'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCameraSlot('back')}
              className="py-2.5 px-3 rounded-xl border border-emerald-600/30 bg-emerald-50/50 hover:bg-emerald-50 text-xs sm:text-sm font-semibold text-[#0F766E] flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Camera className="w-4 h-4 text-[#0F766E]" />
              <span>{backImage ? 'Retake Photo' : 'Open Camera'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guidance Alert based on state */}
      <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-[#123044]">
        <div className="flex items-center gap-2.5">
          <Info className="w-5 h-5 text-[#0F766E] shrink-0" />
          {uploadedCount === 2 ? (
            <span>
              <strong>Perfect!</strong> Both Front &amp; Back panels are loaded. OCR will parse regulatory declarations, complete ingredients, and nutrition facts.
            </span>
          ) : uploadedCount === 1 ? (
            <span>
              <strong>1 photo uploaded.</strong> We strongly suggest adding the second side (Front or Back) for complete 10-point FSSAI compliance and accurate health alerts.
            </span>
          ) : (
            <span>
              Please upload or capture <strong>both Front and Back photos</strong> using your camera or files above.
            </span>
          )}
        </div>

        <div className="text-right shrink-0">
          <span className="font-semibold text-slate-500">
            {uploadedCount} of 2 photos selected
          </span>
        </div>
      </div>

      {/* Primary CTA Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleStartAnalysis}
          disabled={loading || uploadedCount === 0}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-lg text-base transition-all flex items-center justify-center gap-2.5 ${
            uploadedCount >= 2
              ? 'bg-[#0F766E] hover:bg-[#0D655E] shadow-[#0F766E]/25'
              : uploadedCount === 1
              ? 'bg-[#0F766E]/90 hover:bg-[#0F766E] shadow-[#0F766E]/20'
              : 'bg-slate-300 cursor-not-allowed shadow-none'
          } disabled:opacity-60`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-200" />
              <span>Running OCR &amp; Evaluating Food Packet...</span>
            </>
          ) : uploadedCount === 2 ? (
            <>
              <span>Analyse Food Label (Front &amp; Back Ready)</span>
              <ArrowRight className="w-5 h-5" />
            </>
          ) : uploadedCount === 1 ? (
            <>
              <span>Proceed with 1 Photo (Front/Back)</span>
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <span>Upload Photos to Analyse</span>
              <ArrowRight className="w-5 h-5 opacity-40" />
            </>
          )}
        </button>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={activeCameraSlot !== null}
        onClose={() => setActiveCameraSlot(null)}
        onCapture={handleCameraCapture}
        slotLabel={activeCameraSlot === 'front' ? 'Front Side (पैकेट का अगला भाग)' : 'Back Side (पोषण व सामग्री)'}
      />

      {/* Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
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
            Ensure text and FSSAI number are visible
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white flex items-center gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-[#123044]">
            Capture both front and back panels
          </span>
        </div>
      </div>
    </div>
  )
}
