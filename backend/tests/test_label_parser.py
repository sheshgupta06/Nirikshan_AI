"""Unit and regression tests for SectionAwareLabelParser.

Verifies:
1. Spatial ordering of OCR bounding boxes
2. Extraction of INGREDIENTS, CONTAINS, and MAY CONTAIN sections
3. Filtering of nutrition tables, recipe instructions, brand headers, and serving sizes
4. Regression test using a complete multi-section packaged food label with:
   - Wheat, Soy, and INS 330
   - Direct CONTAINS declaration
   - Precautionary MAY CONTAIN advisory
   - Nutrition facts, recipe instructions, brand name, and FSSAI metadata
"""

import pytest
from backend.app.services.label_parser import SectionAwareLabelParser, label_parser
from backend.app.services.normalizer import normalizer
from backend.app.services.ocr_service import OCRTextBox
from backend.app.services.rule_engine import UserProfile, rule_engine


@pytest.fixture
def parser():
    return SectionAwareLabelParser()


class TestSectionDetectionAndFiltering:
    """Tests for section detection, separation, and non-ingredient exclusion."""

    def test_noise_filtering_nutrition_and_instructions(self, parser: SectionAwareLabelParser):
        assert parser.is_non_ingredient_noise("Nutrition Information Per 100g") == "NUTRITION"
        assert parser.is_non_ingredient_noise("Energy 450 kcal") == "NUTRITION"
        assert parser.is_non_ingredient_noise("Serving Size: 30g") == "NUTRITION"
        assert parser.is_non_ingredient_noise("Sodium 850mg") == "NUTRITION"
        assert parser.is_non_ingredient_noise("Cooking Instructions: Boil for 3 mins") == "RECIPE_INSTRUCTION"
        assert parser.is_non_ingredient_noise("Mfg by Nestle India Ltd") == "MANUFACTURER_LEGAL"
        assert parser.is_non_ingredient_noise("FSSAI Lic No: 10012011000123") == "MANUFACTURER_LEGAL"
        assert parser.is_non_ingredient_noise("Refined Wheat Flour (Maida)") is None
        assert parser.is_non_ingredient_noise("Acidity Regulator (INS 330)") is None

    def test_allergen_cleaning_contains_and_may_contain(self, parser: SectionAwareLabelParser):
        contains_raw = "CONTAINS: WHEAT, SOY."
        may_contain_raw = "MAY CONTAIN: PEANUT, TREE NUTS, MILK SOLIDS."

        contains_list = parser.clean_allergen_list(contains_raw)
        may_contain_list = parser.clean_allergen_list(may_contain_raw)

        assert contains_list == ["Wheat", "Soy"]
        assert may_contain_list == ["Peanut", "Tree Nuts", "Milk Solids"]

    def test_spatial_reading_order_sorting(self, parser: SectionAwareLabelParser):
        # Unordered boxes on two distinct lines
        unordered_boxes = [
            OCRTextBox(text="Right Item", bounding_box=[[200, 10], [300, 10], [300, 30], [200, 30]]),
            OCRTextBox(text="Line 2 Item", bounding_box=[[10, 50], [150, 50], [150, 70], [10, 70]]),
            OCRTextBox(text="Left Item", bounding_box=[[10, 10], [120, 10], [120, 30], [10, 30]]),
        ]

        sorted_boxes = parser.sort_boxes_spatially(unordered_boxes)
        sorted_texts = [b.text for b in sorted_boxes]
        assert sorted_texts == ["Left Item", "Right Item", "Line 2 Item"]


