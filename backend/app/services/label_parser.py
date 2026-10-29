"""Nirikshan AI - Section-Aware Label Parser & Spatial Grouping Service.

Parses OCR-extracted text and bounding boxes into distinct semantic sections:
1. INGREDIENTS (recipe ingredients list)
2. CONTAINS (mandatory direct allergen declarations)
3. MAY CONTAIN (precautionary allergen cross-contact advisories)
4. EXCLUDED / IGNORED (nutrition tables, recipe instructions, brand headers,
   serving sizes, manufacturer & FSSAI license metadata)

Prevents non-ingredient text from creating false UNVERIFIED entries while
preserving raw OCR output for auditability and traceability.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from backend.app.services.ocr_service import OCRTextBox


class ParsedLabelSections(BaseModel):
    """Structured representation of parsed packaging label sections."""

    ingredients_text: str = Field(
        default="",
        description="Clean, concatenated text of the actual ingredients section",
    )
    ingredient_tokens: List[str] = Field(
        default_factory=list,
        description="Individual ingredient tokens extracted from the ingredients section",
    )
    contains_clause_detected: bool = Field(
        default=False,
        description="True if an explicit CONTAINS or ALLERGEN ADVICE clause was detected",
    )
    contains_allergens_text: str = Field(
        default="",
        description="Raw text of the CONTAINS allergen declaration",
    )
    contains_allergens: List[str] = Field(
        default_factory=list,
        description="Individual allergens explicitly declared in the CONTAINS statement",
    )
    may_contain_clause_detected: bool = Field(
        default=False,
        description="True if an explicit MAY CONTAIN cross-contamination advisory was detected",
    )
    may_contain_incomplete: bool = Field(
        default=False,
        description="True if MAY CONTAIN advisory header was detected but allergen tokens could not be read",
    )
    may_contain_text: str = Field(
        default="",
        description="Raw text of the MAY CONTAIN cross-contamination advisory",
    )
    may_contain_allergens: List[str] = Field(
        default_factory=list,
        description="Individual allergens listed in the MAY CONTAIN advisory",
    )
    filtered_sections: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Non-ingredient lines excluded from ingredient matching (nutrition, recipe, legal)",
    )
    unmatched_lines: List[str] = Field(
        default_factory=list,
        description="Lines not classified into ingredients or allergen advisories",
    )


class SectionAwareLabelParser:
    """Parser to identify and separate ingredients, contains, and may-contain sections."""

    # Section Header Regexes
    INGREDIENTS_HEADER_REGEX = re.compile(
        r"(?:^|[\.\;]\s*)(?:LIST\s*OF\s*)?(?:INGREDIENTS?|COMPOSITION)\s*[\:\-\.]*\s*",
        re.IGNORECASE,
    )

    CONTAINS_HEADER_REGEX = re.compile(
        r"(?:^|[\.\;\,\:\-\s]+)(?:ALLERGEN\s*(?:DECLARATION|INFORMATION|ADVICE)\s*[\:\-\.]*(?:CONTAINS|CONTAINS\s*ADDED)?|"
        r"CONTAINS\s*ALLERGENS?|(?<!MAY\s)(?<!MAY)(?:CONTAINS|CONTAINS\s*ADDED))\s*[\:\-\.]*\s*",
        re.IGNORECASE,
    )

    MAY_CONTAIN_HEADER_REGEX = re.compile(
        r"(?:^|[\.\;\,\:\-\s]+)(?:MAY\s*CONTAIN(?:\s*TRACES\s*OF)?|PROCESSED\s*IN\s*A\s*FACILITY\s*THAT\s*(?:ALSO\s*)?PROCESSES|"
        r"MANUFACTURED\s*IN\s*A\s*FACILITY\s*THAT\s*(?:ALSO\s*)?HANDLES|CROSS\s*CONTAMINATION\s*ADVISORY)\s*[\:\-\.]*\s*",
        re.IGNORECASE,
    )

    # Non-Ingredient Patterns to Filter Out
    NUTRITION_HEADER_REGEX = re.compile(
        r"\b(?:NUTRITION(?:AL)?\s*(?:FACTS?|INFORMATION|VALUES?|DECLARATION)|TYPICAL\s*VALUES|APPROXIMATE\s*COMPOSITION)\b",
        re.IGNORECASE,
    )

    NUTRITION_LINE_REGEX = re.compile(
        r"^\s*(?:ENERGY|CALORIES|PROTEIN|CARBOHYDRATE|TOTAL\s*FAT|SATURATED\s*FAT|TRANS\s*FAT|"
        r"CHOLESTEROL|SODIUM|ADDED\s*SUGARS?|TOTAL\s*SUGARS?|DIETARY\s*FIBER|CALCIUM|IRON|VITAMIN)\b"
        r"|^\s*(?:PER\s*(?:100\s*g|SERVE|SERVING)|SERVING\s*SIZE|SERVINGS?\s*PER\s*PACK|%?\s*RDA)\b"
        r"|^\s*[\d\.\,]+\s*(?:kcal|kj|g|mg|mcg|%|ml)\s*$",
        re.IGNORECASE,
    )

    RECIPE_INSTRUCTIONS_REGEX = re.compile(
        r"\b(?:HOW\s*TO\s*(?:COOK|PREPARE|USE)|COOKING\s*INSTRUCTIONS?|DIRECTIONS\s*FOR\s*USE|"
        r"METHOD\s*OF\s*PREPARATION|RECOMMENDED\s*USAGE|PREPARATION\s*METHOD)\b"
        r"|^\s*(?:STEP\s*\d|BOIL\s*\d|ADD\s*(?:NOODLES?|WATER|SEASONING|CONTENTS)|SIMMER\s*FOR|COOK\s*FOR\s*\d|"
        r"SERVE\s*HOT|DRAIN\s*EXCESS\s*WATER|DO\s*NOT\s*CONSUME\s*IF\s*POUCH)\b",
        re.IGNORECASE,
    )

    MANUFACTURING_LEGAL_REGEX = re.compile(
        r"\b(?:MANUFACTURED|MFG|PACKED|MARKETED|PRODUCED)\s*BY\b"
        r"|\b(?:DATE\s*OF\s*(?:MFG|MANUFACTURE|PKD|PACKING)|(?:MFG|MFD|PKD|EXP)\s*(?:DATE|ON)?\b[\:\-\.\s]*)"
        r"|\b(?:FSSAI\s*(?:LIC|NO)?|LIC(?:ENSE)?\s*NO\.?|BATCH\s*NO\.?|LOT\s*NO\.?|PKD\s*ON|USE\s*BY|EXPIRY\s*DATE|BEST\s*BEFORE)\b"
        r"|\b(?:NET\s*(?:WEIGHT|QTY|QUANTITY)|MRP\s*RS?\.?|INCL(?:\.|\s*OF)\s*ALL\s*TAXES)\b"
        r"|\b(?:PACK\s*CONTENTS?|PACKAGE\s*CONTENTS?|NET\s*CONTENTS?|PACK\s*INCLUDES?|READY\s*TO\s*FRY)\b"
        r"|\b(?:CAUTION\s*[\:\-]?\s*DO\s*NOT\s*USE\s*(?:COPPER|BRASS|NICKEL|SILVER|GERMAN)?|DO\s*NOT\s*USE\s*(?:COPPER|BRASS|NICKEL|SILVER|GERMAN))\b"
        r"|\b(?:GERMAN\s*SILVER|SILVER\s*UTENSILS|COPPER\s*UTENSILS|PREPARING\s*OR\s*SERVING\s*THIS\s*PRODUCT)\b"
        r"|\b(?:PRODUCT\s*CATEGORY\s*[\d\.]*\s*[\:\-]?\s*SNACKS?)\b"
        r"|\b(?:STORE\s*IN\s*(?:A\s*)?(?:COOL|DRY|AIR\s*TIGHT)|KEEP\s*REFRIGERATED|CUSTOMER\s*CARE|CONSUMER\s*FEEDBACK)\b"
        r"|\b(?:RECYCLE\s*(?:AFTER\s*USE)?|TRASH\s*RESPONSIBLY|PRODUCT\s*OF\s*INDIA)\b"
        r"|\b(?:A\s*UNIT\s*OF|RESORTS\s*PVT|PLOT\s*NO|KHASRA\s*NO|SEZ|SANGANER|JAIPUR|RAJASTHAN)\b"
        r"|\b(?:TOLL\s*FREE|FEEDBACK|QUERIES|WWW\.|E-MAIL|EMAIL|MAX\.\s*RETAIL\s*PRICE|REFER\s*MANUFACTURER)\b",
        re.IGNORECASE,
    )

    def sort_boxes_spatially(self, boxes: List[OCRTextBox]) -> List[OCRTextBox]:
        """Sorts OCR bounding boxes in standard document reading order.

        Groups lines by vertical position (allowing a tolerance for baseline jitter)
        and then orders boxes horizontally from left to right within each line.
        """
        if not boxes:
            return []

        # Calculate bounding box y_min, y_max, x_min, x_max
        def get_box_bounds(b: OCRTextBox) -> Tuple[float, float, float, float]:
            if not b.bounding_box or len(b.bounding_box) < 4:
                return (0.0, 0.0, 0.0, 0.0)
            xs = [pt[0] for pt in b.bounding_box]
            ys = [pt[1] for pt in b.bounding_box]
            return (min(ys), min(xs), max(ys), max(xs))

        # Sort primarily by vertical coordinate
        indexed_boxes = []
        for b in boxes:
            ymin, xmin, ymax, xmax = get_box_bounds(b)
            height = max(ymax - ymin, 10.0)
            indexed_boxes.append((ymin, xmin, ymax, xmax, height, b))

        indexed_boxes.sort(key=lambda item: (item[0], item[1]))

        # Group boxes into horizontal text lines
        lines: List[List[Tuple[float, float, float, float, float, OCRTextBox]]] = []
        for item in indexed_boxes:
            ymin, xmin, ymax, xmax, height, box = item
            placed = False
            for line in lines:
                line_ymin = line[0][0]
                line_height = line[0][4]
                if abs(ymin - line_ymin) <= (line_height * 0.5):
                    line.append(item)
                    placed = True
                    break
            if not placed:
                lines.append([item])

        # Sort each line left-to-right, then flatten
        sorted_boxes: List[OCRTextBox] = []
        for line in lines:
            line.sort(key=lambda it: it[1])  # sort by xmin
            for it in line:
                sorted_boxes.append(it[5])

        return sorted_boxes

    def group_boxes_into_lines(self, boxes: List[OCRTextBox]) -> List[str]:
        """Groups OCR boxes by vertical line and concatenates horizontally aligned boxes."""
        if not boxes:
            return []

        def get_box_bounds(b: OCRTextBox) -> Tuple[float, float, float, float]:
            if not b.bounding_box or len(b.bounding_box) < 4:
                return (0.0, 0.0, 0.0, 0.0)
            xs = [pt[0] for pt in b.bounding_box]
            ys = [pt[1] for pt in b.bounding_box]
            return (min(ys), min(xs), max(ys), max(xs))

        has_coords = any(
            b.bounding_box and len(b.bounding_box) >= 4 and any(pt[0] != 0 or pt[1] != 0 for pt in b.bounding_box)
            for b in boxes
        )
        if not has_coords:
            return [b.text.strip() for b in boxes if b.text and b.text.strip()]

        indexed_boxes = []
        for b in boxes:
            ymin, xmin, ymax, xmax = get_box_bounds(b)
            height = max(ymax - ymin, 10.0)
            indexed_boxes.append((ymin, xmin, ymax, xmax, height, b))

        indexed_boxes.sort(key=lambda item: (item[0], item[1]))

        spatial_lines: List[List[Tuple[float, float, float, float, float, OCRTextBox]]] = []
        for item in indexed_boxes:
            ymin, xmin, ymax, xmax, height, box = item
            placed = False
            for line in spatial_lines:
                line_ymin = line[0][0]
                line_height = line[0][4]
                # Check vertical alignment with line baseline
                if abs(ymin - line_ymin) <= (line_height * 0.6):
                    # Do not merge if one box is non-ingredient noise (e.g. PACK CONTENTS, NUTRITION)
                    # and the other is an ingredient line
                    incoming_noise = bool(self.is_non_ingredient_noise(box.text))
                    existing_noise = any(bool(self.is_non_ingredient_noise(b[5].text)) for b in line)
                    if incoming_noise != existing_noise:
                        continue

                    # Check horizontal gap: avoid merging text across separate columns or panels
                    min_gap = min(max(xmin - b[3], b[1] - xmax, 0.0) for b in line)
                    max_allowed_gap = max(line_height * 2.0, 35.0)
                    if min_gap <= max_allowed_gap:
                        line.append(item)
                        placed = True
                        break
            if not placed:
                spatial_lines.append([item])

        result_lines: List[str] = []
        for line in spatial_lines:
            line.sort(key=lambda it: it[1])  # sort left-to-right
            line_text = " ".join(it[5].text.strip() for it in line if it[5].text and it[5].text.strip())
            if line_text:
                result_lines.append(line_text)

        return result_lines

    def is_non_ingredient_noise(self, text: str) -> Optional[str]:
        """Identifies if a text line belongs to nutrition, recipe, or legal metadata."""
        cleaned = text.strip()
        if not cleaned:
            return None

        if self.NUTRITION_HEADER_REGEX.search(cleaned) or self.NUTRITION_LINE_REGEX.search(cleaned):
            return "NUTRITION"

        if self.RECIPE_INSTRUCTIONS_REGEX.search(cleaned):
            return "RECIPE_INSTRUCTION"

        if self.MANUFACTURING_LEGAL_REGEX.search(cleaned):
            return "MANUFACTURER_LEGAL"

        return None

    def clean_allergen_list(self, text: str) -> List[str]:
        """Tokenizes and sanitizes allergen strings from CONTAINS or MAY CONTAIN clauses."""
        if not text:
            return []

        # Remove common preamble words
        cleaned = re.sub(
            r"^(?:(?:ALLERGEN\s*(?:DECLARATION|INFORMATION|ADVICE)?|CONTAINS\s*ALLERGENS?)\s*[\:\-\.]*\s*)?"
            r"(?:CONTAINS|MAY\s*CONTAIN|PROCESSED\s*IN\s*A\s*FACILITY|ALSO\s*PROCESSES|ALLERGENS?)\s*[\:\-\.]*\s*",
            "",
            text.strip(),
            flags=re.IGNORECASE,
        )
        # Strip trailing notes like "as allergen", "see bold", etc.
        cleaned = re.sub(r"\s*\(see\s*ingredients\s*in\s*bold\)", "", cleaned, flags=re.IGNORECASE)
        # Clean any embedded MAY CONTAIN if previously concatenated
        cleaned = re.sub(r"\bMAY\s*CONTAIN\b[\:\-\.]*\s*", "", cleaned, flags=re.IGNORECASE)
        # Truncate before manufacturer metadata if present
        meta_match = self.MANUFACTURING_LEGAL_REGEX.search(cleaned) or self.NUTRITION_HEADER_REGEX.search(cleaned)
        if meta_match:
            cleaned = cleaned[:meta_match.start()]

        # Truncate at sub-product headings or recipe headers if merged
        cleaned = re.sub(
            r"\b(?:PURIS|PUDINA\s*PANI|KHATTA\s*MEETHA|KHAJUR\s*IMLI|CHUTNEY\s*POWDER|CEREAL\s*PELLETS)\b.*$",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
        cleaned = cleaned.rstrip(".")

        # Split on periods, commas, semicolons, ampersands, and the word "and"
        parts = re.split(r"[\.,;]|\band\b|&", cleaned, flags=re.IGNORECASE)

        tokens = []
        for p in parts:
            t = p.strip()
            # Strip trailing/leading punctuation
            t = re.sub(r"^[\(\[\{\s\:\-\.]+|[\)\]\}\s\:\-\.]+$", "", t)
            if not t or len(t) < 2 or t.lower().startswith("ins"):
                continue
            # Reject metadata, date, or numeric tokens (including date of mfg, use by, batch no)
            if re.search(
                r"\b(?:mfg|mfd|date|batch|lic|fssai|pkg|pkd|exp|expiry|mrp|rs|net|weight|qty|use\s*by|best\s*before|lot)\b",
                t,
                re.IGNORECASE,
            ):
                continue
            if re.search(r"\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}", t):
                continue

            t_lower = t.lower()
            # If token contains non-allergen sub-product/spice keywords alongside an allergen, isolate the allergen
            if re.search(r"\b(?:powder|pani|chutney|puris|pellets|50g|snacks)\b", t_lower):
                matched_canonical = None
                for kw in ("gluten", "wheat", "soy", "soya", "milk", "peanut", "mustard", "tree nut", "nuts", "sesame"):
                    if re.search(rf"\b{kw}\b", t_lower):
                        matched_canonical = kw.capitalize()
                        break
                if matched_canonical and matched_canonical not in tokens:
                    tokens.append(matched_canonical)
            else:
                title_token = t.title()
                if title_token not in tokens:
                    tokens.append(title_token)

        return tokens

    def parse(self, boxes: List[OCRTextBox]) -> ParsedLabelSections:
        """Parses spatially ordered OCR text boxes into distinct semantic sections."""
        lines = self.group_boxes_into_lines(boxes)

        ingredients_parts: List[str] = []
        contains_parts: List[str] = []
        may_contain_parts: List[str] = []
        filtered_sections: List[Dict[str, str]] = []
        unmatched_lines: List[str] = []

        contains_clause_detected = False
        may_contain_clause_detected = False

        current_section = "NONE"  # States: NONE, INGREDIENTS, CONTAINS, MAY_CONTAIN

        for line in lines:
            # Check for allergen headers or ingredients header first
            has_allergen_header = bool(self.CONTAINS_HEADER_REGEX.search(line) or self.MAY_CONTAIN_HEADER_REGEX.search(line))
            has_ing_header = bool(self.INGREDIENTS_HEADER_REGEX.search(line))

            # Only discard as pure noise if no section header is present AND we are not inside an allergen section
            if not has_allergen_header and not has_ing_header:
                if current_section not in ("CONTAINS", "MAY_CONTAIN"):
                    noise_type = self.is_non_ingredient_noise(line)
                    if noise_type:
                        filtered_sections.append({"type": noise_type, "text": line})
                        if current_section == "INGREDIENTS":
                            current_section = "NONE"
                        continue

            # Detect presence of allergen headers anywhere in the line
            c_match = self.CONTAINS_HEADER_REGEX.search(line)
            mc_match = self.MAY_CONTAIN_HEADER_REGEX.search(line)

            # Case A: Line contains BOTH CONTAINS and MAY CONTAIN
            # e.g. "ALLERGEN ADVICE: CONTAINS WHEAT & SOY. MAY CONTAIN NUTS, MUSTARD & MILK."
            if c_match and mc_match:
                contains_clause_detected = True
                may_contain_clause_detected = True
                if c_match.start() < mc_match.start():
                    # Prefix before CONTAINS (if any)
                    prefix = line[:c_match.start()].strip(" .;,-")
                    if prefix:
                        if current_section == "CONTAINS":
                            contains_parts.append(prefix)
                        elif current_section == "MAY_CONTAIN":
                            may_contain_parts.append(prefix)
                        elif current_section == "INGREDIENTS":
                            ingredients_parts.append(prefix)

                    # Text between CONTAINS and MAY CONTAIN
                    c_text = line[c_match.end():mc_match.start()].strip(" .;,-")
                    c_noise = self.MANUFACTURING_LEGAL_REGEX.search(c_text) or self.NUTRITION_HEADER_REGEX.search(c_text)
                    if c_noise:
                        c_text = c_text[:c_noise.start()].strip(" .;,-")
                    if c_text:
                        contains_parts.append(c_text)

                    # Text after MAY CONTAIN
                    mc_text = line[mc_match.end():].strip(" .;,-")
                    mc_noise = self.MANUFACTURING_LEGAL_REGEX.search(mc_text) or self.NUTRITION_HEADER_REGEX.search(mc_text)
                    if mc_noise:
                        mc_text = mc_text[:mc_noise.start()].strip(" .;,-")
                    if mc_text:
                        may_contain_parts.append(mc_text)

                    if (mc_text and line.strip().endswith(".")) or mc_noise:
                        current_section = "NONE"
                    else:
                        current_section = "MAY_CONTAIN"
                    continue
                else:
                    # MAY CONTAIN appears before CONTAINS
                    prefix = line[:mc_match.start()].strip(" .;,-")
                    if prefix:
                        if current_section == "CONTAINS":
                            contains_parts.append(prefix)
                        elif current_section == "MAY_CONTAIN":
                            may_contain_parts.append(prefix)
                        elif current_section == "INGREDIENTS":
                            ingredients_parts.append(prefix)

                    mc_text = line[mc_match.end():c_match.start()].strip(" .;,-")
                    mc_noise = self.MANUFACTURING_LEGAL_REGEX.search(mc_text) or self.NUTRITION_HEADER_REGEX.search(mc_text)
                    if mc_noise:
                        mc_text = mc_text[:mc_noise.start()].strip(" .;,-")
                    if mc_text:
                        may_contain_parts.append(mc_text)

                    c_text = line[c_match.end():].strip(" .;,-")
                    c_noise = self.MANUFACTURING_LEGAL_REGEX.search(c_text) or self.NUTRITION_HEADER_REGEX.search(c_text)
                    if c_noise:
                        c_text = c_text[:c_noise.start()].strip(" .;,-")
                    if c_text:
                        contains_parts.append(c_text)

                    if (c_text and line.strip().endswith(".")) or c_noise:
                        current_section = "NONE"
                    else:
                        current_section = "CONTAINS"
                    continue

            # Case B: Line contains MAY CONTAIN only
            if mc_match:
                may_contain_clause_detected = True
                prefix = line[:mc_match.start()].strip(" .;,-")
                if prefix:
                    if current_section == "CONTAINS":
                        contains_parts.append(prefix)
                    elif current_section == "MAY_CONTAIN":
                        may_contain_parts.append(prefix)
                    elif current_section in ("NONE", "INGREDIENTS"):
                        # If prefix has an explicit INGREDIENTS header, keep it in ingredients
                        if self.INGREDIENTS_HEADER_REGEX.search(prefix):
                            ingredients_parts.append(prefix)
                        else:
                            # Preceding text before MAY CONTAIN on a label is direct allergen declaration
                            # e.g. "WHEAT & SOY.MAY CONTAIN" or "ALLERGEN ADVICE: WHEAT & SOY.MAY CONTAIN"
                            contains_parts.append(prefix)
                            contains_clause_detected = True

                mc_text = line[mc_match.end():].strip()
                mc_noise = self.MANUFACTURING_LEGAL_REGEX.search(mc_text) or self.NUTRITION_HEADER_REGEX.search(mc_text)
                if mc_noise:
                    mc_text = mc_text[:mc_noise.start()].strip(" .;,-")
                if mc_text:
                    may_contain_parts.append(mc_text)

                if mc_text and (line.strip().endswith(".") or mc_noise):
                    current_section = "NONE"
                else:
                    current_section = "MAY_CONTAIN"
                continue

            # Case C: Line contains CONTAINS only
            if c_match:
                contains_clause_detected = True
                prefix = line[:c_match.start()].strip(" .;,-")
                if prefix:
                    if current_section == "MAY_CONTAIN":
                        may_contain_parts.append(prefix)
                    elif current_section == "CONTAINS":
                        contains_parts.append(prefix)
                    elif current_section == "INGREDIENTS":
                        ingredients_parts.append(prefix)

                c_text = line[c_match.end():].strip()
                c_noise = self.MANUFACTURING_LEGAL_REGEX.search(c_text) or self.NUTRITION_HEADER_REGEX.search(c_text)
                if c_noise:
                    c_text = c_text[:c_noise.start()].strip(" .;,-")
                if c_text:
                    contains_parts.append(c_text)

                if c_text and (line.strip().endswith(".") or c_noise):
                    current_section = "NONE"
                else:
                    current_section = "CONTAINS"
                continue

            # Case D: Line contains INGREDIENTS header
            ing_match = self.INGREDIENTS_HEADER_REGEX.search(line)
            if ing_match:
                current_section = "INGREDIENTS"
                content = line[ing_match.end():].strip()
                if content:
                    ingredients_parts.append(content)
                continue

            # Case E: Continuation lines based on current active section
            if current_section == "INGREDIENTS":
                ingredients_parts.append(line)
            elif current_section == "CONTAINS":
                c_noise = self.MANUFACTURING_LEGAL_REGEX.search(line) or self.NUTRITION_HEADER_REGEX.search(line)
                if c_noise:
                    valid_text = line[:c_noise.start()].strip(" .;,-")
                    if valid_text:
                        contains_parts.append(valid_text)
                    noise_text = line[c_noise.start():].strip()
                    if noise_text:
                        filtered_sections.append({"type": "MANUFACTURER_LEGAL", "text": noise_text})
                    if valid_text or contains_parts:
                        current_section = "NONE"
                else:
                    contains_parts.append(line)
                    if line.strip().endswith("."):
                        current_section = "NONE"
            elif current_section == "MAY_CONTAIN":
                mc_noise = self.MANUFACTURING_LEGAL_REGEX.search(line) or self.NUTRITION_HEADER_REGEX.search(line)
                if mc_noise:
                    valid_text = line[:mc_noise.start()].strip(" .;,-")
                    if valid_text:
                        may_contain_parts.append(valid_text)
                    noise_text = line[mc_noise.start():].strip()
                    if noise_text:
                        filtered_sections.append({"type": "MANUFACTURER_LEGAL", "text": noise_text})
                    if valid_text or may_contain_parts:
                        current_section = "NONE"
                else:
                    may_contain_parts.append(line)
                    if line.strip().endswith("."):
                        current_section = "NONE"
            else:
                unmatched_lines.append(line)

        # Fallback 1: If may_contain clause was detected but no allergens captured, recover from unmatched lines
        if may_contain_clause_detected and not may_contain_parts and unmatched_lines:
            rem_unmatched = []
            for u_line in unmatched_lines:
                cand_allergens = self.clean_allergen_list(u_line)
                if cand_allergens:
                    may_contain_parts.append(u_line)
                else:
                    rem_unmatched.append(u_line)
            unmatched_lines = rem_unmatched

        # Fallback 2: If contains clause was detected but no allergens captured, recover from unmatched lines
        if contains_clause_detected and not contains_parts and unmatched_lines:
            rem_unmatched = []
            for u_line in unmatched_lines:
                cand_allergens = self.clean_allergen_list(u_line)
                if cand_allergens:
                    contains_parts.append(u_line)
                else:
                    rem_unmatched.append(u_line)
            unmatched_lines = rem_unmatched

        # Fallback: If no explicit INGREDIENTS header was found,
        # treat remaining unmatched lines as candidate ingredients if they look like ingredients
        if not ingredients_parts and unmatched_lines:
            candidate_lines = []
            for line in unmatched_lines:
                if len(line) > 3 and not self.is_non_ingredient_noise(line):
                    candidate_lines.append(line)
            ingredients_parts = candidate_lines
            unmatched_lines = []

        # Join ingredients lines safely, ensuring line-wrap omissions don't concatenate ingredients
        joined_ing_parts: List[str] = []
        for i, part in enumerate(ingredients_parts):
            p = part.strip()
            if not p:
                continue
            if i < len(ingredients_parts) - 1 and not p.endswith((",", ";", "-", "(")):
                joined_ing_parts.append(p + ",")
            else:
                joined_ing_parts.append(p)

        ingredients_full_text = " ".join(joined_ing_parts).strip()
        contains_full_text = " ".join(contains_parts).strip()
        may_contain_full_text = " ".join(may_contain_parts).strip()

        # Tokenize allergens
        contains_allergens = self.clean_allergen_list(contains_full_text)
        may_contain_allergens = self.clean_allergen_list(may_contain_full_text)

        contains_clause_detected = contains_clause_detected or bool(contains_allergens)
        may_contain_clause_detected = may_contain_clause_detected or bool(may_contain_allergens)
        may_contain_incomplete = bool(may_contain_clause_detected and not may_contain_allergens)

        return ParsedLabelSections(
            ingredients_text=ingredients_full_text,
            contains_clause_detected=contains_clause_detected,
            contains_allergens_text=contains_full_text,
            contains_allergens=contains_allergens,
            may_contain_clause_detected=may_contain_clause_detected,
            may_contain_incomplete=may_contain_incomplete,
            may_contain_text=may_contain_full_text,
            may_contain_allergens=may_contain_allergens,
            filtered_sections=filtered_sections,
            unmatched_lines=unmatched_lines,
        )

    ALLERGEN_CANONICAL_MAP = {
        "gluten": ["gluten", "wheat", "maida", "atta", "barley", "oats", "rye", "spelt", "cereals containing gluten"],
        "wheat": ["gluten", "wheat", "maida", "atta"],
        "peanut": ["peanut", "peanuts", "groundnut", "mungfali"],
        "soy": ["soy", "soya", "soybean", "soy lecithin", "soy flour", "soya flour"],
        "milk": ["milk", "milk solids", "dairy", "whey", "curd", "paneer", "dahi", "casein", "butter", "cheese", "lactose"],
        "tree_nut": ["tree nut", "tree nuts", "nuts", "nut", "almond", "cashew", "walnut", "badam", "kaju", "akhrot", "pistachio", "pista", "hazelnut"],
        "mustard": ["mustard", "mustard seeds", "sarson", "rai"],
        "egg": ["egg", "eggs", "egg albumin", "egg powder"],
        "fish": ["fish", "fish products"],
        "crustacean": ["crustacean", "crustaceans", "prawn", "shrimp", "crab", "lobster"],
        "sulphite": ["sulphite", "sulphites", "sulphur dioxide"],
    }

    def match_declared_allergen_to_profile(
        self, declared_allergen: str, profile_allergies: List[str]
    ) -> bool:
        """Checks if a declared allergen matches any configured profile allergy."""
        decl_clean = declared_allergen.strip().lower()
        for prof_allergy in profile_allergies:
            p_code = prof_allergy.strip().lower()
            if p_code in self.ALLERGEN_CANONICAL_MAP:
                keywords = self.ALLERGEN_CANONICAL_MAP[p_code]
                if any(kw in decl_clean or decl_clean in kw for kw in keywords):
                    return True
            else:
                if p_code in decl_clean or decl_clean in p_code:
                    return True
        return False


# Global singleton instance
label_parser = SectionAwareLabelParser()

