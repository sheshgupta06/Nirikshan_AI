"""Unit tests for Nirikshan AI LLM Health Advisor & Patient Risk Service."""

import pytest
from backend.app.services.llm_health_advisor import (
    LLMHealthAdvisorService,
    llm_health_advisor,
)


@pytest.mark.asyncio
async def test_filter_genuine_ingredients():
    advisor = LLMHealthAdvisorService()
    raw_tokens = [
        "W.H.O. RECOMMENDED FORMULA",
        "formula allows for",
        "quicker absorption of Fluids",
        "which helps replacing",
        "the Water & Electrolytes lost",
        "severe diarrhoea",
        "2.60g Sodium Chloride",
        "1.50g Potassium Chloride",
        "2.90g Sodium Citrate",
        "13.50g Dextrose (Anhydrous)",
        "STORE IN DRY PLACE",
        "KEEP PROTECTED FROM MOISTURE",
        "Each sachet of 189",
    ]

    cleaned = advisor.filter_genuine_ingredients(raw_tokens)

    # All non-ingredient instructions must be stripped
    assert not any("W.H.O" in c for c in cleaned)
    assert not any("quicker absorption" in c for c in cleaned)
    assert not any("STORE IN" in c for c in cleaned)
    assert not any("KEEP PROTECTED" in c for c in cleaned)

    # Genuine ingredients must remain with clean titles
    assert any("Sodium Chloride" in c for c in cleaned)
    assert any("Potassium Chloride" in c for c in cleaned)
    assert any("Sodium Citrate" in c for c in cleaned)
    assert any("Dextrose" in c for c in cleaned)


@pytest.mark.asyncio
async def test_ors_patient_risk_evaluation():
    advisor = LLMHealthAdvisorService()
    ors_ingredients = [
        "Sodium Chloride",
        "Potassium Chloride",
        "Sodium Citrate",
        "Dextrose (Anhydrous)",
    ]

    result = await advisor.analyze_patient_risks(
        candidate_ingredients=ors_ingredients,
        product_title="Oral Rehydration Salts (ORS)",
    )

    assert result is not None
    assert len(result.patient_advisories) >= 3

    # Check for Kidney CKD Advisory triggered by Potassium Chloride
    kidney_advisory = next((a for a in result.patient_advisories if a.condition_key == "KIDNEY_CKD"), None)
    assert kidney_advisory is not None
    assert kidney_advisory.severity == "CRITICAL"
    assert any("Potassium" in ti for ti in kidney_advisory.trigger_ingredients)

    # Check for Diabetes Advisory triggered by Dextrose
    diabetes_advisory = next((a for a in result.patient_advisories if a.condition_key == "DIABETES"), None)
    assert diabetes_advisory is not None
    assert diabetes_advisory.severity == "WARNING"
    assert any("Dextrose" in ti for ti in diabetes_advisory.trigger_ingredients)

    # Check for Hypertension Advisory triggered by Sodium salts
    bp_advisory = next((a for a in result.patient_advisories if a.condition_key == "HYPERTENSION"), None)
    assert bp_advisory is not None
    assert bp_advisory.severity == "WARNING"

    # Check per-ingredient evaluations
    potassium_eval = next((e for e in result.ingredient_evaluations if "Potassium" in e.ingredient_name), None)
    assert potassium_eval is not None
    assert potassium_eval.status_color == "rose"
    assert "Kidney" in potassium_eval.safety_badge


@pytest.mark.asyncio
async def test_celiac_and_heart_evaluation():
    result = await llm_health_advisor.analyze_patient_risks(
        candidate_ingredients=["Wheat Flour (Maida)", "Palmolein Oil", "Iodized Salt"],
        product_title="Instant Noodles",
    )

    celiac_advisory = next((a for a in result.patient_advisories if a.condition_key == "CELIAC"), None)
    assert celiac_advisory is not None
    assert celiac_advisory.severity == "CRITICAL"

    heart_advisory = next((a for a in result.patient_advisories if a.condition_key == "HEART_DISEASE"), None)
    assert heart_advisory is not None
