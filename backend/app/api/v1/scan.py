"""Nirikshan AI - Scan & OCR Image Analysis API Endpoints."""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from backend.app.services.fssai_compliance_engine import (
    FSSAIComplianceReport,
    fssai_compliance_engine,
)
from backend.app.services.health_impact_engine import (
    HealthImpactFinding,
    HealthImpactReport,
    NutritionFacts,
    health_impact_engine,
)
from backend.app.services.label_parser import label_parser
from backend.app.services.normalizer import normalizer
from backend.app.services.ocr_service import (
    ImageValidationError,
    OCREngineError,
    OCRService,
    OCRTextBox,
    ocr_service as default_ocr_service,
)
from backend.app.services.openfoodfacts_service import (
    OFFProductReference,
    openfoodfacts_service,
)
from backend.app.services.rule_engine import EvaluationResult, UserProfile, rule_engine


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scan", tags=["Scan & OCR"])


def get_ocr_service() -> OCRService:
    """FastAPI dependency provider for OCR service, easily overridable in tests."""
    return default_ocr_service


class LabelAllergenReport(BaseModel):
    """Detailed breakdown of label declared and precautionary allergens."""

    contains_allergens: List[str] = Field(
        default_factory=list,
        description="Direct recipe allergens declared in the CONTAINS statement (FSSAI Schedule II Clause 5(3))",
    )
    may_contain_allergens: List[str] = Field(
        default_factory=list,
        description="Precautionary allergen cross-contact advisory (MAY CONTAIN), not direct recipe ingredients",
    )
    profile_matches_contains: List[str] = Field(
        default_factory=list,
        description="Declared allergens that match the user's configured family allergy profile",
    )
    profile_matches_may_contain: List[str] = Field(
        default_factory=list,
        description="Precautionary allergens that match the user's configured family allergy profile",
    )
    incomplete_precautionary_advisory: bool = Field(
        default=False,
        description="True if a MAY CONTAIN clause was detected but allergen tokens could not be legibly read",
    )


class LabelSectionSummary(BaseModel):
    """Summary of identified packaging sections and filtered non-ingredient lines."""

    ingredients_detected_count: int = 0
    contains_clause_found: bool = False
    may_contain_clause_found: bool = False
    may_contain_incomplete: bool = False
    non_ingredient_lines_filtered: int = 0
    raw_ingredients_text: str = ""


class ScanImageResponse(BaseModel):
    """Response payload for image OCR and section-aware label evaluation."""

    status: str = Field(
        ...,
        description="'SUCCESS', 'UNCLEAR', or 'EMPTY'",
    )
    filename: Optional[str] = None
    image_metadata: Dict[str, Any]
    ocr_detected_boxes: List[OCRTextBox] = Field(
        default_factory=list,
        description="Text regions with actual extracted text, confidence, and polygon coordinates",
    )
    raw_extracted_text: str
    sections_summary: LabelSectionSummary = Field(
        default_factory=LabelSectionSummary,
        description="Packaging layout parsing statistics (ingredients vs nutrition vs advisories)",
    )
    allergen_report: LabelAllergenReport = Field(
        default_factory=LabelAllergenReport,
        description="Separately reported direct declared allergens and precautionary advisories",
    )
    evaluation: EvaluationResult
    health_impact_report: Optional[HealthImpactReport] = Field(
        default=None,
        description="Deterministic health impact analysis report against selected allergy and condition profile",
    )
    compliance_report: Optional[FSSAIComplianceReport] = Field(
        default=None,
        description="Module A: Legal Metrology & FSSAI mandatory statutory labelling compliance evaluation (11 points)",
    )
    legal_metrology: Optional[FSSAIComplianceReport] = Field(
        default=None,
        description="Module A: Legal Metrology Compliance Report (PRD Section 6)",
    )
    ingredient_safety: Optional[HealthImpactReport] = Field(
        default=None,
        description="Module B: Food Ingredient Safety Information Report (PRD Section 7)",
    )
    modules_requested: List[str] = Field(
        default_factory=lambda: ["legal_metrology", "ingredient_safety"],
        description="Active screening modules evaluated in this scan",
    )
    jurisdiction: str = Field(
        default="IN",
        description="Primary legal jurisdiction evaluated (e.g. 'IN' for India)",
    )
    open_food_facts_reference: Optional[OFFProductReference] = Field(
        default=None,
        description="Community reference product data matched via barcode from Open Food Facts",
    )
    message: Optional[str] = None
    disclaimer: str = (
        "Educational label analysis only. Nirikshan AI is a photo-based screening platform combining "
        "database-driven Legal Metrology compliance with evidence-backed Food Ingredient Safety information. "
        "It does not replace laboratory testing, official inspection, or professional regulatory/medical judgement."
    )


