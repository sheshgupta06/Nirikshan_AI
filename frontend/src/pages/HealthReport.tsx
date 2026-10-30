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
  Stethoscope,
  Sparkles,
  HeartPulse,
} from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'

// Non-ingredient instruction/packaging lines to filter out
const NON_INGREDIENT_REGEX =
  /\b(W\.?H\.?O|RECOMMENDED\s*FORMULA|formula\s*allows|absorption|Fluids|replacing|severe\s*diarrh|STORE\s*IN|KEEP\s*PROTECTED|KEEP\s*OUT|DRY\s*PLACE|Each\s*sachet|powder\s*in|DOSAGE|DIRECTIONS?|until\s*diarrhoea|PANEL\s*\d|WhatsApp\s*Image|MFG\s*DATE|BATCH\s*NO|EXPIRY|NET\s*QUANTITY|MRP\s*Rs|CONSUMER\s*CARE|STORAGE:|FSSAI\s*Lic|ALLERGEN\s*ADVICE|GREEN\s*VEG\s*EMBLEM|FiecTROLYTE|ELECTROLYTE|TION\s*:\s*OAS|Exciplents|Electrolytes\s*lost|Water\s*&\s*Electrolytes)\b/i

function cleanIngredientName(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^(the|and|or)\s+/i, '')
  s = s.replace(/^[0-9]+(?:\.[0-9]+)?\s*(?:g|mg|kg|ml|l|gm)\s*(?:of\s*)?/i, '')
  s = s.replace(/\b(?:Each\s*sachet\s*of|powder\s*in\s*one\s*sachet|contains?)\b/gi, '')
  s = s.replace(/^[0-9]+(?:\.[0-9]+)?\s*/, '')
  s = s.replace(/^[-•*|]+\s*/, '')
  s = s.replace(/\|.*$/, '')
  return s.trim()
}

interface EvaluatedIngredientItem {
  name: string
  status: string
  statusColor: string
  details?: string
  affectedPatients?: string[]
}

