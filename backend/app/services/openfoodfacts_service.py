"""Nirikshan AI - Open Food Facts Product Lookup Service.

Queries local seed database first, then falls back to Open Food Facts live public REST API (v2).
Provides existing product reference without requiring local storage of the entire 50GB database.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import requests

logger = logging.getLogger(__name__)


class OFFProductReference(BaseModel):
    """Reference product details from Open Food Facts."""

    found: bool = False
    barcode: str
    product_name: Optional[str] = None
    brand: Optional[str] = None
    generic_name: Optional[str] = None
    quantity: Optional[str] = None
    categories: Optional[str] = None
    ingredients_text: Optional[str] = None
    contains_allergens: List[str] = Field(default_factory=list)
    may_contain_allergens: List[str] = Field(default_factory=list)
    nutrition_facts: Dict[str, Any] = Field(default_factory=dict)
    fssai_lic_no: Optional[str] = None
    source: str = "NOT_FOUND"  # OPEN_FOOD_FACTS_LOCAL_SEED, OPEN_FOOD_FACTS_LIVE_API, NOT_FOUND
    reference_url: Optional[str] = None


class OpenFoodFactsService:
    """Service to resolve packaged food details by barcode via Open Food Facts."""

    def __init__(self, seed_path: Optional[Path | str] = None) -> None:
        if seed_path is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            seed_path = base_dir / "data" / "openfoodfacts" / "india_products_seed.json"
        self.seed_path = Path(seed_path)
        self.seed_products: Dict[str, Dict[str, Any]] = {}
        self._load_seed()

    def _load_seed(self) -> None:
        """Loads curated seed products from JSON."""
        if self.seed_path.exists():
            try:
                with open(self.seed_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.seed_products = data.get("products", {})
                    logger.info("Loaded %d seed products from %s", len(self.seed_products), self.seed_path)
            except Exception as err:
                logger.error("Failed to load seed products: %s", err)

    def lookup_barcode(self, barcode: str, timeout_sec: float = 4.0) -> OFFProductReference:
        """Looks up a barcode in local seed first, then live Open Food Facts API."""
        cleaned_barcode = barcode.strip().replace(" ", "")
        if not cleaned_barcode:
            return OFFProductReference(found=False, barcode=barcode, source="INVALID_BARCODE")

        # 1. Local Curated Seed Lookup
        if cleaned_barcode in self.seed_products:
            p = self.seed_products[cleaned_barcode]
            return OFFProductReference(
                found=True,
                barcode=cleaned_barcode,
                product_name=p.get("product_name"),
                brand=p.get("brands"),
                generic_name=p.get("generic_name"),
                quantity=p.get("quantity"),
                categories=p.get("categories"),
                ingredients_text=p.get("ingredients_text"),
                contains_allergens=p.get("contains_allergens", []),
                may_contain_allergens=p.get("may_contain_allergens", []),
                nutrition_facts=p.get("nutrition_facts", {}),
                fssai_lic_no=p.get("fssai_lic_no"),
                source="OPEN_FOOD_FACTS_LOCAL_SEED",
                reference_url=f"https://world.openfoodfacts.org/product/{cleaned_barcode}",
            )

        # 2. Live Open Food Facts API v2 (No API key required)
        url = f"https://world.openfoodfacts.org/api/v2/product/{cleaned_barcode}.json"
        headers = {"User-Agent": "NirikshanAI-Scanner/1.0 (https://github.com/NirikshanAI)"}
        try:
            resp = requests.get(url, headers=headers, timeout=timeout_sec)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == 1 and "product" in data:
                    prod = data["product"]
                    nutriments = prod.get("nutriments", {})
                    nutrition = {
                        "energy_kcal": nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal"),
                        "carbohydrates_g": nutriments.get("carbohydrates_100g"),
                        "sugars_g": nutriments.get("sugars_100g"),
                        "fat_g": nutriments.get("fat_100g"),
                        "sodium_mg": (nutriments.get("sodium_100g") * 1000.0) if nutriments.get("sodium_100g") is not None else None,
                    }

                    allergens_tags = prod.get("allergens_tags", [])
                    contains = [a.replace("en:", "").capitalize() for a in allergens_tags]

                    return OFFProductReference(
                        found=True,
                        barcode=cleaned_barcode,
                        product_name=prod.get("product_name") or prod.get("product_name_en"),
                        brand=prod.get("brands"),
                        generic_name=prod.get("generic_name"),
                        quantity=prod.get("quantity"),
                        categories=prod.get("categories"),
                        ingredients_text=prod.get("ingredients_text") or prod.get("ingredients_text_en"),
                        contains_allergens=contains,
                        nutrition_facts=nutrition,
                        source="OPEN_FOOD_FACTS_LIVE_API",
                        reference_url=f"https://world.openfoodfacts.org/product/{cleaned_barcode}",
                    )
        except Exception as err:
            logger.warning("Live Open Food Facts API lookup failed for barcode %s: %s", cleaned_barcode, err)

        return OFFProductReference(
            found=False,
            barcode=cleaned_barcode,
            source="NOT_FOUND",
            reference_url=f"https://world.openfoodfacts.org/product/{cleaned_barcode}",
        )


openfoodfacts_service = OpenFoodFactsService()