class TestFoodLabelRegressionScan:
    """Comprehensive regression test using a full real-world scan layout."""

    @pytest.fixture
    def packaged_food_label_boxes(self):
        """Simulates OCR bounding boxes from a packaged noodle/snack label."""
        return [
            # Brand Header & Marketing
            OCRTextBox(
                text="NUTRILICIOUS INSTANT MASALA NOODLES",
                confidence=0.98,
                bounding_box=[[20, 10], [380, 10], [380, 35], [20, 35]],
            ),
            # Nutrition Table
            OCRTextBox(
                text="Nutrition Information (Per 100g):",
                confidence=0.96,
                bounding_box=[[20, 45], [250, 45], [250, 65], [20, 65]],
            ),
            OCRTextBox(
                text="Energy 420 kcal, Protein 8.5g, Carbohydrate 62g",
                confidence=0.94,
                bounding_box=[[20, 70], [350, 70], [350, 90], [20, 90]],
            ),
            OCRTextBox(
                text="Serving Size: 70g (1 pack), Sodium 920mg",
                confidence=0.93,
                bounding_box=[[20, 95], [320, 95], [320, 115], [20, 115]],
            ),
            # Recipe Instructions
            OCRTextBox(
                text="Cooking Instructions: 1. Boil 250ml water. 2. Add noodles.",
                confidence=0.95,
                bounding_box=[[20, 125], [390, 125], [390, 145], [20, 145]],
            ),
            OCRTextBox(
                text="Cook for 2-3 minutes and serve hot.",
                confidence=0.94,
                bounding_box=[[20, 150], [260, 150], [260, 170], [20, 170]],
            ),
            # INGREDIENTS SECTION (Multi-line)
            OCRTextBox(
                text="INGREDIENTS: Refined Wheat Flour (Maida), Edible Vegetable Oil (Palm Oil),",
                confidence=0.97,
                bounding_box=[[20, 185], [490, 185], [490, 205], [20, 205]],
            ),
            OCRTextBox(
                text="Sugar, Acidity Regulator (INS 330), Iodized Salt, Hydrolyzed Groundnut Protein.",
                confidence=0.96,
                bounding_box=[[20, 210], [510, 210], [510, 230], [20, 230]],
            ),
            # ALLERGEN DECLARATIONS
            OCRTextBox(
                text="ALLERGEN DECLARATION: CONTAINS: WHEAT, SOY.",
                confidence=0.98,
                bounding_box=[[20, 240], [380, 240], [380, 260], [20, 260]],
            ),
            OCRTextBox(
                text="MAY CONTAIN: PEANUTS, TREE NUTS, MILK.",
                confidence=0.96,
                bounding_box=[[20, 265], [350, 265], [350, 285], [20, 285]],
            ),
            # Manufacturer & License Metadata
            OCRTextBox(
                text="Mfg by: FoodKraft India Ltd, FSSAI Lic No. 10014022001234.",
                confidence=0.92,
                bounding_box=[[20, 295], [450, 295], [450, 315], [20, 315]],
            ),
            OCRTextBox(
                text="Batch No: B402, Best Before 9 Months from PKD.",
                confidence=0.91,
                bounding_box=[[20, 320], [340, 320], [340, 340], [20, 340]],
            ),
        ]

    def test_regression_section_extraction(
        self, parser: SectionAwareLabelParser, packaged_food_label_boxes
    ):
        """Verify that ingredients, contains, and may-contain are cleanly isolated."""
        parsed = parser.parse(packaged_food_label_boxes)

        # 1. Ingredients text is isolated from nutrition and instructions
        assert "Refined Wheat Flour" in parsed.ingredients_text
        assert "Palm Oil" in parsed.ingredients_text
        assert "INS 330" in parsed.ingredients_text
        assert "Energy 420 kcal" not in parsed.ingredients_text
        assert "Boil 250ml water" not in parsed.ingredients_text

        # 2. CONTAINS statement is extracted separately
        assert parsed.contains_allergens == ["Wheat", "Soy"]

        # 3. MAY CONTAIN advisory is extracted separately
        assert parsed.may_contain_allergens == ["Peanuts", "Tree Nuts", "Milk"]

        # 4. Non-ingredient noise lines are properly filtered
        filtered_types = {item["type"] for item in parsed.filtered_sections}
        assert "NUTRITION" in filtered_types
        assert "RECIPE_INSTRUCTION" in filtered_types
        assert "MANUFACTURER_LEGAL" in filtered_types
        assert len(parsed.filtered_sections) >= 6

    def test_regression_rule_engine_integration_zero_false_unverified(
        self, parser: SectionAwareLabelParser, packaged_food_label_boxes
    ):
        """Verify that non-ingredient noise lines DO NOT create false UNVERIFIED alerts."""
        parsed = parser.parse(packaged_food_label_boxes)

        # Extract candidate tokens from parsed ingredients text ONLY
        candidate_tokens = normalizer.split_ingredients(parsed.ingredients_text)

        # Set user profile with soy and gluten allergies, and palm oil watchlist
        profile = UserProfile(
            profile_name="Test User",
            allergies=["soy", "gluten"],
            watchlist=["avoid_palm_oil"],
        )

        evaluation = rule_engine.evaluate(candidate_tokens, profile)

        # Candidate tokens must only be actual ingredients
        token_texts = [it.ingredient.raw_text for it in evaluation.items]
        assert any("Wheat Flour" in t for t in token_texts)
        assert any("Palm Oil" in t for t in token_texts)
        assert any("INS 330" in t for t in token_texts)
        assert any("Salt" in t for t in token_texts)

        # Ensure NO nutrition or instruction lines ended up as ingredients
        assert not any("Energy" in t for t in token_texts)
        assert not any("Carbohydrate" in t for t in token_texts)
        assert not any("420 kcal" in t for t in token_texts)
        assert not any("Boil" in t for t in token_texts)
        assert not any("Serving Size" in t for t in token_texts)
        assert not any("FSSAI Lic" in t for t in token_texts)

        # Verify INS 330 is normalized as Citric Acid (Regulated Additive)
        ins_330_item = next(it for it in evaluation.items if "INS 330" in it.ingredient.raw_text)
        assert ins_330_item.status_code == "REGULATED_ADDITIVE"
        assert ins_330_item.ingredient.canonical_name == "Citric Acid"
        assert ins_330_item.ingredient.ins_code == "330"

        # Verify Wheat Flour triggers profile allergy match
        wheat_item = next(it for it in evaluation.items if "Wheat Flour" in it.ingredient.raw_text)
        assert wheat_item.status_code == "LABEL_DECLARED_ALLERGEN"

        # Verify Palm Oil triggers profile watchlist alert
        palm_item = next(it for it in evaluation.items if "Palm Oil" in it.ingredient.raw_text)
        assert palm_item.status_code == "PROFILE_DIET_ALERT"

        # Verify genuine unknown ingredient ("Hydrolyzed Groundnut Protein") remains UNVERIFIED
        unverified_items = [it for it in evaluation.items if it.status_code == "UNVERIFIED_STATUS"]
        assert len(unverified_items) >= 1
        assert any("Hydrolyzed Groundnut Protein" in it.ingredient.raw_text for it in unverified_items)

    def test_distinguish_contains_from_may_contain_profile_matching(
        self, parser: SectionAwareLabelParser, packaged_food_label_boxes
    ):
        """Verify that direct CONTAINS and precautionary MAY CONTAIN are reported separately."""
        parsed = parser.parse(packaged_food_label_boxes)

        user_allergies = ["soy", "peanut"]

        # Check matching
        matches_contains = [
            a for a in parsed.contains_allergens
            if parser.match_declared_allergen_to_profile(a, user_allergies)
        ]

        matches_may_contain = [
            a for a in parsed.may_contain_allergens
            if parser.match_declared_allergen_to_profile(a, user_allergies)
        ]

        # Soy is in CONTAINS (direct recipe declaration)
        assert matches_contains == ["Soy"]

        # Peanut is in MAY CONTAIN (cross-contact advisory)
        assert matches_may_contain == ["Peanuts"]

        # They are separate lists and NOT merged or treated as equivalent
        assert "Soy" not in matches_may_contain
        assert "Peanuts" not in matches_contains


