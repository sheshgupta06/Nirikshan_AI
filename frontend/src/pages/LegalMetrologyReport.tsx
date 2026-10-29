import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Info
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'
import { Breadcrumbs } from '../components/Breadcrumbs'

export const LegalMetrologyReport: React.FC = () => {
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
  const lmReport = response.legal_metrology
  const items = lmReport?.items || []

  const getMetrologyBadge = (status?: string, metrologyStatus?: string) => {
    const s = (metrologyStatus || status || '').toUpperCase()
    if (s === 'DETECTED' || s === 'COMPLIANT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> DETECTED
        </span>
      )
    }
    if (s === 'POTENTIAL_ISSUE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> POTENTIAL ISSUE
        </span>
      )
    }
    if (s === 'NEEDS_MANUAL_VERIFICATION' || s === 'UNCLEAR_NEEDS_REVIEW') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
          <Info className="w-3.5 h-3.5 text-blue-600" /> MANUAL VERIFICATION
        </span>
      )
    }
    if (s === 'NOT_DETECTED' || s === 'NON_COMPLIANT_MISSING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3.5 h-3.5 text-rose-600" /> NOT DETECTED
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Scan', path: '/scan' },
          { label: 'Dashboard', path: `/scan/${scan.id}/results` },
          { label: 'Legal Metrology Report' }
        ]}
        returnToOverviewUrl={`/scan/${scan.id}/results`}
      />

      {/* Header Banner (Strict Golden Theme #9A6712) */}
      <div className="bg-[#FFF9DB] rounded-2xl border-2 border-[#FFE066] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#9A6712] text-white flex items-center justify-center shadow-md">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#9A6712]">
                Module A • Packaged Commodities Act
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">
                Legal Metrology Compliance Report
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl">
            Screening mandatory package declarations for <strong>{productName}</strong> against <em>Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011</em>.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white border border-[#FFE066] text-center shadow-sm">
            <span className="text-[#64748B] block">Screening Scope</span>
            <span className="text-xl font-bold text-[#9A6712]">Rule 6(1)(a)-(e)</span>
          </div>
        </div>
      </div>

      {/* Statutory Guidance */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#9A6712] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-[#123044] block">
            Statutory Legal Metrology Standard (PRD Section 6)
          </strong>
          <p className="leading-relaxed text-xs">
            The Legal Metrology (Packaged Commodities) Rules, 2011 mandate that every pre-packaged commodity displays declarations including generic name, net weight/volume, Maximum Retail Price (MRP inclusive of all taxes), date of manufacture, and consumer care contacts. <em>NOT DETECTED</em> indicates text was not present in the analyzed image field and does not constitute a formal certificate of non-compliance.
          </p>
        </div>
      </div>

      {/* Evaluated Rule 6 Table */}
      <div className="bg-white rounded-2xl border border-[#DCE5E5] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#DCE5E5] pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#123044]">Rule 6 Mandatory Declarations Checklist</h3>
            <p className="text-xs text-[#64748B]">
              Statutory reference: Department of Consumer Affairs, Legal Metrology (Packaged Commodities) Rules, 2011
            </p>
          </div>
          <a
            href="https://consumeraffairs.nic.in"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[#9A6712] hover:underline inline-flex items-center gap-1"
          >
            Dept. Consumer Affairs Gazette <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F4F8F8] text-[#123044] border-b border-[#DCE5E5]">
                <th className="py-3 px-4 font-bold">Rule Citation</th>
                <th className="py-3 px-4 font-bold">Statutory Requirement</th>
                <th className="py-3 px-4 font-bold">Screening Status</th>
                <th className="py-3 px-4 font-bold">Extracted Label Evidence</th>
                <th className="py-3 px-4 font-bold">Legal Guidance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5E5]">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#9A6712] whitespace-nowrap">
                    {item.clause || item.rule_id}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#123044]">{item.title}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getMetrologyBadge(item.status, item.metrology_status)}
                  </td>
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
