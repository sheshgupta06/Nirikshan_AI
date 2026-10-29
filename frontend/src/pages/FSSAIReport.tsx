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

  // FSSAI Table rows matching Screen 8
  const declarationsTable = [
    {
      requirement: 'Name of the food',
      status: 'FOUND',
      detectedText: 'Lay’s Classic Potato Chips',
      ruleRef: 'FSS (Labelling) Reg. 2011, Reg. 2.1.1',
    },
    {
      requirement: 'List of ingredients',
      status: 'FOUND',
      detectedText: 'Potatoes, Edible Vegetable Oil...',
      ruleRef: 'Reg. 2.1.2',
    },
    {
      requirement: 'Nutritional information',
      status: 'FOUND',
      detectedText: 'Energy 536 kcal, Protein 6.9 g...',
      ruleRef: 'Reg. 2.2.1',
    },
    {
      requirement: 'Vegetarian / Non-vegetarian logo',
      status: 'FOUND',
      detectedText: '(Detected Green Dot / Square)',
      ruleRef: 'Reg. 2.2.2',
    },
    {
      requirement: 'Allergen declaration',
      status: 'FOUND',
      detectedText: 'Contains Milk',
      ruleRef: 'Reg. 2.4.1',
    },
  ]

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

        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">FSSAI Labelling Report</h1>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            2 items missing
          </span>
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
            <span>Overview</span>
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
            <span>Detected Information</span>
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
            <span>Missing / Unclear Items</span>
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
                <span className="text-3xl font-extrabold text-[#123044]">10</span>
                <p className="text-xs text-[#64748B]">Total applicable items</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-[#087F5B]">8</span>
                <p className="text-xs text-[#64748B]">Found</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-rose-600">2</span>
                <p className="text-xs text-[#64748B]">Not detected</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-amber-600">0</span>
                <p className="text-xs text-[#64748B]">Unclear</p>
              </div>
            </div>
          </div>

          {/* Applicable Declarations Table matching Screen 8 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#123044]">Applicable Declarations</h2>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[#64748B] text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">Requirement</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 sm:px-6">Detected Text</th>
                      <th className="py-3.5 px-4">Rule Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[#123044]">
                    {declarationsTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-semibold">{row.requirement}</td>
                        <td className="py-4 px-4">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {row.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-[#64748B] text-xs font-mono">
                          {row.detectedText}
                        </td>
                        <td className="py-4 px-4 text-[#64748B] text-xs font-mono whitespace-nowrap">
                          {row.ruleRef}
                        </td>
                      </tr>
                    ))}
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