class TestLatestScanBugsRegression:
    """Regression tests verifying fixes for the latest real scan API response issues:
    1. Soy Flour (60%), Whole WheatFlour, Sugar and Iodized Salt normalization.
    2. 'Whole WheatFlour Sugar' correctly split into separate ingredients.
    3. 'CONTAINS: WHEAT & SOY. MAY CONTAIN: NUTS, MUSTARD & MILK' parsed cleanly
       without merging into metadata and with MAY CONTAIN populated.
    4. 'Water & Acidity Regulator INS 330' split into ingredient + additive.
    """

    def test_direct_splitting_compound_without_punctuation(self):
        """Verify 'Whole WheatFlour Sugar' is split into Whole Wheat Flour and Sugar."""
        tokens = normalizer.split_ingredients("Whole WheatFlour Sugar")
        assert len(tokens) == 2
        assert tokens[0] == "Whole Wheat Flour"
        assert tokens[1] == "Sugar"

    def test_direct_splitting_water_and_additive(self):
        """Verify 'Water & Acidity Regulator INS 330' splits into Water and additive."""
        tokens = normalizer.split_ingredients("Water & Acidity Regulator INS 330")
        assert len(tokens) == 2
        assert tokens[0] == "Water"
        assert tokens[1] == "Acidity Regulator INS 330"

    def test_direct_splitting_sugar_and_iodized_salt(self):
        """Verify 'Sugar and Iodized Salt' splits into Sugar and Iodized Salt."""
        tokens = normalizer.split_ingredients("Sugar and Iodized Salt")
        assert len(tokens) == 2
        assert tokens[0] == "Sugar"
        assert tokens[1] == "Iodized Salt"

    def test_normalization_soy_flour_percentage(self):
        """Verify 'Soy Flour (60%)' normalizes to Soy Flour with soy allergen."""
        res = normalizer.normalize("Soy Flour (60%)")
        assert res.status == "NORMALIZED"
        assert res.canonical_name == "Soy Flour"
        assert "soy" in res.allergens

    def test_normalization_whole_wheatflour_spacing(self):
        """Verify 'Whole WheatFlour' normalizes to Whole Wheat Flour with gluten allergen."""
        res = normalizer.normalize("Whole WheatFlour")
        assert res.status == "NORMALIZED"
        assert res.canonical_name == "Whole Wheat Flour"
        assert "gluten" in res.allergens

    def test_normalization_water(self):
        """Verify 'Water' normalizes cleanly to Water."""
        res = normalizer.normalize("Water")
        assert res.status == "NORMALIZED"
        assert res.canonical_name == "Water"

    def test_latest_real_scan_comprehensive_regression(self, parser: SectionAwareLabelParser):
        """Full regression test using the exact latest scan structure."""
        boxes = [
            # Brand Header & Marketing
            OCRTextBox(
                text="HEALTHY CRUNCH MULTIGRAIN NOODLES",
                confidence=0.98,
                bounding_box=[[10, 10], [400, 10], [400, 30], [10, 30]],
            ),
            # Nutrition Table
            OCRTextBox(
                text="Nutrition Information: Energy 360 kcal, Protein 14g, Carbohydrate 55g",
                confidence=0.95,
                bounding_box=[[10, 40], [450, 40], [450, 60], [10, 60]],
            ),
            OCRTextBox(
                text="Serving Size: 45g (1 cup), Sodium 420mg",
                confidence=0.94,
                bounding_box=[[10, 65], [350, 65], [350, 85], [10, 85]],
            ),
            # Recipe Instructions
            OCRTextBox(
                text="Cooking Instructions: Boil in 300ml water for 3 minutes. Serve hot.",
                confidence=0.93,
                bounding_box=[[10, 90], [420, 90], [420, 110], [10, 110]],
            ),
            # INGREDIENTS SECTION (Multi-line with line breaks and conjunctions)
            OCRTextBox(
                text="INGREDIENTS: Soy Flour (60%), Whole WheatFlour",
                confidence=0.96,
                bounding_box=[[10, 120], [400, 120], [400, 140], [10, 140]],
            ),
            OCRTextBox(
                text="Sugar and Iodized Salt",
                confidence=0.95,
                bounding_box=[[10, 145], [300, 145], [300, 165], [10, 165]],
            ),
            OCRTextBox(
                text="Water & Acidity Regulator INS 330",
                confidence=0.94,
                bounding_box=[[10, 170], [380, 170], [380, 190], [10, 190]],
            ),
            # ALLERGEN DECLARATIONS (CONTAINS & MAY CONTAIN on single line)
            OCRTextBox(
                text="CONTAINS: WHEAT & SOY. MAY CONTAIN: NUTS, MUSTARD & MILK",
                confidence=0.97,
                bounding_box=[[10, 200], [550, 200], [550, 220], [10, 220]],
            ),
            # Manufacturer & License Metadata
            OCRTextBox(
                text="Mfg by: PureFoods India Pvt Ltd, FSSAI Lic No: 11518001000456",
                confidence=0.91,
                bounding_box=[[10, 230], [480, 230], [480, 250], [10, 250]],
            ),
            OCRTextBox(
                text="Batch No: B-991, Net Qty: 200g, Best Before 6 Months",
                confidence=0.90,
                bounding_box=[[10, 255], [380, 255], [380, 275], [10, 275]],
            ),
        ]

        # 1. Parse sections
        parsed = parser.parse(boxes)

        # Verify CONTAINS is parsed with Wheat and Soy
        assert parsed.contains_allergens == ["Wheat", "Soy"]

        # Verify MAY CONTAIN is parsed with Nuts, Mustard and Milk
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]

        # Verify neither contains nor may_contain leaked into metadata
        assert not any("Mfg by" in a for a in parsed.contains_allergens)
        assert not any("FSSAI" in a for a in parsed.may_contain_allergens)

        # 2. Extract and split candidate ingredients
        candidate_tokens = normalizer.split_ingredients(parsed.ingredients_text)

        # Verify all 6 required ingredients are separated appropriately
        assert any("Soy Flour" in t for t in candidate_tokens)
        assert any("Whole Wheat Flour" in t for t in candidate_tokens)
        assert any("Sugar" in t for t in candidate_tokens)
        assert any("Iodized Salt" in t for t in candidate_tokens)
        assert any("Water" in t for t in candidate_tokens)
        assert any("INS 330" in t for t in candidate_tokens)

        # Verify 'Whole WheatFlour Sugar' was NOT treated as one ingredient
        assert not any("Whole WheatFlour Sugar" in t for t in candidate_tokens)
        assert not any("Wheat Flour Sugar" in t for t in candidate_tokens)

        # Verify 'Water & Acidity Regulator INS 330' was NOT treated as one ingredient
        assert not any("Water & Acidity" in t for t in candidate_tokens)

        # Verify nutrition values and recipe instructions are completely excluded
        assert not any("360 kcal" in t or "Carbohydrate" in t or "14g" in t for t in candidate_tokens)
        assert not any("Boil" in t or "Serve hot" in t or "FSSAI" in t for t in candidate_tokens)

        # 3. Evaluate with Rule Engine against user allergy profile (wheat & soy)
        profile = UserProfile(
            profile_name="Family Member",
            allergies=["wheat", "soy"],
        )
        evaluation = rule_engine.evaluate(candidate_tokens, profile)

        # Check that Soy Flour is flagged for soy allergy
        soy_item = next(it for it in evaluation.items if "Soy Flour" in it.ingredient.canonical_name)
        assert soy_item.status_code == "LABEL_DECLARED_ALLERGEN"

        # Check that Whole Wheat Flour is flagged for wheat/gluten allergy
        wheat_item = next(it for it in evaluation.items if "Whole Wheat Flour" in it.ingredient.canonical_name)
        assert wheat_item.status_code == "LABEL_DECLARED_ALLERGEN"

        # Check that INS 330 is recognized as Citric Acid (Regulated Additive)
        ins_item = next(it for it in evaluation.items if "INS 330" in it.ingredient.raw_text)
        assert ins_item.status_code == "REGULATED_ADDITIVE"
        assert ins_item.ingredient.canonical_name == "Citric Acid"

        # Check that Water, Sugar, Iodized Salt are recognized standards
        water_item = next(it for it in evaluation.items if "Water" in it.ingredient.canonical_name)
        assert water_item.status_code == "PERMITTED_STANDARD"
        sugar_item = next(it for it in evaluation.items if "Sugar" in it.ingredient.canonical_name)
        assert sugar_item.status_code == "PERMITTED_STANDARD"

        # Profile matches on declared allergens
        matches_contains = [
            a for a in parsed.contains_allergens
            if parser.match_declared_allergen_to_profile(a, profile.allergies)
        ]
        # Both Wheat and Soy match the profile
        assert "Wheat" in matches_contains
        assert "Soy" in matches_contains

        # Test profile matching with precautionary advisory (tree_nut / mustard)
        precautionary_profile = ["tree_nut", "mustard"]
        matches_may_contain = [
            a for a in parsed.may_contain_allergens
            if parser.match_declared_allergen_to_profile(a, precautionary_profile)
        ]
        assert "Nuts" in matches_may_contain
        assert "Mustard" in matches_may_contain


