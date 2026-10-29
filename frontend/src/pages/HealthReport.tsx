import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronLeft,
  LayoutGrid,
  List,
  Activity,
  AlertTriangle,
  Lightbulb,
  BookOpen,
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'

export const HealthReport: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const [scan, setScan] = useState<StoredScan | null>(null)
  const [activeSection, setActiveSection] = useState<'overview' | 'ingredients' | 'nutrition' | 'allergens' | 'insights' | 'references'>('overview')

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


  // Sample data fallback matching Screen 7
  const ingredientsList = [
    { name: 'Potatoes', status: 'Generally safe', statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { name: 'Edible Vegetable Oil (Palmolein Oil)', status: 'Generally safe', statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { name: 'Iodised Salt', status: 'High in sodium', statusColor: 'bg-rose-100 text-rose-800 border-rose-200' },
    { name: 'Natural Colour (INS 160c)', status: 'Generally safe', statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  ]

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Top Header Row matching Screen 7 */}
      <div className="space-y-3 pb-2 border-b border-slate-200">
        <Link
          to={`/scan/${scan.id}/results`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0F766E] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Results</span>
        </Link>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Health Analysis Report</h1>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Moderate
          </span>
        </div>
      </div>

      {/* Main Layout: Left Sidebar + Right Content Area matching Screen 7 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-2 space-y-1 shadow-xs sticky top-24">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'overview'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('ingredients')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'ingredients'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Ingredients</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('nutrition')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'nutrition'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Nutrition Information</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('allergens')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'allergens'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Allergens</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('insights')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'insights'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Health Insights</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('references')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left transition-colors ${
              activeSection === 'references'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>References</span>
          </button>
        </div>

        {/* Right Main Content Area */}
        <div className="lg:col-span-9 space-y-8">
          {/* Key Insights Header & 4 Stat Cards Row matching Screen 7 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#123044]">Key Insights</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Stat 1 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-[#123044]">12</span>
                <p className="text-xs text-[#64748B]">Ingredients detected</p>
              </div>

              {/* Stat 2 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span className="text-3xl font-extrabold text-[#123044]">1</span>
                </div>
                <p className="text-xs text-[#64748B]">Potential allergen (Milk)</p>
              </div>

              {/* Stat 3 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-rose-600">High</span>
                <p className="text-xs text-[#64748B]">Sodium content</p>
              </div>

              {/* Stat 4 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-[#087F5B]">No</span>
                <p className="text-xs text-[#64748B]">Artificial sweeteners</p>
              </div>
            </div>
          </div>

          {/* Ingredients Section matching Screen 7 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#123044]">Ingredients</h2>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-100">
                {ingredientsList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-[#123044]">
                      {item.name}
                    </span>

                    <div className="flex items-center gap-4 shrink-0">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${item.statusColor}`}
                      >
                        {item.status}
                      </span>
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="text-xs font-semibold text-[#0F766E] hover:underline"
                      >
                        Learn more
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
