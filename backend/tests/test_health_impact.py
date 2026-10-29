"""Nirikshan AI - Phase 3 Health Impact Analysis Engine Test Suite.

Verifies deterministic, evidence-based health evaluations:
1. Soy allergy matching a Soy CONTAINS declaration
2. Milk allergy matching a Milk MAY CONTAIN advisory
3. Correct separation of declared and precautionary allergens
4. Wheat detection for a coeliac profile (autoimmune distinction from allergy)
5. Diabetes caution only when reliable nutrition data is available (never purely from ingredient 'Sugar')
6. Sodium caution with correct per-100-g versus per-serving units and normalization
7. Missing nutrition data produces DATA_INSUFFICIENT / NOT_EVALUATED, not an invented warning
8. Unknown ingredients do not generate unsupported disease claims
9. Empty profiles do not produce a "safe product" conclusion
10. Existing scan endpoint fields remain backward-compatible
11. Chronic Kidney Disease (CKD) sodium guidance with NIDDK citations
"""

import io
import json
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app
from backend.app.services.health_impact_engine import (
    HealthImpactEngine,
    HealthImpactFinding,
    NutritionFacts,
    health_impact_engine,
)
from backend.app.services.label_parser import ParsedLabelSections
from backend.app.services.ocr_service import OCRTextBox, OCRService
from backend.app.api.v1.scan import get_ocr_service


class DummyMockOCRService(OCRService):
    """Deterministic mock OCR service for testing API scan endpoint."""

    def __init__(self, boxes=None, is_blurry=False):
        self._boxes = boxes or []
        self._is_blurry = is_blurry

    def extract_text_from_bytes(self, image_bytes: bytes, content_type: str = "image/jpeg"):
        metadata = {
            "width": 800,
            "height": 600,
            "channels": 3,
            "file_size_bytes": len(image_bytes),
            "is_blurry": self._is_blurry,
            "blur_score": 50.0 if self._is_blurry else 250.0,
        }
        return self._boxes, metadata


