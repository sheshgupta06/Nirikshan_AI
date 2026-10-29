/**
 * Nirikshan AI - Local Storage Service for Scan Sessions and History
 */

import type { ScanImageResponse } from '../types/scan'
import {
  isSupabaseConfigured,
  saveScanToSupabase,
  deleteScanFromSupabase,
  fetchScansFromSupabase,
} from './supabaseClient'

export interface UserOCRCorrections {
  productName?: string
  rawIngredients?: string
  rawNutrition?: string
  netQuantity?: string
  mrp?: string
  mfgDate?: string
  expiryDate?: string
  fssaiNumber?: string
  manufacturer?: string
}

export interface StoredScan {
  id: string
  timestamp: string
  productName: string
  brand?: string
  imageUrl: string
  secondaryImageUrl?: string
  imageUrls?: string[]
  modulesRequested: 'both' | 'legal_metrology' | 'ingredient_safety'
  response: ScanImageResponse
  corrections?: UserOCRCorrections
  status: 'SUCCESS' | 'UNCLEAR' | 'ERROR'
}

const STORAGE_KEY = 'nirikshan_ai_scan_history_v1'

export const scanStorage = {
  getAllScans(): StoredScan[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) {
        return []
      }
      return JSON.parse(data) as StoredScan[]
    } catch (e) {
      console.error('Failed to parse scan history from localStorage', e)
      return []
    }
  },

  getScan(id: string): StoredScan | null {
    const scans = this.getAllScans()
    return scans.find((s) => s.id === id) || null
  },

  saveScan(scan: StoredScan): void {
    try {
      const scans = this.getAllScans()
      const existingIdx = scans.findIndex((s) => s.id === scan.id)
      if (existingIdx >= 0) {
        scans[existingIdx] = scan
      } else {
        scans.unshift(scan)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scans))

      // Cloud sync to Supabase when configured
      if (isSupabaseConfigured()) {
        saveScanToSupabase(scan).catch((err) => {
          console.warn('Background Supabase scan sync failed:', err)
        })
      }
    } catch (e) {
      console.error('Failed to save scan to localStorage', e)
    }
  },

  deleteScan(id: string): void {
    try {
      const scans = this.getAllScans().filter((s) => s.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scans))

      if (isSupabaseConfigured()) {
        deleteScanFromSupabase(id).catch((err) => {
          console.warn('Background Supabase scan deletion failed:', err)
        })
      }
    } catch (e) {
      console.error('Failed to delete scan from localStorage', e)
    }
  },

  updateCorrections(id: string, corrections: UserOCRCorrections): StoredScan | null {
    const scan = this.getScan(id)
    if (!scan) return null

    scan.corrections = {
      ...(scan.corrections || {}),
      ...corrections,
    }
    if (corrections.productName) {
      scan.productName = corrections.productName
    }

    // If ingredients text was edited, dynamically refresh evaluation items
    if (corrections.rawIngredients) {
      const text = corrections.rawIngredients
      const match = text.match(/INGREDIENTS?\s*[:\-]?\s*([^.\n\r]+)/i)
      const ingSection = match ? match[1] : text
      
      const tokens = ingSection
        .split(/[,;\n]+/)
        .map((t) => t.trim().replace(/^[-•*]\s*/, ''))
        .filter((t) => t.length > 2 && !t.toUpperCase().includes('NUTRITION') && !t.toUpperCase().includes('ALLERGEN'))

      if (tokens.length > 0) {
        const allergenKeywords = ['soy', 'soya', 'wheat', 'gluten', 'milk', 'peanut', 'nut', 'almond', 'cashew', 'mustard', 'egg', 'fish', 'sesame']
        
        scan.response.evaluation = {
          items: tokens.map((t) => {
            const lower = t.toLowerCase()
            const isAllergen = allergenKeywords.some((k) => lower.includes(k))
            return {
              ingredient: {
                raw_text: t,
                status: 'DETECTED',
                canonical_name: t,
                category: 'ingredient',
              },
              status_code: isAllergen ? 'FLAGGED' : 'SAFE',
              matched_rules: [],
              alerts: isAllergen
                ? [
                    {
                      alert_type: 'ALLERGEN_ALERT',
                      severity: 'WARNING',
                      rule_name: 'Allergen Advisory',
                      message: `Contains potential allergen: ${t}`,
                      matched_ingredient: t,
                    },
                  ]
                : [],
              notes: 'User verified ingredient',
            }
          }),
          summary: {
            total_detected: tokens.length,
            allergens_flagged: tokens.filter((t) =>
              allergenKeywords.some((k) => t.toLowerCase().includes(k))
            ).length,
            dietary_violations: 0,
            watchlist_matches: 0,
            unclear_count: 0,
          },
        } as any
      }
    }

    // Update compliance report evidence if user corrected key fields
    if (scan.response?.compliance_report?.items) {
      for (const item of scan.response.compliance_report.items) {
        if ((item.rule_id === 'LM-01-NET_QTY' || item.title.toLowerCase().includes('quantity')) && corrections.netQuantity) {
          item.status = 'FOUND'
          item.evidence_text = corrections.netQuantity
        }
        if ((item.rule_id === 'LM-02-MRP' || item.title.toLowerCase().includes('mrp')) && corrections.mrp) {
          item.status = 'FOUND'
          item.evidence_text = corrections.mrp
        }
        if ((item.rule_id === 'FSSAI-06-LIC' || item.title.toLowerCase().includes('license')) && corrections.fssaiNumber) {
          item.status = 'FOUND'
          item.evidence_text = corrections.fssaiNumber
        }
        if ((item.rule_id === 'FSSAI-01-NAME' || item.title.toLowerCase().includes('name')) && corrections.productName) {
          item.status = 'FOUND'
          item.evidence_text = corrections.productName
        }
      }
    }

    this.saveScan(scan)
    return scan
  },

  /**
   * Synchronizes local scans with Supabase cloud database.
   * Merges remote scans into local cache and uploads any unsynced local scans.
   */
  async syncWithSupabase(): Promise<{ scans: StoredScan[]; syncedCount: number }> {
    if (!isSupabaseConfigured()) {
      return { scans: this.getAllScans(), syncedCount: 0 }
    }

    try {
      const remoteScans = await fetchScansFromSupabase()
      const localScans = this.getAllScans()

      // Merge maps by ID (remote wins if present, local added if not in remote)
      const scanMap = new Map<string, StoredScan>()
      for (const r of remoteScans) {
        scanMap.set(r.id, r)
      }

      // Check which local scans need to be uploaded to Supabase
      const toUpload: StoredScan[] = []
      for (const l of localScans) {
        if (!scanMap.has(l.id)) {
          scanMap.set(l.id, l)
          toUpload.push(l)
        }
      }

      const mergedList = Array.from(scanMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList))

      // Upload missing local scans to Supabase
      if (toUpload.length > 0) {
        await Promise.all(toUpload.map((s) => saveScanToSupabase(s)))
      }

      return { scans: mergedList, syncedCount: remoteScans.length }
    } catch (err) {
      console.warn('Supabase sync error:', err)
      return { scans: this.getAllScans(), syncedCount: 0 }
    }
  },

  /**
   * Initializes demo scans if storage is empty so users can explore immediately
   */
  initDemoScansIfEmpty(): void {
    const existing = this.getAllScans()
    if (existing.length > 0) return

    const demoBhujia: StoredScan = {
      id: 'demo-haldiram-bhujia',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      productName: 'Haldiram’s Bhujia Sev',
      brand: 'Haldiram',
      imageUrl: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&auto=format&fit=crop&q=80',
      modulesRequested: 'both',
      status: 'SUCCESS',
      response: {
        status: 'SUCCESS',
        filename: 'haldirams_bhujia_sample.jpg',
        image_metadata: {
          width: 1200,
          height: 1600,
          is_blurry: false,
          blur_score: 284.5,
          blur_assessment: 'SHARP',
          brightness_mean: 142.3,
          lighting_assessment: 'NORMAL',
          contrast_score: 64.2,
          contrast_assessment: 'NORMAL',
          restormer_status: 'DISABLED_NO_WEIGHTS',
          restormer_note: 'No fake AI - real OpenCV quality analysis applied.',
        },
        ocr_detected_boxes: [
          { text: "Haldiram's Bhujia Sev", confidence: 0.96, bounding_box: [[10, 10], [200, 40]] },
          { text: "Ingredients: Moth Dal Flour, Gram Flour, Edible Vegetable Oil (Palmolein Oil), Salt, Red Chilli Powder, Black Pepper, Ginger, Clove, Acidity Regulator (INS 330).", confidence: 0.94, bounding_box: [[10, 50], [500, 120]] },
          { text: "Allergy Advice: Contains Wheat, Soy. May contain Peanuts, Tree Nuts, Milk.", confidence: 0.91, bounding_box: [[10, 130], [450, 160]] },
          { text: "Net Quantity: 400 g", confidence: 0.98, bounding_box: [[10, 170], [200, 190]] },
          { text: "MRP: Rs. 140.00 (Incl. of all taxes)", confidence: 0.97, bounding_box: [[10, 200], [280, 220]] },
          { text: "Mfg Date: 12/03/2026", confidence: 0.95, bounding_box: [[10, 230], [200, 250]] },
          { text: "Best Before: 6 Months from Packaging", confidence: 0.96, bounding_box: [[10, 260], [320, 280]] },
          { text: "FSSAI Lic. No. 10012022000346", confidence: 0.94, bounding_box: [[10, 290], [300, 310]] }
        ],
        raw_extracted_text: "Haldiram's Bhujia Sev\nIngredients: Moth Dal Flour, Gram Flour, Edible Vegetable Oil (Palmolein Oil), Salt, Red Chilli Powder, Black Pepper, Ginger, Clove, Acidity Regulator (INS 330).\nAllergy Advice: Contains Wheat, Soy. May contain Peanuts, Tree Nuts, Milk.\nNet Quantity: 400 g | MRP: Rs. 140.00\nMfg Date: 12/03/2026 | Best Before: 6 Months\nFSSAI Lic. No. 10012022000346\nManufactured by: Haldiram Snacks Pvt Ltd, Noida, U.P., India.\nConsumer Care Helpline: 1800-425-4444 / customercare@haldirams.com",
        sections_summary: {
          ingredients_detected_count: 9,
          contains_clause_found: true,
          may_contain_clause_found: true,
          may_contain_incomplete: false,
          non_ingredient_lines_filtered: 12,
          raw_ingredients_text: "Moth Dal Flour, Gram Flour, Edible Vegetable Oil (Palmolein Oil), Salt, Red Chilli Powder, Black Pepper, Ginger, Clove, INS 330"
        },
        allergen_report: {
          contains_allergens: ['Wheat', 'Soy'],
          may_contain_allergens: ['Peanuts', 'Tree Nuts', 'Milk'],
          profile_matches_contains: [],
          profile_matches_may_contain: [],
          incomplete_precautionary_advisory: false
        },
        evaluation: {
          profile_name: 'Default',
          summary: {
            total_detected: 9,
            allergens_flagged: 2,
            dietary_violations: 0,
            unverified_count: 0,
            unclear_count: 0
          },
          items: [
            {
              ingredient: {
                raw_text: 'Moth Dal Flour',
                status: 'NORMALIZED',
                prd_match_status: 'EXACT',
                canonical_name: 'Moth Bean Flour',
                allergens: [],
                is_vegetarian: true
              },
              status_code: 'VERIFIED_SAFE',
              alerts: []
            },
            {
              ingredient: {
                raw_text: 'Edible Vegetable Oil (Palmolein Oil)',
                status: 'NORMALIZED',
                prd_match_status: 'SYNONYM',
                canonical_name: 'Palm Oil',
                allergens: [],
                is_vegetarian: true
              },
              status_code: 'CAUTION',
              alerts: []
            },
            {
              ingredient: {
                raw_text: 'Acidity Regulator (INS 330)',
                status: 'NORMALIZED',
                prd_match_status: 'EXACT',
                canonical_name: 'Citric Acid',
                ins_code: '330',
                allergens: [],
                is_vegetarian: true
              },
              status_code: 'VERIFIED_SAFE',
              alerts: []
            }
          ],
          disclaimer: 'Nirikshan AI provides regulatory and ingredient screening assistance only.'
        },
        health_impact_report: {
          profile_conditions_evaluated: ['General Population Health', 'Cardiovascular Risk'],
          general_health_insights: [
            {
              ingredient_name: 'Edible Vegetable Oil (Palmolein Oil)',
              concern_type: 'HIGH_SATURATED_FAT',
              severity: 'WARNING',
              title: 'High Saturated Fatty Acids (Palm Oil)',
              explanation: 'Palmolein contains approximately 40-45% saturated fatty acids. Regular excessive consumption is associated with elevated LDL cholesterol.',
              explanation_hi: 'पामोलीन तेल में सैचुरेटेड फैट की मात्रा अधिक होती है।',
              authority: 'ICMR-NIN & WHO Dietary Guidelines',
              source_url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet'
            },
            {
              ingredient_name: 'Sodium / Common Salt',
              concern_type: 'HIGH_SODIUM',
              severity: 'WARNING',
              title: 'Elevated Sodium Contribution',
              explanation: 'Fried savory snacks in India typically contribute over 600mg sodium per 100g, exceeding the WHO recommended threshold of 2,000mg total sodium per day.',
              authority: 'WHO Guideline: Sodium Intake for Adults',
              source_url: 'https://www.who.int/publications/i/item/9789241504836'
            }
          ],
          regulatory_additive_findings: [
            {
              ins_number: '330',
              e_number: 'E330',
              canonical_name: 'Citric Acid',
              functional_class: 'Acidity Regulator / Antioxidant',
              fssai_status: 'PERMITTED_GMP',
              eu_efsa_status: 'AUTHORIZED',
              us_fda_status: 'GRAS',
              is_banned_internationally: false,
              banned_in_jurisdictions: [],
              health_concern: 'Generally recognized as safe across all jurisdictions.',
              plain_english: 'Naturally occurring fruit acid used safely to regulate tartness and preserve freshness.'
            }
          ],
          allergy_findings: [
            {
              rule_id: 'ALLERGY_WHEAT',
              matched_item: 'Wheat',
              condition_or_allergy: 'Gluten / Wheat Allergy',
              category: 'FOOD_ALLERGY',
              declaration_type: 'CONTAINS',
              severity: 'CRITICAL',
              title: 'Declared Gluten / Wheat Recipe Allergen',
              explanation: 'Contains declared wheat. Unsafe for individuals diagnosed with Coeliac Disease or IgE wheat allergies.',
              evidence_title: 'FSSAI Labelling Regulations 2020 Schedule II (Mandatory Allergen Declaration)',
              evidence_url: 'https://www.fssai.gov.in',
              triggering_text: 'Contains Wheat',
              status: 'EVALUATED',
              recommended_action: 'Avoid consumption if sensitive to gluten or wheat proteins.'
            }
          ],
          condition_findings: [],
          data_insufficient_notices: [],
          nutrition_facts: {
            serving_size: '30 g',
            energy_kcal: 580,
            carbohydrates_g: 42,
            sugars_g: 2.5,
            sodium_mg: 720,
            measurement_basis: 'per 100g',
            raw_nutrition_lines: ['Energy: 580 kcal', 'Carbohydrates: 42 g', 'Sugars: 2.5 g', 'Sodium: 720 mg'],
            is_reliably_parsed: true
          },
          summary_counts: {
            critical_alerts: 1,
            warnings: 2,
            safe_additives: 1
          },
          disclaimer: 'This health summary provides objective reference data based on published ICMR/WHO literature. It does not replace medical advice.'
        },
        legal_metrology: {
          items: [
            {
              rule_id: 'LM_RULE_6_1_A',
              clause: 'Rule 6(1)(a) & FSSAI 5(1)',
              title: 'Name of the Commodity / Generic Name',
              category: 'PRODUCT_IDENTITY',
              is_mandatory: true,
              status: 'COMPLIANT',
              metrology_status: 'DETECTED',
              legal_metrology_rule: 'Legal Metrology (Packaged Commodities) Rules 2011 Rule 6(1)(a)',
              evidence_text: "Haldiram's Bhujia Sev",
              explanation: 'Commodity name clearly declared in primary visual field.'
            },
            {
              rule_id: 'LM_RULE_6_1_B',
              clause: 'Rule 6(1)(b) & FSSAI 5(6)',
              title: 'Net Quantity with Standard Metric Units',
              category: 'QUANTITY_DECLARATION',
              is_mandatory: true,
              status: 'COMPLIANT',
              metrology_status: 'DETECTED',
              legal_metrology_rule: 'Legal Metrology (Packaged Commodities) Rules 2011 Rule 6(1)(b)',
              evidence_text: 'Net Quantity: 400 g',
              explanation: 'Declared using standard SI unit (g) compliant with Rule 12 font size standards.'
            },
            {
              rule_id: 'LM_RULE_6_1_C',
              clause: 'Rule 6(1)(c) & FSSAI 5(7)',
              title: 'Maximum Retail Price (MRP inclusive of all taxes)',
              category: 'RETAIL_PRICE',
              is_mandatory: true,
              status: 'COMPLIANT',
              metrology_status: 'DETECTED',
              legal_metrology_rule: 'Legal Metrology (Packaged Commodities) Rules 2011 Rule 6(1)(c)',
              evidence_text: 'MRP: Rs. 140.00 (Incl. of all taxes)',
              explanation: 'MRP declared clearly with inclusive tax disclaimer.'
            },
            {
              rule_id: 'LM_RULE_6_1_D',
              clause: 'Rule 6(1)(d) & FSSAI 5(5)',
              title: 'Month and Year of Manufacture / Packing',
              category: 'DATE_DECLARATIONS',
              is_mandatory: true,
              status: 'COMPLIANT',
              metrology_status: 'DETECTED',
              legal_metrology_rule: 'Legal Metrology (Packaged Commodities) Rules 2011 Rule 6(1)(d)',
              evidence_text: 'Mfg Date: 12/03/2026',
              explanation: 'Manufacturing date clearly stated.'
            },
            {
              rule_id: 'LM_RULE_6_1_E',
              clause: 'Rule 6(1)(e) & FSSAI 5(8)',
              title: 'Consumer Care Helpline & Contact Details',
              category: 'CONSUMER_GRIEVANCE',
              is_mandatory: true,
              status: 'COMPLIANT',
              metrology_status: 'DETECTED',
              legal_metrology_rule: 'Legal Metrology (Packaged Commodities) Rules 2011 Rule 6(1)(e)',
              evidence_text: '1800-425-4444 / customercare@haldirams.com',
              explanation: 'Consumer care telephone and email address detected.'
            }
          ],
          summary_counts: {
            compliant: 5,
            non_compliant_missing: 0,
            unclear_needs_review: 0,
            detected: 5,
            not_detected: 0,
            needs_manual_verification: 0,
            total_checked: 5
          },
          compliance_score_percent: 100,
          statutory_reference: 'Legal Metrology (Packaged Commodities) Rules, 2011 (Rule 6)',
          disclaimer: 'Legal Metrology screening verifies visual presence of mandatory packaging declarations.'
        },
        compliance_report: {
          items: [
            {
              rule_id: 'FSSAI_REG_5_1',
              clause: 'FSSAI Reg 5(1)',
              title: 'Name of Food and Category',
              category: 'PRODUCT_IDENTITY',
              is_mandatory: true,
              status: 'COMPLIANT',
              evidence_text: "Haldiram's Bhujia Sev",
              explanation: 'Declared prominently on label.'
            },
            {
              rule_id: 'FSSAI_REG_5_2',
              clause: 'FSSAI Reg 5(2)',
              title: 'List of Ingredients in Descending Order of Weight',
              category: 'INGREDIENTS_LIST',
              is_mandatory: true,
              status: 'COMPLIANT',
              evidence_text: 'Moth Dal Flour, Gram Flour, Edible Vegetable Oil...',
              explanation: 'Standard ingredient clause detected.'
            },
            {
              rule_id: 'FSSAI_REG_5_3',
              clause: 'FSSAI Reg 5(3)',
              title: 'Nutritional Information Table (per 100g / per serving)',
              category: 'NUTRITION_FACTS',
              is_mandatory: true,
              status: 'COMPLIANT',
              evidence_text: 'Energy, Carbohydrates, Added Sugars, Sodium',
              explanation: 'Mandatory nutritional declaration detected.'
            },
            {
              rule_id: 'FSSAI_REG_5_4',
              clause: 'FSSAI Reg 5(4)',
              title: 'Vegetarian / Non-Vegetarian Symbol',
              category: 'DIETARY_LOGO',
              is_mandatory: true,
              status: 'COMPLIANT',
              evidence_text: 'Green dot in square detected',
              explanation: 'Standard green vegetarian logo declared.'
            },
            {
              rule_id: 'FSSAI_REG_5_8',
              clause: 'FSSAI Reg 5(8)',
              title: 'FSSAI 14-Digit License Number & Logo',
              category: 'LICENSING',
              is_mandatory: true,
              status: 'COMPLIANT',
              evidence_text: 'FSSAI Lic. No. 10012022000346',
              explanation: 'Valid 14-digit FSSAI license detected.'
            }
          ],
          summary_counts: {
            compliant: 5,
            non_compliant_missing: 0,
            unclear_needs_review: 0,
            total_checked: 5
          },
          compliance_score_percent: 100,
          statutory_reference: 'Food Safety and Standards (Labelling and Display) Regulations, 2020',
          disclaimer: 'This screening verifies compliance with FSSAI (Labelling and Display) Regulations, 2020.'
        },
        disclaimer: 'Nirikshan AI provides regulatory and health screening assistance only. Not a medical or legal certificate.'
      }
    }

    this.saveScan(demoBhujia)
  }
}
