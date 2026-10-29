"""Nirikshan AI - Ingredient and Additive Normalizer Service.

Normalizes ingredient strings, vernacular aliases, and verified INS/E-numbers
against a curated reference dataset. Explicitly flags UNCLEAR for ambiguous
tokens and UNVERIFIED for tokens without verified reference data.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NormalizedIngredient(BaseModel):
    """Structured representation of a processed ingredient token."""

    raw_text: str
    status: str = Field(
        ...,
        description="Normalization status: 'NORMALIZED', 'UNVERIFIED', or 'UNCLEAR'",
    )
    prd_match_status: str = Field(
        default="EXACT",
        description="PRD 7.3 status: 'EXACT', 'SYNONYM', 'PROBABLE', 'AMBIGUOUS', or 'UNKNOWN'",
    )
    canonical_name: Optional[str] = None
    canonical_id: Optional[str] = None
    ins_code: Optional[str] = None
    matched_alias: Optional[str] = None
    category: Optional[str] = None
    allergens: List[str] = Field(default_factory=list)
    is_vegetarian: Optional[bool] = None
    evidence: Optional[Dict[str, Any]] = None
    uncertainty_reason: Optional[str] = None


class IngredientNormalizer:
    """Service to normalize ingredients, aliases, and INS codes."""

    # Regex to detect INS or E codes, e.g. "INS 621", "E-102", "INS 322(i)", "INS 500(ii)"
    INS_REGEX = re.compile(
        r"\b(?:INS|E)[\s\-\.]*(\d{3,4}(?:\([a-z0-9]+\)|[a-z0-9]+)?)(?!\w)",
        re.IGNORECASE,
    )

    # Regex to detect standalone numeric codes in parentheses, e.g. "(621)"
    PAREN_NUMERIC_REGEX = re.compile(
        r"\(\s*(\d{3,4}(?:\([a-z0-9]+\)|[a-z0-9]+)?)\s*\)",
        re.IGNORECASE,
    )

    # Markers of unreadable, ambiguous or corrupted OCR text
    AMBIGUOUS_PATTERNS = [
        re.compile(r"\?{1,}"),                     # One or more question marks
        re.compile(r"\[unclear\]", re.IGNORECASE),
        re.compile(r"\[unreadable\]", re.IGNORECASE),
        re.compile(r"\b(?:unclear|unreadable|obscured)\b", re.IGNORECASE),
        re.compile(r"^[_\-\.\,\:\;\*\#\s]+$"),     # Punctuation/symbols only
    ]

    def __init__(self, data_path: Optional[Path | str] = None) -> None:
        if data_path is None:
            # Default to data/curated/ingredient_aliases.json in workspace
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            data_path = base_dir / "data" / "curated" / "ingredient_aliases.json"

        self.data_path = Path(data_path)
        self.metadata: Dict[str, Any] = {}
        self.allergens: Dict[str, Any] = {}
        self.canonical_ingredients: Dict[str, Any] = {}
        self.aliases: Dict[str, str] = {}
        self.ins_codes: Dict[str, Any] = {}

        self._load_dataset()

    def _load_dataset(self) -> None:
        """Loads curated JSON reference dataset."""
        if not self.data_path.exists():
            raise FileNotFoundError(
                f"Curated ingredient dataset not found at: {self.data_path}"
            )

        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.metadata = data.get("metadata", {})
        self.allergens = data.get("allergens", {})
        self.canonical_ingredients = data.get("canonical_ingredients", {})
        self.aliases = {k.lower(): v for k, v in data.get("aliases", {}).items()}
        self.ins_codes = {k.lower(): v for k, v in data.get("ins_codes", {}).items()}

    def is_ambiguous(self, text: str) -> bool:
        """Determines if the raw token is ambiguous, corrupted, or unreadable."""
        cleaned = text.strip()
        if not cleaned:
            return True

        # Check for empty token or tokens with less than 2 alphanumeric characters unless it's a known short code
        alnum_chars = [c for c in cleaned if c.isalnum()]
        if len(alnum_chars) < 2:
            return True

        for pattern in self.AMBIGUOUS_PATTERNS:
            if pattern.search(cleaned):
                return True

        # Malformed INS prefixes without valid numbers, e.g. "INS", "INS-", "E"
        if re.fullmatch(r"(?:INS|E)[\s\-\.]*", cleaned, re.IGNORECASE):
            return True

        return False

    def extract_ins_code(self, text: str) -> Optional[str]:
        """Extracts normalized INS code from text if present."""
        match = self.INS_REGEX.search(text)
        if match:
            return match.group(1).lower()

        paren_match = self.PAREN_NUMERIC_REGEX.search(text)
        if paren_match:
            candidate = paren_match.group(1).lower()
            if candidate in self.ins_codes:
                return candidate

        return None

    def normalize(self, raw_text: str) -> NormalizedIngredient:
        """Normalizes an ingredient string into a structured NormalizedIngredient."""
        if not isinstance(raw_text, str):
            return NormalizedIngredient(
                raw_text=str(raw_text),
                status="UNCLEAR",
                uncertainty_reason="Input token is not a valid string",
            )

        token = raw_text.strip()

        # 1. Ambiguity Guard: Return UNCLEAR immediately
        if self.is_ambiguous(token):
            return NormalizedIngredient(
                raw_text=raw_text,
                status="UNCLEAR",
                prd_match_status="AMBIGUOUS",
                uncertainty_reason="Token is ambiguous, unreadable, or corrupted",
            )

        # 2. INS / E-Number Additive Check
        ins_code = self.extract_ins_code(token)
        if ins_code:
            # Check if this INS code exists in the verified database
            ins_info = self.ins_codes.get(ins_code)
            if ins_info:
                return NormalizedIngredient(
                    raw_text=raw_text,
                    status="NORMALIZED",
                    prd_match_status="EXACT",
                    canonical_name=ins_info["canonical_name"],
                    canonical_id=f"ins_{ins_code}",
                    ins_code=ins_info["ins_number"],
                    matched_alias=token,
                    category="additive",
                    allergens=ins_info.get("allergens", []),
                    is_vegetarian=ins_info.get("is_vegetarian", True),
                    evidence=ins_info.get("source"),
                )
            else:
                # Additive format recognized, but not verified in our database
                return NormalizedIngredient(
                    raw_text=raw_text,
                    status="UNVERIFIED",
                    prd_match_status="UNKNOWN",
                    ins_code=ins_code,
                    canonical_name=f"Additive INS {ins_code.upper()}",
                    uncertainty_reason=f"INS {ins_code.upper()} is not present in the curated FSSAI reference database",
                )

        # 3. Direct Alias & Canonical Lookup
        cleaned_token = re.sub(r"\s+", " ", token).lower()

        # Handle OCR missing spaces (e.g. "WheatFlour" -> "wheat flour")
        cleaned_token = re.sub(r"([a-z])([A-Z])", r"\1 \2", cleaned_token)
        cleaned_token = re.sub(r"\bwhole\s*wheatflour\b", "whole wheat flour", cleaned_token)
        cleaned_token = re.sub(r"\bwheatflour\b", "wheat flour", cleaned_token)
        cleaned_token = re.sub(r"\bsoya?flour\b", "soy flour", cleaned_token)
        cleaned_token = re.sub(r"\bpalmoil\b", "palm oil", cleaned_token)
        cleaned_token = re.sub(r"\biodizedsalt\b", "iodized salt", cleaned_token)
        cleaned_token = re.sub(r"\blodi[zs]ed\s*salt\b", "iodized salt", cleaned_token)

        # Strip percentage expressions (e.g. "(60%)", "60%", "(40.5 %)")
        token_no_percent = re.sub(r"\s*\(\s*\d+(?:\.\d+)?\s*%\s*\)", "", cleaned_token).strip()
        token_no_percent = re.sub(r"\s+\d+(?:\.\d+)?\s*%", "", token_no_percent).strip()

        # Try exact alias lookup with percentage-stripped text first, then full cleaned token
        for candidate in (token_no_percent, cleaned_token):
            canonical_id = self.aliases.get(candidate)
            if canonical_id and canonical_id in self.canonical_ingredients:
                return self._build_canonical_result(raw_text, candidate, canonical_id)

            if candidate in self.canonical_ingredients:
                return self._build_canonical_result(raw_text, candidate, candidate)

        # 4. Parenthetical Decomposition (e.g. "Refined Wheat Flour (Maida)", "Soy Flour (60%)")
        paren_match = re.search(r"^(.*?)\s*\((.*?)\)\s*$", token)
        if paren_match:
            outer_part = paren_match.group(1).strip().lower()
            inner_part = paren_match.group(2).strip().lower()

            # Normalize OCR spelling in outer part
            outer_part = re.sub(r"\bwhole\s*wheatflour\b", "whole wheat flour", outer_part)
            outer_part = re.sub(r"\bwheatflour\b", "wheat flour", outer_part)
            outer_part = re.sub(r"\bsoya?flour\b", "soy flour", outer_part)

            # If inner part is just a percentage (e.g. "60%"), outer part is the ingredient
            if re.match(r"^\d+(?:\.\d+)?\s*%$", inner_part):
                if outer_part in self.aliases:
                    return self._build_canonical_result(
                        raw_text, outer_part, self.aliases[outer_part]
                    )
                if outer_part in self.canonical_ingredients:
                    return self._build_canonical_result(
                        raw_text, outer_part, outer_part
                    )

            # Check inner alias first (e.g., "(Maida)", "(Palm Oil)")
            if inner_part in self.aliases:
                return self._build_canonical_result(
                    raw_text, inner_part, self.aliases[inner_part]
                )

            # Check outer part (e.g., "Refined Wheat Flour")
            if outer_part in self.aliases:
                return self._build_canonical_result(
                    raw_text, outer_part, self.aliases[outer_part]
                )

        # 5. Unverified Fallback: Clear text but no verified record
        return NormalizedIngredient(
            raw_text=raw_text,
            status="UNVERIFIED",
            prd_match_status="UNKNOWN",
            canonical_name=token,
            uncertainty_reason="No verified entry found in curated database",
        )

    def _build_canonical_result(
        self, raw_text: str, matched_alias: str, canonical_id: str
    ) -> NormalizedIngredient:
        """Constructs a NormalizedIngredient from verified canonical data."""
        canonical_info = self.canonical_ingredients[canonical_id]
        canonical_name = canonical_info["canonical_name"]
        is_synonym = matched_alias.strip().lower() != canonical_name.strip().lower()
        prd_status = "SYNONYM" if is_synonym else "EXACT"

        return NormalizedIngredient(
            raw_text=raw_text,
            status="NORMALIZED",
            prd_match_status=prd_status,
            canonical_name=canonical_name,
            canonical_id=canonical_info["id"],
            matched_alias=matched_alias,
            category=canonical_info.get("category"),
            allergens=canonical_info.get("allergens", []),
            is_vegetarian=canonical_info.get("is_vegetarian", True),
            evidence=canonical_info.get("source"),
        )

    def split_ingredients(self, text: str) -> List[str]:
        """Splits an ingredient text into distinct ingredient and additive tokens.

        Handles standard punctuation (commas, semicolons), OCR missing spacing/punctuation,
        and conjunctions ('&', 'and') while preserving functional additive classes and parentheses.
        """
        if not text:
            return []

        # Remove "Ingredients:" or "Contains:" prefix if present
        clean_text = re.sub(
            r"^(?:ingredients|contains|contains permitted)[\s\:\-]+",
            "",
            text.strip(),
            flags=re.IGNORECASE,
        )

        # 1. Strip sub-product category headings ending with colon
        # (e.g. "Puris :", "Pudina Pani Powder :", "Khajur Imli Chutney Powder :", "Product category 15.1 : Snacks")
        clean_text = re.sub(r"(?i)\b(?:Puris|Pudina\s*Pani\s*Powder|Khatta\s*Meetha\s*Imli\s*Pani\s*Powder|Khajur\s*Imli\s*Chutney\s*Powder|Seasoning(?:\s*Mix)?|Noodles)\s*[\:\-]+", ", ", clean_text)
        clean_text = re.sub(r"(?i)\b(?:Product\s*category[^\:\,\;]*)\s*[\:\-]+[^\,\;]*", "", clean_text)
        clean_text = re.sub(r"(?i)\b(?:PACK\s*CONTENTS?|PACKCONTENTS)[^\,\;]*", "", clean_text)
        clean_text = re.sub(r"(?i)\b(?:Ready\s*to\s*fry\s*\d+\s*pcs[^\,\;]*)", "", clean_text)
        clean_text = re.sub(r"(?i)\b(?:Allergy\s*Advice\s*[\—\-\:]\s*Contains\s*Gluten)", "", clean_text)

        # 2. Conservative OCR Spacing & Typo Fixes
        clean_text = re.sub(r"(?i)\bwhole\s*wheatflour\b", "Whole Wheat Flour", clean_text)
        clean_text = re.sub(r"(?i)\bwheatflour\b", "Wheat Flour", clean_text)
        clean_text = re.sub(r"(?i)\bsoya?flour\b", "Soy Flour", clean_text)
        clean_text = re.sub(r"(?i)\bpalmoil\b", "Palm Oil", clean_text)
        clean_text = re.sub(r"(?i)\biodizedsalt\b", "Iodized Salt", clean_text)
        clean_text = re.sub(r"(?i)\blodi[zs]ed\s*salt\b", "Iodized Salt", clean_text)
        clean_text = re.sub(r"(?i)\bSermolina\b", "Semolina", clean_text)
        clean_text = re.sub(r"(?i)\bSabin\s*Hydogen\s*Carbonate\b", "Sodium Hydrogen Carbonate", clean_text)
        clean_text = re.sub(r"(?i)\bINS\s*500\s*\((?:ll|11)\)", "INS 500(ii)", clean_text)
        clean_text = re.sub(r"(?i)\bTapioca\s*Starch\s*Iodised\s*Salt\b", "Tapioca Starch, Iodized Salt", clean_text)
        clean_text = re.sub(r"(?i)\bTapioca\s*Starch\s*Iodized\s*Salt\b", "Tapioca Starch, Iodized Salt", clean_text)

        # 3. Split compound ingredients concatenated without punctuation
        # (e.g. "Whole Wheat Flour Sugar" -> "Whole Wheat Flour, Sugar")
        clean_text = re.sub(
            r"(?i)\b(Whole\s*Wheat\s*Flour|Refined\s*Wheat\s*Flour|Wheat\s*Flour|Soy\s*Flour)\s+(Sugar|Iodized\s*Salt|lodized\s*Salt|Salt|Water)\b",
            r"\1, \2",
            clean_text,
        )
        # (e.g. "Water Acidity Regulator INS 330" -> "Water, Acidity Regulator INS 330")
        clean_text = re.sub(
            r"(?i)\b(Water|Sugar|Salt)\s+(Acidity\s*Regulator|Emulsifier|Stabilizer|Antioxidant|Flavour\s*Enhancer|Preservative|Colour|Color|Anti-Caking\s*Agent)\b",
            r"\1, \2",
            clean_text,
        )

        # 4. First-pass split by commas and semicolons outside parentheses and brackets
        raw_chunks: List[str] = []
        current: List[str] = []
        paren_depth = 0

        for char in clean_text:
            if char in ("(", "["):
                paren_depth += 1
                current.append(char)
            elif char in (")", "]"):
                if paren_depth > 0:
                    paren_depth -= 1
                current.append(char)
            elif char in (",", ";") and paren_depth == 0:
                chunk = "".join(current).strip()
                if chunk:
                    raw_chunks.append(chunk)
                current = []
            else:
                current.append(char)

        last_chunk = "".join(current).strip()
        if last_chunk:
            raw_chunks.append(last_chunk)

        # 5. Second-pass: Split conjunctions ('&', 'and') and clean unmatched brackets
        tokens: List[str] = []
        functional_adj_regex = re.compile(
            r"^(?:emulsifying|stabilizing|raising|anticaking|anti-caking|thickening|gelling|glazing|acidity)\b",
            re.IGNORECASE,
        )

        for chunk in raw_chunks:
            # Clean unmatched brackets or parentheses from OCR
            item_str = chunk.strip()
            if item_str.endswith(")") and "(" not in item_str:
                item_str = item_str[:-1].strip()
            if item_str.startswith("(") and ")" not in item_str:
                item_str = item_str[1:].strip()
            if item_str.endswith("]") and "[" not in item_str:
                item_str = item_str[:-1].strip()
            if item_str.startswith("[") and "]" not in item_str:
                item_str = item_str[1:].strip()

            if not item_str:
                continue

            # If chunk has no brackets/parentheses, check for '&' or 'and'
            if "(" not in item_str and ")" not in item_str and "[" not in item_str and "]" not in item_str:
                if " & " in item_str:
                    subparts = item_str.split(" & ")
                    for sp in subparts:
                        spt = sp.strip().rstrip(" .,;")
                        if spt:
                            tokens.append(spt)
                    continue

                if re.search(r"\band\b", item_str, re.IGNORECASE):
                    subparts = re.split(r"\s+\band\b\s+", item_str, flags=re.IGNORECASE)
                    if len(subparts) == 2 and functional_adj_regex.search(subparts[0].strip()):
                        tokens.append(item_str.rstrip(" .,;"))
                    else:
                        for sp in subparts:
                            spt = sp.strip().rstrip(" .,;")
                            if spt:
                                tokens.append(spt)
                    continue

            cleaned_item = item_str.strip().rstrip(" .,;")
            if cleaned_item:
                tokens.append(cleaned_item)

        return tokens

    def normalize_list(self, input_data: List[str] | str) -> List[NormalizedIngredient]:
        """Normalizes a list of ingredient strings or a comma-separated paragraph."""
        if isinstance(input_data, str):
            tokens = self.split_ingredients(input_data)
        else:
            tokens = input_data

        return [self.normalize(tok) for tok in tokens]


# Global singleton instance for easy import
normalizer = IngredientNormalizer()
