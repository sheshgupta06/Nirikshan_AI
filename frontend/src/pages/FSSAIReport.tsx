import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ExternalLink,
  Info
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'
import { Breadcrumbs } from '../components/Breadcrumbs'

export const FSSAIReport: React.FC = () => {
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
        <h2 className="text-2xl font-bold text-[#123044]">Scan Not Found</h2>
        <Link to="/scan" className="px-5 py-2.5 rounded-xl font-semibold text-white bg-[#0F766E]">
          Start New Scan
        </Link>
      </div>
    )
  }

  const { response, productName } = scan
  const fssaiReport = response.compliance_report
  const items = fssaiReport?.items || []

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase()
    if (s === 'COMPLIANT' || s === 'FOUND' || s === 'DETECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> FOUND / COMPLIANT
        </span>
      )
    }
    if (s === 'NOT_DETECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3.5 h-3.5 text-rose-600" /> NOT DETECTED IN IMAGE
        </span>
      )
    }
    if (s === 'UNCLEAR' || s === 'UNCLEAR_NEEDS_REVIEW' || s === 'NEEDS_MANUAL_VERIFICATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> UNCLEAR / VERIFY
        </span>
      )
    }
    if (s === 'NOT_APPLICABLE' || s === 'EXEMPTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" /> NOT APPLICABLE
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        NOT ASSESSED
      </span>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Scan', path: '/scan' },
          { label: 'Dashboard', path: `/scan/${scan.id}/results` },
          { label: 'FSSAI Labelling Report' }
        ]}
        returnToOverviewUrl={`/scan/${scan.id}/results`}
      />

      {/* Header Banner (Strict Blue Theme #315DB5) */}
      <div className="bg-[#EBF3FF] rounded-2xl border-2 border-[#D0EBFF] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#315DB5] text-white flex items-center justify-center shadow-md">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#315DB5]">
                Module 2 • Statutory Regulatory Audit
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">
                FSSAI Labelling Compliance
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl">
            Screening packaged label declarations for <strong>{productName}</strong> against the statutory provisions of the <em>Food Safety and Standards (Labelling and Display) Regulations, 2020</em>.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white border border-[#D0EBFF] text-center shadow-sm">
            <span className="text-[#64748B] block">Compliance Score</span>
            <span className="text-xl font-bold text-[#315DB5]">
              {fssaiReport?.compliance_score_percent !== undefined
                ? `${Math.round(fssaiReport.compliance_score_percent)}%`
                : '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Critical Statutory Guidance Notice */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs sm:text-sm text-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#315DB5] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-[#123044] block">
            Statutory Evaluation Protocol (PRD Section 6 &amp; Section 18)
          </strong>
          <p className="leading-relaxed text-xs">
            Nirikshan AI does <strong>not</strong> classify an item as legally missing or in violation solely because OCR failed to detect it in a single camera snapshot. Packaging curvatures, side panels, folds, and camera shadows can obscure valid text. Items marked <em>NOT DETECTED IN IMAGE</em> require visual inspection of the physical packet before making enforcement determinations.
          </p>
        </div>
      </div>

      {/* Evaluated Rules Table */}
      <div className="bg-white rounded-2xl border border-[#DCE5E5] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#DCE5E5] pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#123044]">FSSAI 2020 Statutory Declarations Checklist</h3>
            <p className="text-xs text-[#64748B]">
              Statutory reference: Food Safety and Standards (Labelling and Display) Regulations, 2020
            </p>
          </div>
          <a
            href="https://www.fssai.gov.in"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[#315DB5] hover:underline inline-flex items-center gap-1"
          >
            FSSAI Official Gazette <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F4F8F8] text-[#123044] border-b border-[#DCE5E5]">
                <th className="py-3 px-4 font-bold">Rule Citation</th>
                <th className="py-3 px-4 font-bold">Mandatory Declaration</th>
                <th className="py-3 px-4 font-bold">Screening Status</th>
                <th className="py-3 px-4 font-bold">Detected Label Evidence</th>
                <th className="py-3 px-4 font-bold">Statutory Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5E5]">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#315DB5] whitespace-nowrap">
                    {item.clause || item.rule_id}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#123044]">{item.title}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                  <td className="py-3 px-4 font-mono text-slate-700 max-w-xs truncate">
                    {item.evidence_text || '—'}
                  </td>
                  <td className="py-3 px-4 text-[#64748B] leading-relaxed max-w-sm">
                    {item.explanation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
