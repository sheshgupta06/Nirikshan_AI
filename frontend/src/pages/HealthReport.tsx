import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  HeartPulse,
  ShieldAlert,
  ExternalLink,
  Info
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'
import { Breadcrumbs } from '../components/Breadcrumbs'

export const HealthReport: React.FC = () => {
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
  const healthReport = response.ingredient_safety || response.health_impact_report
  const allergens = response.allergen_report
  const ingredients = response.evaluation?.items || []
  const insights = healthReport?.general_health_insights || []
  const additives = healthReport?.regulatory_additive_findings || []
  const nutrition = healthReport?.nutrition_facts

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Scan', path: '/scan' },
          { label: 'Dashboard', path: `/scan/${scan.id}/results` },
          { label: 'Health & Ingredient Safety Report' }
        ]}
        returnToOverviewUrl={`/scan/${scan.id}/results`}
      />

      {/* Header Banner (Strict Green Theme #087F5B) */}
      <div className="bg-[#EBFBEE] rounded-2xl border-2 border-[#C3FAE8] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#087F5B] text-white flex items-center justify-center shadow-md">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#087F5B]">
                Module B • Food Ingredient Safety
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">
                Health &amp; Nutritional Intelligence
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl">
            Detailed breakdown of ingredients for <strong>{productName}</strong>, declared allergens, INS additives, and scientific benchmarks from published WHO &amp; ICMR literature.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl font-bold bg-[#087F5B] text-white shadow-sm">
            {ingredients.length} Ingredients Deciphered
          </span>
          <span className="px-3 py-1.5 rounded-xl font-semibold bg-white text-[#123044] border border-[#C3FAE8]">
            {allergens?.contains_allergens?.length || 0} Declared Allergens
          </span>
        </div>
      </div>

      {/* Medical & Nutritional Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#087F5B] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-[#123044] block">Evidence-Based Information Disclaimer</strong>
          <p className="leading-relaxed">
            Nirikshan AI provides objective ingredient facts and scientific reference thresholds. This platform does not diagnose medical conditions, prescribe individual diets, or declare any product universally safe or unsafe. Individuals with chronic medical conditions (e.g. Coeliac disease, diabetes, severe allergies) should always consult a physician or registered dietician.
          </p>
        </div>
      </div>

      {/* Section 1: Allergen Declarations (Recipe CONTAINS vs Precautionary MAY CONTAIN) */}
      <div className="bg-white rounded-2xl border border-[#DCE5E5] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#DCE5E5] pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-bold text-[#123044]">Allergen Identification</h3>
          </div>
          <span className="text-xs text-[#64748B]">FSSAI 2020 Schedule II Mandatory Screening</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Declared Recipe Ingredients (CONTAINS) */}
          <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                Recipe Ingredients (CONTAINS)
              </span>
              <span className="text-[11px] font-semibold text-red-700">Immediate Sensitivity Risk</span>
            </div>
            {allergens?.contains_allergens && allergens.contains_allergens.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {allergens.contains_allergens.map((alg, i) => (
                  <span
                    key={i}
                    className="text-xs font-bold px-3 py-1 rounded-lg bg-red-600 text-white shadow-sm"
                  >
                    ⚠️ {alg}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] italic">No recipe allergens explicitly detected.</p>
            )}
            <p className="text-[11px] text-red-800 pt-1">
              These ingredients are intentionally added in the product formulation recipe.
            </p>
          </div>

          {/* Precautionary Cross-Contact (MAY CONTAIN) */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                Cross-Contact Advisory (MAY CONTAIN)
              </span>
              <span className="text-[11px] font-semibold text-amber-700">Facility / Shared Line</span>
            </div>
            {allergens?.may_contain_allergens && allergens.may_contain_allergens.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {allergens.may_contain_allergens.map((alg, i) => (
                  <span
                    key={i}
                    className="text-xs font-semibold px-3 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300"
                  >
                    ⚡ {alg}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] italic">No cross-contact advisory detected on label.</p>
            )}
            <p className="text-[11px] text-amber-800 pt-1">
              May be present due to shared manufacturing equipment or agricultural processing lines.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Canonical Ingredients & Matching Status (PRD Section 7.3) */}
      <div className="bg-white rounded-2xl border border-[#DCE5E5] p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE5E5] pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#123044]">Normalized Ingredient Database Matches</h3>
            <p className="text-xs text-[#64748B]">Canonical identification and verified Indian food aliases</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">EXACT</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">SYNONYM</span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">PROBABLE</span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">AMBIGUOUS</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F4F8F8] text-[#123044] border-b border-[#DCE5E5]">
                <th className="py-3 px-4 font-bold">Raw OCR Extracted Text</th>
                <th className="py-3 px-4 font-bold">Canonical Name / Meaning</th>
                <th className="py-3 px-4 font-bold">INS / E-Code</th>
                <th className="py-3 px-4 font-bold">Match Status</th>
                <th className="py-3 px-4 font-bold">Dietary Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5E5]">
              {ingredients.map((item, idx) => {
                const ing = item.ingredient
                const matchStatus = ing.prd_match_status || 'EXACT'
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#123044]">{ing.raw_text}</td>
                    <td className="py-3 px-4 text-[#087F5B] font-semibold">
                      {ing.canonical_name || ing.raw_text}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {ing.ins_code ? `INS ${ing.ins_code}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          matchStatus === 'EXACT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : matchStatus === 'SYNONYM'
                            ? 'bg-blue-100 text-blue-800'
                            : matchStatus === 'AMBIGUOUS'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {matchStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {ing.is_vegetarian !== false ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Veg
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-600"></span> Non-Veg / Caution
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Extracted Nutrition Facts with ICMR / WHO Benchmarks */}
      {nutrition && (
        <div className="bg-white rounded-2xl border border-[#DCE5E5] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#DCE5E5] pb-3">
            <div>
              <h3 className="text-lg font-bold text-[#123044]">Extracted Nutritional Summary</h3>
              <p className="text-xs text-[#64748B]">
                Measurement basis: {nutrition.measurement_basis || 'per 100g'} • Serving size:{' '}
                {nutrition.serving_size || 'Standard packet portion'}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Reliably Parsed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F4F8F8] border border-[#DCE5E5] text-center">
              <span className="text-[11px] font-bold text-[#64748B] uppercase block">Energy</span>
              <span className="text-2xl font-black text-[#123044] block mt-1">
                {nutrition.energy_kcal ?? '—'}
              </span>
              <span className="text-[10px] text-[#64748B]">kcal</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F4F8F8] border border-[#DCE5E5] text-center">
              <span className="text-[11px] font-bold text-[#64748B] uppercase block">Carbohydrates</span>
              <span className="text-2xl font-black text-[#123044] block mt-1">
                {nutrition.carbohydrates_g ?? '—'}
              </span>
              <span className="text-[10px] text-[#64748B]">grams</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F4F8F8] border border-[#DCE5E5] text-center">
              <span className="text-[11px] font-bold text-[#64748B] uppercase block">Sugars</span>
              <span className="text-2xl font-black text-amber-700 block mt-1">
                {nutrition.sugars_g ?? '—'}
              </span>
              <span className="text-[10px] text-[#64748B]">grams (WHO max: 25g/day)</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F4F8F8] border border-[#DCE5E5] text-center">
              <span className="text-[11px] font-bold text-[#64748B] uppercase block">Sodium</span>
              <span className="text-2xl font-black text-red-700 block mt-1">
                {nutrition.sodium_mg ?? '—'}
              </span>
              <span className="text-[10px] text-[#64748B]">mg (WHO max: 2000mg/day)</span>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Evidence-Backed Health Insights & Additive Regulatory Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evidence-Backed Health Insights */}
        <div className="bg-white rounded-2xl border border-[#DCE5E5] p-6 shadow-sm space-y-4">
          <div className="border-b border-[#DCE5E5] pb-3">
            <h3 className="text-base font-bold text-[#123044]">Scientific Evidence Findings</h3>
            <p className="text-xs text-[#64748B]">Published WHO &amp; ICMR dietary guidance</p>
          </div>

          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">{insight.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-200 text-amber-900">
                      {insight.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed">{insight.explanation}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-[11px]">
                    <span className="text-[#64748B] font-medium">{insight.authority}</span>
                    {insight.source_url && (
                      <a
                        href={insight.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#087F5B] hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        Source Citation <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#64748B] p-4 text-center">No critical nutritional alerts triggered.</p>
          )}
        </div>

        {/* Multi-Jurisdiction Additive Status */}
        <div className="bg-white rounded-2xl border border-[#DCE5E5] p-6 shadow-sm space-y-4">
          <div className="border-b border-[#DCE5E5] pb-3">
            <h3 className="text-base font-bold text-[#123044]">Multi-Jurisdiction Regulatory Matrix</h3>
            <p className="text-xs text-[#64748B]">Status across FSSAI (India), EU EFSA &amp; US FDA</p>
          </div>

          {additives.length > 0 ? (
            <div className="space-y-3">
              {additives.map((add, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[#DCE5E5] bg-[#F4F8F8] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#123044]">{add.canonical_name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                        INS {add.ins_number}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B]">{add.functional_class}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{add.plain_english}</p>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#DCE5E5] text-[10px]">
                    <div className="p-1.5 rounded bg-white border border-[#DCE5E5] text-center">
                      <span className="text-[#64748B] block">FSSAI India</span>
                      <span className="font-bold text-emerald-700">{add.fssai_status}</span>
                    </div>
                    <div className="p-1.5 rounded bg-white border border-[#DCE5E5] text-center">
                      <span className="text-[#64748B] block">EU EFSA</span>
                      <span className="font-bold text-emerald-700">{add.eu_efsa_status}</span>
                    </div>
                    <div className="p-1.5 rounded bg-white border border-[#DCE5E5] text-center">
                      <span className="text-[#64748B] block">US FDA</span>
                      <span className="font-bold text-emerald-700">{add.us_fda_status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#64748B] p-4 text-center">No artificial or chemical additives detected.</p>
          )}
        </div>
      </div>
    </div>
  )
}
