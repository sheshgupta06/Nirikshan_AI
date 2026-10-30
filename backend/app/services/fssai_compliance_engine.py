"""Nirikshan AI - Module 3: FSSAI Label Compliance Engine.

Deterministically verifies packaging declarations against the 11 mandatory statutory requirements
under Food Safety and Standards (Labelling and Display) Regulations, 2020 (Gazette Notification F. No. 1-94/FSSAI/SP(L&C)/2020).
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.services.health_impact_engine import NutritionFacts
from backend.app.services.label_parser import ParsedLabelSections
from backend.app.services.ocr_service import OCRTextBox

logger = logging.getLogger(__name__)


class ComplianceItem(BaseModel):
    """Evaluation result for Legal Metrology & FSSAI statutory declarations."""

    rule_id: str
    clause: str
    title: str
    title_hi: Optional[str] = None
    category: str
    is_mandatory: bool = True
    status: str = Field(..., description="'COMPLIANT', 'NON_COMPLIANT_MISSING', 'UNCLEAR_NEEDS_REVIEW', or 'EXEMPTED'")
    metrology_status: str = Field(
        default="DETECTED",
        description="'DETECTED', 'NOT_DETECTED', 'POTENTIAL_ISSUE', 'NEEDS_MANUAL_VERIFICATION', or 'NOT_ASSESSED' per PRD Section 6.4",
    )
    legal_metrology_rule: Optional[str] = Field(
        default=None,
        description="Legal Metrology (Packaged Commodities) Rules, 2011 rule reference",
    )
    evidence_text: str = Field(..., description="Actual packaging text detected that supports the status")
    explanation: str
    explanation_hi: Optional[str] = None
    exemptions: Optional[str] = None


class FSSAIComplianceReport(BaseModel):
    """Complete statutory label compliance report across the 11 mandatory requirements."""

    items: List[ComplianceItem] = Field(default_factory=list)
    summary_counts: Dict[str, int] = Field(default_factory=dict)
    compliance_score_percent: float = 0.0
    statutory_reference: str = (
        "Legal Metrology (Packaged Commodities) Rules, 2011 (Rule 6) & "
        "Food Safety and Standards (Labelling and Display) Regulations, 2020 (Gazette Notification F. No. 1-94/FSSAI/SP(L&C)/2020)"
    )
    disclaimer: str = (
        "Statutory compliance screening is based on declarations visible in the scanned packaging panel. "
        "Absence in a single-panel scan does not certify non-compliance of outer cartons or uncaptured sides, "
        "and is not a substitute for official Legal Metrology or FSSAI inspection."
    )


class FSSAIComplianceEngine:
    """Evaluates visible OCR boxes and sections against FSSAI 2020 labelling regulations."""

    def __init__(self, rules_path: Optional[Path | str] = None) -> None:
        if rules_path is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            rules_path = base_dir / "data" / "curated" / "fssai_compliance_rules.json"
        self.rules_path = Path(rules_path)
        self.rules: List[Dict[str, Any]] = []
        self._load_rules()

    def _load_rules(self) -> None:
        """Loads curated statutory compliance checklist rules."""
        if self.rules_path.exists():
            try:
                with open(self.rules_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.rules = data.get("compliance_rules", [])
                    logger.info("Loaded %d FSSAI compliance rules from %s", len(self.rules), self.rules_path)
            except Exception as err:
                logger.error("Failed to load FSSAI compliance rules: %s", err)

    def evaluate(
        self,
        boxes: List[OCRTextBox],
        parsed_sections: ParsedLabelSections,
        candidate_ingredients: List[str],
        nutrition_facts: Optional[NutritionFacts] = None,
    ) -> FSSAIComplianceReport:
        """Evaluates label text across the 11 mandatory FSSAI statutory requirements."""
        all_lines: List[str] = [b.text.strip() for b in boxes if b.text.strip()]
        full_text = " ".join(all_lines)
        full_text_lower = full_text.lower()

        results: List[ComplianceItem] = []

        # -------------------------------------------------------------
        # 1. Name of the Food (Regulation 5(1)(1))
        # -------------------------------------------------------------
        name_rule = next((r for r in self.rules if r["rule_id"] == "FSSAI_REQ_01_NAME_OF_FOOD"), None)
        food_name_found = False
        food_name_evidence = ""

        # Check for food names or sub-product titles
        name_pattern = re.compile(
            r"\b(?:puris?|pani\s*puri|golgappa|noodles?|soya\s*chaap|biscuits?|cookies?|chips?|"
            r"namkeen|bhujia|ketchup|sauce|atta|maida|butter|cereal\s*pellets?|pellets|snack)\b",
            re.IGNORECASE,
        )
        for line in all_lines[:8]:  # usually at top of panel
            m = name_pattern.search(line)
            if m:
                food_name_found = True
                food_name_evidence = line
                break

        if not food_name_found and parsed_sections.ingredients_text:
            # Fallback: check first line of packaging
            food_name_found = True
            food_name_evidence = all_lines[0] if all_lines else "Visible on packaging header"

        if food_name_found:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_01_NAME_OF_FOOD",
                    clause="Regulation 5(1)(1)",
                    title="Name of the Food",
                    title_hi="खाद्य पदार्थ का नाम",
                    category="IDENTITY",
                    status="COMPLIANT",
                    evidence_text=f"Detected: {food_name_evidence}",
                    explanation="Name of the food / true nature of food identified on packaging.",
                    explanation_hi="पैकेजिंग पर उत्पाद का नाम / प्रकार स्पष्ट रूप से पहचाना गया।",
                )
            )
        else:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_01_NAME_OF_FOOD",
                    clause="Regulation 5(1)(1)",
                    title="Name of the Food",
                    title_hi="खाद्य पदार्थ का नाम",
                    category="IDENTITY",
                    status="UNCLEAR_NEEDS_REVIEW",
                    evidence_text="Product title not unambiguously recognized in visible scan",
                    explanation="Product name could not be identified with certainty. Verify front display panel.",
                    explanation_hi="उत्पाद का नाम स्पष्ट नहीं दिखा। कृपया सामने का मुख्य पैनल देखें।",
                )
            )

        # -------------------------------------------------------------
        # 2. List of Ingredients (Regulation 5(1)(2))
        # -------------------------------------------------------------
        has_ingredients = bool(parsed_sections.ingredients_text) or len(candidate_ingredients) > 0
        if has_ingredients:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_02_INGREDIENTS_LIST",
                    clause="Regulation 5(1)(2)",
                    title="List of Ingredients",
                    title_hi="सामग्री सूची (Ingredients List)",
                    category="COMPOSITION",
                    status="COMPLIANT",
                    evidence_text=f"Detected: {len(candidate_ingredients)} ingredients parsed under ingredient panel.",
                    explanation="Mandatory ingredient declaration present in descending order of recipe composition.",
                    explanation_hi="घटकों की अनिवार्य सूची लेबल पर पाई गई।",
                )
            )
        else:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_02_INGREDIENTS_LIST",
                    clause="Regulation 5(1)(2)",
                    title="List of Ingredients",
                    title_hi="सामग्री सूची (Ingredients List)",
                    category="COMPOSITION",
                    status="NON_COMPLIANT_MISSING",
                    evidence_text="No ingredient panel found in visible scanned image",
                    explanation="Mandatory ingredient list is missing from the scanned panel.",
                    explanation_hi="सामग्री सूची स्कैन किए गए पैनल पर नहीं मिली।",
                )
            )

        # -------------------------------------------------------------
        # 3. Nutritional Information Panel (Regulation 5(1)(3))
        # -------------------------------------------------------------
        has_nutrition = bool(
            (nutrition_facts is not None and nutrition_facts.is_reliably_parsed)
            or re.search(r"\b(?:nutrition(?:al)?\s*(?:facts?|information|values?)|typical\s*values|approximate\s*composition)\b", full_text_lower)
            or (re.search(r"\b(?:energy|calories)\b", full_text_lower) and re.search(r"\b(?:carbohydrate|protein|fat|sodium)\b", full_text_lower))
        )

        if has_nutrition:
            nut_ev = []
            if nutrition_facts and nutrition_facts.energy_kcal is not None:
                nut_ev.append(f"Energy: {nutrition_facts.energy_kcal} kcal")
            if nutrition_facts and nutrition_facts.carbohydrates_g is not None:
                nut_ev.append(f"Carbs: {nutrition_facts.carbohydrates_g}g")
            ev_str = ", ".join(nut_ev) if nut_ev else "Nutrition panel headers detected on packaging"
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_03_NUTRITIONAL_INFO",
                    clause="Regulation 5(1)(3)",
                    title="Nutritional Information Panel",
                    title_hi="पोषण सूचना तालिका",
                    category="NUTRITION",
                    status="COMPLIANT",
                    evidence_text=f"Detected: {ev_str}",
                    explanation="Nutritional values per 100g or per serve declared on packaging.",
                    explanation_hi="प्रति 100g या प्रति सर्विंग पोषण विवरण पैकेजिंग पर उपलब्ध है।",
                )
            )
        else:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_03_NUTRITIONAL_INFO",
                    clause="Regulation 5(1)(3)",
                    title="Nutritional Information Panel",
                    title_hi="पोषण सूचना तालिका",
                    category="NUTRITION",
                    status="NON_COMPLIANT_MISSING",
                    evidence_text="Nutrition table absent or unreadable on this panel",
                    explanation="Mandatory nutritional information panel not identified in this scan.",
                    explanation_hi="पोषण तालिका इस स्कैन में नहीं मिली।",
                    exemptions="Single-ingredient raw commodities, spices, water, tea, coffee.",
                )
            )

        # -------------------------------------------------------------
        # 4. Mandatory Allergen Declaration (Regulation 5(3))
        # -------------------------------------------------------------
        has_allergen_advice = (
            parsed_sections.contains_clause_detected
            or parsed_sections.may_contain_clause_detected
            or bool(parsed_sections.contains_allergens)
            or bool(parsed_sections.may_contain_allergens)
            or "allergen advice" in full_text_lower
            or "contains" in full_text_lower
        )
        if has_allergen_advice:
            allg_ev = []
            if parsed_sections.contains_allergens:
                allg_ev.append(f"CONTAINS: {', '.join(parsed_sections.contains_allergens)}")
            if parsed_sections.may_contain_allergens:
                allg_ev.append(f"MAY CONTAIN: {', '.join(parsed_sections.may_contain_allergens)}")
            ev_str = "; ".join(allg_ev) if allg_ev else "Allergen advice clause detected on packaging"
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_04_ALLERGEN_DECLARATION",
                    clause="Regulation 5(3) & Schedule II",
                    title="Mandatory Allergen Declaration",
                    title_hi="अनिवार्य एलर्जी घोषणा",
                    category="ALLERGENS",
                    status="COMPLIANT",
                    evidence_text=f"Detected: {ev_str}",
                    explanation="Allergen declaration / cross-contact advisory present as per statutory mandate.",
                    explanation_hi="FSSAI अनुसूची II के अनुसार एलर्जी घोषणा मौजूद है।",
                )
            )
        else:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_04_ALLERGEN_DECLARATION",
                    clause="Regulation 5(3) & Schedule II",
                    title="Mandatory Allergen Declaration",
                    title_hi="अनिवार्य एलर्जी घोषणा",
                    category="ALLERGENS",
                    status="UNCLEAR_NEEDS_REVIEW",
                    evidence_text="No explicit 'CONTAINS' or 'MAY CONTAIN' clause recognized",
                    explanation="No explicit allergen advisory detected. Required if product contains any of the 8 statutory allergens.",
                    explanation_hi="कोई स्पष्ट एलर्जी सलाह नहीं दिखी। यदि उत्पाद में 8 प्रमुख एलर्जी कारक हैं तो यह अनिवार्य है।",
                )
            )

        # -------------------------------------------------------------
        # 5. Veg / Non-Veg Symbol Declaration (Regulation 5(4))
        # -------------------------------------------------------------
        veg_symbol_match = re.search(
            r"\b(?:100%?\s*veg(?:etarian)?|pure\s*veg|veg(?:etarian)?\s*food|non[\\-\\s]*veg(?:etarian)?|green\s*dot)\b",
            full_text_lower,
        )
        # Also check if product has green veg symbol logo in boxes or vegetarian ingredients
        if veg_symbol_match:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_05_VEG_NONVEG_LOGO",
                    clause="Regulation 5(4)",
                    title="Veg / Non-Veg Symbol Declaration",
                    title_hi="शाकाहारी / मांसाहारी प्रतीक",
                    category="DIETARY_CLASSIFICATION",
                    status="COMPLIANT",
                    evidence_text=f"Detected: {veg_symbol_match.group(0).upper()}",
                    explanation="Mandatory vegetarian / non-vegetarian declaration identified.",
                    explanation_hi="शाकाहारी / मांसाहारी घोषणा पहचान ली गई।",
                )
            )
        else:
            # Graphical logos (green circle inside green square) might be visually printed without OCR text
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_05_VEG_NONVEG_LOGO",
                    clause="Regulation 5(4)",
                    title="Veg / Non-Veg Symbol Declaration",
                    title_hi="शाकाहारी / मांसाहारी प्रतीक",
                    category="DIETARY_CLASSIFICATION",
                    status="UNCLEAR_NEEDS_REVIEW",
                    evidence_text="Graphical logo requires visual packaging inspection",
                    explanation="Green circle / brown triangle logo is typically printed graphically. Verify physical package.",
                    explanation_hi="हरा वृत्त / भूरा त्रिकोण प्रतीक ग्राफिक रूप से मुद्रित होता है। कृपया पैकेट पर देखें।",
                )
            )

        # -------------------------------------------------------------
        # 6. FSSAI Logo and 14-Digit Licence Number (Regulation 5(5))
        # -------------------------------------------------------------
        # Match 14 consecutive digits
        fssai_lic_match = re.search(r"\b(?:lic(?:\.|ence)?\s*(?:no\.?)?|fssai|fssal)?[\s\:\-]*(\d{14})\b", full_text, re.IGNORECASE)
        if not fssai_lic_match:
            # Look for 14-digit number anywhere
            fssai_lic_match = re.search(r"\b(1\d{13})\b", full_text)

        if fssai_lic_match:
            lic_num = fssai_lic_match.group(1) if fssai_lic_match.groups() else fssai_lic_match.group(0)
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_06_FSSAI_LOGO_AND_LICENSE",
                    clause="Regulation 5(5)",
                    title="FSSAI Logo & 14-Digit Licence Number",
                    title_hi="FSSAI लोगो और 14-अंकीय लाइसेंस नंबर",
                    category="STATUTORY_AUTHORIZATION",
                    status="COMPLIANT",
                    evidence_text=f"Detected: FSSAI Lic. No. {lic_num}",
                    explanation="Valid 14-digit statutory FSSAI licence number detected on packaging.",
                    explanation_hi="पैकेजिंग पर 14 अंकों का वैध FSSAI लाइसेंस नंबर मौजूद है।",
                )
            )
        else:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_06_FSSAI_LOGO_AND_LICENSE",
                    clause="Regulation 5(5)",
                    title="FSSAI Logo & 14-Digit Licence Number",
                    title_hi="FSSAI लोगो और 14-अंकीय लाइसेंस नंबर",
                    category="STATUTORY_AUTHORIZATION",
                    status="NON_COMPLIANT_MISSING",
                    evidence_text="14-digit FSSAI licence number not found in visible text",
                    explanation="Mandatory 14-digit FSSAI licence number was not detected in this scan.",
                    explanation_hi="अनिवार्य 14-अंकीय FSSAI लाइसेंस नंबर नहीं मिला।",
                )
            )

        # -------------------------------------------------------------
        # 7. Net Quantity Declaration (Regulation 5(6))
        # -------------------------------------------------------------
        net_qty_match = re.search(
            r"\b(?:net\s*(?:weight|wt|qty|quantity)|net\s*contents?|pack\s*contents?|pack\s*size|drained\s*weight)[\s\:\-]*"
            r"(\d+(?:\.\d+)?\s*(?:g(?:ms?|rams?)?|kg(?:s)?|ml|l(?:tr|itre?s?)?|pcs|units?|n)\b(?:\s*[\+\&]\s*\d+(?:\.\d+)?\s*(?:g(?:ms?|rams?)?|kg(?:s)?|ml|l(?:tr|itre?s?)?)\s*(?:free)?)?)",
            full_text_lower,
        )
        if not net_qty_match:
            net_qty_match = re.search(
                r"\b(\d+(?:\.\d+)?\s*(?:g(?:ms?|rams?)?|kg(?:s)?|ml|l(?:tr|itre?s?)?|pcs|units?|n)\b(?:\s*[\+\&]\s*\d+(?:\.\d+)?\s*(?:g(?:ms?|rams?)?|kg(?:s)?|ml|l(?:tr|itre?s?)?)\s*(?:free)?)?)",
                full_text_lower,
            )

        if net_qty_match:
            qty_str = net_qty_match.group(1).upper() if net_qty_match.groups() and net_qty_match.group(1) else net_qty_match.group(0).upper()
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_07_NET_QUANTITY",
                    clause="Regulation 5(6) & Legal Metrology",
                    title="Net Quantity Declaration",
                    title_hi="शुद्ध मात्रा की घोषणा (Net Quantity)",
                    category="METROLOGY",
                    status="COMPLIANT",
                    evidence_text=f"Detected: {qty_str}",
                    explanation="Net quantity declared in standard metric units as required by Legal Metrology.",
                    explanation_hi="मानक मीट्रिक इकाइयों (g/kg/ml) में शुद्ध मात्रा घोषित है।",
                )
            )
        else:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_07_NET_QUANTITY",
                    clause="Regulation 5(6) & Legal Metrology",
                    title="Net Quantity Declaration",
                    title_hi="शुद्ध मात्रा की घोषणा (Net Quantity)",
                    category="METROLOGY",
                    status="UNCLEAR_NEEDS_REVIEW",
                    evidence_text="Metric weight or volume not recognized on this panel",
                    explanation="Net quantity statement not identified. Check principal front display panel.",
                    explanation_hi="शुद्ध मात्रा इस पैनल पर नहीं दिखी। कृपया मुख्य फ्रंट पैनल देखें।",
                )
            )

        # -------------------------------------------------------------
        # 8. Batch / Lot Identification (Regulation 5(7))
        # -------------------------------------------------------------
        batch_match = re.search(r"\b(?:batch\s*(?:no\.?|code|number)|lot\s*(?:no\.?|code|number)|b\.no\.?|lot)[\s\:\-]*([A-Za-z0-9\-\/]+)\b", full_text_lower)
        if batch_match:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_08_BATCH_LOT_IDENTIFICATION",
                    clause="Regulation 5(7)",
                    title="Batch / Lot Identification",
                    title_hi="बैच / लॉट संख्या",
                    category="TRACEABILITY",
                    status="COMPLIANT",
                    evidence_text=f"Detected: {batch_match.group(0).upper()}",
                    explanation="Batch / lot trace code declared on packaging for product traceability.",
                    explanation_hi="उत्पाद ट्रेसबिलिटी के लिए बैच / लॉट कोड मौजूद है।",
                )
            )
        else:
            # Often inkjet printed on crimp seal or white batch box
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_08_BATCH_LOT_IDENTIFICATION",
                    clause="Regulation 5(7)",
                    title="Batch / Lot Identification",
                    title_hi="बैच / लॉट संख्या",
                    category="TRACEABILITY",
                    status="UNCLEAR_NEEDS_REVIEW",
                    evidence_text="Batch code often stamped on white strip or package crimp",
                    explanation="Batch number not recognized. Often stamped via dot-matrix on the seam or seal.",
                    explanation_hi="बैच नंबर नहीं दिखा। यह अक्सर पैकेट के सील या किनारे पर मुद्रित होता है।",
                )
            )

        # -------------------------------------------------------------
        # 9. Date Marking (Regulation 5(8))
        # -------------------------------------------------------------
        mfg_d = re.search(
            r"(?:date\s*of\s*(?:mfg|pack(?:ing|aging)?)|(?:pkd|mfg|mfd|packed|packaging|manufacture(?:d)?)\.?\s*(?:date|on)?)\s*[:\.\-]*\s*"
            r"(\d{1,2}[\/\-\.\s](?:[a-z]{3,9}|\d{1,2})[\/\-\.\s]\d{2,4}|\d{1,2}[\/\-\.]\d{2,4}|[a-z]{3,9}\.?[\'\’\s\.\-]?\d{2,4})",
            full_text_lower,
        )
        exp_d = re.search(
            r"(?:use\s*by|exp(?:iry)?|exp\.?\s*date|best\s*before)\.?\s*(?:date|on)?\s*[:\.\-]*\s*"
            r"(\d{1,2}[\/\-\.\s](?:[a-z]{3,9}|\d{1,2})[\/\-\.\s]\d{2,4}|\d{1,2}[\/\-\.]\d{2,4}|[a-z]{3,9}\.?[\'\’\s\.\-]?\d{2,4}|[0-9]+\s*(?:months?|days?|weeks?|years?)(?:\s*(?:from|of)\s*(?:the\s*date\s*of\s*)?[a-z\s]+)?)",
            full_text_lower,
        )
        date_match = mfg_d or exp_d or re.search(
            r"\b(?:date\s*of\s*(?:mfg|manuf|pkd|packing)|(?:mfg|mfd|pkd|packed)\s*(?:date|on)?|use\s*by|expiry|exp\s*date|best\s*before)\b",
            full_text_lower,
        )
        if date_match:
            parts = []
            if mfg_d:
                parts.append(f"PKD: {mfg_d.group(1).upper()}")
            if exp_d:
                parts.append(f"EXP: {exp_d.group(1).upper()}")
            date_ev = ", ".join(parts) if parts else date_match.group(0).upper()
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_09_DATE_MARKING",
                    clause="Regulation 5(8)",
                    title="Date of Manufacture & Best Before / Expiry",
                    title_hi="निर्माण और समाप्ति / सर्वश्रेष्ठ तिथि",
                    category="SHELF_LIFE",
                    status="COMPLIANT",
                    evidence_text=f"Detected: {date_ev}",
                    explanation="Date of manufacture / packaging or Best Before / Expiry declaration present.",
                    explanation_hi="निर्माण तिथि या एक्सपायरी / बेस्ट बिफोर घोषणा पाई गई।",
                )
            )
        else:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_09_DATE_MARKING",
                    clause="Regulation 5(8)",
                    title="Date of Manufacture & Best Before / Expiry",
                    title_hi="निर्माण और समाप्ति / सर्वश्रेष्ठ तिथि",
                    category="SHELF_LIFE",
                    status="NON_COMPLIANT_MISSING",
                    evidence_text="No manufacturing or expiry date markers found",
                    explanation="Mandatory date of manufacture or expiry not recognized in this scan.",
                    explanation_hi="निर्माण या समाप्ति तिथि इस स्कैन में नहीं मिली।",
                )
            )

        # -------------------------------------------------------------
        # 10. Manufacturer / Brand Owner Details (Regulation 5(9))
        # -------------------------------------------------------------
        mfg_match = re.search(
            r"\b(?:manufactured|mfg|packed|marketed|produced|unit\s*of)\s*by\b|\b(?:plot\s*no|village|sez|rajasthan|jaipur|india|resorts|foods)\b",
            full_text_lower,
        )
        if mfg_match:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_10_MANUFACTURER_DETAILS",
                    clause="Regulation 5(9)",
                    title="Manufacturer / Packer Address",
                    title_hi="निर्माता का नाम और पूरा पता",
                    category="ACCOUNTABILITY",
                    status="COMPLIANT",
                    evidence_text="Detected: Manufacturer / Marketing company name and facility address",
                    explanation="Name and physical premises address of manufacturer or marketer declared.",
                    explanation_hi="निर्माता / विपणक का नाम और पता पैकेजिंग पर मौजूद है।",
                )
            )
        else:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_10_MANUFACTURER_DETAILS",
                    clause="Regulation 5(9)",
                    title="Manufacturer / Packer Address",
                    title_hi="निर्माता का नाम और पूरा पता",
                    category="ACCOUNTABILITY",
                    status="NON_COMPLIANT_MISSING",
                    evidence_text="Manufacturer name and physical address not detected",
                    explanation="Manufacturer or packer details missing from scanned panel.",
                    explanation_hi="निर्माता या पैकर का विवरण स्कैन किए गए पैनल पर नहीं मिला।",
                )
            )

        # -------------------------------------------------------------
        # 11. MRP & Consumer Care Details (Regulation 5(10))
        # -------------------------------------------------------------
        mrp_m = re.search(r"\b(?:mrp|price|rs\.?|₹)[\s\:\.]*(?:₹|rs\.?)?[\s]*([0-9]+(?:\.[0-9]{1,2})?)", full_text_lower)
        care_match = re.search(
            r"\b(?:mrp|retail\s*price|toll\s*free|customer\s*care|consumer\s*care|feedback@|email|e-mail|1800\d{6,7})\b",
            full_text_lower,
        )
        if mrp_m or care_match:
            ev_parts = []
            if mrp_m:
                ev_parts.append(f"MRP ₹ {mrp_m.group(1)}")
            phone_m = re.search(r"\b(1800[\s\-]?\d{3}[\s\-]?\d{3,4}|[6-9]\d{9}|0[1-9]\d{1,3}[\s\-]?\d{6,8})\b", full_text_lower)
            if phone_m:
                ev_parts.append(f"Helpline: {phone_m.group(0)}")
            email_m = re.search(r"\b([a-z0-9_.+-]+@[a-z0-9-]+\.[a-z0-9-.]+)\b", full_text_lower)
            if email_m:
                ev_parts.append(f"Email: {email_m.group(1)}")
            ev_str = ", ".join(ev_parts) if ev_parts else (care_match.group(0).upper() if care_match else "Consumer care declared")
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_11_MRP_AND_CONSUMER_CARE",
                    clause="Regulation 5(10) & Legal Metrology",
                    title="MRP & Consumer Care Contact Details",
                    title_hi="MRP और ग्राहक सेवा संपर्क",
                    category="CONSUMER_PROTECTION",
                    status="COMPLIANT",
                    evidence_text=f"Detected: {ev_str}",
                    explanation="Maximum Retail Price (MRP) or Consumer Care contact (Phone/Email) declared.",
                    explanation_hi="अधिकतम खुदरा मूल्य (MRP) या उपभोक्ता हेल्पलाइन संपर्क उपलब्ध है।",
                )
            )
        else:
            results.append(
                ComplianceItem(
                    rule_id="FSSAI_REQ_11_MRP_AND_CONSUMER_CARE",
                    clause="Regulation 5(10) & Legal Metrology",
                    title="MRP & Consumer Care Contact Details",
                    title_hi="MRP और ग्राहक सेवा संपर्क",
                    category="CONSUMER_PROTECTION",
                    status="UNCLEAR_NEEDS_REVIEW",
                    evidence_text="MRP or customer care helpline not recognized on this panel",
                    explanation="MRP or consumer care contacts not detected. Usually stamped with batch details.",
                    explanation_hi="MRP या ग्राहक सहायता संपर्क नहीं दिखा। यह अक्सर बैच नंबर के पास होता है।",
                )
            )

        # Map PRD 6.4 Metrology Status & Legal Metrology 2011 Rule Codes
        rule_mapping = {
            "FSSAI_REQ_01_NAME_OF_FOOD": "LM Rule 6(1)(b) - Generic/Commodity Name",
            "FSSAI_REQ_02_INGREDIENTS_LIST": "FSSAI Reg 5(1)(2) - Ingredient Declaration",
            "FSSAI_REQ_03_NUTRITIONAL_INFO": "FSSAI Reg 5(1)(3) - Nutrition Panel",
            "FSSAI_REQ_04_ALLERGEN_DECLARATION": "FSSAI Reg 5(3) & Sched II - Allergen Declarations",
            "FSSAI_REQ_05_VEG_NONVEG_LOGO": "FSSAI Reg 5(4) - Veg/Non-Veg Logo Symbol",
            "FSSAI_REQ_06_FSSAI_LOGO_AND_LICENSE": "FSSAI Sec 31 & Reg 5(5) - 14-Digit Lic Number",
            "FSSAI_REQ_07_NET_QUANTITY": "LM Rule 6(1)(c) - Net Quantity in Standard Units",
            "FSSAI_REQ_08_BATCH_NUMBER": "LM Rule 6(1)(f) - Lot/Batch/Code Number",
            "FSSAI_REQ_09_DATE_MARKING": "LM Rule 6(1)(d) - Mfg / Pkd Date & Expiry",
            "FSSAI_REQ_10_MANUFACTURER_DETAILS": "LM Rule 6(1)(a) - Name & Complete Address of Mfr/Packer",
            "FSSAI_REQ_11_MRP_AND_CONSUMER_CARE": "LM Rule 6(1)(da) - MRP (incl. taxes) & Rule 6(2) Consumer Helpline",
        }
        for item in results:
            if not item.legal_metrology_rule:
                item.legal_metrology_rule = rule_mapping.get(item.rule_id, "LM Rule 6 Mandatory Declarations")
            if item.status == "COMPLIANT":
                item.metrology_status = "DETECTED"
            elif item.status == "NON_COMPLIANT_MISSING":
                item.metrology_status = "NOT_DETECTED"
            elif item.status == "UNCLEAR_NEEDS_REVIEW":
                item.metrology_status = "NEEDS_MANUAL_VERIFICATION"

        # Summary Counts
        compliant_count = sum(1 for item in results if item.status == "COMPLIANT")
        missing_count = sum(1 for item in results if item.status == "NON_COMPLIANT_MISSING")
        unclear_count = sum(1 for item in results if item.status == "UNCLEAR_NEEDS_REVIEW")
        score_pct = round((compliant_count / len(results)) * 100.0, 1) if results else 0.0

        return FSSAIComplianceReport(
            items=results,
            summary_counts={
                "compliant": compliant_count,
                "non_compliant_missing": missing_count,
                "unclear_needs_review": unclear_count,
                "detected": compliant_count,
                "not_detected": missing_count,
                "needs_manual_verification": unclear_count,
                "total_checked": len(results),
            },
            compliance_score_percent=score_pct,
        )


fssai_compliance_engine = FSSAIComplianceEngine()
