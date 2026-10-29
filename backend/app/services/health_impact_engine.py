"""Nirikshan AI - Deterministic Health Impact & Global Regulatory Engine.

Consumes section-aware parsed label text, CONTAINS and MAY CONTAIN declarations,
nutrition facts, additives, and user health profiles to evaluate:
1. Global Regulatory & Banned Additives Status (India FSSAI, European Union EFSA, US FDA).
2. Product-Level Health & Nutritional Concerns (Saturated Fats, Palm Oil, Refined Maida, Added Sugars, High Sodium).
3. Packaging Chemical Safety Warnings (e.g., Copper/Brass utensil reaction cautions).
4. Personalized Sensitivity & Allergen Matches (Coeliac, Allergies, Diabetes, Hypertension, CKD).

Strict architectural principles:
- No LLM or generative guessing.
- Deterministic, evidence-based rules backed by verified public health sources (FSSAI, EFSA, FDA, WHO, CDC, NIDDK).
- NEVER profile-dependent for baseline food safety: Product health risks and international bans are
  evaluated automatically on every scan, even when no user profile is selected.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field

from backend.app.services.label_parser import ParsedLabelSections
from backend.app.services.ocr_service import OCRTextBox

logger = logging.getLogger(__name__)


class NutritionFacts(BaseModel):
    """Reliably extracted nutritional facts and measurement units."""

    serving_size: Optional[str] = Field(
        default=None,
        description="Serving size statement if parsed, e.g. '30 g' or '1 pouch (50g)'",
    )
    energy_kcal: Optional[float] = Field(
        default=None,
        description="Energy in kcal",
    )
    carbohydrates_g: Optional[float] = Field(
        default=None,
        description="Total carbohydrates in grams",
    )
    sugars_g: Optional[float] = Field(
        default=None,
        description="Total sugars in grams",
    )
    sodium_mg: Optional[float] = Field(
        default=None,
        description="Sodium content normalized to milligrams (mg)",
    )
    measurement_basis: Optional[str] = Field(
        default=None,
        description="Measurement basis: 'per_100g', 'per_serving', or 'unspecified'",
    )
    raw_nutrition_lines: List[str] = Field(
        default_factory=list,
        description="Raw lines from packaging identified as nutritional information",
    )
    is_reliably_parsed: bool = Field(
        default=False,
        description="True if at least one key nutrient with unambiguous units was parsed",
    )


class RegulatoryAdditiveFinding(BaseModel):
    """Global regulatory and ban status for an additive across India, EU, and USA."""

    ins_number: str
    e_number: Optional[str] = None
    canonical_name: str
    functional_class: str
    fssai_status: str
    eu_efsa_status: str
    us_fda_status: str
    is_banned_internationally: bool = False
    banned_in_jurisdictions: List[str] = Field(default_factory=list)
    health_concern: str
    plain_english: str
    hindi_explanation: Optional[str] = None


class GeneralHealthInsight(BaseModel):
    """General health impact insight for a key recipe ingredient or packaging caution."""

    ingredient_name: str
    concern_type: str
    severity: str = Field(..., description="'CRITICAL', 'WARNING', 'CAUTION', or 'INFO'")
    title: str
    explanation: str
    explanation_hi: Optional[str] = None
    authority: str
    source_url: str


class HealthImpactFinding(BaseModel):
    """A single deterministic health impact evaluation finding."""

    rule_id: str = Field(..., description="Stable rule identifier, e.g. RULE_ALLERGY_SOY_CONTAINS")
    matched_item: str = Field(..., description="Ingredient or nutrient that triggered the rule")
    condition_or_allergy: str = Field(..., description="Target user condition or allergen code")
    category: str = Field(
        ...,
        description="'FOOD_ALLERGY', 'COELIAC_DISEASE', 'DIABETIC_NUTRITION', 'CARDIOVASCULAR_SODIUM', or 'RENAL_SODIUM'",
    )
    declaration_type: str = Field(
        ...,
        description="'CONTAINS', 'MAY_CONTAIN', or 'NUTRITION'",
    )
    severity: str = Field(
        ...,
        description="'CRITICAL', 'WARNING', 'CAUTION', or 'DATA_INSUFFICIENT'",
    )
    title: str = Field(..., description="Human-readable title for the finding")
    explanation: str = Field(..., description="Plain-English explanation of health relevance")
    explanation_hi: Optional[str] = Field(default=None, description="Hindi explanation where available")
    evidence_title: str = Field(..., description="Title of official authority publication")
    evidence_url: str = Field(..., description="URL to official regulatory or clinical publication")
    triggering_text: str = Field(..., description="Actual packaging text or nutrient value detected")
    status: str = Field(
        default="EVALUATED",
        description="'EVALUATED', 'DATA_INSUFFICIENT', or 'NOT_EVALUATED'",
    )
    recommended_action: str = Field(..., description="Practical verification or dietary action")
    limitations: Optional[str] = Field(default=None, description="Scope and limitations of finding")


class HealthImpactReport(BaseModel):
    """Complete health impact evaluation result for user review."""

    profile_conditions_evaluated: List[str] = Field(
        default_factory=list,
        description="Conditions and allergies requested for evaluation",
    )
    general_health_insights: List[GeneralHealthInsight] = Field(
        default_factory=list,
        description="Automatic health insights for ingredients (Palmolein oil, Maida, Added Sugars, Utensil alerts)",
    )
    regulatory_additive_findings: List[RegulatoryAdditiveFinding] = Field(
        default_factory=list,
        description="Global regulatory status of additives (FSSAI, EU EFSA, US FDA)",
    )
    international_bans_detected: List[str] = Field(
        default_factory=list,
        description="Additives detected that are banned or severely restricted internationally",
    )
    packaging_caution_detected: Optional[str] = Field(
        default=None,
        description="Critical chemical/packaging warnings detected on label (e.g. Copper/Brass utensils warning)",
    )
    allergy_findings: List[HealthImpactFinding] = Field(
        default_factory=list,
        description="Direct declared and precautionary allergen matches",
    )
    condition_findings: List[HealthImpactFinding] = Field(
        default_factory=list,
        description="Health condition findings (coeliac, diabetes, hypertension, CKD)",
    )
    data_insufficient_notices: List[HealthImpactFinding] = Field(
        default_factory=list,
        description="Explicit notices where packaging data was unreadable or absent",
    )
    nutrition_facts: Optional[NutritionFacts] = Field(
        default=None,
        description="Parsed nutrition facts from the packaging panel",
    )
    summary_counts: Dict[str, int] = Field(
        default_factory=dict,
        description="Summary counts: critical, warning, caution, data_insufficient, international_bans",
    )
    disclaimer: str = (
        "Educational label analysis only. Nirikshan AI evaluates visible label declarations and "
        "parsed nutrition facts against curated public health guidance. It does not provide medical "
        "diagnoses, treatment recommendations, or clinical validation. Consult a qualified healthcare "
        "professional or registered dietitian for personal dietary management."
    )


class HealthImpactEngine:
    """Deterministic evaluation engine consuming curated health and global regulatory knowledge."""

    def __init__(
        self,
        knowledge_path: Optional[Path | str] = None,
        regulatory_path: Optional[Path | str] = None,
    ) -> None:
        base_dir = Path(__file__).resolve().parent.parent.parent.parent

        if knowledge_path is None:
            knowledge_path = base_dir / "data" / "curated" / "health_knowledge.json"
        if regulatory_path is None:
            regulatory_path = base_dir / "data" / "curated" / "global_regulatory_knowledge.json"

        self.knowledge_path = Path(knowledge_path)
        self.regulatory_path = Path(regulatory_path)
        self.rules: Dict[str, Dict[str, Any]] = {}
        self.regulatory_additives: Dict[str, Dict[str, Any]] = {}
        self.core_ingredients_profile: Dict[str, Dict[str, Any]] = {}

        self._load_knowledge()

    def _load_knowledge(self) -> None:
        """Loads curated health rules and global regulatory data from disk."""
        if self.knowledge_path.exists():
            try:
                with open(self.knowledge_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.rules = data.get("rules", {})
                    logger.info("Loaded %d curated health rules from %s", len(self.rules), self.knowledge_path)
            except Exception as err:
                logger.error("Failed to load health knowledge base: %s", err)

        if self.regulatory_path.exists():
            try:
                with open(self.regulatory_path, "r", encoding="utf-8") as f:
                    reg_data = json.load(f)
                    self.regulatory_additives = reg_data.get("regulatory_additives", {})
                    self.core_ingredients_profile = reg_data.get("core_ingredients_health_profile", {})
                    logger.info("Loaded %d regulatory additives from %s", len(self.regulatory_additives), self.regulatory_path)
            except Exception as err:
                logger.error("Failed to load global regulatory knowledge base: %s", err)

    def parse_nutrition_facts(
        self,
        boxes: List[OCRTextBox],
        filtered_sections: List[Dict[str, str]],
    ) -> NutritionFacts:
        """Deterministically parses nutrition values from filtered lines or OCR boxes."""
        candidate_lines: List[str] = []

        for item in filtered_sections:
            text = item.get("text", "").strip()
            if text:
                candidate_lines.append(text)

        nutrition_keywords = ("nutrition", "energy", "calorie", "protein", "carbohydrate", "sugar", "sodium", "salt", "serving", "100g", "per serve")
        for box in boxes:
            t = box.text.strip()
            if any(k in t.lower() for k in nutrition_keywords):
                if t not in candidate_lines:
                    candidate_lines.append(t)

        serving_size: Optional[str] = None
        measurement_basis: Optional[str] = None
        energy_kcal: Optional[float] = None
        carbohydrates_g: Optional[float] = None
        sugars_g: Optional[float] = None
        sodium_mg: Optional[float] = None

        full_text = " ".join(candidate_lines).lower()
        if "per 100 g" in full_text or "per 100g" in full_text or "in 100g" in full_text:
            measurement_basis = "per_100g"
        elif "per serve" in full_text or "per serving" in full_text:
            measurement_basis = "per_serving"

        serving_match = re.search(r"(?:SERVING\s*SIZE|PER\s*SERVE(?:\s*SIZE)?)\s*[\:\-]?\s*(\d+(?:\.\d+)?\s*(?:g|ml|oz)?)", full_text, re.IGNORECASE)
        if serving_match:
            serving_size = serving_match.group(1).strip()

        energy_match = re.search(r"(?:ENERGY|CALORIES)\s*[\:\-]?\s*(\d+(?:\.\d+)?)\s*(?:kcal|cal|kj)?", full_text, re.IGNORECASE)
        if energy_match:
            try:
                energy_kcal = float(energy_match.group(1))
            except ValueError:
                pass

        carbs_match = re.search(r"(?:TOTAL\s*)?CARBOHYDRATE[S]?\s*[\:\-]?\s*(\d+(?:\.\d+)?)\s*g?", full_text, re.IGNORECASE)
        if carbs_match:
            try:
                carbs_g_val = float(carbs_match.group(1))
                if carbs_g_val <= 100.0 or measurement_basis != "per_100g":
                    carbohydrates_g = carbs_g_val
            except ValueError:
                pass

        sugars_match = re.search(r"(?:TOTAL\s*SUGARS?|SUGARS?)\s*[\:\-]?\s*(\d+(?:\.\d+)?)\s*g?", full_text, re.IGNORECASE)
        if sugars_match:
            try:
                sugars_g_val = float(sugars_match.group(1))
                if sugars_g_val <= 100.0 or measurement_basis != "per_100g":
                    sugars_g = sugars_g_val
            except ValueError:
                pass

        sodium_match = re.search(r"\bSODIUM\s*[\:\-]?\s*(\d+(?:\.\d+)?)\s*(mg|g)?\b", full_text, re.IGNORECASE)
        if sodium_match:
            try:
                raw_num = float(sodium_match.group(1))
                unit = (sodium_match.group(2) or "mg").lower()
                if unit == "g":
                    sodium_mg = raw_num * 1000.0
                else:
                    sodium_mg = raw_num
            except ValueError:
                pass

        is_reliably_parsed = (
            carbohydrates_g is not None
            or sugars_g is not None
            or sodium_mg is not None
            or energy_kcal is not None
        )

        return NutritionFacts(
            serving_size=serving_size,
            energy_kcal=energy_kcal,
            carbohydrates_g=carbohydrates_g,
            sugars_g=sugars_g,
            sodium_mg=sodium_mg,
            measurement_basis=measurement_basis or ("per_100g" if is_reliably_parsed else "unspecified"),
            raw_nutrition_lines=candidate_lines,
            is_reliably_parsed=is_reliably_parsed,
        )

    def evaluate(
        self,
        candidate_ingredients: List[str],
        parsed_sections: ParsedLabelSections,
        boxes: List[OCRTextBox],
        allergies: Optional[List[str]] = None,
        health_conditions: Optional[List[str]] = None,
    ) -> HealthImpactReport:
        """Evaluates product health impacts, global bans, and user profiles deterministically."""
        profile_allergies: List[str] = [a.strip().lower() for a in (allergies or []) if a.strip()]
        profile_conditions: List[str] = [c.strip().lower() for c in (health_conditions or []) if c.strip()]
        evaluated_conditions_list: List[str] = sorted(list(set(profile_allergies + profile_conditions)))

        allergy_findings: List[HealthImpactFinding] = []
        condition_findings: List[HealthImpactFinding] = []
        insufficient_notices: List[HealthImpactFinding] = []
        general_insights: List[GeneralHealthInsight] = []
        regulatory_findings: List[RegulatoryAdditiveFinding] = []
        international_bans: List[str] = []
        packaging_caution: Optional[str] = None

        # 1. Parse nutrition facts
        nutrition_facts = self.parse_nutrition_facts(boxes, parsed_sections.filtered_sections)

        # 2. Extract full text string across all boxes for pattern detection
        full_text_lower = " ".join(b.text.lower() for b in boxes)
        ingredients_full_lower = " ".join(candidate_ingredients).lower() + " " + parsed_sections.ingredients_text.lower()

        # -------------------------------------------------------------
        # PART A: GLOBAL REGULATORY & BANNED ADDITIVES EVALUATION
        # -------------------------------------------------------------
        # Detect INS/E numbers in ingredients and boxes
        detected_ins_codes: Set[str] = set()
        ins_regex = re.compile(r"\b(?:INS|E)[\s\-\.]*(\d{3,4}(?:\([a-z0-9]+\)|[a-z0-9]+)?)\b", re.IGNORECASE)
        for match in ins_regex.finditer(ingredients_full_lower + " " + full_text_lower):
            raw_code = match.group(1).lower().strip()
            # Normalize common OCR typos like (ll) or (11) to (ii)
            normalized_code = re.sub(r"\((?:ll|11)\)", "(ii)", raw_code)
            detected_ins_codes.add(normalized_code)
            # Also add base number if parenthesized
            base_code = re.sub(r"\(.*?\)", "", normalized_code)
            if base_code:
                detected_ins_codes.add(base_code)

        for ins_key, additive_info in self.regulatory_additives.items():
            key_normalized = ins_key.lower()
            if key_normalized in detected_ins_codes or (f"ins {key_normalized}" in ingredients_full_lower) or (f"ins{key_normalized}" in ingredients_full_lower):
                is_banned = additive_info.get("is_banned_internationally", False)
                eu_status = additive_info.get("eu_efsa_status", "PERMITTED")
                fssai_status = additive_info.get("fssai_status", "PERMITTED")
                banned_jurisdictions = additive_info.get("banned_in_jurisdictions", [])

                if is_banned or eu_status == "BANNED" or fssai_status == "BANNED":
                    for j in banned_jurisdictions:
                        ban_str = f"{additive_info['canonical_name']} (INS {additive_info['ins_number']}) — Banned in {j}"
                        if ban_str not in international_bans:
                            international_bans.append(ban_str)

                regulatory_findings.append(
                    RegulatoryAdditiveFinding(
                        ins_number=additive_info.get("ins_number", ins_key),
                        e_number=additive_info.get("e_number"),
                        canonical_name=additive_info.get("canonical_name", f"Additive INS {ins_key}"),
                        functional_class=additive_info.get("functional_class", "Food Additive"),
                        fssai_status=fssai_status,
                        eu_efsa_status=eu_status,
                        us_fda_status=additive_info.get("us_fda_status", "PERMITTED"),
                        is_banned_internationally=is_banned,
                        banned_in_jurisdictions=banned_jurisdictions,
                        health_concern=additive_info.get("health_concern", "Additive safety profile"),
                        plain_english=additive_info.get("plain_english", ""),
                        hindi_explanation=additive_info.get("hindi_explanation"),
                    )
                )

        # -------------------------------------------------------------
        # PART B: PRODUCT-LEVEL NUTRITIONAL & PACKAGING HEALTH CONCERNS
        # -------------------------------------------------------------
        # 1. Refined Palmolein Oil (Palm Oil Saturated Fat Warning)
        if any(k in ingredients_full_lower for k in ("palmolein", "palm oil", "palmolein oil")):
            palm_info = self.core_ingredients_profile.get("palmolein_oil", {})
            general_insights.append(
                GeneralHealthInsight(
                    ingredient_name="Refined Palmolein Oil",
                    concern_type="SATURATED_FAT_CARDIOVASCULAR",
                    severity="WARNING",
                    title="High Saturated Fat Source: Palmolein Oil",
                    explanation=palm_info.get(
                        "plain_english",
                        "Contains Refined Palmolein Oil, which is approximately 50% saturated fat. High saturated fat intake raises serum LDL cholesterol and increases cardiovascular risk.",
                    ),
                    explanation_hi=palm_info.get("hindi_explanation"),
                    authority=palm_info.get("authority", "World Health Organization (WHO)"),
                    source_url=palm_info.get("url", "https://www.who.int/news-room/fact-sheets/detail/healthy-diet"),
                )
            )

        # 2. Refined Wheat Flour (Maida High Glycemic Carbs)
        if any(k in ingredients_full_lower for k in ("maida", "refined wheat flour", "refined flour")):
            maida_info = self.core_ingredients_profile.get("maida", {})
            general_insights.append(
                GeneralHealthInsight(
                    ingredient_name="Refined Wheat Flour (Maida)",
                    concern_type="HIGH_GLYCEMIC_REFINED_CARBS",
                    severity="CAUTION",
                    title="Refined Carbohydrate: Maida (Low Dietary Fiber)",
                    explanation=maida_info.get(
                        "plain_english",
                        "Refined Wheat Flour (Maida) has had its fiber-rich outer bran stripped. It digests quickly and has a high glycemic index.",
                    ),
                    explanation_hi=maida_info.get("hindi_explanation"),
                    authority=maida_info.get("authority", "ICMR-NIN Dietary Guidelines for Indians"),
                    source_url=maida_info.get("url", "https://www.nin.res.in"),
                )
            )

        # 3. Added Sugars
        if any(k in ingredients_full_lower for k in ("sugar", "cane sugar", "table sugar")) or (nutrition_facts.sugars_g and nutrition_facts.sugars_g > 10.0):
            sugar_info = self.core_ingredients_profile.get("sugar", {})
            general_insights.append(
                GeneralHealthInsight(
                    ingredient_name="Added Sugars",
                    concern_type="FREE_SUGARS_METABOLIC",
                    severity="CAUTION",
                    title="Added Sugar Content & Metabolic Impact",
                    explanation=sugar_info.get(
                        "plain_english",
                        "Contains added sugars. WHO guidance recommends limiting free sugar intake to less than 10% (ideally <5%) of total daily caloric intake.",
                    ),
                    explanation_hi=sugar_info.get("hindi_explanation"),
                    authority=sugar_info.get("authority", "WHO Guideline on Sugars Intake"),
                    source_url=sugar_info.get("url", "https://www.who.int"),
                )
            )

        # 4. Packaging Caution: Acidic food reacting with Copper/Brass/Silver utensils
        if ("copper" in full_text_lower or "brass" in full_text_lower or "silver" in full_text_lower) and ("utensil" in full_text_lower or "do not use" in full_text_lower):
            packaging_caution = (
                "DO NOT USE COPPER, BRASS, NICKEL, OR SILVER UTENSILS: "
                "Organic food acids (tamarind, tartaric and citric acids) chemically react with copper/brass vessels, "
                "leaching toxic metallic verdigris/copper tartrate salts."
            )
            acid_info = self.core_ingredients_profile.get("acidic_metal_reaction", {})
            general_insights.append(
                GeneralHealthInsight(
                    ingredient_name="Packaging Chemical Advisory",
                    concern_type="TOXIC_METALLIC_LEACHING",
                    severity="CRITICAL",
                    title="Safety Caution: Avoid Copper / Brass / Silver Cookware",
                    explanation=acid_info.get(
                        "plain_english",
                        "PACKAGING SAFETY WARNING: Do not prepare or store this food in brass, copper, nickel, or silver utensils. Food acids from tamarind and tartaric acid react with metal to leach toxic chemical salts.",
                    ),
                    explanation_hi=acid_info.get("hindi_explanation"),
                    authority="FSSAI Food Safety Warning & Manufacturer Label Advisory",
                    source_url="https://www.fssai.gov.in",
                )
            )

        # 5. Gluten Presence
        has_gluten = any(k in ingredients_full_lower for k in ("wheat", "atta", "maida", "semolina", "suji", "sooji", "sermolina", "gluten")) or any("gluten" in a.lower() or "wheat" in a.lower() for a in parsed_sections.contains_allergens)
        if has_gluten:
            gluten_info = self.core_ingredients_profile.get("gluten_wheat", {})
            general_insights.append(
                GeneralHealthInsight(
                    ingredient_name="Wheat & Gluten Cereals",
                    concern_type="AUTOIMMUNE_ALLERGEN_TRIGGER",
                    severity="INFO",
                    title="Contains Gluten (Wheat Cereals)",
                    explanation=gluten_info.get(
                        "plain_english",
                        "Contains gluten from wheat. Must be avoided by individuals diagnosed with Coeliac Disease or IgE-mediated Wheat Allergy.",
                    ),
                    explanation_hi=gluten_info.get("hindi_explanation"),
                    authority="FSSAI Mandatory Allergen Declaration / NIDDK",
                    source_url="https://www.niddk.nih.gov",
                )
            )

        # -------------------------------------------------------------
        # PART C: PERSONALIZED PROFILE MATCHING (IF SELECTED)
        # -------------------------------------------------------------
        # Allergy mapping
        ALLERGY_MAP: Dict[str, Dict[str, str]] = {
            "soy": {"contains_rule": "RULE_ALLERGY_SOY_CONTAINS", "may_contain_rule": "RULE_ALLERGY_SOY_MAY_CONTAIN"},
            "wheat": {"contains_rule": "RULE_ALLERGY_WHEAT_CONTAINS", "may_contain_rule": "RULE_ALLERGY_WHEAT_MAY_CONTAIN"},
            "gluten": {"contains_rule": "RULE_ALLERGY_WHEAT_CONTAINS", "may_contain_rule": "RULE_ALLERGY_WHEAT_MAY_CONTAIN"},
            "milk": {"contains_rule": "RULE_ALLERGY_MILK_CONTAINS", "may_contain_rule": "RULE_ALLERGY_MILK_MAY_CONTAIN"},
            "peanut": {"contains_rule": "RULE_ALLERGY_PEANUT_CONTAINS", "may_contain_rule": "RULE_ALLERGY_PEANUT_MAY_CONTAIN"},
            "tree_nut": {"contains_rule": "RULE_ALLERGY_TREENUT_CONTAINS", "may_contain_rule": "RULE_ALLERGY_TREENUT_MAY_CONTAIN"},
            "nuts": {"contains_rule": "RULE_ALLERGY_TREENUT_CONTAINS", "may_contain_rule": "RULE_ALLERGY_TREENUT_MAY_CONTAIN"},
            "mustard": {"contains_rule": "RULE_ALLERGY_MUSTARD_CONTAINS", "may_contain_rule": "RULE_ALLERGY_MUSTARD_MAY_CONTAIN"},
        }

        def matches_allergen(target_code: str, label_allergen: str) -> bool:
            lbl = label_allergen.lower()
            if target_code == "soy" and ("soy" in lbl or "soya" in lbl):
                return True
            if target_code in ("wheat", "gluten") and ("wheat" in lbl or "gluten" in lbl):
                return True
            if target_code == "milk" and ("milk" in lbl or "dairy" in lbl):
                return True
            if target_code == "peanut" and ("peanut" in lbl or "groundnut" in lbl):
                return True
            if target_code in ("tree_nut", "nuts") and ("nut" in lbl or "almond" in lbl or "cashew" in lbl or "walnut" in lbl or "pistachio" in lbl):
                return True
            if target_code == "mustard" and "mustard" in lbl:
                return True
            if target_code in lbl or lbl in target_code:
                return True
            return False

        for allergy_code in profile_allergies:
            config = ALLERGY_MAP.get(allergy_code)

            for declared in parsed_sections.contains_allergens:
                if matches_allergen(allergy_code, declared):
                    rule_id = config["contains_rule"] if config else "RULE_ALLERGY_DECLARED_GENERIC"
                    rule_def = self.rules.get(rule_id, {})
                    title = rule_def.get("title", f"Declared Recipe Allergen: {declared.capitalize()}")
                    plain_en = rule_def.get("plain_english", f"The packaging declares {declared} as a direct recipe ingredient.")
                    plain_hi = rule_def.get("hindi_explanation")
                    ev = rule_def.get("evidence", {})

                    allergy_findings.append(
                        HealthImpactFinding(
                            rule_id=rule_id,
                            matched_item=declared,
                            condition_or_allergy=allergy_code,
                            category="FOOD_ALLERGY",
                            declaration_type="CONTAINS",
                            severity="CRITICAL",
                            title=title,
                            explanation=plain_en,
                            explanation_hi=plain_hi,
                            evidence_title=ev.get("title", "FSSAI Labelling Regulations, 2020"),
                            evidence_url=ev.get("url", "https://www.fssai.gov.in"),
                            triggering_text=f"CONTAINS: {declared}",
                            status="EVALUATED",
                            recommended_action=f"Strictly avoid consumption if allergic to {declared}.",
                            limitations=rule_def.get("limitations"),
                        )
                    )

            for precautionary in parsed_sections.may_contain_allergens:
                if matches_allergen(allergy_code, precautionary):
                    rule_id = config["may_contain_rule"] if config else "RULE_ALLERGY_MAY_CONTAIN_GENERIC"
                    rule_def = self.rules.get(rule_id, {})
                    title = rule_def.get("title", f"Precautionary Advisory: {precautionary.capitalize()}")
                    plain_en = rule_def.get("plain_english", f"Packaging notes potential cross-contact with {precautionary}.")
                    plain_hi = rule_def.get("hindi_explanation")
                    ev = rule_def.get("evidence", {})

                    allergy_findings.append(
                        HealthImpactFinding(
                            rule_id=rule_id,
                            matched_item=precautionary,
                            condition_or_allergy=allergy_code,
                            category="FOOD_ALLERGY",
                            declaration_type="MAY_CONTAIN",
                            severity="WARNING",
                            title=title,
                            explanation=plain_en,
                            explanation_hi=plain_hi,
                            evidence_title=ev.get("title", "FSSAI Labelling Regulations, 2020"),
                            evidence_url=ev.get("url", "https://www.fssai.gov.in"),
                            triggering_text=f"MAY CONTAIN: {precautionary}",
                            status="EVALUATED",
                            recommended_action=f"Exercise caution if highly sensitive to {precautionary}.",
                            limitations=rule_def.get("limitations"),
                        )
                    )

        # Coeliac Disease condition
        if any(c in profile_conditions for c in ("celiac", "coeliac", "celiac_disease", "coeliac_disease")):
            gluten_found_contains = None
            for a in parsed_sections.contains_allergens:
                if any(k in a.lower() for k in ("wheat", "gluten", "barley", "rye")):
                    gluten_found_contains = a
                    break
            if not gluten_found_contains:
                for ing in candidate_ingredients:
                    if any(k in ing.lower() for k in ("wheat", "gluten", "barley", "rye", "maida", "atta", "semolina")):
                        gluten_found_contains = ing.strip()
                        break

            if gluten_found_contains:
                rule_def = self.rules.get("RULE_CONDITION_CELIAC_GLUTEN_CONTAINS", {})
                ev = rule_def.get("evidence", {})
                condition_findings.append(
                    HealthImpactFinding(
                        rule_id="RULE_CONDITION_CELIAC_GLUTEN_CONTAINS",
                        matched_item=gluten_found_contains,
                        condition_or_allergy="celiac",
                        category="COELIAC_DISEASE",
                        declaration_type="CONTAINS",
                        severity="CRITICAL",
                        title=rule_def.get("title", "Gluten Source Declared (Coeliac Disease Concern)"),
                        explanation=rule_def.get("plain_english", "Gluten source declared. People with coeliac disease must avoid gluten."),
                        explanation_hi=rule_def.get("hindi_explanation"),
                        evidence_title=ev.get("title", "Eating, Diet, & Nutrition for Celiac Disease"),
                        evidence_url=ev.get("url", "https://www.niddk.nih.gov"),
                        triggering_text=f"Detected gluten source: {gluten_found_contains}",
                        status="EVALUATED",
                        recommended_action="Avoid consumption. Coeliac disease requires a strict gluten-free diet.",
                    )
                )
            else:
                gluten_found_precautionary = None
                for a in parsed_sections.may_contain_allergens:
                    if any(k in a.lower() for k in ("wheat", "gluten", "barley", "rye")):
                        gluten_found_precautionary = a
                        break
                if gluten_found_precautionary:
                    rule_def = self.rules.get("RULE_CONDITION_CELIAC_GLUTEN_MAY_CONTAIN", {})
                    ev = rule_def.get("evidence", {})
                    condition_findings.append(
                        HealthImpactFinding(
                            rule_id="RULE_CONDITION_CELIAC_GLUTEN_MAY_CONTAIN",
                            matched_item=gluten_found_precautionary,
                            condition_or_allergy="celiac",
                            category="COELIAC_DISEASE",
                            declaration_type="MAY_CONTAIN",
                            severity="WARNING",
                            title=rule_def.get("title", "Precautionary Gluten Cross-Contact (Coeliac Disease Caution)"),
                            explanation=rule_def.get(
                                "plain_english",
                                "The packaging indicates a potential cross-contact advisory ('MAY CONTAIN WHEAT / GLUTEN').",
                            ),
                            explanation_hi=rule_def.get("hindi_explanation"),
                            evidence_title=ev.get("title", "Eating, Diet, & Nutrition for Celiac Disease"),
                            evidence_url=ev.get("url", "https://www.niddk.nih.gov"),
                            triggering_text=f"MAY CONTAIN: {gluten_found_precautionary}",
                            status="EVALUATED",
                            recommended_action="Review with your healthcare provider or check for dedicated gluten-free facility certification.",
                            limitations=rule_def.get("limitations"),
                        )
                    )


        # Diabetes condition
        if any(c in profile_conditions for c in ("diabetes", "diabetic", "blood_sugar")):
            if nutrition_facts.carbohydrates_g is not None or nutrition_facts.sugars_g is not None:
                rule_def = self.rules.get("RULE_CONDITION_DIABETES_NUTRITION", {})
                ev = rule_def.get("evidence", {})
                trig_parts = []
                if nutrition_facts.carbohydrates_g is not None:
                    trig_parts.append(f"Carbs: {nutrition_facts.carbohydrates_g}g")
                if nutrition_facts.sugars_g is not None:
                    trig_parts.append(f"Sugars: {nutrition_facts.sugars_g}g")
                condition_findings.append(
                    HealthImpactFinding(
                        rule_id="RULE_CONDITION_DIABETES_NUTRITION",
                        matched_item="Carbohydrates & Sugars",
                        condition_or_allergy="diabetes",
                        category="DIABETIC_NUTRITION",
                        declaration_type="NUTRITION",
                        severity="CAUTION",
                        title=rule_def.get("title", "Carbohydrate & Sugar Context for Blood Glucose"),
                        explanation=rule_def.get("plain_english", "Portion size and carbohydrate counting impact blood glucose."),
                        explanation_hi=rule_def.get("hindi_explanation"),
                        evidence_title=ev.get("title", "Diabetes Meal Planning and Carbohydrate Tracking"),
                        evidence_url=ev.get("url", "https://www.cdc.gov"),
                        triggering_text=", ".join(trig_parts),
                        status="EVALUATED",
                        recommended_action="Account for portion size within your carbohydrate plan.",
                    )
                )
            else:
                rule_def = self.rules.get("RULE_CONDITION_DIABETES_DATA_INSUFFICIENT", {})
                ev = rule_def.get("evidence", {})
                insufficient_notices.append(
                    HealthImpactFinding(
                        rule_id="RULE_CONDITION_DIABETES_DATA_INSUFFICIENT",
                        matched_item="Carbohydrates / Sugars",
                        condition_or_allergy="diabetes",
                        category="DIABETIC_NUTRITION",
                        declaration_type="NUTRITION",
                        severity="DATA_INSUFFICIENT",
                        title=rule_def.get("title", "Nutritional Data Insufficient (Carbohydrates Unparsed)"),
                        explanation=rule_def.get("plain_english", "Carbohydrate values could not be extracted from visible label."),
                        explanation_hi=rule_def.get("hindi_explanation"),
                        evidence_title=ev.get("title", "CDC Diabetes Nutrition Guidance"),
                        evidence_url=ev.get("url", "https://www.cdc.gov"),
                        triggering_text="Nutrition table unparsed or absent in image",
                        status="DATA_INSUFFICIENT",
                        recommended_action="Check the physical package nutrition table.",
                    )
                )

        # Hypertension condition
        if any(c in profile_conditions for c in ("hypertension", "sodium_restricted")):
            if nutrition_facts.sodium_mg is not None:
                rule_def = self.rules.get("RULE_CONDITION_HYPERTENSION_SODIUM", {})
                ev = rule_def.get("evidence", {})
                condition_findings.append(
                    HealthImpactFinding(
                        rule_id="RULE_CONDITION_HYPERTENSION_SODIUM",
                        matched_item="Sodium",
                        condition_or_allergy="hypertension",
                        category="CARDIOVASCULAR_SODIUM",
                        declaration_type="NUTRITION",
                        severity="CAUTION",
                        title=rule_def.get("title", "Sodium Information for Blood Pressure Management"),
                        explanation=rule_def.get("plain_english", f"Detected sodium: {nutrition_facts.sodium_mg:.0f} mg. WHO advises <2,000 mg/day."),
                        explanation_hi=rule_def.get("hindi_explanation"),
                        evidence_title=ev.get("title", "WHO Guideline: Sodium intake"),
                        evidence_url=ev.get("url", "https://www.who.int"),
                        triggering_text=f"Sodium: {nutrition_facts.sodium_mg:.0f} mg ({nutrition_facts.measurement_basis or 'per 100g'})",
                        status="EVALUATED",
                        recommended_action="Track portion size against daily sodium budget.",
                    )
                )
            else:
                rule_def = self.rules.get("RULE_CONDITION_HYPERTENSION_DATA_INSUFFICIENT", {})
                ev = rule_def.get("evidence", {})
                insufficient_notices.append(
                    HealthImpactFinding(
                        rule_id="RULE_CONDITION_HYPERTENSION_DATA_INSUFFICIENT",
                        matched_item="Sodium",
                        condition_or_allergy="hypertension",
                        category="CARDIOVASCULAR_SODIUM",
                        declaration_type="NUTRITION",
                        severity="DATA_INSUFFICIENT",
                        title=rule_def.get("title", "Sodium Content Not Evaluated (Data Insufficient)"),
                        explanation=rule_def.get("plain_english", "Sodium value could not be reliably extracted from packaging."),
                        explanation_hi=rule_def.get("hindi_explanation"),
                        evidence_title=ev.get("title", "WHO Sodium Guidance"),
                        evidence_url=ev.get("url", "https://www.who.int"),
                        triggering_text="Sodium line unparsed or absent in image",
                        status="DATA_INSUFFICIENT",
                        recommended_action="Inspect physical package nutrition table.",
                    )
                )

        # CKD condition
        if any(c in profile_conditions for c in ("ckd", "kidney_disease", "renal")):
            if nutrition_facts.sodium_mg is not None:
                rule_def = self.rules.get("RULE_CONDITION_CKD_SODIUM", {})
                ev = rule_def.get("evidence", {})
                condition_findings.append(
                    HealthImpactFinding(
                        rule_id="RULE_CONDITION_CKD_SODIUM",
                        matched_item="Sodium",
                        condition_or_allergy="ckd",
                        category="RENAL_SODIUM",
                        declaration_type="NUTRITION",
                        severity="CAUTION",
                        title=rule_def.get("title", "Sodium & Renal Filtration Consideration"),
                        explanation=rule_def.get("plain_english", f"Detected sodium: {nutrition_facts.sodium_mg:.0f} mg. In CKD, kidneys have reduced excretion."),
                        explanation_hi=rule_def.get("hindi_explanation"),
                        evidence_title=ev.get("title", "Nutrition for Adults with Chronic Kidney Disease"),
                        evidence_url=ev.get("url", "https://www.niddk.nih.gov"),
                        triggering_text=f"Sodium: {nutrition_facts.sodium_mg:.0f} mg ({nutrition_facts.measurement_basis or 'per 100g'})",
                        status="EVALUATED",
                        recommended_action="Consult nephrologist or renal dietitian.",
                    )
                )
            else:
                rule_def = self.rules.get("RULE_CONDITION_CKD_DATA_INSUFFICIENT", {})
                ev = rule_def.get("evidence", {})
                insufficient_notices.append(
                    HealthImpactFinding(
                        rule_id="RULE_CONDITION_CKD_DATA_INSUFFICIENT",
                        matched_item="Sodium",
                        condition_or_allergy="ckd",
                        category="RENAL_SODIUM",
                        declaration_type="NUTRITION",
                        severity="DATA_INSUFFICIENT",
                        title=rule_def.get("title", "Renal Nutrition Data Insufficient (Sodium Unparsed)"),
                        explanation=rule_def.get("plain_english", "Sodium content could not be extracted for renal evaluation."),
                        explanation_hi=rule_def.get("hindi_explanation"),
                        evidence_title=ev.get("title", "NIDDK CKD Guidance"),
                        evidence_url=ev.get("url", "https://www.niddk.nih.gov"),
                        triggering_text="Sodium line unparsed or absent in image",
                        status="DATA_INSUFFICIENT",
                        recommended_action="Review physical packaging table before consuming.",
                    )
                )

        # -------------------------------------------------------------
        # SUMMARY COUNTS
        # -------------------------------------------------------------
        all_eval_items = allergy_findings + condition_findings + insufficient_notices
        summary_counts: Dict[str, int] = {
            "critical": sum(1 for f in all_eval_items if f.severity == "CRITICAL") + sum(1 for g in general_insights if g.severity == "CRITICAL"),
            "warning": sum(1 for f in all_eval_items if f.severity == "WARNING") + sum(1 for g in general_insights if g.severity == "WARNING"),
            "caution": sum(1 for f in all_eval_items if f.severity == "CAUTION") + sum(1 for g in general_insights if g.severity == "CAUTION"),
            "data_insufficient": sum(1 for f in all_eval_items if f.severity == "DATA_INSUFFICIENT"),
            "international_bans": len(international_bans),
            "total_findings": len(all_eval_items) + len(general_insights) + len(regulatory_findings),
        }

        return HealthImpactReport(
            profile_conditions_evaluated=evaluated_conditions_list,
            general_health_insights=general_insights,
            regulatory_additive_findings=regulatory_findings,
            international_bans_detected=international_bans,
            packaging_caution_detected=packaging_caution,
            allergy_findings=allergy_findings,
            condition_findings=condition_findings,
            data_insufficient_notices=insufficient_notices,
            nutrition_facts=nutrition_facts,
            summary_counts=summary_counts,
        )


health_impact_engine = HealthImpactEngine()
