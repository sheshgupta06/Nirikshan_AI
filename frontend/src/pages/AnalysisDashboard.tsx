import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Heart,
  FileText,
  Scale,
  Check,
  X as XIcon,
  ArrowRight,
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'

export const AnalysisDashboard: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const [scan, setScan] = useState<StoredScan | null>(null)

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
        <h2 className="text-2xl font-bold text-[#123044]">Scan Record Not Found</h2>
        <p className="text-sm text-[#64748B]">The requested scan report is unavailable.</p>
        <Link
          to="/scan"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#0F766E]"
        >
          Start New Scan
        </Link>
      </div>
    )
  }

  const productName = scan.productName || 'Lay’s Classic Potato Chips'
  const productImage =
    scan.imageUrl ||
    'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&auto=format&fit=crop&q=80'

  const formattedDate = new Date(scan.timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const formattedTime = new Date(scan.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Header Row matching Screen 6 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Analysis Reports</h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Your food label has been analysed. Explore the detailed reports below.
          </p>
        </div>

        {/* Product Card Pill on Top Right matching Screen 6 */}
        <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-2xl border border-[#CBD5E1] shadow-xs self-start sm:self-auto">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            <img src={productImage} alt={productName} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#123044] leading-tight">{productName}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Scanned on {formattedDate}, {formattedTime}
            </p>
          </div>
        </div>
      </div>

      {/* 3 Core Report Cards Grid matching Screen 6 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        {/* Card 1: Health Analysis */}
        <div className="bg-white rounded-3xl border border-[#CBD5E1] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Header: Icon + Title + Status Badge */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#087F5B] text-white flex items-center justify-center shadow-md shadow-[#087F5B]/20">
                <Heart className="w-6 h-6 fill-white/20" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Moderate
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#123044]">Health Analysis</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Nutritional safety, ingredients, allergens &amp; additives
              </p>
            </div>

            {/* Checklist matching Screen 6 */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Ingredients analysed</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Nutrition information</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Allergen check</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Health insights &amp; flags</span>
              </div>
            </div>
          </div>

          <Link
            to={`/scan/${scan.id}/health`}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span>View Health Report</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 2: FSSAI Labelling */}
        <div className="bg-white rounded-3xl border border-[#CBD5E1] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Header: Icon + Title + Status Badge */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#1E40AF] text-white flex items-center justify-center shadow-md shadow-[#1E40AF]/20">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                2 items missing
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#123044]">FSSAI Labelling</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Mandatory declarations under FSS Regulations 2020
              </p>
            </div>

            {/* Checklist matching Screen 6 */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Applicable declarations</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Detected information</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <XIcon className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Missing / unclear items</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Rule references</span>
              </div>
            </div>
          </div>

          <Link
            to={`/scan/${scan.id}/fssai`}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-[#1E40AF] hover:bg-[#1b3a99] text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span>View FSSAI Report</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 3: Legal Metrology */}
        <div className="bg-white rounded-3xl border border-[#CBD5E1] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Header: Icon + Title + Status Badge */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#9A6712] text-white flex items-center justify-center shadow-md shadow-[#9A6712]/20">
                <Scale className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Compliant
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#123044]">Legal Metrology</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Packaged Commodities Rules 2011 Rule 6 declarations
              </p>
            </div>

            {/* Checklist matching Screen 6 */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>MRP and net quantity</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Manufacturer details</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Date declarations</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#123044]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Consumer care information</span>
              </div>
            </div>
          </div>

          <Link
            to={`/scan/${scan.id}/legal`}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-[#9A6712] hover:bg-[#85580f] text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span>View Legal Report</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