class TestLatestAllergenAdviceAndMetadataRegression:
    """Regression tests for:
    1. Parsing 'ALLERGEN ADVICE: CONTAINS WHEAT & SOY. MAY CONTAIN NUTS, MUSTARD & MILK.'
    2. contains_allergens = ['Wheat', 'Soy']
    3. may_contain_allergens = ['Nuts', 'Mustard', 'Milk']
    4. Exclusion of 'Date Of Mfg' and manufacturer metadata from allergen lists
    5. Conservative normalization of OCR typo 'lodized Salt' -> 'Iodized Salt'
    6. Default profile (no personal allergy rules) still preserves label declared allergens
    """

    def test_allergen_advice_clause_separation(self, parser: SectionAwareLabelParser):
        """Verify exact sentence 'ALLERGEN ADVICE: CONTAINS WHEAT & SOY. MAY CONTAIN NUTS, MUSTARD & MILK.'"""
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE: CONTAINS WHEAT & SOY. MAY CONTAIN NUTS, MUSTARD & MILK.",
                confidence=0.98,
                bounding_box=[[10, 10], [550, 10], [550, 30], [10, 30]],
            )
        ]
        parsed = parser.parse(boxes)
        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]

    def test_metadata_exclusion_multiline(self, parser: SectionAwareLabelParser):
        """Verify 'Date Of Mfg' on subsequent line is not merged into MAY CONTAIN."""
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE: CONTAINS WHEAT & SOY. MAY CONTAIN NUTS, MUSTARD & MILK.",
                confidence=0.98,
                bounding_box=[[10, 10], [550, 10], [550, 30], [10, 30]],
            ),
            OCRTextBox(
                text="Date Of Mfg: 24/10/2026 Batch No: 104",
                confidence=0.92,
                bounding_box=[[10, 40], [350, 40], [350, 60], [10, 60]],
            ),
        ]
        parsed = parser.parse(boxes)
        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]
        assert not any("Date Of Mfg" in a for a in parsed.may_contain_allergens)
        assert not any("Mfg" in a or "Date" in a or "Batch" in a for a in parsed.may_contain_allergens)

    def test_metadata_exclusion_same_line(self, parser: SectionAwareLabelParser):
        """Verify 'Date Of Mfg' appended on the same line is truncated before allergen tokenization."""
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE: CONTAINS WHEAT & SOY. MAY CONTAIN NUTS, MUSTARD & MILK. Date Of Mfg: 24/10/2026",
                confidence=0.97,
                bounding_box=[[10, 10], [600, 10], [600, 30], [10, 30]],
            )
        ]
        parsed = parser.parse(boxes)
        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]
        assert not any("Date Of Mfg" in a for a in parsed.may_contain_allergens)
        assert not any("24/10/2026" in a for a in parsed.may_contain_allergens)

    def test_lodized_salt_ocr_typo_normalization(self):
        """Verify conservative correction of OCR font typo 'lodized Salt' -> 'Iodized Salt'."""
        # Direct normalization
        norm = normalizer.normalize("lodized Salt")
        assert norm.status == "NORMALIZED"
        assert norm.canonical_name == "Iodized Salt"
        assert norm.category == "mineral"

        # Splitting in conjunction
        tokens = normalizer.split_ingredients("Sugar and lodized Salt")
        assert len(tokens) == 2
        assert tokens[0] == "Sugar"
        assert tokens[1] == "Iodized Salt"

    def test_default_profile_preserves_label_allergens(self, parser: SectionAwareLabelParser):
        """Verify a user with no personal allergy rules still receives label-declared allergens."""
        boxes = [
            OCRTextBox(
                text="INGREDIENTS: Whole WheatFlour, lodized Salt",
                confidence=0.96,
                bounding_box=[[10, 10], [400, 10], [400, 30], [10, 30]],
            ),
            OCRTextBox(
                text="ALLERGEN ADVICE: CONTAINS WHEAT & SOY. MAY CONTAIN NUTS, MUSTARD & MILK.",
                confidence=0.98,
                bounding_box=[[10, 40], [550, 40], [550, 60], [10, 60]],
            ),
        ]
        parsed = parser.parse(boxes)

        # Label-declared allergens are parsed regardless of profile
        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]

        # Default profile has empty allergy list
        default_profile = UserProfile(profile_name="Default", allergies=[])

        # Profile matches are empty because user has no configured allergies
        profile_matches_contains = [
            a for a in parsed.contains_allergens
            if parser.match_declared_allergen_to_profile(a, default_profile.allergies)
        ]
        profile_matches_may_contain = [
            a for a in parsed.may_contain_allergens
            if parser.match_declared_allergen_to_profile(a, default_profile.allergies)
        ]
        assert profile_matches_contains == []
        assert profile_matches_may_contain == []

        # But label declarations remain fully intact
        assert len(parsed.contains_allergens) == 2
        assert len(parsed.may_contain_allergens) == 3


