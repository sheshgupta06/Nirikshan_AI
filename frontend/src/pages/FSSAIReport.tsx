import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronLeft,
  LayoutGrid,
  CheckCircle2,
  FileCheck,
  AlertOctagon,
  BookOpen,
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'

export const FSSAIReport: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const [scan, setScan] = useState<StoredScan | null>(null)
  const [activeSection, setActiveSection] = useState<'overview' | 'mandatory' | 'detected' | 'missing' | 'rules'>('overview')

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

  // Extract real compliance items from backend response
  const complianceItems = scan.response?.compliance_report?.items || []

  // Dynamic calculations
  const totalCount = complianceItems.length || 10
  const foundCount = complianceItems.filter((i) => i.status === 'FOUND').length
  const notDetectedCount = complianceItems.filter((i) => i.status === 'NOT_DETECTED').length
  const unclearCount = complianceItems.filter((i) => i.status === 'UNCLEAR').length

  // Filter items based on active tab
  let displayedItems = complianceItems
  if (activeSection === 'mandatory') {
    displayedItems = complianceItems.filter((i) => i.is_mandatory)
  } else if (activeSection === 'detected') {
    displayedItems = complianceItems.filter((i) => i.status === 'FOUND')
  } else if (activeSection === 'missing') {
    displayedItems = complianceItems.filter((i) => i.status === 'NOT_DETECTED' || i.status === 'UNCLEAR')
  }

  // If backend didn't return compliance items, fallback to parsed label items
  if (displayedItems.length === 0 && complianceItems.length === 0) {
    const rawText = scan.corrections?.rawIngredients || scan.response?.raw_extracted_text || ''
    displayedItems = [
      {
        rule_id: 'FSSAI-01-NAME',
        clause: 'Reg. 2.1.1',
        title: 'Name of the Food',
        title_hi: 'खाद्य का नाम',
        category: 'statutory_label',
        is_mandatory: true,
        status: scan.productName ? 'FOUND' : 'NOT_DETECTED',
        metrology_status: 'METROLOGY_COMPLIANT',
        legal_metrology_rule: 'LM Rule 6(1)(a)',
        evidence_text: scan.productName || 'Not detected',
        explanation: 'The name of the food shall be declared on the principal display panel.',
        explanation_hi: '',
        exemptions: [],
      },
      {
        rule_id: 'FSSAI-02-ING',
        clause: 'Reg. 2.1.2',
        title: 'List of Ingredients',
        title_hi: 'सामग्रियों की सूची',
        category: 'statutory_label',
        is_mandatory: true,
        status: rawText.includes('INGREDIENT') ? 'FOUND' : 'NOT_DETECTED',
        metrology_status: 'METROLOGY_COMPLIANT',
        legal_metrology_rule: 'LM Rule 6(1)(b)',
        evidence_text: rawText.match(/INGREDIENTS[^\n]+/i)?.[0]?.slice(0, 80) || 'Not detected',
        explanation: 'Ingredients list shall be declared in descending order of weight.',
        explanation_hi: '',
        exemptions: [],
      },
    ] as any
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Top Header Row matching Screen 8 */}
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">FSSAI Labelling Report</h1>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                notDetectedCount > 0
                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              {notDetectedCount > 0 ? `${notDetectedCount} items missing` : 'All Found'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-600">
            Product: <span className="font-bold text-[#123044]">{scan.corrections?.productName || scan.productName}</span>
          </p>
        </div>
      </div>

      {/* Main Layout: Left Sidebar + Right Content Area matching Screen 8 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-2 space-y-1 shadow-xs sticky top-24">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'overview'
                ? 'bg-blue-50 text-[#1E40AF] border border-blue-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Overview ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('mandatory')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'mandatory'
                ? 'bg-blue-50 text-[#1E40AF] border border-blue-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Mandatory Declarations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('detected')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'detected'
                ? 'bg-blue-50 text-[#1E40AF] border border-blue-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Detected ({foundCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('missing')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'missing'
                ? 'bg-blue-50 text-[#1E40AF] border border-blue-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Missing / Unclear ({notDetectedCount + unclearCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('rules')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'rules'
                ? 'bg-blue-50 text-[#1E40AF] border border-blue-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Rule References</span>
          </button>
        </div>

        {/* Right Main Content Area */}
        <div className="lg:col-span-9 space-y-8">
          {/* Compliance Summary Section matching Screen 8 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#123044]">Compliance Summary</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-[#123044]">{totalCount}</span>
                <p className="text-xs text-[#64748B]">Total statutory points</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-[#087F5B]">{foundCount}</span>
                <p className="text-xs text-[#64748B]">Found</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-rose-600">{notDetectedCount}</span>
                <p className="text-xs text-[#64748B]">Not detected</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-amber-600">{unclearCount}</span>
                <p className="text-xs text-[#64748B]">Unclear</p>
              </div>
            </div>
          </div>

          {/* Applicable Declarations Table matching Screen 8 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#123044]">
              {activeSection === 'missing'
                ? 'Missing or Unclear Declarations'
                : activeSection === 'detected'
                ? 'Detected Label Declarations'
                : 'Applicable Label Declarations'}
            </h2>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[#64748B] text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">Requirement</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 sm:px-6">Detected Text / Evidence</th>
                      <th className="py-3.5 px-4">Rule Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[#123044]">
                    {displayedItems.map((row, idx) => {
                      const isFound = row.status === 'FOUND'
                      const isNotDetected = row.status === 'NOT_DETECTED'
                      const statusBg = isFound
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : isNotDetected
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 sm:px-6">
                            <span className="font-semibold block">{row.title}</span>
                            {activeSection === 'rules' && (
                              <span className="text-[11px] text-slate-500 mt-0.5 block">{row.explanation}</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${statusBg}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 sm:px-6 text-[#64748B] text-xs font-mono">
                            {row.evidence_text || (isFound ? 'Verified' : 'Not detected in uploaded image')}
                          </td>
                          <td className="py-4 px-4 text-[#64748B] text-xs font-mono whitespace-nowrap">
                            {row.clause || row.legal_metrology_rule || 'FSSAI 2020'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
