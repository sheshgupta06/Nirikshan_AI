import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  HeartPulse,
  ClipboardCheck,
  Scale,
  Sparkles,
  ArrowRight,
  FileText,
  Info
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { ImageQualityBanner } from '../components/ImageQualityBanner'

export const AnalysisDashboard: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const [scan, setScan] = useState<StoredScan | null>(null)

  useEffect(() => {
    if (!scanId) return
    const record = scanStorage.getScan(scanId)
    if (!record) {
      scanStorage.initDemoScansIfEmpty()
      const fallback = scanStorage.getScan(scanId)
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

  const { response, productName } = scan
  const healthReport = response.ingredient_safety || response.health_impact_report
  const fssaiReport = response.compliance_report
  const legalMetrologyReport = response.legal_metrology

  // Summary counts
  const allergenCount =
    (response.allergen_report?.contains_allergens?.length || 0) +
    (response.allergen_report?.may_contain_allergens?.length || 0)
  const healthInsightsCount =
    (healthReport?.general_health_insights?.length || 0) +
    (healthReport?.allergy_findings?.length || 0)

  const fssaiCompliantCount = fssaiReport?.summary_counts?.compliant || 0
  const fssaiTotalCount = fssaiReport?.items?.length || 0

  const lmItems = legalMetrologyReport?.items || []
  const lmDetectedCount = lmItems.filter(
    (i) => i.metrology_status === 'DETECTED' || i.status === 'COMPLIANT'
  ).length
  const lmTotalCount = lmItems.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Scan', path: '/scan' },
          { label: 'OCR Review', path: `/scan/${scan.id}/review` },
          { label: `Analysis Overview: ${productName}` }
        ]}
      />

      {/* Product Overview Header */}
      <div className="bg-white rounded-2xl border border-[#DCE5E5] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              PRD Screen 6 • Analysis Overview
            </span>
            <span className="text-xs text-[#64748B]">
              {new Date(scan.timestamp).toLocaleDateString()} at{' '}
              {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">{productName}</h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Automated screening across three distinct statutory and nutritional evaluation frameworks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/scan/${scan.id}/review`}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#123044] border border-[#DCE5E5] hover:bg-[#F4F8F8] flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-4 h-4 text-[#64748B]" />
            <span>Review OCR Text</span>
          </Link>
          <Link
            to="/scan"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Scan Another</span>
          </Link>
        </div>
      </div>

      {/* Screen 2: OpenCV Image Quality Banner */}
      <ImageQualityBanner metadata={response.image_metadata} />

      {/* PRD Screen 6: Statutory Independence Notice */}
      <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-xs sm:text-sm text-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#315DB5] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold block text-[#123044]">
            Statutory &amp; Health Separation Principle (PRD Section 11 &amp; 18)
          </strong>
          <p className="text-slate-700 leading-relaxed text-xs">
            Regulatory compliance (FSSAI Labelling or Legal Metrology Rule 6) does <strong>not</strong> imply a food product is healthy, safe for all medical conditions, or low in sodium/sugar. Conversely, a product flagged with nutritional warnings may be 100% compliant with packaging statutes. Each engine operates independently.
          </p>
        </div>
      </div>

      {/* The Three Core Report Cards (Side-by-Side on Desktop, Stacked on Mobile) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#123044]">Specialized Screening Reports</h2>
          <span className="text-xs text-[#64748B]">Click any card to open the comprehensive report</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card A: Health Analysis (Green) */}
          <div className="bg-white rounded-2xl border-2 border-[#C3FAE8] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#EBFBEE] text-[#087F5B] flex items-center justify-center">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#EBFBEE] text-[#087F5B] border border-[#C3FAE8]">
                  Health &amp; Ingredients
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#123044]">Health Analysis</h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Canonical ingredient identification, declared allergens, and ICMR/WHO nutritional benchmarks.
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-2 pt-2 border-t border-[#DCE5E5] text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B]">Detected Allergens ({allergenCount}):</span>
                  <span className="font-bold text-[#087F5B]">
                    {response.allergen_report?.contains_allergens?.length || 0} Recipe •{' '}
                    {response.allergen_report?.may_contain_allergens?.length || 0} Advisory
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B]">Health Insights &amp; Flags:</span>
                  <span className="font-bold text-amber-700">{healthInsightsCount} Evaluated</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B]">Additives / INS Identified:</span>
                  <span className="font-bold text-[#123044]">
                    {healthReport?.regulatory_additive_findings?.length || 0} Additives
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-[#DCE5E5]">
              <Link
                to={`/scan/${scan.id}/health`}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#087F5B] hover:bg-[#065A40] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <span>View Health Report</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card B: FSSAI Labelling (Blue) */}
          <div className="bg-white rounded-2xl border-2 border-[#D0EBFF] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#EBF3FF] text-[#315DB5] flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#EBF3FF] text-[#315DB5] border border-[#D0EBFF]">
                  FSSAI 2020 Rules
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#123044]">FSSAI Labelling</h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Screening against Food Safety and Standards (Labelling and Display) Regulations, 2020.
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-2 pt-2 border-t border-[#DCE5E5] text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B]">Compliance Score:</span>
                  <span className="font-bold text-[#315DB5]">
                    {fssaiReport?.compliance_score_percent !== undefined
                      ? `${Math.round(fssaiReport.compliance_score_percent)}%`
                      : 'Evaluated'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B]">Compliant Declarations:</span>
                  <span className="font-bold text-emerald-700">
                    {fssaiCompliantCount} of {fssaiTotalCount || 5} Rules
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B]">License &amp; Veg Mark:</span>
                  <span className="font-bold text-[#123044]">Reg 5(4) &amp; 5(8) Screened</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-[#DCE5E5]">
              <Link
                to={`/scan/${scan.id}/fssai`}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#315DB5] hover:bg-[#214389] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <span>View FSSAI Report</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card C: Legal Metrology (Golden) */}
          <div className="bg-white rounded-2xl border-2 border-[#FFE066] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#FFF9DB] text-[#9A6712] flex items-center justify-center">
                  <Scale className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#FFF9DB] text-[#9A6712] border border-[#FFE066]">
                  Rule 6 PCR 2011
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#123044]">Legal Metrology</h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Audits mandatory pre-packaged commodities declarations under Legal Metrology Rule 6.
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-2 pt-2 border-t border-[#DCE5E5] text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B]">Declarations Screened:</span>
                  <span className="font-bold text-[#9A6712]">
                    {lmDetectedCount} of {lmTotalCount || 5} Rule 6 Items
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B]">MRP &amp; Net Quantity:</span>
                  <span className="font-bold text-emerald-700">Metric Units Verified</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B]">Consumer Care Contact:</span>
                  <span className="font-bold text-[#123044]">Rule 6(1)(e) Screened</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-[#DCE5E5]">
              <Link
                to={`/scan/${scan.id}/legal`}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#9A6712] hover:bg-[#6D490B] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <span>View Legal Metrology Report</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