class TestMultiBoxAllergenParsingFailureRegression:
    """Regression tests for real food-label multi-box allergen parsing failures:
    Box 1: 'ALLERGEN ADVICE:CONTAINS'
    Box 2: 'WHEAT & SOY.MAY CONTAIN'
    Box 3: 'NUTS,MUSTARD &MILK.'
    """

    def test_exact_three_box_fragments_stacked(self, parser: SectionAwareLabelParser):
        """Verify exact 3 OCR boxes on separate lines with punctuation and missing spaces."""
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE:CONTAINS",
                confidence=0.98,
                bounding_box=[[10, 60], [200, 60], [200, 80], [10, 80]],
            ),
            OCRTextBox(
                text="WHEAT & SOY.MAY CONTAIN",
                confidence=0.97,
                bounding_box=[[10, 85], [200, 85], [200, 105], [10, 105]],
            ),
            OCRTextBox(
                text="NUTS,MUSTARD &MILK.",
                confidence=0.96,
                bounding_box=[[10, 110], [200, 110], [200, 130], [10, 130]],
            ),
        ]
        parsed = parser.parse(boxes)

        # 1. contains_allergens = ["Wheat", "Soy"]
        assert parsed.contains_allergens == ["Wheat", "Soy"]
        # 2. may_contain_allergens = ["Nuts", "Mustard", "Milk"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]
        # 3. Keep declared allergens separate from precautionary allergens
        assert not any(a in parsed.may_contain_allergens for a in parsed.contains_allergens)
        assert not any(a in parsed.contains_allergens for a in parsed.may_contain_allergens)

    def test_exact_three_box_fragments_horizontally_aligned(self, parser: SectionAwareLabelParser):
        """Verify when Box 1 and Box 2 are horizontally on the same line and Box 3 is on the next line."""
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE:CONTAINS",
                confidence=0.98,
                bounding_box=[[10, 60], [150, 60], [150, 80], [10, 80]],
            ),
            OCRTextBox(
                text="WHEAT & SOY.MAY CONTAIN",
                confidence=0.97,
                bounding_box=[[160, 60], [350, 60], [350, 80], [160, 80]],
            ),
            OCRTextBox(
                text="NUTS,MUSTARD &MILK.",
                confidence=0.96,
                bounding_box=[[10, 85], [200, 85], [200, 105], [10, 105]],
            ),
        ]
        parsed = parser.parse(boxes)

        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]

    def test_metadata_exclusion_batch_mfg_use_by(self, parser: SectionAwareLabelParser):
        """Verify DATE OF MFG, USE BY, and BATCH NO in subsequent boxes are never classified as allergens."""
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE:CONTAINS",
                confidence=0.98,
                bounding_box=[[10, 60], [200, 60], [200, 80], [10, 80]],
            ),
            OCRTextBox(
                text="WHEAT & SOY.MAY CONTAIN",
                confidence=0.97,
                bounding_box=[[10, 85], [200, 85], [200, 105], [10, 105]],
            ),
            OCRTextBox(
                text="NUTS,MUSTARD &MILK.",
                confidence=0.96,
                bounding_box=[[10, 110], [200, 110], [200, 130], [10, 130]],
            ),
            OCRTextBox(
                text="DATE OF MFG: 24/10/2026 BATCH NO: 104 USE BY: 24/04/2027",
                confidence=0.95,
                bounding_box=[[10, 135], [400, 135], [400, 155], [10, 155]],
            ),
        ]
        parsed = parser.parse(boxes)

        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]

        all_allergens = parsed.contains_allergens + parsed.may_contain_allergens
        for forbidden in ["Date", "Mfg", "Batch", "Use By", "24/10/2026", "24/04/2027", "104"]:
            assert not any(forbidden.lower() in a.lower() for a in all_allergens), f"Found {forbidden} in allergens: {all_allergens}"

    def test_metadata_on_same_line_as_may_contain(self, parser: SectionAwareLabelParser):
        """Verify metadata appended on the same box as MAY CONTAIN does not discard the allergens."""
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE:CONTAINS",
                confidence=0.98,
                bounding_box=[[10, 60], [200, 60], [200, 80], [10, 80]],
            ),
            OCRTextBox(
                text="WHEAT & SOY.MAY CONTAIN",
                confidence=0.97,
                bounding_box=[[10, 85], [200, 85], [200, 105], [10, 105]],
            ),
            OCRTextBox(
                text="NUTS,MUSTARD &MILK. DATE OF MFG: 24/10/2026 BATCH NO: 104 USE BY: 24/04/2027",
                confidence=0.96,
                bounding_box=[[10, 110], [500, 110], [500, 130], [10, 130]],
            ),
        ]
        parsed = parser.parse(boxes)

        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]

        all_allergens = parsed.contains_allergens + parsed.may_contain_allergens
        for forbidden in ["Date", "Mfg", "Batch", "Use By"]:
            assert not any(forbidden.lower() in a.lower() for a in all_allergens)

    def test_punctuation_and_missing_spaces_in_allergens(self, parser: SectionAwareLabelParser):
        """Verify tokens are split properly despite missing spaces in ',MUSTARD' and '&MILK.'."""
        tokens = parser.clean_allergen_list("NUTS,MUSTARD &MILK.")
        assert tokens == ["Nuts", "Mustard", "Milk"]


