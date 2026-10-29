"""Unit tests for Nirikshan AI Ingredient and Additive Normalizer."""

import pytest
from backend.app.services.normalizer import IngredientNormalizer, NormalizedIngredient


@pytest.fixture
def normalizer():
    return IngredientNormalizer()


class TestKnownIngredientsAndAliases:
    """Tests for canonical ingredients and common Indian packaging aliases."""

    def test_canonical_ingredient_direct(self, normalizer: IngredientNormalizer):
        result = normalizer.normalize("Refined Wheat Flour")
        assert result.status == "NORMALIZED"
        assert result.canonical_name == "Refined Wheat Flour"
        assert result.canonical_id == "wheat_flour"
        assert "gluten" in result.allergens
        assert result.evidence is not None
        assert "FSSAI" in result.evidence["title"]

    def test_hindi_alias_maida(self, normalizer: IngredientNormalizer):
        result = normalizer.normalize("Maida")
        assert result.status == "NORMALIZED"
        assert result.canonical_name == "Refined Wheat Flour"
        assert result.canonical_id == "wheat_flour"
        assert "gluten" in result.allergens

    def test_hindi_alias_atta(self, normalizer: IngredientNormalizer):
        result = normalizer.normalize("Atta")
        assert result.status == "NORMALIZED"
        assert result.canonical_name == "Whole Wheat Flour"
        assert "gluten" in result.allergens

    def test_peanut_aliases(self, normalizer: IngredientNormalizer):
        # Groundnut is the most common Indian label term for Peanut
        result_gn = normalizer.normalize("Groundnut")
        assert result_gn.status == "NORMALIZED"
        assert result_gn.canonical_name == "Peanut"
        assert "peanut" in result_gn.allergens

        result_mf = normalizer.normalize("mungfali")
        assert result_mf.status == "NORMALIZED"
        assert result_mf.canonical_name == "Peanut"
        assert "peanut" in result_mf.allergens

    def test_tree_nut_aliases(self, normalizer: IngredientNormalizer):
        result_badam = normalizer.normalize("Badam")
        assert result_badam.status == "NORMALIZED"
        assert result_badam.canonical_name == "Almond"
        assert "tree_nut" in result_badam.allergens

        result_kaju = normalizer.normalize("Kaju")
        assert result_kaju.status == "NORMALIZED"
        assert result_kaju.canonical_name == "Cashew Nut"
        assert "tree_nut" in result_kaju.allergens

    def test_oil_aliases(self, normalizer: IngredientNormalizer):
        result = normalizer.normalize("Palmolein")
        assert result.status == "NORMALIZED"
        assert result.canonical_name == "Edible Vegetable Oil (Palm Oil)"
        assert result.canonical_id == "palm_oil"

    def test_bracketed_alias_extraction(self, normalizer: IngredientNormalizer):
        # Common packaging pattern: "Refined Wheat Flour (Maida)"
        result = normalizer.normalize("Refined Wheat Flour (Maida)")
        assert result.status == "NORMALIZED"
        assert result.canonical_name == "Refined Wheat Flour"
        assert "gluten" in result.allergens


class TestVerifiedINSCodes:
    """Tests for verified FSSAI INS and E-number additives."""

    def test_ins_621_msg(self, normalizer: IngredientNormalizer):
        result = normalizer.normalize("INS 621")
        assert result.status == "NORMALIZED"
        assert result.canonical_name == "Monosodium L-Glutamate (MSG)"
        assert result.ins_code == "621"
        assert result.category == "additive"
        assert result.evidence is not None
        assert "Appendix A" in result.evidence["section"]

    def test_ins_102_tartrazine(self, normalizer: IngredientNormalizer):
        result = normalizer.normalize("E-102")
        assert result.status == "NORMALIZED"
        assert result.canonical_name == "Tartrazine"
        assert result.ins_code == "102"

    def test_ins_322_soy_lecithin(self, normalizer: IngredientNormalizer):
        result = normalizer.normalize("INS 322")
        assert result.status == "NORMALIZED"
        assert "Lecithin" in (result.canonical_name or "")
        assert "soy" in result.allergens

    def test_ins_500ii_baking_soda(self, normalizer: IngredientNormalizer):
        result = normalizer.normalize("INS 500(ii)")
        assert result.status == "NORMALIZED"
        assert "Sodium Hydrogen Carbonate" in (result.canonical_name or "")

    def test_ins_in_parentheses(self, normalizer: IngredientNormalizer):
        result = normalizer.normalize("Flavour Enhancer (621)")
        assert result.status == "NORMALIZED"
        assert result.ins_code == "621"
        assert "Monosodium" in (result.canonical_name or "")


class TestUnverifiedAndUnknownIngredients:
    """Tests for ingredients absent from the curated reference dataset."""

    def test_unverified_ingredient_clear_text(self, normalizer: IngredientNormalizer):
        # Maltodextrin is valid text, but not in our curated sample dataset
        result = normalizer.normalize("Maltodextrin")
        assert result.status == "UNVERIFIED"
        assert result.canonical_name == "Maltodextrin"
        assert result.uncertainty_reason is not None
        assert "curated database" in result.uncertainty_reason

    def test_unverified_ins_code(self, normalizer: IngredientNormalizer):
        # INS 9999 is a synthetic unverified code
        result = normalizer.normalize("INS 9999")
        assert result.status == "UNVERIFIED"
        assert result.ins_code == "9999"
        assert "not present in the curated" in (result.uncertainty_reason or "")


class TestAmbiguousAndUnclearInputs:
    """Tests for unreadable, corrupted, or ambiguous OCR fragments."""

    @pytest.mark.parametrize(
        "ambiguous_input",
        [
            "",
            "   ",
            "???",
            "oil (???)",
            "[unclear]",
            "[unreadable]",
            "---",
            "...",
            "INS",
            "INS -",
            "E-",
        ],
    )
    def test_ambiguous_tokens_return_unclear(
        self, normalizer: IngredientNormalizer, ambiguous_input: str
    ):
        result = normalizer.normalize(ambiguous_input)
        assert result.status == "UNCLEAR"
        assert result.uncertainty_reason is not None


class TestIngredientListSplitting:
    """Tests for multi-ingredient paragraph parsing with nested parentheses."""

    def test_split_and_normalize_list(self, normalizer: IngredientNormalizer):
        label_text = (
            "Ingredients: Refined Wheat Flour (Maida), Edible Vegetable Oil (Palm Oil), "
            "Sugar, INS 621, Salt, ???"
        )
        results = normalizer.normalize_list(label_text)
        assert len(results) == 6
        assert results[0].status == "NORMALIZED"
        assert results[0].canonical_name == "Refined Wheat Flour"
        assert results[1].status == "NORMALIZED"
        assert results[1].canonical_name == "Edible Vegetable Oil (Palm Oil)"
        assert results[2].status == "NORMALIZED"
        assert results[2].canonical_name == "Sugar"
        assert results[3].status == "NORMALIZED"
        assert results[3].canonical_name == "Monosodium L-Glutamate (MSG)"
        assert results[4].status == "NORMALIZED"
        assert results[4].canonical_name == "Iodized Salt"
        assert results[5].status == "UNCLEAR"
