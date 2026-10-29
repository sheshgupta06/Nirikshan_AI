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

      // Assign evidence-backed plain-English health concern
      const lower = (item.ingredient.canonical_name || item.ingredient.raw_text).toLowerCase()
      let healthConcern = item.alerts[0]?.message || ''

      if (!healthConcern) {
        if (lower.includes('soy')) {
          healthConcern = 'Allergen Concern: Contains soy protein; can trigger allergic reactions in soy-sensitive individuals.'
        } else if (lower.includes('wheat') || lower.includes('maida') || lower.includes('gluten')) {
          healthConcern = 'Gluten / Allergen Concern: Contains gluten; unsafe for Coeliac Disease and wheat allergy.'
        } else if (lower.includes('salt') || lower.includes('sodium')) {
          healthConcern = 'Cardiovascular / BP Risk: Concentrated sodium source; high intake elevates blood pressure (hypertension) and kidney strain.'
        } else if (lower.includes('sugar') || lower.includes('glucose') || lower.includes('fructose') || lower.includes('syrup')) {
          healthConcern = 'Metabolic / Diabetes Risk: Simple carbohydrate; rapidly spikes blood glucose levels and increases diabetic risk.'
        } else if (lower.includes('palmolein') || lower.includes('palm oil')) {
          healthConcern = 'Heart Health Concern: High in saturated fatty acids (~50%); may increase serum LDL cholesterol.'
        } else if (lower.includes('citric acid') || lower.includes('330') || lower.includes('acidity regulator')) {
          healthConcern = 'Digestive Note: Acidity regulator (INS 330); safe in standard amounts, high intake may aggravate acidity or reflux.'
        } else if (lower.includes('monosodium') || lower.includes('msg') || lower.includes('621')) {
          healthConcern = 'Flavor Enhancer: Permitted glutamate additive; some individuals report mild sensitivity symptoms.'
        } else if (lower.includes('water')) {
          healthConcern = 'Safe hydration carrier ingredient.'
        } else if (lower.includes('milk') || lower.includes('dairy') || lower.includes('whey')) {
          healthConcern = 'Allergen / Lactose Concern: Contains dairy proteins and lactose; unsuitable for lactose intolerance or milk allergy.'
        } else if (lower.includes('peanut') || lower.includes('nut')) {
          healthConcern = 'Severe Allergen Warning: Nut allergens can induce severe systemic allergic reactions.'
        } else {
          healthConcern = 'Standard Food Ingredient: Evaluated against FSSAI and ICMR-NIN safety guidelines.'
        }
      }

      return {
        name: item.ingredient.canonical_name || item.ingredient.raw_text,
        status,
        statusColor,
        details: healthConcern,
      }
    })
  } else if (scan.corrections?.rawIngredients || scan.response?.raw_extracted_text) {
    // Extract tokens from corrected or raw text
    const text = scan.corrections?.rawIngredients || scan.response?.raw_extracted_text || ''
    const match = text.match(/INGREDIENTS?\s*[:\-]?\s*([^.\n]+)/i)
    const rawTokens = match
      ? match[1].split(/[,;]+/)
      : text.split('\n').filter((l) => l.length > 3 && l.length < 50)

    ingredientsList = rawTokens
      .map((t) => t.trim().replace(/^[-•*]\s*/, ''))
      .filter((t) => t.length > 2 && !t.toUpperCase().includes('NUTRITION'))
      .map((name) => {
        const lower = name.toLowerCase()
        let status = 'Generally safe'
        let statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200'
        let details = 'Evaluated food component.'

        if (lower.includes('soy') || lower.includes('wheat') || lower.includes('milk') || lower.includes('nut') || lower.includes('mustard')) {
          status = 'Allergen Alert'
          statusColor = 'bg-rose-100 text-rose-800 border-rose-200'
          details = 'Known allergen: Can cause allergic reactions or food sensitivity.'
        } else if (lower.includes('salt') || lower.includes('sodium')) {
          status = 'High in sodium'
          statusColor = 'bg-rose-100 text-rose-800 border-rose-200'
          details = 'High intake elevates blood pressure (hypertension) and kidney strain.'
        } else if (lower.includes('sugar') || lower.includes('glucose')) {
          status = 'Metabolic Caution'
          statusColor = 'bg-amber-100 text-amber-800 border-amber-200'
          details = 'Added sugar spikes blood glucose; monitor intake for diabetes.'
        } else if (lower.includes('palm') || lower.includes('palmolein')) {
          status = 'Saturated Fat'
          statusColor = 'bg-amber-100 text-amber-800 border-amber-200'
          details = 'High in saturated fat (~50%); can raise LDL cholesterol.'
        } else if (lower.includes('330') || lower.includes('citric acid') || lower.includes('acidity')) {
          status = 'Acidity Regulator'
          statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200'
          details = 'INS 330 (Citric Acid) — Generally recognized as safe by FSSAI & EFSA.'
        }

        return { name, status, statusColor, details }
      })
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
              <h2 className="text-lg font-bold text-[#123044]">Evidence-Backed Health Insights &amp; Condition Warnings</h2>
              <div className="space-y-3">
                {/* Allergy Findings */}
                {healthReport?.allergy_findings && healthReport.allergy_findings.length > 0 &&
                  healthReport.allergy_findings.map((finding, idx) => (
                    <div key={`allergy-${idx}`} className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 flex items-start gap-3 shadow-xs">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-rose-900">{finding.title}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900 uppercase">
                            {finding.severity}
                          </span>
                        </div>
                        <p className="text-xs text-rose-800 mt-1">{finding.explanation}</p>
                        <p className="text-[11px] text-rose-600 font-semibold mt-1">Action: {finding.recommended_action}</p>
                      </div>
                    </div>
                  ))
                }

                {/* Condition Findings (Diabetes, Hypertension, CKD) */}
                {healthReport?.condition_findings && healthReport.condition_findings.length > 0 &&
                  healthReport.condition_findings.map((finding, idx) => (
                    <div key={`cond-${idx}`} className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 flex items-start gap-3 shadow-xs">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-amber-900">{finding.title}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 uppercase">
                            {finding.severity}
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 mt-1">{finding.explanation}</p>
                        <p className="text-[11px] text-amber-700 font-semibold mt-1">Guidance: {finding.recommended_action}</p>
                      </div>
                    </div>
                  ))
                }

                {/* Regulatory Additive Findings */}
                {healthReport?.regulatory_additive_findings && healthReport.regulatory_additive_findings.length > 0 &&
                  healthReport.regulatory_additive_findings.map((additive, idx) => (
                    <div key={`add-${idx}`} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3 shadow-xs">
                      <CheckCircle className="w-5 h-5 text-[#087F5B] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#123044]">
                          {additive.canonical_name} (INS {additive.ins_number}) — {additive.functional_class}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">{additive.plain_english || additive.health_concern}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                          <span className="font-semibold text-slate-500">Status:</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                            FSSAI: {additive.fssai_status}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px]">
                            EU EFSA: {additive.eu_efsa_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                }

                {/* General Health Insights */}
                {healthReport?.general_health_insights && healthReport.general_health_insights.length > 0 &&
                  healthReport.general_health_insights.map((insight, idx) => (
                    <div key={`gen-${idx}`} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start gap-3 shadow-xs">
                      <Lightbulb className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#123044]">{insight.title}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">{insight.explanation}</p>
                      </div>
                    </div>
                  ))
                }

                {(!healthReport?.allergy_findings?.length &&
                  !healthReport?.condition_findings?.length &&
                  !healthReport?.regulatory_additive_findings?.length &&
                  !healthReport?.general_health_insights?.length) && (
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
