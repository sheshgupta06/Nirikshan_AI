import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Save,
  Eye
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'
import { Breadcrumbs } from '../components/Breadcrumbs'

export const OCRReview: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const navigate = useNavigate()
  const [scan, setScan] = useState<StoredScan | null>(null)

  // Editable fields
  const [productName, setProductName] = useState('')
  const [rawIngredients, setRawIngredients] = useState('')
  const [rawNutrition, setRawNutrition] = useState('')
  const [netQuantity, setNetQuantity] = useState('')
  const [mrp, setMrp] = useState('')
  const [mfgDate, setMfgDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [fssaiNumber, setFssaiNumber] = useState('')

  const [hasEdits, setHasEdits] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    if (!scanId) return
    const record = scanStorage.getScan(scanId)
    if (!record) {
      // If not found, try initializing demo data
      scanStorage.initDemoScansIfEmpty()
      const fallback = scanStorage.getScan(scanId)
      if (fallback) {
        loadScanData(fallback)
      }
      return
    }
    loadScanData(record)
  }, [scanId])

  const loadScanData = (record: StoredScan) => {
    setScan(record)
    const corr = record.corrections || {}
    setProductName(corr.productName || record.productName || '')
    setRawIngredients(
      corr.rawIngredients ||
      record.response.sections_summary?.raw_ingredients_text ||
      record.response.raw_extracted_text ||
      ''
    )
    setRawNutrition(
      corr.rawNutrition ||
      record.response.health_impact_report?.nutrition_facts?.raw_nutrition_lines?.join('\n') ||
      ''
    )

    // Pull detected values from legal metrology if present
    const lmItems = record.response.legal_metrology?.items || []
    const netQtyItem = lmItems.find((i) => i.rule_id === 'LM_RULE_6_1_B')
    const mrpItem = lmItems.find((i) => i.rule_id === 'LM_RULE_6_1_C')
    const mfgItem = lmItems.find((i) => i.rule_id === 'LM_RULE_6_1_D')

    setNetQuantity(corr.netQuantity || netQtyItem?.evidence_text || '')
    setMrp(corr.mrp || mrpItem?.evidence_text || '')
    setMfgDate(corr.mfgDate || mfgItem?.evidence_text || '')
    setFssaiNumber(corr.fssaiNumber || '')
  }

  const handleSaveCorrections = () => {
    if (!scanId) return
    scanStorage.updateCorrections(scanId, {
      productName,
      rawIngredients,
      rawNutrition,
      netQuantity,
      mrp,
      mfgDate,
      expiryDate,
      fssaiNumber
    })
    setHasEdits(false)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  const handleContinue = () => {
    if (hasEdits && scanId) {
      handleSaveCorrections()
    }
    navigate(`/scan/${scanId}/results`)
  }

  if (!scan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#123044]">Scan Not Found</h2>
        <p className="text-sm text-[#64748B]">
          Could not locate the requested scan record. It may have expired or been deleted.
        </p>
        <Link
          to="/scan"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#0F766E]"
        >
          Start New Scan
        </Link>
      </div>
    )
  }

  // Find any low confidence boxes from OCR
  const ocrBoxes = scan.response.ocr_detected_boxes || []
  const lowConfidenceCount = ocrBoxes.filter((b) => b.confidence < 0.85).length

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Scan', path: '/scan' },
          { label: `Review OCR: ${scan.productName}` }
        ]}
        returnToOverviewUrl={`/scan/${scan.id}/results`}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE5E5]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">OCR Text Verification</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#315DB5] border border-blue-200">
              PRD Screen 5
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Compare extracted text side-by-side with the package photo. You can correct any OCR typos before final report generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasEdits && (
            <button
              type="button"
              onClick={handleSaveCorrections}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#0F766E] border border-[#0F766E] hover:bg-[#0F766E]/10 flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" /> Save Corrections
            </button>
          )}

          <button
            type="button"
            onClick={handleContinue}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-sm flex items-center gap-2 transition-all"
          >
            <span>Continue to Reports</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>User corrections saved successfully! Reports will reflect these values.</span>
        </div>
      )}

      {/* Uncertainty Notice */}
      {lowConfidenceCount > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block text-amber-900">
              {lowConfidenceCount} Text Segment(s) Detected with Moderate OCR Confidence
            </strong>
            <span>
              Please visually check the highlighted ingredient and date fields against your physical packaging.
            </span>
          </div>
        </div>
      )}

      {/* Side-by-Side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Original Package Image */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#DCE5E5] p-5 shadow-sm space-y-4 sticky top-24">
          <div className="flex items-center justify-between border-b border-[#DCE5E5] pb-3">
            <span className="text-xs font-bold text-[#123044] uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#0F766E]" /> Package Label Image
            </span>
            <span className="text-xs text-[#64748B]">Original Resolution</span>
          </div>

          <div className="rounded-xl overflow-hidden bg-[#123044] border border-[#DCE5E5] flex items-center justify-center min-h-[320px] max-h-[540px]">
            {scan.imageUrl ? (
              <img
                src={scan.imageUrl}
                alt="Package label"
                className="max-h-[520px] w-auto object-contain"
              />
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Image preview not available for this session
              </div>
            )}
          </div>

          <div className="text-[11px] text-[#64748B] flex items-center justify-between">
            <span>Sharpness: {scan.response.image_metadata?.blur_assessment || 'SHARP'}</span>
            <span>Lighting: {scan.response.image_metadata?.lighting_assessment || 'NORMAL'}</span>
          </div>
        </div>

        {/* Right Column: Editable Extracted Fields */}
        <div className="lg:col-span-7 space-y-5">
          {/* Product Name */}
          <div className="bg-white rounded-2xl border border-[#DCE5E5] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#123044] uppercase tracking-wide">
                Detected Product Name
              </label>
              {scan.corrections?.productName && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  User Edited
                </span>
              )}
            </div>
            <input
              type="text"
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value)
                setHasEdits(true)
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5E5] text-sm font-semibold text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          {/* Raw Ingredients Text */}
          <div className="bg-white rounded-2xl border border-[#DCE5E5] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#123044] uppercase tracking-wide block">
                  Ingredients List (Raw Extracted)
                </label>
                <p className="text-[11px] text-[#64748B]">
                  Separate ingredients with commas. Evaluated by Module B (Ingredient Safety Engine).
                </p>
              </div>
              {scan.corrections?.rawIngredients && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  User Edited
                </span>
              )}
            </div>
            <textarea
              rows={4}
              value={rawIngredients}
              onChange={(e) => {
                setRawIngredients(e.target.value)
                setHasEdits(true)
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5E5] text-xs font-mono text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] leading-relaxed"
            />
          </div>

          {/* Key Legal Declarations Grid */}
          <div className="bg-white rounded-2xl border border-[#DCE5E5] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCE5E5] pb-2">
              <span className="text-xs font-bold text-[#123044] uppercase tracking-wide">
                Key Declarations (Legal Metrology &amp; FSSAI)
              </span>
              <span className="text-[11px] text-[#64748B]">Verify against packaging print</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  Net Quantity (with metric unit)
                </label>
                <input
                  type="text"
                  value={netQuantity}
                  onChange={(e) => {
                    setNetQuantity(e.target.value)
                    setHasEdits(true)
                  }}
                  placeholder="e.g. 400 g or 1 L"
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5E5] text-xs text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  Maximum Retail Price (MRP)
                </label>
                <input
                  type="text"
                  value={mrp}
                  onChange={(e) => {
                    setMrp(e.target.value)
                    setHasEdits(true)
                  }}
                  placeholder="e.g. Rs. 140.00"
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5E5] text-xs text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  Mfg / Packaging Date
                </label>
                <input
                  type="text"
                  value={mfgDate}
                  onChange={(e) => {
                    setMfgDate(e.target.value)
                    setHasEdits(true)
                  }}
                  placeholder="e.g. 12/03/2026"
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5E5] text-xs text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  Best Before / Expiry Date
                </label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => {
                    setExpiryDate(e.target.value)
                    setHasEdits(true)
                  }}
                  placeholder="e.g. 6 Months from Packaging"
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5E5] text-xs text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  FSSAI 14-Digit License No.
                </label>
                <input
                  type="text"
                  value={fssaiNumber}
                  onChange={(e) => {
                    setFssaiNumber(e.target.value)
                    setHasEdits(true)
                  }}
                  placeholder="e.g. 10012022000346"
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5E5] text-xs text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#64748B]">
              Changes will update compliance and allergen analysis in real-time.
            </span>
            <button
              type="button"
              onClick={handleContinue}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-sm flex items-center gap-2 transition-all"
            >
              <span>Continue to Reports</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
