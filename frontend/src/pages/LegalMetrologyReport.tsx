import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronLeft,
  LayoutGrid,
  Tag,
  Scale,
  Building,
  Calendar,
  PhoneCall,
  BookOpen,
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'

export const LegalMetrologyReport: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const [scan, setScan] = useState<StoredScan | null>(null)
  const [activeSection, setActiveSection] = useState<'overview' | 'mrp' | 'quantity' | 'manufacturer' | 'date' | 'care' | 'rules'>('overview')

  useEffect(() => {
    if (!scanId) return
    const record = scanStorage.getScan(scanId)
    if (!record) {
      scanStorage.initDemoScansIfEmpty()
      const fallback = scanStorage.getScan(scanId) || scanStorage.getAllScans()[0]
      if (fallback) setScan(fallback)
      return
    }
    setScan(record)
  }, [scanId])

  if (!scan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#123044]">Scan Not Found</h2>
        <Link to="/scan" className="px-5 py-2.5 rounded-xl font-semibold text-white bg-[#0F766E]">
          Start New Scan
        </Link>
      </div>
    )
  }

  // Extract real compliance items and user corrections
  const complianceItems = scan.response?.compliance_report?.items || []
  const rawText = scan.corrections?.rawIngredients || scan.response?.raw_extracted_text || ''

  const mrpItem = complianceItems.find((i) => i.rule_id === 'LM-02-MRP' || i.title.toLowerCase().includes('mrp'))
  const netQtyItem = complianceItems.find((i) => i.rule_id === 'LM-01-NET_QTY' || i.title.toLowerCase().includes('quantity'))
  const mfgDateItem = complianceItems.find((i) => i.rule_id === 'LM-03-MFG_DATE' || i.title.toLowerCase().includes('date'))
  const fssaiItem = complianceItems.find((i) => i.rule_id === 'FSSAI-06-LIC' || i.title.toLowerCase().includes('license'))
  const mfgDetailsItem = complianceItems.find((i) => i.rule_id === 'LM-04-MFG_NAME' || i.title.toLowerCase().includes('manufacturer'))
  const consumerCareItem = complianceItems.find((i) => i.rule_id === 'LM-05-CONSUMER_CARE' || i.title.toLowerCase().includes('consumer'))

  // Helper to extract clean evidence without backend boilerplate
  const cleanEvidenceText = (text: string | undefined): string => {
    if (!text) return ''
    return text
      .replace(/^Detected:\s*/i, '')
      .replace(/\s*\(Consumer feedback \/ Price line\)/i, '')
      .replace(/^(?:Metric weight|Product title|Nutrition table|14-digit|No explicit).*$/i, '')
      .trim()
  }

  // Dynamic values with priority: User Corrections -> Regex from Scanned Text -> Compliance Report
  const mrpMatch = rawText.match(/(?:MRP|PRICE|Rs\.?|₹)\s*[:\-]?\s*(?:₹|Rs\.?|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i)
  const displayMrp =
    scan.corrections?.mrp && scan.corrections.mrp !== 'Not specified'
      ? scan.corrections.mrp
      : mrpMatch
      ? `₹ ${mrpMatch[1]}`
      : cleanEvidenceText(mrpItem?.evidence_text) || 'Not detected'

  const netQtyMatch = rawText.match(/(?:NET\s*(?:WEIGHT|WT|QTY|QUANTITY)|DRAINED\s*WEIGHT)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|l)(?:\s*\+\s*[0-9]+\s*(?:g|kg|ml|l)\s*FREE)?)/i)
  const displayNetQty =
    scan.corrections?.netQuantity && scan.corrections.netQuantity !== 'Not specified'
      ? scan.corrections.netQuantity
      : netQtyMatch
      ? netQtyMatch[1].trim()
      : cleanEvidenceText(netQtyItem?.evidence_text) || 'Not detected'

  const mfgDateMatch = rawText.match(/(?:PKD|MFG|MFD|PACKED|PACKAGING|MANUFACTURE)\s*(?:DATE|ON)?\s*[:\.]?\s*([A-Za-z0-9\/\-\.\s]{3,12})/i)
  const displayMfgDate =
    scan.corrections?.mfgDate && scan.corrections.mfgDate !== 'Not specified'
      ? scan.corrections.mfgDate
      : mfgDateMatch
      ? mfgDateMatch[1].trim().replace(/^[\:\.\s]+/, '')
      : cleanEvidenceText(mfgDateItem?.evidence_text) || 'Check package'

  const expDateMatch = rawText.match(/(?:USE\s*BY|EXP|EXPIRY|BEST\s*BEFORE)\s*(?:DATE|ON)?\s*[:\.]?\s*([A-Za-z0-9\/\-\.\s]{3,12})/i)
  const displayBestBefore =
    scan.corrections?.expiryDate && scan.corrections.expiryDate !== 'Not specified'
      ? scan.corrections.expiryDate
      : expDateMatch
      ? expDateMatch[1].trim().replace(/^[\:\.\s]+/, '')
      : 'Check package'

  const mfrMatch = rawText.match(/(?:Manufactured\s*(?:&|AND)?\s*Packed\s*by|Manufacturer|Marketed\s*by|Packed\s*by)\s*[:\-]?\s*([^\n\r,]+)/i)
  const displayManufacturer =
    mfrMatch
      ? mfrMatch[1].trim()
      : cleanEvidenceText(mfgDetailsItem?.evidence_text) ||
        scan.brand ||
        scan.productName ||
        'Packer / Brand Holder'

  const fssaiMatch = rawText.match(/\b(1[0-9]{13})\b/)
  const displayFssai =
    scan.corrections?.fssaiNumber && scan.corrections.fssaiNumber !== 'Not detected'
      ? scan.corrections.fssaiNumber
      : fssaiMatch
      ? fssaiMatch[1]
      : cleanEvidenceText(fssaiItem?.evidence_text) || 'Check license panel'

  const careMatch = rawText.match(/(?:(?:Ph(?:one)?|Tel)\.?\s*No\.?|Consumer\s*Care|Help(?:line)?|Customer\s*Care)\s*[:\-]?\s*([^\n\r]+)/i)
  const displayCare =
    careMatch
      ? careMatch[1].trim()
      : cleanEvidenceText(consumerCareItem?.evidence_text) || 'Refer to package contact'

  const isCompliant = displayNetQty !== 'Not detected on panel'

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Top Header Row matching Screen 9 */}
      <div className="space-y-3 pb-2 border-b border-slate-200">
        <Link
          to={`/scan/${scan.id}/results`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0F766E] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Results</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Legal Metrology Report</h1>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                isCompliant
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              {isCompliant ? 'Compliant' : 'Review Needed'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-600">
            Product: <span className="font-bold text-[#123044]">{scan.corrections?.productName || scan.productName}</span>
          </p>
        </div>
      </div>

      {/* Main Layout: Left Sidebar + Right Content Area matching Screen 9 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Navigation matching Screen 9 */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-2 space-y-1 shadow-xs sticky top-24">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'overview'
                ? 'bg-amber-50 text-[#9A6712] border border-amber-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('mrp')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'mrp'
                ? 'bg-amber-50 text-[#9A6712] border border-amber-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>MRP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('quantity')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'quantity'
                ? 'bg-amber-50 text-[#9A6712] border border-amber-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Net Quantity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('manufacturer')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'manufacturer'
                ? 'bg-amber-50 text-[#9A6712] border border-amber-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Manufacturer Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('date')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'date'
                ? 'bg-amber-50 text-[#9A6712] border border-amber-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Date Declarations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('care')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'care'
                ? 'bg-amber-50 text-[#9A6712] border border-amber-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Consumer Care</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('rules')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'rules'
                ? 'bg-amber-50 text-[#9A6712] border border-amber-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Rule References</span>
          </button>
        </div>

        {/* Right Main Content Area matching Screen 9 */}
        <div className="lg:col-span-9 space-y-8">
          {/* Key Information 4-column metric cards */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#123044]">Key Information</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-base sm:text-2xl font-extrabold text-[#123044] block break-words">{displayMrp}</span>
                <p className="text-xs text-[#64748B]">MRP (incl. of all taxes)</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-base sm:text-2xl font-extrabold text-[#123044] block break-words">{displayNetQty}</span>
                <p className="text-xs text-[#64748B]">Net / Drained Weight</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-base sm:text-xl font-extrabold text-[#123044] block break-words">{displayMfgDate}</span>
                <p className="text-xs text-[#64748B]">Mfg. Date</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-base sm:text-xl font-extrabold text-[#123044] block break-words">{displayBestBefore}</span>
                <p className="text-xs text-[#64748B]">Best Before / Use By</p>
              </div>
            </div>
          </div>

          {/* Manufacturer Details Card matching Screen 9 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#123044]">Manufacturer &amp; Packer Details</h2>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 pb-3 border-b border-slate-100">
                <span className="sm:col-span-4 text-xs font-bold text-slate-500 uppercase">Manufacturer / Brand</span>
                <span className="sm:col-span-8 text-sm font-semibold text-[#123044]">
                  {displayManufacturer}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 pb-3 border-b border-slate-100">
                <span className="sm:col-span-4 text-xs font-bold text-slate-500 uppercase">FSSAI License No.</span>
                <span className="sm:col-span-8 text-sm font-mono font-semibold text-[#123044]">
                  {displayFssai}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 pb-3 border-b border-slate-100">
                <span className="sm:col-span-4 text-xs font-bold text-slate-500 uppercase">Consumer Care</span>
                <span className="sm:col-span-8 text-sm text-[#123044]">
                  {displayCare}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4">
                <span className="sm:col-span-4 text-xs font-bold text-slate-500 uppercase">Statutory Rule</span>
                <span className="sm:col-span-8 text-xs text-slate-600">
                  Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(a-g) mandatory declarations.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
