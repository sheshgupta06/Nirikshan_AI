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
  CheckCircle,
  ShieldAlert,
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'

export const HealthReport: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const [scan, setScan] = useState<StoredScan | null>(null)
  const [activeSection, setActiveSection] = useState<
    'overview' | 'ingredients' | 'nutrition' | 'allergens' | 'insights' | 'references'
  >('overview')

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

  // Extract dynamic data from the actual scan response
  const healthReport = scan.response?.health_impact_report
  const evalResult = scan.response?.evaluation
  const allergenReport = scan.response?.allergen_report
  const nutritionFacts = healthReport?.nutrition_facts

  // Dynamically build ingredients list from evaluation items or corrections
  let ingredientsList: Array<{
    name: string
    status: string
    statusColor: string
    details?: string
  }> = []

  if (evalResult?.items && evalResult.items.length > 0) {
    ingredientsList = evalResult.items.map((item) => {
      const hasAllergen = item.alerts.some((a) => a.alert_type === 'ALLERGEN_ALERT')
      const hasWatchlist = item.alerts.some((a) => a.alert_type === 'WATCHLIST_MATCH')
      const isUnclear = item.status_code === 'UNCLEAR_NEEDS_REVIEW'

      let status = 'Generally safe'
      let statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200'

      if (hasAllergen) {
        status = 'Allergen Alert'
        statusColor = 'bg-rose-100 text-rose-800 border-rose-200'
      } else if (hasWatchlist) {
        status = 'Watchlist Flag'
        statusColor = 'bg-amber-100 text-amber-800 border-amber-200'
      } else if (isUnclear) {
        status = 'Review needed'
        statusColor = 'bg-slate-100 text-slate-800 border-slate-200'
      }

      return {
        name: item.ingredient.canonical_name || item.ingredient.raw_text,
        status,
        statusColor,
        details: item.alerts[0]?.message,
      }
    })
  } else if (scan.corrections?.rawIngredients || scan.response?.raw_extracted_text) {
    // Extract tokens from corrected or raw text
    const text = scan.corrections?.rawIngredients || scan.response?.raw_extracted_text || ''
    const match = text.match(/INGREDIENTS\s*[:\-]?\s*([^.\n]+)/i)
    const rawTokens = match
      ? match[1].split(/[,;]+/)
      : text.split('\n').filter((l) => l.length > 3 && l.length < 50)

    ingredientsList = rawTokens
      .map((t) => t.trim().replace(/^[-•*]\s*/, ''))
      .filter((t) => t.length > 2 && !t.toUpperCase().includes('NUTRITION'))
      .map((name) => ({
        name,
        status: 'Detected ingredient',
        statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      }))
  }

  // Fallback if empty
  if (ingredientsList.length === 0) {
    ingredientsList = [
      { name: scan.productName || 'Food Item', status: 'Detected', statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    ]
  }

  // Calculate dynamic stats
  const totalIngredients = ingredientsList.length
  const declaredAllergens = allergenReport?.contains_allergens || []
  const precautionaryAllergens = allergenReport?.may_contain_allergens || []
  const allAllergens = Array.from(new Set([...declaredAllergens, ...precautionaryAllergens]))

  // Sodium calculation
  const sodiumVal = nutritionFacts?.sodium_mg
  let sodiumLevel = 'Normal'
  let sodiumColor = 'text-[#087F5B]'
  if (sodiumVal !== undefined && sodiumVal !== null) {
    if (sodiumVal > 800) {
      sodiumLevel = 'High'
      sodiumColor = 'text-rose-600'
    } else if (sodiumVal > 400) {
      sodiumLevel = 'Moderate'
      sodiumColor = 'text-amber-600'
    } else {
      sodiumLevel = 'Low'
      sodiumColor = 'text-[#087F5B]'
    }
  }

  // Additives
  const additiveCount = healthReport?.regulatory_additive_findings?.length || 0

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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Health Analysis Report</h1>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                allAllergens.length > 0
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              {allAllergens.length > 0 ? `${allAllergens.length} Allergen Alert` : 'Good / Safe'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-600">
            Product: <span className="font-bold text-[#123044]">{scan.corrections?.productName || scan.productName}</span>
          </p>
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
            <span>Ingredients ({totalIngredients})</span>
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
            <span>Allergens ({allAllergens.length})</span>
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
              {/* Stat 1: Total Ingredients */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-3xl font-extrabold text-[#123044]">{totalIngredients}</span>
                <p className="text-xs text-[#64748B]">Ingredients detected</p>
              </div>

              {/* Stat 2: Allergens */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className={`w-5 h-5 ${allAllergens.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="text-3xl font-extrabold text-[#123044]">{allAllergens.length}</span>
                </div>
                <p className="text-xs text-[#64748B] truncate">
                  {allAllergens.length > 0 ? allAllergens.slice(0, 2).join(', ') : 'No allergens'}
                </p>
              </div>

              {/* Stat 3: Sodium */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className={`text-3xl font-extrabold ${sodiumColor}`}>
                  {sodiumLevel}
                </span>
                <p className="text-xs text-[#64748B]">
                  Sodium {sodiumVal !== undefined && sodiumVal !== null ? `(${sodiumVal}mg)` : 'content'}
                </p>
              </div>

              {/* Stat 4: Additives / Sweeteners */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#087F5B]">
                  {additiveCount > 0 ? `${additiveCount} Additive` : 'None'}
                </span>
                <p className="text-xs text-[#64748B]">Food additives / INS</p>
              </div>
            </div>
          </div>

          {/* Section: Overview & Ingredients Table */}
          {(activeSection === 'overview' || activeSection === 'ingredients') && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#123044]">Detected Ingredients</h2>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="divide-y divide-slate-100">
                  {ingredientsList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-[#123044] block">
                          {item.name}
                        </span>
                        {item.details && (
                          <span className="text-[11px] text-amber-700 mt-0.5 block">{item.details}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${item.statusColor}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section: Nutrition Facts */}
          {(activeSection === 'overview' || activeSection === 'nutrition') && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#123044]">Nutritional Information (per 100g)</h2>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                {nutritionFacts ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500">Energy</p>
                      <p className="text-base font-bold text-[#123044] mt-0.5">
                        {nutritionFacts.energy_kcal !== null ? `${nutritionFacts.energy_kcal} kcal` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500">Protein</p>
                      <p className="text-base font-bold text-[#123044] mt-0.5">
                        {nutritionFacts.protein_g !== null ? `${nutritionFacts.protein_g} g` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500">Carbohydrates</p>
                      <p className="text-base font-bold text-[#123044] mt-0.5">
                        {nutritionFacts.carbohydrates_g !== null ? `${nutritionFacts.carbohydrates_g} g` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500">Total Sugars</p>
                      <p className="text-base font-bold text-[#123044] mt-0.5">
                        {nutritionFacts.total_sugars_g !== null ? `${nutritionFacts.total_sugars_g} g` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500">Total Fat</p>
                      <p className="text-base font-bold text-[#123044] mt-0.5">
                        {nutritionFacts.total_fat_g !== null ? `${nutritionFacts.total_fat_g} g` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500">Saturated Fat</p>
                      <p className="text-base font-bold text-[#123044] mt-0.5">
                        {nutritionFacts.saturated_fat_g !== null ? `${nutritionFacts.saturated_fat_g} g` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500">Trans Fat</p>
                      <p className="text-base font-bold text-[#123044] mt-0.5">
                        {nutritionFacts.trans_fat_g !== null ? `${nutritionFacts.trans_fat_g} g` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500">Sodium</p>
                      <p className="text-base font-bold text-rose-600 mt-0.5">
                        {nutritionFacts.sodium_mg !== null ? `${nutritionFacts.sodium_mg} mg` : 'N/A'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Nutrition values were not explicitly detected in this image scan.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section: Allergens */}
          {(activeSection === 'overview' || activeSection === 'allergens') && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#123044]">Allergen Declarations</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <h3 className="text-sm font-bold text-[#123044]">Contains (Direct Allergens)</h3>
                  </div>
                  {declaredAllergens.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {declaredAllergens.map((a, i) => (
                        <span key={i} className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg">
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No direct allergen declaration found on label.</p>
                  )}
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-[#123044]">May Contain (Precautionary Advisory)</h3>
                  </div>
                  {precautionaryAllergens.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {precautionaryAllergens.map((a, i) => (
                        <span key={i} className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg">
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No cross-contact advisory declared.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section: Health Insights */}
          {(activeSection === 'overview' || activeSection === 'insights') && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#123044]">Evidence-Backed Health Insights</h2>
              <div className="space-y-3">
                {healthReport?.general_health_insights && healthReport.general_health_insights.length > 0 ? (
                  healthReport.general_health_insights.map((insight, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start gap-3 shadow-xs">
                      <CheckCircle className="w-5 h-5 text-[#087F5B] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#123044]">{insight.title}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">{insight.explanation}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start gap-3 shadow-xs">
                    <CheckCircle className="w-5 h-5 text-[#087F5B] shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600">
                      Standard packaged food formulation assessed against Indian ICMR-NIN RDA limits.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: References */}
          {activeSection === 'references' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#123044]">Scientific &amp; Regulatory References</h2>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs text-slate-600">
                <p>• <strong>FSSAI Food Safety and Standards (Labelling and Display) Regulations, 2020</strong>: Schedule II mandatory labelling declarations.</p>
                <p>• <strong>ICMR-NIN Dietary Guidelines for Indians (2024)</strong>: Sodium recommended daily intake threshold (2000mg/day).</p>
                <p>• <strong>Legal Metrology (Packaged Commodities) Rules, 2011</strong>: Rule 6 statutory declarations on pre-packaged goods.</p>
                <p>• <strong>Open Food Facts Database</strong>: Collaborative community food ingredients and nutrition references.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
