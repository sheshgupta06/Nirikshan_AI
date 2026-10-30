"""Nirikshan AI - Gemini LLM Health Advisor & Patient Risk Intelligence Service.

Combines Google AI Studio Gemini API with a deterministic Clinical Rules Knowledge Base
to evaluate extracted packaged food & electrolyte ingredients for specific vulnerable patient groups:
1. Diabetic Patients (Diabetes Mellitus Type 1 & 2)
2. Kidney Disease Patients (Chronic Kidney Disease / CKD / Renal Failure)
3. Hypertension & Cardiovascular Patients (High Blood Pressure / Heart Failure)
4. Coeliac Disease & Gluten Sensitivity Patients
5. Acid Reflux & GERD / Gastritis Patients
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class PatientRiskAdvisory(BaseModel):
    """Specific warning for a vulnerable clinical patient group."""

    condition_key: str = Field(..., description="E.g. 'DIABETES', 'KIDNEY_CKD', 'HYPERTENSION', 'HEART_DISEASE', 'CELIAC'")
    condition_name: str = Field(..., description="Display title, e.g. 'Diabetic Patients (मधुमेह)'")
    severity: str = Field(..., description="'CRITICAL', 'WARNING', 'CAUTION', or 'INFO'")
    trigger_ingredients: List[str] = Field(default_factory=list)
    warning_en: str
    warning_hi: Optional[str] = None
    clinical_recommendation: str


class IngredientPatientEvaluation(BaseModel):
    """Patient-specific evaluation for a single ingredient token."""

    ingredient_name: str
    safety_badge: str = Field(..., description="E.g. 'Risk for Kidney Patients', 'High Glycemic (Diabetes)', 'Generally Safe'")
    status_color: str = Field(..., description="'rose' (critical), 'amber' (warning), 'blue' (caution), or 'emerald' (safe)")
    affected_patients: List[str] = Field(default_factory=list)
    clinical_explanation: str
    clinical_explanation_hi: Optional[str] = None
    is_safe_for_general_public: bool = True


class LLMHealthAnalysisResult(BaseModel):
    """Full patient risk assessment from Gemini LLM or offline clinical knowledge base."""

    source: str = Field(..., description="'GEMINI_AI_STUDIO' or 'CLINICAL_KNOWLEDGE_BASE'")
    overall_health_verdict: str
    overall_health_verdict_hi: Optional[str] = None
    patient_advisories: List[PatientRiskAdvisory] = Field(default_factory=list)
    ingredient_evaluations: List[IngredientPatientEvaluation] = Field(default_factory=list)
    safe_patient_groups: List[str] = Field(default_factory=list)
    high_risk_patient_groups: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Deterministic Clinical Knowledge Base (Used offline or as resilient fallback)
# ---------------------------------------------------------------------------

CLINICAL_INGREDIENT_RULES = [
    {
        "patterns": [r"\bdextrose\b", r"\bglucose\b", r"\bfructose\b", r"\bcorn\s*syrup\b", r"\bmaltodextrin\b", r"\bsucrose\b"],
        "badge": "Risk for Diabetic Patients",
        "color": "amber",
        "affected_patients": ["Diabetic Patients (मधुमेह)", "Prediabetes / Insulin Resistance"],
        "clinical_explanation": "Pure fast-absorbing simple sugar (GI 100). Rapidly spikes blood glucose levels; unadvisable for diabetics without medical supervision.",
        "clinical_explanation_hi": "यह सीधे खून में घुलकर ब्लड शुगर तुरंत बढ़ा देता है। डायबिटीज़ के मरीजों को इसका सेवन सावधानी से करना चाहिए।",
        "condition_key": "DIABETES",
        "condition_name": "Diabetic Patients (रक्त शर्करा / मधुमेह)",
        "severity": "WARNING",
        "clinical_recommendation": "Diabetic patients should monitor blood glucose closely and avoid without medical guidance.",
    },
    {
        "patterns": [r"\bpotassium\s*chloride\b", r"\bpotassium\s*citrate\b", r"\bpotassium\b"],
        "badge": "Risk for Kidney (CKD) Patients",
        "color": "rose",
        "affected_patients": ["Kidney Disease (CKD / गुर्दे की बीमारी)", "Renal Failure Patients"],
        "clinical_explanation": "Concentrated potassium source. Impaired kidneys cannot excrete potassium, risking life-threatening Hyperkalemia and cardiac arrest.",
        "clinical_explanation_hi": "किडनी (गुर्दे) की बीमारी वाले मरीज़ पोटेशियम को फ़िल्टर नहीं कर पाते, जिससे हाइपरकेलेमिया (Hyperkalemia) और दिल का दौरा पड़ने का ख़तरा हो सकता है।",
        "condition_key": "KIDNEY_CKD",
        "condition_name": "Kidney Disease / CKD Patients (गुर्दे की बीमारी)",
        "severity": "CRITICAL",
        "clinical_recommendation": "Strictly restricted for patients with Chronic Kidney Disease or Renal Impairment.",
    },
    {
        "patterns": [r"\bsodium\s*chloride\b", r"\bsodium\s*citrate\b", r"\bcommon\s*salt\b", r"\biodi[sz]ed\s*salt\b"],
        "badge": "High BP & Heart Risk",
        "color": "amber",
        "affected_patients": ["Hypertension (उच्च रक्तचाप)", "Heart Failure Patients", "Edema / Fluid Retention"],
        "clinical_explanation": "Concentrated sodium expands blood plasma volume, raising arterial pressure and increasing strain on heart and kidneys.",
        "clinical_explanation_hi": "सोडियम की अधिक मात्रा खून की नसों पर दबाव बढ़ाती है, जिससे हाई ब्लड प्रेशर और दिल पर अतिरिक्त बोझ पड़ता है।",
        "condition_key": "HYPERTENSION",
        "condition_name": "Hypertension & Heart Patients (उच्च रक्तचाप व हृदय रोग)",
        "severity": "WARNING",
        "clinical_recommendation": "Patients on low-sodium / DASH diets should limit consumption.",
    },
    {
        "patterns": [r"\bpalmolein\b", r"\bpalm\s*oil\b", r"\bhydrogenated\b"],
        "badge": "Heart / Cholesterol Caution",
        "color": "amber",
        "affected_patients": ["Cardiovascular Disease (हृदय रोग)", "High Cholesterol (Hyperlipidemia)"],
        "clinical_explanation": "Contains ~50% saturated fatty acids. Regular excessive intake elevates serum LDL cholesterol and arterial plaque risk.",
        "clinical_explanation_hi": "इसमें लगभग 50% सेचुरेटेड फैट होता है जो खून में खराब कोलेस्ट्रॉल (LDL) बढ़ाकर नसों में ब्लॉकेज का जोखिम पैदा करता है।",
        "condition_key": "HEART_DISEASE",
        "condition_name": "Heart & High Cholesterol Patients (हृदय रोग व कोलेस्ट्रॉल)",
        "severity": "CAUTION",
        "clinical_recommendation": "Heart patients should limit saturated fat intake to <7% of daily calories.",
    },
    {
        "patterns": [r"\bwheat\b", r"\bmaida\b", r"\batta\b", r"\bbarley\b", r"\brye\b", r"\bgluten\b"],
        "badge": "Gluten / Celiac Trigger",
        "color": "rose",
        "affected_patients": ["Celiac Disease (ग्लूटेन एलर्जी)", "Non-Celiac Gluten Sensitivity"],
        "clinical_explanation": "Contains gluten proteins (gliadin/glutenin). Triggers severe autoimmune villous atrophy and intestinal inflammation in Celiac patients.",
        "clinical_explanation_hi": "इसमें ग्लूटेन प्रोटीन होता है जो सीलिएक (Celiac) बीमारी वाले लोगों की आंतों को गंभीर नुकसान पहुँचाता है।",
        "condition_key": "CELIAC",
        "condition_name": "Celiac Disease Patients (सीलिएक / ग्लूटेन एलर्जी)",
        "severity": "CRITICAL",
        "clinical_recommendation": "Strictly contraindicated for individuals with Celiac Disease or wheat allergy.",
    },
    {
        "patterns": [r"\bmsg\b", r"\bmonosodium\s*glutamate\b", r"\bins\s*621\b"],
        "badge": "Sensitivity Caution: MSG",
        "color": "amber",
        "affected_patients": ["Asthmatic Patients", "Glutamate Sensitive Individuals"],
        "clinical_explanation": "Flavor enhancer with free glutamate. May trigger broncho-constriction or headaches in sensitive individuals.",
        "clinical_explanation_hi": "स्वाद बढ़ाने वाला यह तत्व अस्थमा या संवेदनशील लोगों में सिरदर्द या सांस लेने में परेशानी पैदा कर सकता है।",
        "condition_key": "ASTHMA_MSG",
        "condition_name": "Asthma & Glutamate Sensitive Individuals",
        "severity": "CAUTION",
        "clinical_recommendation": "Sensitive individuals should test tolerance or avoid.",
    },
]

# Non-ingredient instructional patterns to filter out completely
NON_INGREDIENT_PATTERNS = [
    re.compile(r"\bW\.?H\.?O\.?\b", re.IGNORECASE),
    re.compile(r"\bRECOMMENDED\s*FORMULA\b", re.IGNORECASE),
    re.compile(r"\b(?:the\s*)?Water\s*&\s*Electrolytes(?:\s*lost)?\b", re.IGNORECASE),
    re.compile(r"\bElectrolytes?\s*lost\b", re.IGNORECASE),
    re.compile(r"\bquicker\s*absorption(?:\s*of\s*Fluids)?\b", re.IGNORECASE),
    re.compile(r"\babsorption\s*of\s*Fluids\b", re.IGNORECASE),
    re.compile(r"\bformula\s*allows\b", re.IGNORECASE),
    re.compile(r"\bhelps\s*replacing\b", re.IGNORECASE),
    re.compile(r"\b(?:during\s*)?severe\s*diarrh?oe?a\b", re.IGNORECASE),
    re.compile(r"\bSTORE\s*IN\b", re.IGNORECASE),
    re.compile(r"\bKEEP\s*PROTECTED\b", re.IGNORECASE),
    re.compile(r"\bKEEP\s*OUT\s*OF\b", re.IGNORECASE),
    re.compile(r"\bDRY\s*PLACE\b", re.IGNORECASE),
    re.compile(r"\buntil\s*diarrh?oe?a\b", re.IGNORECASE),
    re.compile(r"\bEach\s*sachet\s*of\b", re.IGNORECASE),
    re.compile(r"\bpowder\s*in\s*one\b", re.IGNORECASE),
    re.compile(r"\bDOSAGE\b", re.IGNORECASE),
    re.compile(r"\bDIRECTIONS?\s*FOR\s*USE\b", re.IGNORECASE),
    re.compile(r"\bCAUTION\b", re.IGNORECASE),
    re.compile(r"\bWARNING\b", re.IGNORECASE),
    re.compile(r"\bMFG\b", re.IGNORECASE),
    re.compile(r"\bEXPIRY\b", re.IGNORECASE),
    re.compile(r"\bBATCH\b", re.IGNORECASE),
    re.compile(r"\bMRP\b", re.IGNORECASE),
    re.compile(r"\bNET\s*WT\b", re.IGNORECASE),
]


class LLMHealthAdvisorService:
    """Service providing patient-specific health risk analysis using Gemini AI Studio with offline clinical fallback."""

    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()

    def filter_genuine_ingredients(self, raw_tokens: List[str]) -> List[str]:
        """Cleanses token list by stripping packaging instructions, dosages, and storage text."""
        cleaned: List[str] = []
        for token in raw_tokens:
            t = token.strip()
            if not t or len(t) < 2:
                continue

            # Strip leading numbers/weights like "2.60g Sodium Chloride" -> "Sodium Chloride"
            t_norm = re.sub(r"^[0-9]+(?:\.[0-9]+)?\s*(?:g|mg|kg|ml|l|gm)\s*(?:of\s*)?", "", t, flags=re.IGNORECASE).strip()
            t_norm = re.sub(r"\b(?:Each\s*sachet\s*of|powder\s*in\s*one\s*sachet|contains?)\b", "", t_norm, flags=re.IGNORECASE).strip()
            t_norm = re.sub(r"^[0-9]+(?:\.[0-9]+)?\s*", "", t_norm).strip()

            if not t_norm:
                continue

            # Check if matching non-ingredient instruction lines
            is_instruction = any(p.search(t) for p in NON_INGREDIENT_PATTERNS)
            if is_instruction:
                continue

            cleaned.append(t_norm)

        # De-duplicate while preserving order
        unique_tokens: List[str] = []
        for c in cleaned:
            if not any(c.lower() == u.lower() for u in unique_tokens):
                unique_tokens.append(c)

        return unique_tokens

    async def analyze_patient_risks(
        self,
        candidate_ingredients: List[str],
        nutrition_text: Optional[str] = None,
        product_title: Optional[str] = None,
    ) -> LLMHealthAnalysisResult:
        """Evaluates ingredients for patient risks using Gemini API when available, or clinical rules."""
        genuine_tokens = self.filter_genuine_ingredients(candidate_ingredients)

        # 1. If Gemini API key is configured, query Google AI Studio
        if self.api_key and len(self.api_key) >= 10:
            try:
                llm_result = await self._query_gemini_api(genuine_tokens, nutrition_text, product_title)
                if llm_result:
                    return llm_result
            except Exception as exc:
                logger.warning("Gemini AI Studio call failed (%s). Falling back to Clinical Rule Engine.", exc)

        # 2. Resilient Deterministic Clinical Knowledge Base
        return self._evaluate_with_clinical_rules(genuine_tokens)

    async def _query_gemini_api(
        self,
        ingredients: List[str],
        nutrition_text: Optional[str],
        product_title: Optional[str],
    ) -> Optional[LLMHealthAnalysisResult]:
        """Calls Google AI Studio Gemini API with structured JSON output."""
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={self.api_key}"

        prompt = f"""You are an expert Clinical Pharmacologist and Food Safety Specialist (FSSAI/WHO/ICMR guidelines).
