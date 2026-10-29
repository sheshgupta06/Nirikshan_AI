import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  History,
  Search,
  Trash2,
  ExternalLink,
  Sparkles,
  FileText,
  HeartPulse,
  ClipboardCheck,
  Calendar,
  Database,
  RefreshCw,
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'
import { isSupabaseConfigured } from '../services/supabaseClient'

export const ScanHistory: React.FC = () => {
  const [scans, setScans] = useState<StoredScan[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'both' | 'legal_metrology' | 'ingredient_safety'>('all')
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const isCloudActive = isSupabaseConfigured()

  useEffect(() => {
    scanStorage.initDemoScansIfEmpty()
    setScans(scanStorage.getAllScans())

    // If Supabase is connected, automatically sync on mount
    if (isSupabaseConfigured()) {
      handleSync()
    }
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await scanStorage.syncWithSupabase()
      setScans(res.scans)
      setSyncMessage(`Synced ${res.scans.length} scans with Supabase Cloud`)
      setTimeout(() => setSyncMessage(null), 3000)
    } catch {
      setSyncMessage('Sync failed. Please check your Supabase connection.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm('Are you sure you want to remove this scan from your history?')) {
      scanStorage.deleteScan(id)
      setScans(scanStorage.getAllScans())
    }
  }

  const filteredScans = scans.filter((scan) => {
    const matchesSearch =
      scan.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.response.raw_extracted_text.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      selectedFilter === 'all' || scan.modulesRequested === selectedFilter

    return matchesSearch && matchesFilter
  })

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE5E5]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Scan History</h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Access, search, and re-examine all previously evaluated packaged food label scans.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isCloudActive && (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2.5 rounded-xl font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 flex items-center gap-2 text-sm transition-all"
              title="Sync with Supabase Cloud Database"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-700 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync with Supabase'}</span>
            </button>
          )}

          <Link
            to="/scan"
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-sm flex items-center justify-center gap-2 text-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>New Label Scan</span>
          </Link>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#DCE5E5] p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, ingredient, or brand..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#DCE5E5] text-xs sm:text-sm text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedFilter === 'all'
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'bg-[#F4F8F8] text-[#64748B] hover:text-[#123044]'
            }`}
          >
            All Scans ({scans.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('both')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedFilter === 'both'
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'bg-[#F4F8F8] text-[#64748B] hover:text-[#123044]'
            }`}
          >
            Combined
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('legal_metrology')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedFilter === 'legal_metrology'
                ? 'bg-[#9A6712] text-white shadow-sm'
                : 'bg-[#F4F8F8] text-[#64748B] hover:text-[#123044]'
            }`}
          >
            Legal Metrology
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('ingredient_safety')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedFilter === 'ingredient_safety'
                ? 'bg-[#087F5B] text-white shadow-sm'
                : 'bg-[#F4F8F8] text-[#64748B] hover:text-[#123044]'
            }`}
          >
            Health &amp; Safety
          </button>
        </div>
      </div>

      {/* Scans List / Cards */}
      {filteredScans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScans.map((scan) => {
            const allergensCount =
              (scan.response.allergen_report?.contains_allergens?.length || 0) +
              (scan.response.allergen_report?.may_contain_allergens?.length || 0)
            const fssaiScore = scan.response.compliance_report?.compliance_score_percent

            return (
              <div
                key={scan.id}
                className="bg-white rounded-2xl border border-[#DCE5E5] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Image Thumbnail */}
                  <div className="h-44 bg-[#123044] relative overflow-hidden flex items-center justify-center">
                    {scan.imageUrl ? (
                      <img
                        src={scan.imageUrl}
                        alt={scan.productName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-xs text-slate-400">No Image Preview</div>
                    )}

                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#123044]/80 text-white backdrop-blur-sm">
                        {scan.modulesRequested === 'both'
                          ? 'Combined Audit'
                          : scan.modulesRequested === 'legal_metrology'
                          ? 'Legal Metrology'
                          : 'Health Safety'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(scan.id, e)}
                      className="absolute top-3 right-3 p-1.5 rounded-md bg-white/90 text-slate-600 hover:text-red-600 hover:bg-white shadow-sm transition-colors"
                      title="Delete scan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(scan.timestamp).toLocaleDateString()}</span>
                    </div>

                    <h3 className="font-bold text-lg text-[#123044] group-hover:text-[#0F766E] transition-colors line-clamp-1">
                      {scan.productName}
                    </h3>

                    {/* Quick Stats Badges */}
                    <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                      <span className="px-2 py-0.5 rounded bg-[#EBFBEE] text-[#087F5B] border border-[#C3FAE8] font-semibold flex items-center gap-1">
                        <HeartPulse className="w-3 h-3" />
                        {allergensCount} Allergens
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#EBF3FF] text-[#315DB5] border border-[#D0EBFF] font-semibold flex items-center gap-1">
                        <ClipboardCheck className="w-3 h-3" />
                        FSSAI: {fssaiScore !== undefined ? `${Math.round(fssaiScore)}%` : 'Evaluated'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-[#F4F8F8] border-t border-[#DCE5E5] flex items-center justify-between text-xs">
                  <Link
                    to={`/scan/${scan.id}/review`}
                    className="font-semibold text-[#64748B] hover:text-[#123044] flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> Review OCR
                  </Link>

                  <Link
                    to={`/scan/${scan.id}/results`}
                    className="font-bold text-[#0F766E] hover:text-[#0D655E] flex items-center gap-1"
                  >
                    <span>View Reports</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-[#DCE5E5] p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center mx-auto">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#123044]">No Scans Match Your Criteria</h3>
          <p className="text-xs text-[#64748B]">
            Try adjusting your search keywords or clear the module filters to see past records.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setSelectedFilter('all')
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#0F766E] border border-[#0F766E] hover:bg-[#0F766E]/10"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  )
}
