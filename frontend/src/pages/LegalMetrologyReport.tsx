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

        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Legal Metrology Report</h1>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Compliant
          </span>
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#123044]">₹ 20.00</span>
                <p className="text-xs text-[#64748B]">MRP (incl. of all taxes)</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#123044]">52 g</span>
                <p className="text-xs text-[#64748B]">Net Quantity</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xl sm:text-2xl font-extrabold text-[#123044]">12 Aug 2024</span>
                <p className="text-xs text-[#64748B]">Mfg. Date</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xl sm:text-2xl font-extrabold text-[#123044]">11 Feb 2025</span>
                <p className="text-xs text-[#64748B]">Best Before</p>
              </div>
            </div>
          </div>

          {/* Manufacturer Details Card matching Screen 9 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#123044]">Manufacturer Details</h2>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 pb-3 border-b border-slate-100">
                <span className="sm:col-span-4 text-xs font-bold text-slate-500 uppercase">Manufacturer</span>
                <span className="sm:col-span-8 text-sm font-semibold text-[#123044]">
                  PepsiCo India Holdings Pvt. Ltd.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 pb-3 border-b border-slate-100">
                <span className="sm:col-span-4 text-xs font-bold text-slate-500 uppercase">Address</span>
                <span className="sm:col-span-8 text-sm text-[#123044]">
                  Plot No. 125, Sector 24, Gurgaon, Haryana - 122001
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 pb-3 border-b border-slate-100">
                <span className="sm:col-span-4 text-xs font-bold text-slate-500 uppercase">FSSAI License No.</span>
                <span className="sm:col-span-8 text-sm font-mono font-semibold text-[#123044]">
                  10012064000142
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4">
                <span className="sm:col-span-4 text-xs font-bold text-slate-500 uppercase">Consumer Care</span>
                <span className="sm:col-span-8 text-sm text-[#123044]">
                  1800-22-4020 | consumer.care@pepsico.com
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