Analyze these extracted packaged food / electrolyte / oral rehydration ingredients and identify specific health risks for vulnerable patient groups:
Product: {product_title or 'Packaged Consumable'}
Ingredients: {', '.join(ingredients)}
Nutrition details: {nutrition_text or 'N/A'}

Evaluate each ingredient and flag specific medical risks for:
1. Diabetic Patients (Sugar, Dextrose, Glucose, high glycemic carbs)
2. Kidney Disease / CKD Patients (Potassium chloride, high sodium, potassium salts)
3. Hypertension / High BP Patients (Sodium chloride, sodium citrate, high sodium)
4. Heart Failure / Cardiovascular Patients (Saturated fat, trans fat, excess sodium)
5. Celiac Disease (Gluten, wheat, maida)

Output strictly valid JSON with this exact schema:
{{
  "overall_health_verdict": "string (summary for general consumer)",
  "overall_health_verdict_hi": "string (Hindi summary)",
  "high_risk_patient_groups": ["list of medical conditions at risk"],
  "safe_patient_groups": ["list of conditions safe to consume"],
  "patient_advisories": [
    {{
      "condition_key": "DIABETES | KIDNEY_CKD | HYPERTENSION | HEART_DISEASE | CELIAC",
      "condition_name": "Condition Name in English and Hindi",
      "severity": "CRITICAL | WARNING | CAUTION",
      "trigger_ingredients": ["list of ingredients causing risk"],
      "warning_en": "Medical explanation why this patient is at risk",
      "warning_hi": "Hindi explanation",
      "clinical_recommendation": "Medical guidance"
    }}
  ],
  "ingredient_evaluations": [
    {{
      "ingredient_name": "Exact ingredient name",
      "safety_badge": "Short badge, e.g. 'Risk for Kidney Patients', 'High Glycemic (Diabetes)', or 'Generally Safe'",
      "status_color": "rose | amber | blue | emerald",
      "affected_patients": ["list of patient conditions"],
      "clinical_explanation": "Medical reasoning",
      "clinical_explanation_hi": "Hindi reasoning",
      "is_safe_for_general_public": true
    }}
  ]
}}"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        candidate_models = [
            "gemini-flash-lite-latest",
        ]

        async with httpx.AsyncClient(timeout=2.5) as client:
            for model in candidate_models:
                endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
                try:
                    resp = await client.post(endpoint, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_content = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        parsed = json.loads(raw_content)

                        return LLMHealthAnalysisResult(
                            source="GEMINI_AI_STUDIO",
                            overall_health_verdict=parsed.get(
                                "overall_health_verdict", "Evaluated by Gemini Clinical AI."
                            ),
                            overall_health_verdict_hi=parsed.get("overall_health_verdict_hi"),
                            patient_advisories=[
                                PatientRiskAdvisory(**pa) for pa in parsed.get("patient_advisories", [])
                            ],
                            ingredient_evaluations=[
                                IngredientPatientEvaluation(**ie)
                                for ie in parsed.get("ingredient_evaluations", [])
                            ],
                            safe_patient_groups=parsed.get("safe_patient_groups", []),
                            high_risk_patient_groups=parsed.get("high_risk_patient_groups", []),
                        )
                    else:
                        logger.warning(
                            "Gemini model '%s' returned status %d. Trying fallback.",
                            model,
                            resp.status_code,
                        )
                except Exception as exc:
                    logger.warning("Gemini model '%s' call failed or timed out: %s. Using Clinical Engine.", model, exc)
                    break  # Do not cascade timeouts; immediately use instant clinical engine

            return None

    def _evaluate_with_clinical_rules(self, ingredients: List[str]) -> LLMHealthAnalysisResult:
        """Deterministic, highly accurate clinical rules engine for patient risk mapping."""
        advisories_map: Dict[str, PatientRiskAdvisory] = {}
        evaluations: List[IngredientPatientEvaluation] = []
        high_risk_groups: set[str] = set()

        for ing in ingredients:
            ing_lower = ing.lower()
            matched_rule = None

            for rule in CLINICAL_INGREDIENT_RULES:
                if any(re.search(pat, ing_lower) for pat in rule["patterns"]):
                    matched_rule = rule
                    break

            if matched_rule:
                evaluations.append(
                    IngredientPatientEvaluation(
                        ingredient_name=ing,
                        safety_badge=matched_rule["badge"],
                        status_color=matched_rule["color"],
                        affected_patients=matched_rule["affected_patients"],
                        clinical_explanation=matched_rule["clinical_explanation"],
                        clinical_explanation_hi=matched_rule["clinical_explanation_hi"],
                        is_safe_for_general_public=True,
                    )
                )

                cond_key = matched_rule["condition_key"]
                high_risk_groups.add(matched_rule["condition_name"])

                if cond_key not in advisories_map:
                    advisories_map[cond_key] = PatientRiskAdvisory(
                        condition_key=cond_key,
                        condition_name=matched_rule["condition_name"],
                        severity=matched_rule["severity"],
                        trigger_ingredients=[ing],
                        warning_en=matched_rule["clinical_explanation"],
                        warning_hi=matched_rule["clinical_explanation_hi"],
                        clinical_recommendation=matched_rule["clinical_recommendation"],
                    )
                else:
                    if ing not in advisories_map[cond_key].trigger_ingredients:
                        advisories_map[cond_key].trigger_ingredients.append(ing)
            else:
                evaluations.append(
                    IngredientPatientEvaluation(
                        ingredient_name=ing,
                        safety_badge="Generally Safe",
                        status_color="emerald",
                        affected_patients=[],
                        clinical_explanation="Standard dietary ingredient. Generally recognized as safe under FSSAI / ICMR-NIN guidelines for the general public.",
                        clinical_explanation_hi="सामान्य आहार घटक। स्वस्थ व्यक्तियों के लिए सामान्यतः सुरक्षित।",
                        is_safe_for_general_public=True,
                    )
                )

        # Build high risk list & overall summary
        high_risk_list = list(high_risk_groups)
        verdict = (
            f"Caution advised for {len(high_risk_list)} vulnerable patient group(s): {', '.join(high_risk_list)}."
            if high_risk_list
            else "Ingredients are generally safe for the general population under moderate consumption."
        )
        verdict_hi = (
            f"इन मरीजों के लिए विशेष सावधानी आवश्यक है: {', '.join(high_risk_list)}।"
            if high_risk_list
            else "सामान्य व्यक्तियों के लिए सभी सामग्रियां सुरक्षित हैं।"
        )

        return LLMHealthAnalysisResult(
            source="CLINICAL_KNOWLEDGE_BASE",
            overall_health_verdict=verdict,
            overall_health_verdict_hi=verdict_hi,
            patient_advisories=list(advisories_map.values()),
            ingredient_evaluations=evaluations,
            safe_patient_groups=["General Healthy Adults", "Active Sports Persons"] if high_risk_list else ["All Groups"],
            high_risk_patient_groups=high_risk_list,
        )


# Global singleton
llm_health_advisor = LLMHealthAdvisorService()