@router.post(
    "/analyze",
    response_model=ScanImageResponse,
    status_code=status.HTTP_200_OK,
    summary="Screen Packaged Food Label Image (PRD Section 12.3)",
    description="Analyzes packaged food labels for Legal Metrology (Module A), Ingredient Safety (Module B), or Both.",
)
@router.post(
    "/image",
    response_model=ScanImageResponse,
    status_code=status.HTTP_200_OK,
    summary="Scan Packaged Food Label Image (Alias)",
    description="Upload a food label image (JPEG, PNG, WebP) to extract text via OCR, parse sections, and evaluate ingredients.",
)
async def scan_food_label_image(
    file: Optional[UploadFile] = File(None, description="Single packaged food label image file"),
    files: Optional[List[UploadFile]] = File(None, description="Multiple food label image files (e.g. front & back panels)"),
    modules: Optional[str] = Form(
        "both",
        description="Screening modules to run: 'both', 'legal_metrology', or 'ingredient_safety' (PRD Section 4 & 5)",
    ),
    jurisdiction: Optional[str] = Form(
        "IN",
        description="Jurisdiction code to evaluate against (default 'IN')",
    ),
    product_category: Optional[str] = Form(
        None,
        description="Optional packaging category, e.g. 'snacks', 'beverages', 'staples'",
    ),
    profile_name: str = Form("Default", description="User or family profile name"),
    allergies: Optional[str] = Form(
        None,
        description="Comma-separated allergen list, e.g. 'peanut,gluten,milk,soy'",
    ),
    health_conditions: Optional[str] = Form(
        None,
        description="Comma-separated health conditions, e.g. 'celiac,diabetes,hypertension,ckd'",
    ),
    dietary_preference: Optional[str] = Form(
        None,
        description="Dietary preference, e.g. 'vegetarian', 'vegan'",
    ),
    watchlist: Optional[str] = Form(
        None,
        description="Comma-separated watchlist items, e.g. 'avoid_palm_oil'",
    ),
    service: OCRService = Depends(get_ocr_service),
) -> ScanImageResponse:
    """Validates and processes one or multiple food label images (e.g. Front & Back) with section-aware extraction."""
    # 1. Collect all valid uploaded files
    target_files: List[UploadFile] = []
    if files:
        target_files.extend([f for f in files if f and f.filename])
    if file and file.filename and file not in target_files:
        target_files.append(file)

    if not target_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image files provided. Please upload at least one packaged food label image (front or back).",
        )

    # 2. Read and OCR all uploaded images concurrently in parallel for 3-5s response time
    file_payloads: List[Tuple[int, str, bytes, Optional[str]]] = []
    for idx, target_file in enumerate(target_files):
        try:
            image_bytes = await target_file.read()
            file_payloads.append((idx, target_file.filename or f"Panel_{idx+1}", image_bytes, target_file.content_type))
        except Exception as e:
            logger.error("Failed to read uploaded file %s: %s", target_file.filename, e)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read uploaded file '{target_file.filename}'.",
            ) from e

    async def _extract_panel(panel_idx: int, panel_name: str, img_b: bytes, c_type: Optional[str]):
        try:
            p_boxes, p_meta = await asyncio.to_thread(
                service.extract_text_from_bytes,
                img_b,
                c_type,
            )
            return panel_idx, panel_name, p_boxes, p_meta
        except ImageValidationError as err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
        except OCREngineError as err:
            logger.error("OCR Engine execution failed for %s: %s", panel_name, err)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"OCR processing failed for '{panel_name}': {err}") from err
        except Exception as err:
            logger.exception("Unexpected error during OCR processing for %s: %s", panel_name, err)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error during label image processing.") from err

    # Concurrent parallel OCR extraction across all panels
    ocr_results = await asyncio.gather(
        *[_extract_panel(p_idx, p_fn, p_bytes, p_ct) for p_idx, p_fn, p_bytes, p_ct in file_payloads]
    )

    # Sort results in natural panel order
    ocr_results.sort(key=lambda r: r[0])

    all_boxes: List[OCRTextBox] = []
    combined_metadata: Dict[str, Any] = {}
    extracted_text_chunks: List[str] = []

    for idx, panel_name, cur_boxes, cur_meta in ocr_results:
        all_boxes.extend(cur_boxes)
        panel_lines = [b.text.strip() for b in cur_boxes if b.text.strip()]
        if panel_lines:
            panel_label = f"--- PANEL {idx + 1} ({panel_name}) ---"
            extracted_text_chunks.append(f"{panel_label}\n" + "\n".join(panel_lines))

        if idx == 0:
            combined_metadata = dict(cur_meta)
        else:
            combined_metadata["total_images_processed"] = len(target_files)

    boxes = all_boxes
    metadata = combined_metadata

    # 3. Concatenate and clean raw extracted text for traceability
    detected_lines = [b.text.strip() for b in boxes if b.text.strip()]
    raw_text = "\n\n".join(extracted_text_chunks) if extracted_text_chunks else " ".join(detected_lines)
    logger.info("OCR raw extracted text across %d images: %s", len(target_files), raw_text[:300])

    # Primary filename representation
    primary_filename = ", ".join([f.filename for f in target_files if f.filename]) or "packaged_food.jpg"

    # 4. Parse user profile options early
    parsed_allergies = (
        [a.strip().lower() for a in allergies.split(",") if a.strip()]
        if allergies
        else []
    )
    parsed_conditions = (
        [c.strip().lower() for c in health_conditions.split(",") if c.strip()]
        if health_conditions
        else []
    )
    parsed_watchlist = (
        [w.strip().lower() for w in watchlist.split(",") if w.strip()]
        if watchlist
        else []
    )

    profile = UserProfile(
        profile_name=profile_name,
        allergies=parsed_allergies,
        dietary_preference=dietary_preference.strip().lower() if dietary_preference else None,
        watchlist=parsed_watchlist,
    )

    # 5. Handle Empty or Degraded Detection
    if not detected_lines:
        status_code = "UNCLEAR" if metadata.get("is_blurry") else "EMPTY"
        msg = (
            "Image is blurry or low contrast. Please hold the camera steady on the ingredient panel."
            if metadata.get("is_blurry")
            else "No readable text detected in the uploaded image."
        )

        empty_eval = rule_engine.evaluate([], profile)
        return ScanImageResponse(
            status=status_code,
            filename=primary_filename,
            image_metadata=metadata,
            ocr_detected_boxes=[],
            raw_extracted_text="",
            sections_summary=LabelSectionSummary(),
            allergen_report=LabelAllergenReport(),
            evaluation=empty_eval,
            health_impact_report=None,
            message=msg,
        )

    # 6. Section-Aware Parsing: Isolate INGREDIENTS, CONTAINS, and MAY CONTAIN
    parsed_sections = label_parser.parse(boxes)

    # Candidate ingredient tokens: split ingredients text by commas/semicolons
    candidate_tokens: List[str] = []
    if parsed_sections.ingredients_text:
        candidate_tokens = normalizer.split_ingredients(parsed_sections.ingredients_text)
    elif parsed_sections.unmatched_lines:
        # Fallback if no explicit INGREDIENTS header was present
        for line in parsed_sections.unmatched_lines:
            tokens = normalizer.split_ingredients(line)
            candidate_tokens.extend(tokens if tokens else [line])

    # 7. Allergen Matching against Family Profile
    profile_matches_contains: List[str] = [
        allergen
        for allergen in parsed_sections.contains_allergens
        if label_parser.match_declared_allergen_to_profile(allergen, parsed_allergies)
    ]

    profile_matches_may_contain: List[str] = [
        allergen
        for allergen in parsed_sections.may_contain_allergens
        if label_parser.match_declared_allergen_to_profile(allergen, parsed_allergies)
    ]

    allergen_report = LabelAllergenReport(
        contains_allergens=parsed_sections.contains_allergens,
        may_contain_allergens=parsed_sections.may_contain_allergens,
        profile_matches_contains=profile_matches_contains,
        profile_matches_may_contain=profile_matches_may_contain,
        incomplete_precautionary_advisory=parsed_sections.may_contain_incomplete,
    )

    sections_summary = LabelSectionSummary(
        ingredients_detected_count=len(candidate_tokens),
        contains_clause_found=parsed_sections.contains_clause_detected or bool(parsed_sections.contains_allergens),
        may_contain_clause_found=parsed_sections.may_contain_clause_detected or bool(parsed_sections.may_contain_allergens),
        may_contain_incomplete=parsed_sections.may_contain_incomplete,
        non_ingredient_lines_filtered=len(parsed_sections.filtered_sections),
        raw_ingredients_text=parsed_sections.ingredients_text,
    )

    # 8. Evaluate ONLY genuine ingredient candidates against the rule engine
    evaluation = rule_engine.evaluate(candidate_tokens, profile)

    # 9. Handle incomplete precautionary advisory: flag alert without inventing allergens
    if parsed_sections.may_contain_incomplete:
        from backend.app.services.normalizer import NormalizedIngredient
        from backend.app.services.rule_engine import EvaluatedIngredient, ProfileAlert

        incomplete_advisory_item = EvaluatedIngredient(
            ingredient=NormalizedIngredient(
                raw_text="MAY CONTAIN (Unread Allergen Advisory)",
                status="UNCLEAR",
                canonical_name="Precautionary Advisory Incomplete",
                category="precautionary_advisory",
                uncertainty_reason="Precautionary advisory statement recognized on label, but allergen names were omitted or unreadable in OCR scan.",
            ),
            status_code="UNCLEAR_NEEDS_REVIEW",
            matched_rules=[],
            alerts=[
                ProfileAlert(
                    alert_type="INCOMPLETE_DETECTION",
                    severity="WARNING",
                    rule_name="Precautionary Advisory Incomplete",
                    message=(
                        "A precautionary allergen advisory ('MAY CONTAIN') was detected on the label, "
                        "but specific allergen names could not be legibly recognized. "
                        "Manual packaging inspection is recommended."
                    ),
                    matched_ingredient="MAY CONTAIN",
                )
            ],
            notes="Packaging advisory detected but specific allergen text was missing or unreadable.",
        )
        evaluation.items.append(incomplete_advisory_item)
        evaluation.summary.unclear_count += 1

    msg = (
        f"Parsed {len(candidate_tokens)} ingredients; "
        f"filtered {len(parsed_sections.filtered_sections)} non-ingredient lines; "
        f"found {len(parsed_sections.contains_allergens)} declared allergens and "
        f"{len(parsed_sections.may_contain_allergens)} precautionary advisories."
    )
    if parsed_sections.may_contain_incomplete:
        msg += " Note: Precautionary allergen advisory was detected, but specific allergen names were not legibly recognized."

    # Determine modules requested
    raw_modules = (modules or "both").lower()
    if raw_modules in ("both", "all"):
        req_modules = ["legal_metrology", "ingredient_safety"]
    elif "legal" in raw_modules or "metrology" in raw_modules:
        req_modules = ["legal_metrology"]
    elif "ingredient" in raw_modules or "safety" in raw_modules:
        req_modules = ["ingredient_safety"]
    else:
        req_modules = ["legal_metrology", "ingredient_safety"]

    # 10. Module B: Food Ingredient Safety Information (PRD Section 7)
    health_impact_report = None
    if "ingredient_safety" in req_modules:
        health_impact_report = health_impact_engine.evaluate(
            candidate_ingredients=candidate_tokens,
            parsed_sections=parsed_sections,
            boxes=boxes,
            allergies=parsed_allergies,
            health_conditions=parsed_conditions,
        )

        # 10b. Patient Risk Intelligence & Google AI Studio Gemini LLM
        try:
            from backend.app.services.llm_health_advisor import llm_health_advisor
            llm_result = await llm_health_advisor.analyze_patient_risks(
                candidate_ingredients=candidate_tokens,
                nutrition_text=raw_text[:1200],
                product_title=primary_filename,
            )
            if llm_result:
                health_impact_report.patient_risk_advisories = [
                    a.model_dump() if hasattr(a, "model_dump") else a.dict()
                    for a in llm_result.patient_advisories
                ]
                health_impact_report.ingredient_evaluations = [
                    ie.model_dump() if hasattr(ie, "model_dump") else ie.dict()
                    for ie in llm_result.ingredient_evaluations
                ]
                health_impact_report.llm_source = llm_result.source
                health_impact_report.llm_verdict = llm_result.overall_health_verdict
                health_impact_report.llm_verdict_hi = llm_result.overall_health_verdict_hi
        except Exception as err:
            logger.warning("LLM patient risk evaluation error: %s", err)

    # 11. Module A: Legal Metrology Compliance (PRD Section 6)
    compliance_report = None
    if "legal_metrology" in req_modules:
        compliance_report = fssai_compliance_engine.evaluate(
            boxes=boxes,
            parsed_sections=parsed_sections,
            candidate_ingredients=candidate_tokens,
            nutrition_facts=health_impact_report.nutrition_facts if health_impact_report else None,
        )

    # 12. Open Food Facts Barcode Resolution (fast non-blocking lookup)
    off_reference: Optional[OFFProductReference] = None
    barcode_match = re.search(r"\b(890\d{10}|\d{13}|\d{12})\b", raw_text)
    if barcode_match:
        detected_barcode = barcode_match.group(1)
        try:
            off_reference = await asyncio.to_thread(
                openfoodfacts_service.lookup_barcode,
                detected_barcode,
                timeout_sec=1.5,
            )
        except Exception as e:
            logger.warning("Open Food Facts lookup failed: %s", e)

    return ScanImageResponse(
        status="SUCCESS",
        filename=primary_filename,
        image_metadata=metadata,
        ocr_detected_boxes=boxes,
        raw_extracted_text=raw_text,
        sections_summary=sections_summary,
        allergen_report=allergen_report,
        evaluation=evaluation,
        health_impact_report=health_impact_report,
        compliance_report=compliance_report,
        legal_metrology=compliance_report,
        ingredient_safety=health_impact_report,
        modules_requested=req_modules,
        jurisdiction=jurisdiction or "IN",
        open_food_facts_reference=off_reference,
        message=msg,
    )


@router.get(
    "/barcode/{barcode}",
    response_model=OFFProductReference,
    summary="Lookup Product by Barcode via Open Food Facts",
    description="Look up packaged food reference info (Name, Brand, Ingredients, Nutrition) from local seed or Open Food Facts live API.",
)
async def lookup_product_by_barcode(barcode: str) -> OFFProductReference:
    """Returns community reference product information for a given barcode."""
    return openfoodfacts_service.lookup_barcode(barcode)