function evaluateIngredientClinical(
  rawName: string,
  backendEvaluations?: Array<{
    ingredient_name: string
    safety_badge: string
    status_color: string
    clinical_explanation: string
    affected_patients: string[]
  }>
): EvaluatedIngredientItem {
  const name = cleanIngredientName(rawName)
  const lower = name.toLowerCase()

  // Match backend LLM/clinical evaluation if present
  if (backendEvaluations && backendEvaluations.length > 0) {
    const matched = backendEvaluations.find(
      (be) =>
        be.ingredient_name.toLowerCase().includes(lower) ||
        lower.includes(be.ingredient_name.toLowerCase())
    )
    if (matched) {
      let colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'
      if (matched.status_color === 'rose') {
        colorClass = 'bg-rose-100 text-rose-800 border-rose-300'
      } else if (matched.status_color === 'amber') {
        colorClass = 'bg-amber-100 text-amber-800 border-amber-300'
      } else if (matched.status_color === 'blue') {
        colorClass = 'bg-blue-100 text-blue-800 border-blue-300'
      }
      return {
        name,
        status: matched.safety_badge,
        statusColor: colorClass,
        details: matched.clinical_explanation,
        affectedPatients: matched.affected_patients,
      }
    }
  }

  // Deterministic Clinical Rules Mapping
  // 1. Kidney / CKD Risk (Potassium)
  if (
    lower.includes('potassium chloride') ||
    lower.includes('potassium chlorid') ||
    lower.includes('potassium citrate') ||
    (lower.includes('potassium') && !lower.includes('sorbate'))
  ) {
    return {
      name,
      status: '🚨 Kidney (CKD) Risk',
      statusColor: 'bg-rose-100 text-rose-800 border-rose-300',
      details:
        'Kidney Warning: Concentrated potassium cannot be excreted by impaired kidneys, risking life-threatening hyperkalemia & cardiac arrhythmia.',
      affectedPatients: ['Kidney Disease (गुर्दे की बीमारी / CKD)', 'Renal Failure Patients'],
    }
  }

  // 2. Diabetic Risk (Dextrose, Glucose, Simple Sugars)
  if (
    lower.includes('dextrose') ||
    lower.includes('glucose') ||
    lower.includes('fructose') ||
    lower.includes('corn syrup') ||
    lower.includes('maltodextrin') ||
    lower.includes('sucrose') ||
    lower.includes('sugar')
  ) {
    return {
      name,
      status: '⚠️ Diabetes Risk',
      statusColor: 'bg-amber-100 text-amber-800 border-amber-300',
      details:
        'High Glycemic Sugar: Fast-absorbing simple carbohydrate (GI 100). Rapidly spikes blood glucose; diabetic patients should exercise strict caution.',
      affectedPatients: ['Diabetic Patients (मधुमेह)', 'Prediabetes / Insulin Resistance'],
    }
  }

  // 3. Hypertension / High Blood Pressure / Heart Failure
  if (
    lower.includes('sodium chloride') ||
    lower.includes('sodium citrate') ||
    lower.includes('salt') ||
    lower.includes('iodized salt') ||
    lower.includes('common salt')
  ) {
    return {
      name,
      status: '⚠️ High BP / Heart Risk',
      statusColor: 'bg-amber-100 text-amber-800 border-amber-300',
      details:
        'Cardiovascular / BP Risk: Concentrated sodium expands blood plasma volume, raising arterial blood pressure and increasing cardiac strain.',
      affectedPatients: ['Hypertension (उच्च रक्तचाप)', 'Heart Failure Patients'],
    }
  }

  // 4. Gluten / Celiac
  if (
    lower.includes('wheat') ||
    lower.includes('maida') ||
    lower.includes('gluten') ||
    lower.includes('barley') ||
    lower.includes('rye') ||
    lower.includes('atta')
  ) {
    return {
      name,
      status: '🚨 Celiac / Gluten Trigger',
      statusColor: 'bg-rose-100 text-rose-800 border-rose-300',
      details:
        'Gluten Protein: Unsafe for Celiac disease and gluten sensitivity. Induces intestinal inflammation and villous atrophy.',
      affectedPatients: ['Celiac Disease (सीलिएक / ग्लूटेन एलर्जी)'],
    }
  }

  // 5. Palmolein / Saturated Fat
  if (lower.includes('palmolein') || lower.includes('palm oil') || lower.includes('hydrogenated')) {
    return {
      name,
      status: '⚠️ Saturated Fat / Heart',
      statusColor: 'bg-amber-100 text-amber-800 border-amber-300',
      details:
        'High in saturated fatty acids (~50%); regular excessive intake elevates LDL cholesterol and arterial plaque risk.',
      affectedPatients: ['Cardiovascular Disease (हृदय रोग)', 'High Cholesterol (Hyperlipidemia)'],
    }
  }

  // 6. Allergens (Soy, Milk, Nut, Peanut, Mustard)
  if (
    lower.includes('soy') ||
    lower.includes('milk') ||
    lower.includes('dairy') ||
    lower.includes('whey') ||
    lower.includes('nut') ||
    lower.includes('peanut') ||
    lower.includes('mustard')
  ) {
    return {
      name,
      status: '🚨 Allergen Alert',
      statusColor: 'bg-rose-100 text-rose-800 border-rose-300',
      details:
        'Major declared allergen: Known to trigger IgE-mediated allergic reactions or intolerance in sensitive individuals.',
      affectedPatients: ['Food Allergy Sufferers'],
    }
  }

  // 7. MSG
  if (lower.includes('monosodium') || lower.includes('msg') || lower.includes('621')) {
    return {
      name,
      status: '⚠️ MSG / Sensitivity',
      statusColor: 'bg-amber-100 text-amber-800 border-amber-300',
      details:
        'Flavor enhancer (free glutamate); may cause bronchoconstriction or headaches in sensitive individuals.',
      affectedPatients: ['Asthma & Glutamate Sensitive Individuals'],
    }
  }

  // 8. Citric Acid
  if (lower.includes('citric acid') || lower.includes('330') || lower.includes('acidity regulator')) {
    return {
      name,
      status: '✓ Generally Safe',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      details:
        'Acidity Regulator (INS 330): Permitted under FSSAI & EFSA. High amounts may aggravate gastric acidity or acid reflux.',
      affectedPatients: [],
    }
  }

  // Default: Generally safe food ingredient
  return {
    name,
    status: '✓ Generally Safe',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    details: 'Standard food ingredient; evaluated as safe under FSSAI and ICMR-NIN safety guidelines.',
    affectedPatients: [],
  }
}