class TestMayContainAllergenBugRegression:
    """Regression tests for the MAY CONTAIN allergen parsing bug on Testo Soya Chaap packaging.

    Verifies:
    1. Direct string 'WHEAT & SOY.MAY CONTAIN NUTS,MUSTARD &MILK.' without explicit CONTAINS keyword
       extracts contains_allergens = ['Wheat', 'Soy'] and may_contain_allergens = ['Nuts', 'Mustard', 'Milk'].
    2. Missing spaces in 'SOY.MAYCONTAIN' and ',MUSTARD &MILK.' are handled.
    3. Multi-box parsing separates ingredients, declared allergens, and precautionary advisories without
       converting 'WHEAT & SOY' into a 7th ingredient.
    4. When OCR omits the precautionary allergen names ('WHEAT & SOY.MAY CONTAIN' without subsequent text),
       may_contain_clause_detected is True, may_contain_incomplete is True, and no allergens are hallucinated.
    5. 'ALLERGEN ADVICE: WHEAT & SOY. MAY CONTAIN: NUTS, MUSTARD & MILK.' matches both clauses.
    """

    def test_wheat_and_soy_may_contain_nuts_mustard_milk_direct_string(
        self, parser: SectionAwareLabelParser
    ):
        """Verify 'WHEAT & SOY.MAY CONTAIN NUTS,MUSTARD &MILK.' parses both sections."""
        boxes = [
            OCRTextBox(
                text="WHEAT & SOY.MAY CONTAIN NUTS,MUSTARD &MILK.",
                confidence=0.97,
                bounding_box=[[10, 50], [500, 50], [500, 70], [10, 70]],
            )
        ]
        parsed = parser.parse(boxes)

        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]
        assert parsed.contains_clause_detected is True
        assert parsed.may_contain_clause_detected is True
        assert parsed.may_contain_incomplete is False

    def test_wheat_and_soy_maycontain_missing_space(
        self, parser: SectionAwareLabelParser
    ):
        """Verify missing space in 'SOY.MAYCONTAIN' is supported."""
        boxes = [
            OCRTextBox(
                text="CONTAINS WHEAT & SOY.MAYCONTAIN NUTS,MUSTARD &MILK.",
                confidence=0.96,
                bounding_box=[[10, 50], [500, 50], [500, 70], [10, 70]],
            )
        ]
        parsed = parser.parse(boxes)

        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]
        assert parsed.contains_clause_detected is True
        assert parsed.may_contain_clause_detected is True
        assert parsed.may_contain_incomplete is False

    def test_three_boxes_no_contains_header_in_box2(
        self, parser: SectionAwareLabelParser
    ):
        """Verify 3 OCR boxes where Box 2 lacks 'CONTAINS' header does not treat allergens as ingredients."""
        boxes = [
            OCRTextBox(
                text="Ingredients: Soy Flour (60%), Whole Wheat Flour, Sugar, Water, Acidity Regulator INS 330, Iodized Salt.",
                confidence=0.96,
                bounding_box=[[10, 10], [600, 10], [600, 30], [10, 30]],
            ),
            OCRTextBox(
                text="WHEAT & SOY.MAY CONTAIN",
                confidence=0.97,
                bounding_box=[[10, 35], [250, 35], [250, 55], [10, 55]],
            ),
            OCRTextBox(
                text="NUTS,MUSTARD &MILK.",
                confidence=0.95,
                bounding_box=[[10, 60], [250, 60], [250, 80], [10, 80]],
            ),
        ]
        parsed = parser.parse(boxes)

        # 1. contains_allergens = ["Wheat", "Soy"]
        assert parsed.contains_allergens == ["Wheat", "Soy"]
        # 2. may_contain_allergens = ["Nuts", "Mustard", "Milk"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]
        # 3. Ingredients text does NOT include WHEAT & SOY
        assert "WHEAT & SOY" not in parsed.ingredients_text
        # 4. Clauses detected
        assert parsed.contains_clause_detected is True
        assert parsed.may_contain_clause_detected is True
        assert parsed.may_contain_incomplete is False

    def test_incomplete_precautionary_advisory_when_ocr_omits_allergens(
        self, parser: SectionAwareLabelParser
    ):
        """Verify incomplete detection when MAY CONTAIN header is read but allergen line was omitted by OCR."""
        boxes = [
            OCRTextBox(
                text="Ingredients: Soy Flour (60%), Whole Wheat Flour, Sugar, Water, Acidity Regulator INS 330, Iodized Salt.",
                confidence=0.96,
                bounding_box=[[10, 10], [600, 10], [600, 30], [10, 30]],
            ),
            OCRTextBox(
                text="ALLERGEN ADVICE:CONTAINS",
                confidence=0.98,
                bounding_box=[[10, 35], [200, 35], [200, 55], [10, 55]],
            ),
            OCRTextBox(
                text="WHEAT & SOY.MAY CONTAIN",
                confidence=0.97,
                bounding_box=[[10, 60], [200, 60], [200, 80], [10, 80]],
            ),
        ]
        parsed = parser.parse(boxes)

        # 1. Preserves declared CONTAINS allergens
        assert parsed.contains_allergens == ["Wheat", "Soy"]
        # 2. Never invents allergens when OCR omits them
        assert parsed.may_contain_allergens == []
        # 3. Correctly flags clause detected on packaging
        assert parsed.contains_clause_detected is True
        assert parsed.may_contain_clause_detected is True
        # 4. Correctly flags advisory as incomplete
        assert parsed.may_contain_incomplete is True

    def test_allergen_advice_without_explicit_contains_keyword(
        self, parser: SectionAwareLabelParser
    ):
        """Verify 'ALLERGEN ADVICE: WHEAT & SOY. MAY CONTAIN: NUTS, MUSTARD & MILK.' parses both."""
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE: WHEAT & SOY. MAY CONTAIN: NUTS, MUSTARD & MILK.",
                confidence=0.97,
                bounding_box=[[10, 50], [500, 50], [500, 70], [10, 70]],
            )
        ]
        parsed = parser.parse(boxes)

        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]
        assert parsed.contains_clause_detected is True
        assert parsed.may_contain_clause_detected is True
        assert parsed.may_contain_incomplete is False

    def test_exact_real_testo_soya_chaap_boxes_with_date_of_mfg_in_right_column(
        self, parser: SectionAwareLabelParser
    ):
        """Verify the exact real Testo Soya Chaap OCR boxes:
        - ALLERGEN ADVICE:CONTAINS (0.974)
        - WHEAT & SOY.MAY CONTAIN (0.9328)
        - NUTS,MUSTARD &MILK. (0.9569)
        - DATE OF MFG (0.9171) in nearby right-hand column at same Y as WHEAT & SOY.MAY CONTAIN
        """
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE:CONTAINS",
                confidence=0.974,
                bounding_box=[[50, 70], [250, 70], [250, 90], [50, 90]],
            ),
            OCRTextBox(
                text="WHEAT & SOY.MAY CONTAIN",
                confidence=0.9328,
                bounding_box=[[50, 100], [250, 100], [250, 120], [50, 120]],
            ),
            OCRTextBox(
                text="DATE OF MFG",
                confidence=0.9171,
                bounding_box=[[400, 105], [550, 105], [550, 125], [400, 125]],
            ),
            OCRTextBox(
                text="NUTS,MUSTARD &MILK.",
                confidence=0.9569,
                bounding_box=[[50, 130], [250, 130], [250, 150], [50, 150]],
            ),
        ]
        parsed = parser.parse(boxes)

        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]
        assert parsed.contains_clause_detected is True
        assert parsed.may_contain_clause_detected is True
        assert parsed.may_contain_incomplete is False

        all_allergens = parsed.contains_allergens + parsed.may_contain_allergens
        for forbidden in ["Date", "Mfg"]:
            assert not any(forbidden.lower() in a.lower() for a in all_allergens)

    def test_allergen_boxes_with_date_of_mfg_interleaved_vertically(
        self, parser: SectionAwareLabelParser
    ):
        """Verify when DATE OF MFG in right column has Y coordinate between Box 2 and Box 3."""
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE:CONTAINS",
                confidence=0.974,
                bounding_box=[[50, 70], [250, 70], [250, 90], [50, 90]],
            ),
            OCRTextBox(
                text="WHEAT & SOY.MAY CONTAIN",
                confidence=0.9328,
                bounding_box=[[50, 100], [250, 100], [250, 120], [50, 120]],
            ),
            OCRTextBox(
                text="DATE OF MFG",
                confidence=0.9171,
                bounding_box=[[400, 115], [550, 115], [550, 135], [400, 135]],
            ),
            OCRTextBox(
                text="NUTS,MUSTARD &MILK.",
                confidence=0.9569,
                bounding_box=[[50, 140], [250, 140], [250, 160], [50, 160]],
            ),
        ]
        parsed = parser.parse(boxes)

        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == ["Nuts", "Mustard", "Milk"]
        assert parsed.contains_clause_detected is True
        assert parsed.may_contain_clause_detected is True
        assert parsed.may_contain_incomplete is False

    def test_genuinely_incomplete_precautionary_advisory_when_nuts_box_absent(
        self, parser: SectionAwareLabelParser
    ):
        """Verify incomplete advisory reported when NUTS,MUSTARD &MILK. is genuinely missing from image."""
        boxes = [
            OCRTextBox(
                text="ALLERGEN ADVICE:CONTAINS",
                confidence=0.974,
                bounding_box=[[50, 70], [250, 70], [250, 90], [50, 90]],
            ),
            OCRTextBox(
                text="WHEAT & SOY.MAY CONTAIN",
                confidence=0.9328,
                bounding_box=[[50, 100], [250, 100], [250, 120], [50, 120]],
            ),
            OCRTextBox(
                text="DATE OF MFG",
                confidence=0.9171,
                bounding_box=[[400, 105], [550, 105], [550, 125], [400, 125]],
            ),
        ]
        parsed = parser.parse(boxes)

        assert parsed.contains_allergens == ["Wheat", "Soy"]
        assert parsed.may_contain_allergens == []
        assert parsed.contains_clause_detected is True
        assert parsed.may_contain_clause_detected is True
        assert parsed.may_contain_incomplete is True





