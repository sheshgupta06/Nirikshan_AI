"""Unit tests for Nirikshan AI Deterministic Rule and Allergy Engine."""

import pytest
from backend.app.services.rule_engine import RuleEngine, UserProfile


@pytest.fixture
def rule_engine():
    return RuleEngine()


class TestAllergenMatching:
    """Tests for mandatory FSSAI allergen detection against user profiles."""

    def test_peanut_allergy_match_with_indian_aliases(self, rule_engine: RuleEngine):
        profile = UserProfile(profile_name="Aarav", allergies=["peanut"])

        # Test Groundnut (most common Indian label alias)
        result = rule_engine.evaluate(["Groundnut", "Sugar"], profile)
        assert result.summary.allergens_flagged == 1
        item_gn = result.items[0]
        assert item_gn.status_code == "LABEL_DECLARED_ALLERGEN"
        assert len(item_gn.alerts) == 1
        alert = item_gn.alerts[0]
        assert alert.alert_type == "ALLERGEN"
        assert alert.severity == "CRITICAL"
        assert "Peanut" in alert.rule_name
        assert alert.evidence is not None
        assert "Schedule II, Clause 5(3)" in alert.evidence["section"]

    def test_gluten_allergy_match_with_maida(self, rule_engine: RuleEngine):
        profile = UserProfile(profile_name="Mom", allergies=["gluten"])

        result = rule_engine.evaluate(["Maida", "Iodized Salt"], profile)
        assert result.summary.allergens_flagged == 1
        item_maida = result.items[0]
        assert item_maida.status_code == "LABEL_DECLARED_ALLERGEN"
        assert any(a.alert_type == "ALLERGEN" for a in item_maida.alerts)

    def test_soy_allergy_match_via_ins_additive(self, rule_engine: RuleEngine):
        # INS 322 is Lecithin, which is soy-derived
        profile = UserProfile(profile_name="Child", allergies=["soy"])

        result = rule_engine.evaluate(["INS 322", "Sugar"], profile)
        assert result.summary.allergens_flagged == 1
        item_ins = result.items[0]
        assert item_ins.status_code == "LABEL_DECLARED_ALLERGEN"
        assert any(a.alert_type == "ALLERGEN" for a in item_ins.alerts)

    def test_no_allergen_when_profile_has_no_matching_allergies(
        self, rule_engine: RuleEngine
    ):
        profile = UserProfile(profile_name="Self", allergies=["fish"])

        # Product contains wheat and sugar, user is only allergic to fish
        result = rule_engine.evaluate(["Wheat Flour", "Sugar"], profile)
        assert result.summary.allergens_flagged == 0
        assert result.items[0].status_code == "PERMITTED_STANDARD"


class TestDietaryPreferencesAndWatchlist:
    """Tests for vegetarian dietary rules and custom watchlists (Palm Oil)."""

    def test_vegetarian_profile_flags_animal_gelatin(self, rule_engine: RuleEngine):
        profile = UserProfile(profile_name="Grandma", dietary_preference="vegetarian")

        result = rule_engine.evaluate(["Gelatin", "Sugar"], profile)
        assert result.summary.dietary_violations == 1
        item_gelatin = result.items[0]
        assert item_gelatin.status_code == "PROFILE_DIET_ALERT"
        alert = item_gelatin.alerts[0]
        assert alert.alert_type == "DIETARY_VIOLATION"
        assert alert.severity == "WARNING"
        assert "Declarations regarding Non-Vegetarian Food" in alert.evidence["section"]

    def test_avoid_palm_oil_watchlist(self, rule_engine: RuleEngine):
        profile = UserProfile(
            profile_name="Dad",
            watchlist=["avoid_palm_oil"],
        )

        result = rule_engine.evaluate(["Palmolein", "Wheat Flour"], profile)
        assert result.summary.dietary_violations == 1
        item_oil = result.items[0]
        assert item_oil.status_code == "PROFILE_DIET_ALERT"
        alert = item_oil.alerts[0]
        assert alert.alert_type == "WATCHLIST_FLAG"
        assert "Palm Oil" in alert.rule_name


class TestUnverifiedAndUnclearHandling:
    """Tests for zero-hallucination handling of unknown or ambiguous tokens."""

    def test_unverified_ingredient_status(self, rule_engine: RuleEngine):
        profile = UserProfile()

        result = rule_engine.evaluate(["Maltodextrin"], profile)
        assert result.summary.unverified_count == 1
        item = result.items[0]
        assert item.status_code == "UNVERIFIED_STATUS"
        alert = item.alerts[0]
        assert alert.alert_type == "UNVERIFIED"
        assert alert.severity == "NEEDS_REVIEW"
        assert "not found in the verified FSSAI" in alert.message

    def test_unclear_token_status(self, rule_engine: RuleEngine):
        profile = UserProfile()

        result = rule_engine.evaluate(["???"], profile)
        assert result.summary.unclear_count == 1
        item = result.items[0]
        assert item.status_code == "UNCLEAR_NEEDS_REVIEW"
        alert = item.alerts[0]
        assert alert.alert_type == "UNCLEAR"
        assert alert.severity == "NEEDS_REVIEW"


class TestFullLabelEvaluationSummary:
    """Tests comprehensive parsing and summary calculation for a real label string."""

    def test_full_packaged_snack_label(self, rule_engine: RuleEngine):
        profile = UserProfile(
            profile_name="Family",
            allergies=["peanut", "gluten"],
            dietary_preference="vegetarian",
            watchlist=["avoid_palm_oil"],
        )

        label = (
            "Ingredients: Refined Wheat Flour (Maida), Palmolein Oil, Sugar, "
            "Groundnut, INS 621, Xanthan Gum, ???"
        )

        result = rule_engine.evaluate(label, profile)

        # 7 items total
        assert result.summary.total_detected == 7
        # Maida (gluten) and Groundnut (peanut)
        assert result.summary.allergens_flagged == 2
        # Palmolein (palm oil watchlist)
        assert result.summary.dietary_violations == 1
        # Xanthan Gum (unverified in curated sample dataset)
        assert result.summary.unverified_count == 1
        # ??? (unclear/ambiguous)
        assert result.summary.unclear_count == 1
        # Mandatory disclaimer present
        assert "Nirikshan AI" in result.disclaimer
        assert "medical diagnoses" in result.disclaimer
