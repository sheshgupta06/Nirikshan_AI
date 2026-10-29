"""Nirikshan AI - Test Suite for Module 3: FSSAI Label Compliance & Open Food Facts."""

import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app
from backend.app.api.v1.scan import get_ocr_service
from backend.app.services.fssai_compliance_engine import (
    FSSAIComplianceEngine,
    fssai_compliance_engine,
)
from backend.app.services.label_parser import ParsedLabelSections
from backend.app.services.ocr_service import OCRService, OCRTextBox
from backend.app.services.openfoodfacts_service import (
    OpenFoodFactsService,
    openfoodfacts_service,
)


class DummyMockOCRService(OCRService):
    def __init__(self, boxes=None):
        self._boxes = boxes or []

    def extract_text_from_bytes(self, image_bytes: bytes, content_type: str = "image/jpeg"):
        metadata = {
            "width": 800,
            "height": 600,
            "channels": 3,
            "file_size_bytes": len(image_bytes),
            "is_blurry": False,
            "blur_score": 150.0,
            "blur_assessment": "SHARP",
            "brightness_mean": 128.0,
            "lighting_assessment": "NORMAL",
            "contrast_score": 55.0,
            "contrast_assessment": "NORMAL",
            "restormer_status": "DISABLED_NO_WEIGHTS",
            "restormer_note": "Real Restormer PyTorch weights not present in environment.",
        }
        return self._boxes, metadata


def create_dummy_png_bytes(width=200, height=150) -> bytes:
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestFSSAIComplianceEngine:
    """Verifies deterministic evaluation of the 11 mandatory FSSAI statutory declarations."""

    def test_compliance_engine_evaluates_all_11_points(self):
        """Engine must evaluate exactly 11 mandatory requirements under Regulations 2020."""
        boxes = [
            OCRTextBox(text="PANI PURI READY TO FRY", confidence=0.98),
            OCRTextBox(text="INGREDIENTS: Whole Wheat Flour, Semolina, Palmolein Oil, Salt.", confidence=0.97),
            OCRTextBox(text="ALLERGEN ADVICE: CONTAINS GLUTEN (WHEAT).", confidence=0.96),
            OCRTextBox(text="100% PURE VEG", confidence=0.95),
            OCRTextBox(text="NUTRITION INFORMATION: Energy 375 kcal, Carbs 83g, Sodium 120mg", confidence=0.94),
            OCRTextBox(text="FSSAI Lic.No.10018013001471", confidence=0.98),
            OCRTextBox(text="Net Weight: 270 g", confidence=0.95),
            OCRTextBox(text="BATCH NO: PK-2026-09", confidence=0.93),
            OCRTextBox(text="DATE OF MFG: 15/10/2026 BEST BEFORE: 14/07/2027", confidence=0.95),
            OCRTextBox(text="MANUFACTURED BY: Chokhi Dhani Foods, SEZ Jaipur Rajasthan India", confidence=0.96),
            OCRTextBox(text="MRP Rs. 85.00 (Incl. of all taxes) Toll Free: 18001210222", confidence=0.95),
        ]
        parsed_sections = ParsedLabelSections(
            ingredients_text="Whole Wheat Flour, Semolina, Palmolein Oil, Salt",
            contains_allergens=["Gluten", "Wheat"],
            contains_clause_detected=True,
        )

        report = fssai_compliance_engine.evaluate(
            boxes=boxes,
            parsed_sections=parsed_sections,
            candidate_ingredients=["Whole Wheat Flour", "Semolina", "Palmolein Oil", "Salt"],
        )

        assert len(report.items) == 11
        assert report.summary_counts["total_checked"] == 11
        assert report.summary_counts["compliant"] >= 10
        assert report.compliance_score_percent >= 90.0

        # Check 14-digit FSSAI Lic No item
        lic_item = next(item for item in report.items if item.rule_id == "FSSAI_REQ_06_FSSAI_LOGO_AND_LICENSE")
        assert lic_item.status == "COMPLIANT"
        assert "10018013001471" in lic_item.evidence_text

        # Check Allergen item
        allg_item = next(item for item in report.items if item.rule_id == "FSSAI_REQ_04_ALLERGEN_DECLARATION")
        assert allg_item.status == "COMPLIANT"

        # Check Date Marking item
        date_item = next(item for item in report.items if item.rule_id == "FSSAI_REQ_09_DATE_MARKING")
        assert date_item.status == "COMPLIANT"

    def test_missing_mandatory_declarations_flagged(self):
        """When critical declarations are missing, engine flags NON_COMPLIANT_MISSING."""
        boxes = [
            OCRTextBox(text="ONLY SOME RANDOM TEXT WITHOUT FSSAI OR NUTRITION", confidence=0.95),
        ]
        parsed_sections = ParsedLabelSections()

        report = fssai_compliance_engine.evaluate(
            boxes=boxes,
            parsed_sections=parsed_sections,
            candidate_ingredients=[],
        )

        assert len(report.items) == 11
        # Ingredients, Nutrition, FSSAI Lic, Date marking should be missing
        missing_rules = [item.rule_id for item in report.items if item.status == "NON_COMPLIANT_MISSING"]
        assert "FSSAI_REQ_02_INGREDIENTS_LIST" in missing_rules
        assert "FSSAI_REQ_03_NUTRITIONAL_INFO" in missing_rules
        assert "FSSAI_REQ_06_FSSAI_LOGO_AND_LICENSE" in missing_rules