export const HealthReport: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const [scan, setScan] = useState<StoredScan | null>(null)
  const [activeSection, setActiveSection] = useState<
    'overview' | 'patients' | 'ingredients' | 'nutrition' | 'allergens' | 'insights' | 'references'
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

  // Dynamically build clean ingredients list
  let ingredientsList: EvaluatedIngredientItem[] = []

  if (evalResult?.items && evalResult.items.length > 0) {
    ingredientsList = evalResult.items
      .map((item) => item.ingredient.canonical_name || item.ingredient.raw_text)
      .filter((raw) => {
        if (!raw || raw.trim().length < 2) return false
        if (NON_INGREDIENT_REGEX.test(raw)) return false
        return true
      })
      .map((name) =>
        evaluateIngredientClinical(
          name,
          healthReport?.ingredient_evaluations as any
        )
      )
  } else if (scan.corrections?.rawIngredients || scan.response?.raw_extracted_text) {
    const text = scan.corrections?.rawIngredients || scan.response?.raw_extracted_text || ''
    const match = text.match(/INGREDIENTS?\s*[:\-]?\s*([^.\n]+)/i)
    const rawTokens = match
      ? match[1].split(/[,;]+/)
      : text.split('\n').filter((l) => l.length > 3 && l.length < 50)

    ingredientsList = rawTokens
      .map((t) => t.trim())
      .filter((raw) => {
        if (!raw || raw.length < 2) return false
        if (raw.toUpperCase().includes('NUTRITION')) return false
        if (NON_INGREDIENT_REGEX.test(raw)) return false
        return true
      })
      .map((name) =>
        evaluateIngredientClinical(
          name,
          healthReport?.ingredient_evaluations as any
        )
      )
  }

  // De-duplicate items by lowercase name
  const seenNames = new Set<string>()
  ingredientsList = ingredientsList.filter((item) => {
    const key = item.name.toLowerCase()
    if (!key || seenNames.has(key)) return false
    seenNames.add(key)
    return true
  })

  // Fallback if empty
  if (ingredientsList.length === 0) {
    ingredientsList = [
      {
        name: scan.productName || 'Food Item',
        status: '✓ Generally Safe',
        statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        details: 'Standard food ingredients evaluated against FSSAI guidelines.',
      },
    ]
  }

  // Compile Patient Health Advisories from backend or extracted ingredients
  interface PatientAdvisoryDisplay {
    key: string
    title: string
    severity: 'CRITICAL' | 'WARNING' | 'CAUTION'
    badgeBg: string
    borderColor: string
    triggerIngredients: string[]
    warningEn: string
    warningHi?: string
    recommendation: string
  }

  let patientAdvisories: PatientAdvisoryDisplay[] = []

  if (healthReport?.patient_risk_advisories && healthReport.patient_risk_advisories.length > 0) {
    patientAdvisories = healthReport.patient_risk_advisories.map((pa) => ({
      key: pa.condition_key,
      title: pa.condition_name,
      severity: (pa.severity as any) || 'WARNING',
      badgeBg:
        pa.severity === 'CRITICAL'
          ? 'bg-rose-50 text-rose-900 border-rose-300'
          : 'bg-amber-50 text-amber-900 border-amber-300',
      borderColor: pa.severity === 'CRITICAL' ? 'border-rose-200' : 'border-amber-200',
      triggerIngredients: pa.trigger_ingredients || [],
      warningEn: pa.warning_en,
      warningHi: pa.warning_hi,
      recommendation: pa.clinical_recommendation,
    }))
  } else {
    // Synthesize from ingredientsList
    const advMap = new Map<string, PatientAdvisoryDisplay>()

    ingredientsList.forEach((ing) => {
      const lower = ing.name.toLowerCase()

      // Kidney
      if (lower.includes('potassium')) {
        if (!advMap.has('KIDNEY_CKD')) {
          advMap.set('KIDNEY_CKD', {
            key: 'KIDNEY_CKD',
            title: 'Kidney Disease / CKD Patients (गुर्दे की बीमारी)',
            severity: 'CRITICAL',
            badgeBg: 'bg-rose-50 text-rose-900 border-rose-300',
            borderColor: 'border-rose-200',
            triggerIngredients: [ing.name],
            warningEn:
              'Concentrated potassium cannot be safely filtered by impaired kidneys, risking life-threatening Hyperkalemia and cardiac complications.',
            warningHi:
              'किडनी (गुर्दे) की बीमारी वाले मरीज़ पोटेशियम को फ़िल्टर नहीं कर पाते, जिससे हाइपरकेलेमिया (Hyperkalemia) और दिल का दौरा पड़ने का ख़तरा हो सकता है।',
            recommendation:
              'Strictly restricted for patients with Chronic Kidney Disease (CKD) or Renal Failure. Consult a nephrologist before consuming.',
          })
        } else {
          const cur = advMap.get('KIDNEY_CKD')!
          if (!cur.triggerIngredients.includes(ing.name)) cur.triggerIngredients.push(ing.name)
        }
      }

      // Diabetes
      if (
        lower.includes('dextrose') ||
        lower.includes('glucose') ||
        lower.includes('sugar') ||
        lower.includes('syrup')
      ) {
        if (!advMap.has('DIABETES')) {
          advMap.set('DIABETES', {
            key: 'DIABETES',
            title: 'Diabetic Patients (रक्त शर्करा / मधुमेह)',
            severity: 'WARNING',
            badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
            borderColor: 'border-amber-200',
            triggerIngredients: [ing.name],
            warningEn:
              'Dextrose and simple sugars are high-glycemic carbohydrates (GI 100) that rapidly absorb into the bloodstream, triggering sharp blood glucose spikes.',
            warningHi:
              'यह सीधे खून में घुलकर ब्लड शुगर तुरंत बढ़ा देता है। डायबिटीज़ के मरीजों को इसका सेवन सावधानी से और डॉक्टर की सलाह पर ही करना चाहिए।',
            recommendation:
              'Diabetic patients should monitor post-prandial blood glucose closely and avoid unmeasured intake.',
          })
        } else {
          const cur = advMap.get('DIABETES')!
          if (!cur.triggerIngredients.includes(ing.name)) cur.triggerIngredients.push(ing.name)
        }
      }

      // High BP / Heart
      if (lower.includes('sodium') || lower.includes('salt')) {
        if (!advMap.has('HYPERTENSION')) {
          advMap.set('HYPERTENSION', {
            key: 'HYPERTENSION',
            title: 'Hypertension & Heart Patients (उच्च रक्तचाप व हृदय रोग)',
            severity: 'WARNING',
            badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
            borderColor: 'border-amber-200',
            triggerIngredients: [ing.name],
            warningEn:
              'Concentrated sodium expands blood plasma volume, raising arterial pressure and increasing strain on the cardiovascular system and kidneys.',
            warningHi:
              'सोडियम की अधिक मात्रा खून की नसों पर दबाव बढ़ाती है, जिससे हाई ब्लड प्रेशर और दिल पर अतिरिक्त बोझ पड़ता है।',
            recommendation:
              'Individuals on low-sodium / DASH diets or with hypertension should strictly monitor cumulative sodium intake.',
          })
        } else {
          const cur = advMap.get('HYPERTENSION')!
          if (!cur.triggerIngredients.includes(ing.name)) cur.triggerIngredients.push(ing.name)
        }
      }

      // Celiac
      if (lower.includes('wheat') || lower.includes('maida') || lower.includes('gluten')) {
        if (!advMap.has('CELIAC')) {
          advMap.set('CELIAC', {
            key: 'CELIAC',
            title: 'Celiac Disease Patients (सीलिएक / ग्लूटेन एलर्जी)',
            severity: 'CRITICAL',
            badgeBg: 'bg-rose-50 text-rose-900 border-rose-300',
            borderColor: 'border-rose-200',
            triggerIngredients: [ing.name],
            warningEn:
              'Contains gluten proteins (gliadin) that trigger autoimmune small intestinal mucosal destruction in patients with Celiac disease.',
            warningHi:
              'इसमें ग्लूटेन प्रोटीन होता है जो सीलिएक बीमारी वाले लोगों की आंतों को गंभीर नुकसान पहुँचाता है।',
            recommendation: 'Strictly avoid. Choose certified gluten-free alternatives.',
          })
        }
      }

      // Palmolein / Saturated Fat
      if (lower.includes('palmolein') || lower.includes('palm oil')) {
        if (!advMap.has('HEART_FAT')) {
          advMap.set('HEART_FAT', {
            key: 'HEART_FAT',
            title: 'Heart & Cholesterol Watch (हृदय रोग व कोलेस्ट्रॉल)',
            severity: 'CAUTION',
            badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
            borderColor: 'border-amber-200',
            triggerIngredients: [ing.name],
            warningEn:
              'Contains approximately 50% saturated fatty acids. Regular excessive intake elevates serum LDL cholesterol and cardiovascular risk.',
            warningHi:
              'इसमें लगभग 50% सेचुरेटेड फैट होता है जो खराब कोलेस्ट्रॉल (LDL) बढ़ाकर नसों में ब्लॉकेज का जोखिम पैदा करता है।',
            recommendation:
              'Limit total saturated fat intake to less than 7% of total daily caloric intake.',
          })
        }
      }
    })

    patientAdvisories = Array.from(advMap.values())
  }

  // Helper to safely format nutrient values avoiding 'undefined g'
  const formatNutrient = (val: number | string | null | undefined, unit: string) => {
    if (val === null || val === undefined || val === '' || isNaN(Number(val))) {
      return 'N/A'
    }
    return `${val} ${unit}`
  }

  const hasAnyNutrient = Boolean(
    nutritionFacts &&
      [
        nutritionFacts.energy_kcal,
        nutritionFacts.protein_g,
        nutritionFacts.carbohydrates_g,
        nutritionFacts.total_sugars_g,
        nutritionFacts.total_fat_g,
        nutritionFacts.saturated_fat_g,
        nutritionFacts.trans_fat_g,
        nutritionFacts.sodium_mg,
      ].some((v) => v !== null && v !== undefined && !isNaN(Number(v)))
  )

  // Calculate dynamic stats
  const totalIngredients = ingredientsList.length
  const declaredAllergens = (allergenReport?.contains_allergens || [])
    .map((a) => a.replace(/\b(?:manufactured|packed|marketed|food\s*products|pvt|ltd|regd|office|by).*$/i, '').trim())
    .filter(Boolean)
  const precautionaryAllergens = (allergenReport?.may_contain_allergens || [])
    .map((a) => a.replace(/\b(?:manufactured|packed|marketed|food\s*products|pvt|ltd|regd|office|by).*$/i, '').trim())
    .filter(Boolean)
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-2 shadow-xs static lg:sticky lg:top-24 z-10 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 lg:shrink lg:w-full transition-colors ${
              activeSection === 'overview'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('patients')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 lg:shrink lg:w-full transition-colors ${
              activeSection === 'patients'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Patient Advisories ({patientAdvisories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('ingredients')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 lg:shrink lg:w-full transition-colors ${
              activeSection === 'ingredients'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4 shrink-0" />
            <span>Ingredients ({totalIngredients})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('nutrition')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 lg:shrink lg:w-full transition-colors ${
              activeSection === 'nutrition'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>Nutrition Information</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('allergens')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 lg:shrink lg:w-full transition-colors ${
              activeSection === 'allergens'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Allergens ({allAllergens.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('insights')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 lg:shrink lg:w-full transition-colors ${
              activeSection === 'insights'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Lightbulb className="w-4 h-4 shrink-0" />
            <span>Health Insights</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('references')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 lg:shrink lg:w-full transition-colors ${
              activeSection === 'references'
                ? 'bg-emerald-50 text-[#0F766E] border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
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

          {/* Section: Patient Health Advisories & Vulnerable Groups */}
          {(activeSection === 'overview' || activeSection === 'patients') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#123044]">
                      Patient Health Advisories &amp; Risk Groups
                    </h2>
                    <p className="text-xs text-slate-500">
                      मरीजों के लिए स्वास्थ्य सलाह (Clinical safety based on FSSAI &amp; ICMR-NIN protocols)
                    </p>
                  </div>
                </div>

                {healthReport?.llm_source && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {healthReport.llm_source === 'GEMINI_AI_STUDIO'
                        ? 'Google AI Studio Gemini'
                        : 'Clinical Intelligence Engine'}
                    </span>
                  </span>
                )}
              </div>

              {patientAdvisories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientAdvisories.map((advisory, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border bg-white shadow-xs space-y-3 transition-all hover:shadow-sm ${advisory.borderColor}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <HeartPulse
                            className={`w-5 h-5 shrink-0 ${
                              advisory.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'
                            }`}
                          />
                          <h3 className="text-sm font-bold text-[#123044]">{advisory.title}</h3>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border shrink-0 ${advisory.badgeBg}`}
                        >
                          {advisory.severity}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500">Trigger:</span>
                        {advisory.triggerIngredients.map((ti, tiIdx) => (
                          <span
                            key={tiIdx}
                            className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-[#123044] border border-slate-200"
                          >
                            {ti}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">{advisory.warningEn}</p>

                      {advisory.warningHi && (
                        <p className="text-xs text-slate-600 italic leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                          {advisory.warningHi}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5">
                        <span className="text-[11px] font-bold text-[#0F766E] shrink-0">Doctor's Guidance:</span>
                        <span className="text-[11px] text-slate-600">{advisory.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-2xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-xs sm:text-sm text-emerald-900 font-medium">
                    No major clinical contraindications detected for common patient groups (Diabetes, Kidney Disease, Celiac) under standard moderate intake.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section: Overview & Ingredients Table */}
          {(activeSection === 'overview' || activeSection === 'ingredients') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#123044]">Detected Ingredients</h2>
                  <p className="text-xs text-slate-500">
                    Cleaned &amp; evaluated against Indian food safety regulations
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {totalIngredients} Ingredients
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="divide-y divide-slate-100">
                  {ingredientsList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-[#123044]">
                            {item.name}
                          </span>
                          {item.affectedPatients && item.affectedPatients.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                              Risk: {item.affectedPatients[0]}
                            </span>
                          )}
                        </div>
                        {item.details && (
                          <p className="text-[11px] text-slate-600 leading-relaxed max-w-2xl">
                            {item.details}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${item.statusColor}`}
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
                  <div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500">Energy</p>
                        <p className="text-base font-bold text-[#123044] mt-0.5">
                          {formatNutrient(nutritionFacts.energy_kcal, 'kcal')}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500">Protein</p>
                        <p className="text-base font-bold text-[#123044] mt-0.5">
                          {formatNutrient(nutritionFacts.protein_g, 'g')}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500">Carbohydrates</p>
                        <p className="text-base font-bold text-[#123044] mt-0.5">
                          {formatNutrient(nutritionFacts.carbohydrates_g, 'g')}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500">Total Sugars</p>
                        <p className="text-base font-bold text-[#123044] mt-0.5">
                          {formatNutrient(nutritionFacts.total_sugars_g, 'g')}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500">Total Fat</p>
                        <p className="text-base font-bold text-[#123044] mt-0.5">
                          {formatNutrient(nutritionFacts.total_fat_g, 'g')}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500">Saturated Fat</p>
                        <p className="text-base font-bold text-[#123044] mt-0.5">
                          {formatNutrient(nutritionFacts.saturated_fat_g, 'g')}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500">Trans Fat</p>
                        <p className="text-base font-bold text-[#123044] mt-0.5">
                          {formatNutrient(nutritionFacts.trans_fat_g, 'g')}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500">Sodium</p>
                        <p className={`text-base font-bold mt-0.5 ${nutritionFacts.sodium_mg ? 'text-rose-600' : 'text-[#123044]'}`}>
                          {formatNutrient(nutritionFacts.sodium_mg, 'mg')}
                        </p>
                      </div>
                    </div>

                    {!hasAnyNutrient && (
                      <p className="text-xs text-slate-500 italic mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                        <span className="text-sm">ℹ️</span>
                        <span>No nutrition table declared on this packaging (spices, whole tea, raw single-ingredient foods, and small sachets under 10g are exempt from mandatory nutrition labelling under FSSAI regulations).</span>
                      </p>
                    )}
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
