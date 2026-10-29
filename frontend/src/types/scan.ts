/**
 * Nirikshan AI - TypeScript definitions for Scan & Allergen Evaluation
 */

export interface OCRTextBox {
  text: string
  confidence: number
  bounding_box: number[][]
}

export interface LabelAllergenReport {
  contains_allergens: string[]
  may_contain_allergens: string[]
  profile_matches_contains: string[]
  profile_matches_may_contain: string[]
  incomplete_precautionary_advisory: boolean
}

export interface LabelSectionSummary {
  ingredients_detected_count: number
  contains_clause_found: boolean
  may_contain_clause_found: boolean
  may_contain_incomplete: boolean
  non_ingredient_lines_filtered: number
  raw_ingredients_text: string
}

export interface ProfileAlert {
  alert_type: string
  severity: string
  rule_name: string
  message: string
  matched_ingredient: string
  evidence?: Record<string, unknown>
}

export interface EvidenceSource {
  title?: string
  section?: string
  url?: string
  authority?: string
  [key: string]: unknown
}

export interface NormalizedIngredient {
  raw_text: string
  status: 'NORMALIZED' | 'UNVERIFIED' | 'UNCLEAR'
  canonical_name?: string
  canonical_id?: string
  ins_code?: string
  matched_alias?: string
  category?: string
  allergens: string[]
  is_vegetarian?: boolean
  evidence?: EvidenceSource | null
  uncertainty_reason?: string
}

export type ScanLifecycleStatus = 'IDLE' | 'READY_FOR_ANALYSIS' | 'SCANNING' | 'SCAN_COMPLETE' | 'ERROR'

export interface EvaluatedIngredient {
  ingredient: NormalizedIngredient
  status_code: string
  alerts: ProfileAlert[]
  notes?: string
}

export interface EvaluationSummary {
  total_detected: number
  allergens_flagged: number
  dietary_violations: number
  unverified_count: number
  unclear_count: number
}

export interface EvaluationResult {
  profile_name: string
  summary: EvaluationSummary
  items: EvaluatedIngredient[]
  disclaimer: string
}

export interface RegulatoryAdditiveFinding {
  ins_number: string
  e_number?: string
  canonical_name: string
  functional_class: string
  fssai_status: string
  eu_efsa_status: string
  us_fda_status: string
  is_banned_internationally: boolean
  banned_in_jurisdictions: string[]
  health_concern: string
  plain_english: string
  hindi_explanation?: string
}

export interface GeneralHealthInsight {
  ingredient_name: string
  concern_type: string
  severity: 'CRITICAL' | 'WARNING' | 'CAUTION' | 'INFO' | string
  title: string
  explanation: string
  explanation_hi?: string
  authority: string
  source_url: string
}

export interface HealthImpactFinding {
  rule_id: string
  matched_item: string
  condition_or_allergy: string
  category: 'FOOD_ALLERGY' | 'COELIAC_DISEASE' | 'DIABETIC_NUTRITION' | 'CARDIOVASCULAR_SODIUM' | 'RENAL_SODIUM' | string
  declaration_type: 'CONTAINS' | 'MAY_CONTAIN' | 'NUTRITION' | string
  severity: 'CRITICAL' | 'WARNING' | 'CAUTION' | 'DATA_INSUFFICIENT' | string
  title: string
  explanation: string
  explanation_hi?: string
  evidence_title: string
  evidence_url: string
  triggering_text: string
  status: 'EVALUATED' | 'DATA_INSUFFICIENT' | 'NOT_EVALUATED' | string
  recommended_action: string
  limitations?: string
}

export interface NutritionFacts {
  serving_size?: string
  energy_kcal?: number
  carbohydrates_g?: number
  sugars_g?: number
  sodium_mg?: number
  measurement_basis?: string
  raw_nutrition_lines: string[]
  is_reliably_parsed: boolean
}

export interface HealthImpactReport {
  profile_conditions_evaluated: string[]
  general_health_insights?: GeneralHealthInsight[]
  regulatory_additive_findings?: RegulatoryAdditiveFinding[]
  international_bans_detected?: string[]
  packaging_caution_detected?: string | null
  allergy_findings: HealthImpactFinding[]
  condition_findings: HealthImpactFinding[]
  data_insufficient_notices: HealthImpactFinding[]
  nutrition_facts?: NutritionFacts
  summary_counts: Record<string, number>
  disclaimer: string
}


export interface ComplianceItem {
  rule_id: string
  clause: string
  title: string
  title_hi?: string
  category: string
  is_mandatory: boolean
  status: 'COMPLIANT' | 'NON_COMPLIANT_MISSING' | 'UNCLEAR_NEEDS_REVIEW' | 'EXEMPTED' | string
  evidence_text: string
  explanation: string
  explanation_hi?: string
  exemptions?: string
}

export interface FSSAIComplianceReport {
  items: ComplianceItem[]
  summary_counts: {
    compliant: number
    non_compliant_missing: number
    unclear_needs_review: number
    total_checked: number
    [key: string]: number
  }
  compliance_score_percent: number
  statutory_reference: string
  disclaimer: string
}

export interface OFFProductReference {
  found: boolean
  barcode: string
  product_name?: string
  brand?: string
  generic_name?: string
  quantity?: string
  categories?: string
  ingredients_text?: string
  contains_allergens?: string[]
  may_contain_allergens?: string[]
  nutrition_facts?: Record<string, unknown>
  fssai_lic_no?: string
  source: string
  reference_url?: string
}

export interface ScanImageResponse {
  status: 'SUCCESS' | 'UNCLEAR' | 'EMPTY'
  filename?: string
  image_metadata: {
    width?: number
    height?: number
    channels?: number
    file_size_bytes?: number
    is_blurry?: boolean
    blur_score?: number
    [key: string]: unknown
  }
  ocr_detected_boxes: OCRTextBox[]
  raw_extracted_text: string
  sections_summary: LabelSectionSummary
  allergen_report: LabelAllergenReport
  evaluation: EvaluationResult
  health_impact_report?: HealthImpactReport
  compliance_report?: FSSAIComplianceReport
  open_food_facts_reference?: OFFProductReference
  message?: string
  disclaimer: string
}

export interface UserProfileConfig {
  profile_name: string
  allergies: string
  health_conditions: string[]
  dietary_preference: string
  watchlist: string
}


