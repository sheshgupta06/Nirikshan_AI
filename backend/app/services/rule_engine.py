"""Nirikshan AI - Deterministic Rule & Allergy Engine Service.

Applies deterministic profile matching, FSSAI mandatory allergen checks, and
dietary watchlists without generative guesswork or invented medical claims.
Emits explicit UNVERIFIED and UNCLEAR status codes when data or text is deficient.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.services.normalizer import (
    IngredientNormalizer,
    NormalizedIngredient,
    normalizer as default_normalizer,
)


class UserProfile(BaseModel):
    """Configuration representing a user or family member dietary profile."""

    profile_name: str = "Default Profile"
    allergies: List[str] = Field(
        default_factory=list,
        description="List of allergen codes to flag (e.g. 'peanut', 'gluten', 'milk', 'soy')",
    )
    dietary_preference: Optional[str] = Field(
        default=None,
        description="e.g. 'vegetarian', 'vegan', 'jain'",
    )
    watchlist: List[str] = Field(
        default_factory=list,
        description="Custom watchlist items (e.g. 'avoid_palm_oil', 'high_sodium')",
    )


class ProfileAlert(BaseModel):
    """Alert raised for an allergen match, dietary conflict, or watchlist item."""

    alert_type: str = Field(
        ...,
        description="'ALLERGEN', 'DIETARY_VIOLATION', 'WATCHLIST_FLAG', or 'UNVERIFIED'",
    )
    severity: str = Field(
        ...,
        description="'CRITICAL', 'WARNING', 'INFO', or 'NEEDS_REVIEW'",
    )
    rule_name: str
    message: str
    matched_ingredient: str
    evidence: Optional[Dict[str, Any]] = None


class EvaluatedIngredient(BaseModel):
    """Full evaluation of an individual ingredient against rules."""

    ingredient: NormalizedIngredient
    status_code: str = Field(
        ...,
        description="Status code: 'LABEL_DECLARED_ALLERGEN', 'PROFILE_DIET_ALERT', 'REGULATED_ADDITIVE', 'PERMITTED_STANDARD', 'UNVERIFIED_STATUS', or 'UNCLEAR_NEEDS_REVIEW'",
    )
    alerts: List[ProfileAlert] = Field(default_factory=list)


class EvaluationSummary(BaseModel):
    """Aggregate statistics for an evaluation run."""

    total_detected: int
    allergens_flagged: int
    dietary_violations: int
    unverified_count: int
    unclear_count: int


class EvaluationResult(BaseModel):
    """Comprehensive evaluation payload returned to callers."""

    profile_name: str
    summary: EvaluationSummary
    items: List[EvaluatedIngredient]
    disclaimer: str = (
        "Educational label analysis only. Nirikshan AI evaluates visible label text against "
        "curated FSSAI records and user profiles. It does not provide medical diagnoses, "
        "detect undeclared cross-contact, or guarantee product safety."
    )


class RuleEngine:
    """Deterministic matcher for allergy and dietary preferences."""

    FSSAI_ALLERGEN_REGULATION = {
        "title": "Food Safety and Standards (Labelling and Display) Regulations, 2020",
        "section": "Schedule II, Clause 5(3): Mandatory Allergen Declarations",
        "url": "https://www.fssai.gov.in/food-law/regulations/amendments/labelling-display",
        "jurisdiction": "India",
    }

    FSSAI_VEG_REGULATION = {
        "title": "Food Safety and Standards (Labelling and Display) Regulations, 2020",
        "section": "Schedule II, Clause 5(2): Declarations regarding Non-Vegetarian Food",
        "url": "https://www.fssai.gov.in/food-law/regulations/amendments/labelling-display",
        "jurisdiction": "India",
    }

    ALLERGEN_PROFILE_MAP = {
        "gluten": {"gluten", "wheat", "cereal_gluten", "maida", "atta"},
        "wheat": {"gluten", "wheat", "cereal_gluten", "maida", "atta"},
        "peanut": {"peanut", "groundnut"},
        "groundnut": {"peanut", "groundnut"},
        "soy": {"soy", "soya", "soybean"},
        "milk": {"milk", "dairy"},
        "dairy": {"milk", "dairy"},
        "tree_nut": {"tree_nut", "nuts", "nut", "tree_nuts"},
        "nuts": {"tree_nut", "nuts", "nut", "tree_nuts"},
        "mustard": {"mustard"},
        "egg": {"egg", "eggs"},
        "fish": {"fish"},
        "crustacean": {"crustacean", "shellfish"},
        "sulphite": {"sulphite", "sulfite"},
    }

    def __init__(self, normalizer_instance: Optional[IngredientNormalizer] = None) -> None:
        self.normalizer = normalizer_instance or default_normalizer

    def evaluate_ingredient(
        self,
        item: NormalizedIngredient,
        profile: UserProfile,
    ) -> EvaluatedIngredient:
        """Evaluates a single normalized ingredient against the profile."""
        alerts: List[ProfileAlert] = []

        # 1. Handle UNCLEAR input
        if item.status == "UNCLEAR":
            alerts.append(
                ProfileAlert(
                    alert_type="UNCLEAR",
                    severity="NEEDS_REVIEW",
                    rule_name="Unclear Label Token",
                    message=item.uncertainty_reason or "Text is ambiguous, blurred, or corrupted. Manual review recommended.",
                    matched_ingredient=item.raw_text,
                    evidence=None,
                )
            )
            return EvaluatedIngredient(
                ingredient=item,
                status_code="UNCLEAR_NEEDS_REVIEW",
                alerts=alerts,
            )

        # 2. Handle UNVERIFIED input
        if item.status == "UNVERIFIED":
            alerts.append(
                ProfileAlert(
                    alert_type="UNVERIFIED",
                    severity="NEEDS_REVIEW",
                    rule_name="Unverified Ingredient",
                    message=(
                        f"'{item.raw_text}' was not found in the verified FSSAI reference database. "
                        "Absence does not imply safety or absence of allergens."
                    ),
                    matched_ingredient=item.raw_text,
                    evidence=None,
                )
            )
            return EvaluatedIngredient(
                ingredient=item,
                status_code="UNVERIFIED_STATUS",
                alerts=alerts,
            )

        # 3. Check Allergens
        user_allergies_lower = {a.strip().lower() for a in profile.allergies}
        expanded_user_allergies = set(user_allergies_lower)
        for u_allergy in user_allergies_lower:
            if u_allergy in self.ALLERGEN_PROFILE_MAP:
                expanded_user_allergies.update(self.ALLERGEN_PROFILE_MAP[u_allergy])

        for allergen in item.allergens:
            allergen_clean = allergen.lower()
            matching_keys = self.ALLERGEN_PROFILE_MAP.get(allergen_clean, {allergen_clean})
            if allergen_clean in expanded_user_allergies or matching_keys.intersection(expanded_user_allergies):
                alerts.append(
                    ProfileAlert(
                        alert_type="ALLERGEN",
                        severity="CRITICAL",
                        rule_name=f"Allergen Match: {allergen.replace('_', ' ').title()}",
                        message=f"'{item.canonical_name}' matches configured allergen profile for {allergen}.",
                        matched_ingredient=item.raw_text,
                        evidence=self.FSSAI_ALLERGEN_REGULATION,
                    )
                )

        # 4. Check Dietary Preferences (e.g. Vegetarian)
        if profile.dietary_preference and profile.dietary_preference.lower() in ("vegetarian", "veg"):
            if item.is_vegetarian is False:
                alerts.append(
                    ProfileAlert(
                        alert_type="DIETARY_VIOLATION",
                        severity="WARNING",
                        rule_name="Non-Vegetarian Ingredient",
                        message=f"'{item.canonical_name}' is derived from animal origin (Non-Vegetarian).",
                        matched_ingredient=item.raw_text,
                        evidence=self.FSSAI_VEG_REGULATION,
                    )
                )

        # 5. Check Watchlists (e.g. Palm Oil)
        if "avoid_palm_oil" in profile.watchlist:
            if item.canonical_id == "palm_oil" or "palm" in (item.canonical_name or "").lower():
                alerts.append(
                    ProfileAlert(
                        alert_type="WATCHLIST_FLAG",
                        severity="WARNING",
                        rule_name="Palm Oil Watchlist",
                        message="Product contains palm oil/palmolein as indicated on the label.",
                        matched_ingredient=item.raw_text,
                        evidence=item.evidence,
                    )
                )

        # 6. Assign overall status code
        if any(a.alert_type == "ALLERGEN" for a in alerts):
            status_code = "LABEL_DECLARED_ALLERGEN"
        elif any(a.alert_type in ("DIETARY_VIOLATION", "WATCHLIST_FLAG") for a in alerts):
            status_code = "PROFILE_DIET_ALERT"
        elif item.category == "additive" or item.ins_code:
            status_code = "REGULATED_ADDITIVE"
        else:
            status_code = "PERMITTED_STANDARD"

        return EvaluatedIngredient(
            ingredient=item,
            status_code=status_code,
            alerts=alerts,
        )

    def evaluate(
        self,
        raw_or_normalized_items: List[str] | List[NormalizedIngredient] | str,
        profile: Optional[UserProfile] = None,
    ) -> EvaluationResult:
        """Evaluates a list of ingredients against a user profile."""
        if profile is None:
            profile = UserProfile()

        # Step 1: Normalize items if raw strings or comma-separated string provided
        normalized_items: List[NormalizedIngredient]
        if isinstance(raw_or_normalized_items, str):
            normalized_items = self.normalizer.normalize_list(raw_or_normalized_items)
        elif raw_or_normalized_items and isinstance(raw_or_normalized_items[0], str):
            normalized_items = [
                self.normalizer.normalize(tok)  # type: ignore[arg-type]
                for tok in raw_or_normalized_items
            ]
        else:
            normalized_items = raw_or_normalized_items  # type: ignore[assignment]

        # Step 2: Evaluate each normalized ingredient
        evaluated_items = [
            self.evaluate_ingredient(item, profile)
            for item in normalized_items
        ]

        # Step 3: Compute summary counts
        allergens_count = sum(
            1 for it in evaluated_items if it.status_code == "LABEL_DECLARED_ALLERGEN"
        )
        dietary_count = sum(
            1 for it in evaluated_items if it.status_code == "PROFILE_DIET_ALERT"
        )
        unverified_count = sum(
            1 for it in evaluated_items if it.status_code == "UNVERIFIED_STATUS"
        )
        unclear_count = sum(
            1 for it in evaluated_items if it.status_code == "UNCLEAR_NEEDS_REVIEW"
        )

        summary = EvaluationSummary(
            total_detected=len(evaluated_items),
            allergens_flagged=allergens_count,
            dietary_violations=dietary_count,
            unverified_count=unverified_count,
            unclear_count=unclear_count,
        )

        return EvaluationResult(
            profile_name=profile.profile_name,
            summary=summary,
            items=evaluated_items,
        )


# Global singleton instance for easy import
rule_engine = RuleEngine()