class TestOpenFoodFactsService:
    """Verifies barcode lookup from local seed and data isolation."""

    def test_local_seed_barcode_lookup(self):
        """Curated Indian barcode returns valid product reference."""
        barcode = "8906073528026"  # Chokhi Dhani Pani Puri
        result = openfoodfacts_service.lookup_barcode(barcode)

        assert result.found is True
        assert result.barcode == barcode
        assert "Chokhi Dhani" in (result.brand or "")
        assert "Pani Puri" in (result.product_name or "")
        assert result.source == "OPEN_FOOD_FACTS_LOCAL_SEED"
        assert result.fssai_lic_no == "10018013001471"

    def test_unknown_barcode_returns_not_found_safely(self):
        """Non-existent dummy barcode returns found=False without error."""
        result = openfoodfacts_service.lookup_barcode("0000000000000")
        assert result.found is False
        assert result.barcode == "0000000000000"


class TestScanAPIWithComplianceReport:
    """Verifies Scan Image API returns compliance_report."""

    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_scan_endpoint_includes_compliance_report(self, client):
        boxes = [
            OCRTextBox(text="INGREDIENTS: Wheat Flour, Water, Salt.", confidence=0.96),
            OCRTextBox(text="FSSAI Lic.No.10018013001471", confidence=0.98),
            OCRTextBox(text="Net Wt: 500g", confidence=0.94),
        ]
        mock_service = DummyMockOCRService(boxes=boxes)
        app.dependency_overrides[get_ocr_service] = lambda: mock_service

        try:
            image_bytes = create_dummy_png_bytes()
            response = client.post(
                "/api/v1/scan/image",
                files={"file": ("label.png", image_bytes, "image/png")},
            )

            assert response.status_code == 200
            data = response.json()
            assert "compliance_report" in data
            comp = data["compliance_report"]
            assert comp is not None
            assert "items" in comp
            assert len(comp["items"]) == 11
            assert "compliance_score_percent" in comp
        finally:
            app.dependency_overrides.pop(get_ocr_service, None)

    def test_analyze_endpoint_prd_contract(self, client):
        """Verifies POST /api/v1/analyze satisfies PRD Section 12.3 contract."""
        boxes = [
            OCRTextBox(text="PANI PURI PELLETS", confidence=0.98),
            OCRTextBox(text="INGREDIENTS: Wheat Flour, Salt.", confidence=0.96),
            OCRTextBox(text="FSSAI Lic.No.10018013001471", confidence=0.98),
        ]
        mock_service = DummyMockOCRService(boxes=boxes)
        app.dependency_overrides[get_ocr_service] = lambda: mock_service

        try:
            image_bytes = create_dummy_png_bytes()
            response = client.post(
                "/api/v1/analyze",
                files={"file": ("label.png", image_bytes, "image/png")},
                data={"modules": "both", "jurisdiction": "IN"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "SUCCESS"
            assert "legal_metrology" in data and data["legal_metrology"] is not None
            assert "ingredient_safety" in data and data["ingredient_safety"] is not None
            assert data["modules_requested"] == ["legal_metrology", "ingredient_safety"]
            assert data["jurisdiction"] == "IN"

            # Check image quality metadata
            meta = data["image_metadata"]
            assert "blur_score" in meta
            assert "blur_assessment" in meta
            assert "lighting_assessment" in meta
            assert "contrast_assessment" in meta
            assert "restormer_status" in meta
            assert meta["restormer_status"] == "DISABLED_NO_WEIGHTS"
        finally:
            app.dependency_overrides.pop(get_ocr_service, None)

    def test_analyze_endpoint_selective_modules(self, client):
        """Verifies selective screening when only legal_metrology or ingredient_safety is requested."""
        boxes = [OCRTextBox(text="SALT", confidence=0.99)]
        mock_service = DummyMockOCRService(boxes=boxes)
        app.dependency_overrides[get_ocr_service] = lambda: mock_service

        try:
            image_bytes = create_dummy_png_bytes()

            # Case A: Only Legal Metrology
            res_legal = client.post(
                "/api/v1/analyze",
                files={"file": ("label.png", image_bytes, "image/png")},
                data={"modules": "legal_metrology"},
            )
            assert res_legal.status_code == 200
            data_legal = res_legal.json()
            assert data_legal["legal_metrology"] is not None
            assert data_legal["ingredient_safety"] is None

            # Case B: Only Ingredient Safety
            res_ing = client.post(
                "/api/v1/analyze",
                files={"file": ("label.png", image_bytes, "image/png")},
                data={"modules": "ingredient_safety"},
            )
            assert res_ing.status_code == 200
            data_ing = res_ing.json()
            assert data_ing["legal_metrology"] is None
            assert data_ing["ingredient_safety"] is not None
        finally:
            app.dependency_overrides.pop(get_ocr_service, None)