def create_dummy_png_bytes(width=200, height=150) -> bytes:
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestAllergenMatching:
    """Verifies deterministic matching of declared vs precautionary allergens."""

    def test_soy_allergy_matching_contains_declaration(self):
        """Soy allergy matches a Soy CONTAINS declaration with CRITICAL severity."""
        parsed_sections = ParsedLabelSections(
            contains_allergens=["Wheat", "Soy"],
            may_contain_allergens=["Nuts"],
        )
        boxes = []
        report = health_impact_engine.evaluate(
            candidate_ingredients=["Soy Flour", "Wheat Flour", "Water"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            allergies=["soy"],
        )

        assert "soy" in report.profile_conditions_evaluated
        soy_findings = [f for f in report.allergy_findings if f.condition_or_allergy == "soy"]
        assert len(soy_findings) == 1
        f = soy_findings[0]
        assert f.rule_id == "RULE_ALLERGY_SOY_CONTAINS"
        assert f.declaration_type == "CONTAINS"
        assert f.severity == "CRITICAL"
        assert f.matched_item == "Soy"
        assert "FSSAI" in f.evidence_title
        assert "fssai.gov.in" in f.evidence_url

    def test_milk_allergy_matching_may_contain_advisory(self):
        """Milk allergy matches a Milk MAY CONTAIN advisory with WARNING severity."""
        parsed_sections = ParsedLabelSections(
            contains_allergens=["Wheat"],
            may_contain_allergens=["Milk", "Mustard"],
        )
        boxes = []
        report = health_impact_engine.evaluate(
            candidate_ingredients=["Wheat Flour", "Water", "Salt"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            allergies=["milk"],
        )

        assert "milk" in report.profile_conditions_evaluated
        milk_findings = [f for f in report.allergy_findings if f.condition_or_allergy == "milk"]
        assert len(milk_findings) == 1
        f = milk_findings[0]
        assert f.rule_id == "RULE_ALLERGY_MILK_MAY_CONTAIN"
        assert f.declaration_type == "MAY_CONTAIN"
        assert f.severity == "WARNING"
        assert f.matched_item == "Milk"
        assert "FSSAI" in f.evidence_title

    def test_correct_separation_of_declared_and_precautionary_allergens(self):
        """Declared recipe allergens and precautionary facility warnings remain strictly separated."""
        parsed_sections = ParsedLabelSections(
            contains_allergens=["Wheat", "Soy"],
            may_contain_allergens=["Nuts", "Mustard", "Milk"],
        )
        boxes = []
        report = health_impact_engine.evaluate(
            candidate_ingredients=["Wheat Flour", "Soy Flour", "Water"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            allergies=["wheat", "milk"],
        )

        assert report.summary_counts["critical"] >= 1
        assert report.summary_counts["warning"] >= 1

        wheat_finding = next(f for f in report.allergy_findings if f.matched_item == "Wheat")
        milk_finding = next(f for f in report.allergy_findings if f.matched_item == "Milk")

        assert wheat_finding.declaration_type == "CONTAINS"
        assert wheat_finding.severity == "CRITICAL"

        assert milk_finding.declaration_type == "MAY_CONTAIN"
        assert milk_finding.severity == "WARNING"


class TestCoeliacDiseaseEvaluation:
    """Verifies coeliac disease evaluation and distinction from IgE wheat allergy."""

    def test_wheat_detection_for_coeliac_profile_in_ingredients(self):
        """Gluten source in ingredients triggers coeliac mucosal damage caution."""
        parsed_sections = ParsedLabelSections(
            ingredients_text="Whole Wheat Flour (60%), Water, Salt",
            contains_allergens=[],
            may_contain_allergens=[],
        )
        boxes = []
        report = health_impact_engine.evaluate(
            candidate_ingredients=["Whole Wheat Flour (60%)", "Water", "Salt"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            health_conditions=["celiac"],
        )

        celiac_findings = [f for f in report.condition_findings if f.condition_or_allergy == "celiac"]
        assert len(celiac_findings) == 1
        f = celiac_findings[0]
        assert f.rule_id == "RULE_CONDITION_CELIAC_GLUTEN_CONTAINS"
        assert f.severity == "CRITICAL"
        assert "autoimmune" in f.explanation.lower()
        assert "niddk.nih.gov" in f.evidence_url

    def test_precautionary_wheat_for_coeliac_profile(self):
        """MAY CONTAIN Wheat triggers precautionary gluten cross-contact caution."""
        parsed_sections = ParsedLabelSections(
            ingredients_text="Rice Flour, Water, Salt",
            contains_allergens=[],
            may_contain_allergens=["Wheat"],
        )
        boxes = []
        report = health_impact_engine.evaluate(
            candidate_ingredients=["Rice Flour", "Water", "Salt"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            health_conditions=["celiac"],
        )

        celiac_findings = [f for f in report.condition_findings if f.condition_or_allergy == "celiac"]
        assert len(celiac_findings) == 1
        f = celiac_findings[0]
        assert f.rule_id == "RULE_CONDITION_CELIAC_GLUTEN_MAY_CONTAIN"
        assert f.severity == "WARNING"
        assert f.declaration_type == "MAY_CONTAIN"


class TestDiabetesEvaluation:
    """Verifies diabetes evaluation requires portion & carbohydrate context, not just checking 'Sugar'."""

    def test_diabetes_caution_only_when_reliable_nutrition_data_available(self):
        """When carbohydrate/sugar facts are present, reports blood-glucose portion context."""
        parsed_sections = ParsedLabelSections(
            ingredients_text="Soy Flour, Wheat Flour, Sugar, Salt",
            filtered_sections=[
                {"type": "NUTRITION", "text": "Nutrition Information Per 100g"},
                {"type": "NUTRITION", "text": "Energy: 345 kcal"},
                {"type": "NUTRITION", "text": "Total Carbohydrate: 55.4 g"},
                {"type": "NUTRITION", "text": "Total Sugars: 6.2 g"},
            ],
        )
        boxes = [
            OCRTextBox(text="Total Carbohydrate: 55.4 g", confidence=0.95, bounding_box=[[0, 0], [10, 0], [10, 10], [0, 10]]),
            OCRTextBox(text="Total Sugars: 6.2 g", confidence=0.95, bounding_box=[[0, 15], [10, 15], [10, 25], [0, 25]]),
        ]

        report = health_impact_engine.evaluate(
            candidate_ingredients=["Soy Flour", "Wheat Flour", "Sugar", "Salt"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            health_conditions=["diabetes"],
        )

        assert report.nutrition_facts is not None
        assert report.nutrition_facts.carbohydrates_g == 55.4
        assert report.nutrition_facts.sugars_g == 6.2

        diabetes_findings = [f for f in report.condition_findings if f.condition_or_allergy == "diabetes"]
        assert len(diabetes_findings) == 1
        f = diabetes_findings[0]
        assert f.rule_id == "RULE_CONDITION_DIABETES_NUTRITION"
        assert f.severity == "CAUTION"
        assert "cdc.gov" in f.evidence_url

    def test_diabetes_data_insufficient_when_nutrition_missing_even_with_sugar_ingredient(self):
        """When ingredient list contains 'Sugar' but nutrition facts are unparsed, returns DATA_INSUFFICIENT."""
        parsed_sections = ParsedLabelSections(
            ingredients_text="Soy Flour, Wheat Flour, Sugar, Salt",
            filtered_sections=[],
        )
        boxes = []

        report = health_impact_engine.evaluate(
            candidate_ingredients=["Soy Flour", "Wheat Flour", "Sugar", "Salt"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            health_conditions=["diabetes"],
        )

        # Must NOT invent an unsafe warning
        assert len(report.condition_findings) == 0

        # Must report DATA_INSUFFICIENT
        insufficient = [f for f in report.data_insufficient_notices if f.condition_or_allergy == "diabetes"]
        assert len(insufficient) == 1
        notice = insufficient[0]
        assert notice.rule_id == "RULE_CONDITION_DIABETES_DATA_INSUFFICIENT"
        assert notice.severity == "DATA_INSUFFICIENT"
        assert "cdc.gov" in notice.evidence_url


class TestSodiumEvaluation:
    """Verifies sodium evaluation for hypertension and CKD with units and basis."""

    def test_sodium_caution_with_per_100g_units(self):
        """Evaluates sodium with per 100g basis and references WHO 2000 mg/day limit."""
        parsed_sections = ParsedLabelSections(
            filtered_sections=[
                {"type": "NUTRITION", "text": "Per 100 g"},
                {"type": "NUTRITION", "text": "Sodium 480 mg"},
            ],
        )
        boxes = [
            OCRTextBox(text="Per 100 g", confidence=0.95, bounding_box=[[0, 0], [10, 0], [10, 10], [0, 10]]),
            OCRTextBox(text="Sodium 480 mg", confidence=0.95, bounding_box=[[0, 15], [10, 15], [10, 25], [0, 25]]),
        ]

        report = health_impact_engine.evaluate(
            candidate_ingredients=["Soy Flour", "Salt"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            health_conditions=["hypertension"],
        )

        assert report.nutrition_facts is not None
        assert report.nutrition_facts.sodium_mg == 480.0
        assert report.nutrition_facts.measurement_basis == "per_100g"

        ht_findings = [f for f in report.condition_findings if f.condition_or_allergy == "hypertension"]
        assert len(ht_findings) == 1
        f = ht_findings[0]
        assert f.rule_id == "RULE_CONDITION_HYPERTENSION_SODIUM"
        assert f.severity == "CAUTION"
        assert "480 mg" in f.triggering_text
        assert "who.int" in f.evidence_url

    def test_sodium_unit_conversion_from_grams_to_milligrams(self):
        """Converts sodium parsed in grams (e.g. 0.35 g) to 350 mg."""
        parsed_sections = ParsedLabelSections(
            filtered_sections=[
                {"type": "NUTRITION", "text": "Per Serving"},
                {"type": "NUTRITION", "text": "Sodium: 0.35 g"},
            ],
        )
        boxes = [
            OCRTextBox(text="Sodium: 0.35 g", confidence=0.95, bounding_box=[[0, 0], [10, 0], [10, 10], [0, 10]]),
        ]

        report = health_impact_engine.evaluate(
            candidate_ingredients=["Soy Flour", "Salt"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            health_conditions=["hypertension"],
        )

        assert report.nutrition_facts is not None
        assert report.nutrition_facts.sodium_mg == 350.0

    def test_ckd_renal_filtration_caution_when_sodium_present(self):
        """CKD profile evaluates sodium with NIDDK renal filtration guidance."""
        parsed_sections = ParsedLabelSections(
            filtered_sections=[
                {"type": "NUTRITION", "text": "Per 100g"},
                {"type": "NUTRITION", "text": "Sodium 600 mg"},
            ],
        )
        boxes = [
            OCRTextBox(text="Sodium 600 mg", confidence=0.95, bounding_box=[[0, 0], [10, 0], [10, 10], [0, 10]]),
        ]

        report = health_impact_engine.evaluate(
            candidate_ingredients=["Soy Flour", "Salt"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            health_conditions=["ckd"],
        )

        ckd_findings = [f for f in report.condition_findings if f.condition_or_allergy == "ckd"]
        assert len(ckd_findings) == 1
        f = ckd_findings[0]
        assert f.rule_id == "RULE_CONDITION_CKD_SODIUM"
        assert f.severity == "CAUTION"
        assert "niddk.nih.gov" in f.evidence_url
        assert "renal" in f.explanation.lower() or "kidney" in f.explanation.lower()

    def test_missing_sodium_data_produces_data_insufficient_for_ht_and_ckd(self):
        """When sodium is unparsed, both hypertension and CKD produce DATA_INSUFFICIENT."""
        parsed_sections = ParsedLabelSections(
            ingredients_text="Soy Flour, Water, Salt",
            filtered_sections=[],
        )
        boxes = []

        report = health_impact_engine.evaluate(
            candidate_ingredients=["Soy Flour", "Water", "Salt"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            health_conditions=["hypertension", "ckd"],
        )

        assert len(report.condition_findings) == 0
        rule_ids = [n.rule_id for n in report.data_insufficient_notices]
        assert "RULE_CONDITION_HYPERTENSION_DATA_INSUFFICIENT" in rule_ids
        assert "RULE_CONDITION_CKD_DATA_INSUFFICIENT" in rule_ids


class TestSafetyBoundariesAndEdgeCases:
    """Verifies that empty profiles, unknown ingredients, and edge cases adhere to safety guidelines."""

    def test_unknown_ingredients_do_not_generate_unsupported_disease_claims(self):
        """Unknown or unverified ingredient names never generate fabricated medical or disease warnings."""
        parsed_sections = ParsedLabelSections(
            ingredients_text="AshwagandhaExtract, GuduchiPowder, Water",
            contains_allergens=[],
            may_contain_allergens=[],
            filtered_sections=[],
        )
        boxes = []

        report = health_impact_engine.evaluate(
            candidate_ingredients=["AshwagandhaExtract", "GuduchiPowder", "Water"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            health_conditions=["diabetes", "hypertension"],
        )

        # Condition findings should be empty (no reliable nutrition data)
        assert len(report.condition_findings) == 0
        # No allergy findings
        assert len(report.allergy_findings) == 0
        # Only data insufficient notices for unparsed nutrition facts
        for notice in report.data_insufficient_notices:
            assert notice.severity == "DATA_INSUFFICIENT"

    def test_empty_profiles_do_not_produce_safe_product_conclusion(self):
        """An empty profile generates 0 findings and reminds user that empty match != safe product."""
        parsed_sections = ParsedLabelSections(
            ingredients_text="Soy Flour, Wheat Flour, Water",
            contains_allergens=["Soy", "Wheat"],
            may_contain_allergens=["Nuts"],
        )
        boxes = []

        report = health_impact_engine.evaluate(
            candidate_ingredients=["Soy Flour", "Wheat Flour", "Water"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            allergies=[],
            health_conditions=[],
        )

        assert len(report.profile_conditions_evaluated) == 0
        assert len(report.allergy_findings) == 0
        assert len(report.condition_findings) == 0
        assert "does not provide medical diagnoses" in report.disclaimer.lower()


class TestScanAPIIntegrationAndBackwardCompatibility:
    """Verifies that the /api/v1/scan/image endpoint remains completely backward-compatible."""

    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_scan_endpoint_includes_health_impact_report(self, client):
        """Verifies health_impact_report is returned with evaluated profile conditions."""
        boxes = [
            OCRTextBox(text="INGREDIENTS: SOY FLOUR, WHOLE WHEAT FLOUR, WATER, IODIZED SALT.", confidence=0.96, bounding_box=[[0, 0], [100, 0], [100, 20], [0, 20]]),
            OCRTextBox(text="ALLERGEN ADVICE: CONTAINS WHEAT & SOY. MAY CONTAIN MILK.", confidence=0.95, bounding_box=[[0, 30], [100, 30], [100, 50], [0, 50]]),
        ]
        mock_service = DummyMockOCRService(boxes=boxes)
        app.dependency_overrides[get_ocr_service] = lambda: mock_service

        try:
            image_bytes = create_dummy_png_bytes()
            response = client.post(
                "/api/v1/scan/image",
                files={"file": ("test_label.png", image_bytes, "image/png")},
                data={
                    "profile_name": "Test Family",
                    "allergies": "soy,milk",
                    "health_conditions": "celiac,diabetes",
                },
            )

            assert response.status_code == 200
            data = response.json()

            # Backward-compatible fields
            assert "status" in data
            assert data["status"] == "SUCCESS"
            assert "sections_summary" in data
            assert "allergen_report" in data
            assert "evaluation" in data
            assert "raw_extracted_text" in data
            assert "disclaimer" in data

            # Phase 3 health_impact_report field
            assert "health_impact_report" in data
            report = data["health_impact_report"]
            assert report is not None
            assert "profile_conditions_evaluated" in report
            assert "celiac" in report["profile_conditions_evaluated"]
            assert "diabetes" in report["profile_conditions_evaluated"]
            assert "soy" in report["profile_conditions_evaluated"]
            assert "milk" in report["profile_conditions_evaluated"]

            # Soy CONTAINS match
            soy_findings = [f for f in report["allergy_findings"] if f["matched_item"] == "Soy"]
            assert len(soy_findings) == 1
            assert soy_findings[0]["severity"] == "CRITICAL"

            # Milk MAY CONTAIN match
            milk_findings = [f for f in report["allergy_findings"] if f["matched_item"] == "Milk"]
            assert len(milk_findings) == 1
            assert milk_findings[0]["severity"] == "WARNING"

            # Coeliac Wheat match
            celiac_findings = [f for f in report["condition_findings"] if f["condition_or_allergy"] == "celiac"]
            assert len(celiac_findings) == 1
            assert celiac_findings[0]["severity"] == "CRITICAL"

        finally:
            app.dependency_overrides.pop(get_ocr_service, None)

    def test_scan_endpoint_without_health_conditions_param_backward_compatibility(self, client):
        """Verifies endpoint still succeeds when health_conditions parameter is omitted."""
        boxes = [
            OCRTextBox(text="INGREDIENTS: WATER, SALT.", confidence=0.96, bounding_box=[[0, 0], [100, 0], [100, 20], [0, 20]]),
        ]
        mock_service = DummyMockOCRService(boxes=boxes)
        app.dependency_overrides[get_ocr_service] = lambda: mock_service

        try:
            image_bytes = create_dummy_png_bytes()
            response = client.post(
                "/api/v1/scan/image",
                files={"file": ("test_label.png", image_bytes, "image/png")},
                data={
                    "profile_name": "Default",
                    "allergies": "peanut",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "SUCCESS"
            assert "health_impact_report" in data
        finally:
            app.dependency_overrides.pop(get_ocr_service, None)


class TestUniversalHealthImpactAndGlobalBans:
    """Verifies baseline product health risks and international bans evaluate WITHOUT profile dependency."""

    def test_universal_evaluation_without_user_profile(self):
        """Even with empty allergies and empty conditions, palmolein, maida, sugar, and INS additives evaluate."""
        boxes = [
            OCRTextBox(text="INGREDIENTS: Refined Wheat Flour (Maida), Refined Palmolein Oil, Sugar, INS 500(ii), INS 334.", confidence=0.95, bounding_box=[[0, 0], [100, 0], [100, 20], [0, 20]]),
            OCRTextBox(text="DO NOT USE BRASS OR COPPER UTENSILS.", confidence=0.94, bounding_box=[[0, 30], [100, 30], [100, 50], [0, 50]]),
        ]
        parsed_sections = ParsedLabelSections(
            ingredients_text="Refined Wheat Flour (Maida), Refined Palmolein Oil, Sugar, INS 500(ii), INS 334",
            contains_allergens=["Wheat"],
        )

        report = health_impact_engine.evaluate(
            candidate_ingredients=["Refined Wheat Flour (Maida)", "Refined Palmolein Oil", "Sugar", "INS 500(ii)", "INS 334"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            allergies=[],
            health_conditions=[],
        )

        # Baseline evaluation runs even without user profile
        assert len(report.general_health_insights) >= 3
        insight_types = [g.concern_type for g in report.general_health_insights]
        assert "SATURATED_FAT_CARDIOVASCULAR" in insight_types
        assert "HIGH_GLYCEMIC_REFINED_CARBS" in insight_types
        assert "TOXIC_METALLIC_LEACHING" in insight_types

        # Utensil warning detected
        assert report.packaging_caution_detected is not None
        assert "COPPER" in report.packaging_caution_detected

        # Regulatory additives evaluated (INS 500ii, INS 334)
        assert len(report.regulatory_additive_findings) >= 2
        ins_codes = [r.ins_number for r in report.regulatory_additive_findings]
        assert "500(ii)" in ins_codes or "500" in ins_codes
        assert "334" in ins_codes

    def test_banned_additive_detection(self):
        """Verifies detection of internationally banned additive e.g. Titanium Dioxide (INS 171)."""
        boxes = [
            OCRTextBox(text="INGREDIENTS: Water, Sugar, Food Colour (INS 171).", confidence=0.96, bounding_box=[[0, 0], [100, 0], [100, 20], [0, 20]]),
        ]
        parsed_sections = ParsedLabelSections(
            ingredients_text="Water, Sugar, Food Colour (INS 171)",
        )

        report = health_impact_engine.evaluate(
            candidate_ingredients=["Water", "Sugar", "Food Colour (INS 171)"],
            parsed_sections=parsed_sections,
            boxes=boxes,
            allergies=[],
            health_conditions=[],
        )

        assert len(report.international_bans_detected) >= 1
        ban_text = " ".join(report.international_bans_detected)
        assert "European Union" in ban_text or "EU" in ban_text
        assert "171" in ban_text

