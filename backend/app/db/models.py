"""Nirikshan AI - 10 Core Relational Database Models (SQLAlchemy)."""

from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.app.db.session import Base


class Product(Base):
    """1. products: Master product metadata (OpenFoodFacts / OCR verified)."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String(64), unique=True, index=True, nullable=True)
    product_name = Column(String(255), index=True, nullable=False)
    brand = Column(String(255), index=True, nullable=True)
    category = Column(String(255), nullable=True)
    market = Column(String(100), default="India")
    source = Column(String(50), default="OCR_SCAN")  # 'OPEN_FOOD_FACTS' or 'OCR_SCAN'
    raw_ingredients_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    scans = relationship("Scan", back_populates="product")


class Scan(Base):
    """2. scans: Individual label scans with lifecycle timestamp and status."""

    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    scan_uuid = Column(String(64), unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    processing_status = Column(String(50), default="SUCCESS")  # SUCCESS, UNCLEAR, EMPTY
    device_info = Column(String(255), nullable=True)
    profile_name = Column(String(100), default="Default Profile")

    product = relationship("Product", back_populates="scans")
    ocr_result = relationship("OCRResult", back_populates="scan", uselist=False)
    scan_ingredients = relationship("ScanIngredient", back_populates="scan")
    health_findings = relationship("HealthFinding", back_populates="scan")
    compliance_results = relationship("ComplianceResult", back_populates="scan")


class OCRResult(Base):
    """3. ocr_results: Raw text, confidence scores, and clarity status."""

    __tablename__ = "ocr_results"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), unique=True, nullable=False)
    raw_text = Column(Text, nullable=False)
    corrected_text = Column(Text, nullable=True)
    average_confidence = Column(Float, nullable=True)
    unclear_status = Column(Boolean, default=False)
    is_blurry = Column(Boolean, default=False)
    panel = Column(String(50), default="INGREDIENTS_AND_NUTRITION")
    boxes_json = Column(Text, nullable=True)

    scan = relationship("Scan", back_populates="ocr_result")


class Ingredient(Base):
    """4. ingredients: Standardized canonical ingredients, synonyms, and additive codes."""

    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    canonical_name = Column(String(255), unique=True, index=True, nullable=False)
    synonyms_json = Column(Text, nullable=True)  # JSON array of vernacular/English aliases
    additive_code = Column(String(50), index=True, nullable=True)  # e.g., INS 500(ii)
    category = Column(String(100), nullable=True)  # cereal, oil, additive, spice, etc.
    is_vegetarian = Column(Boolean, default=True)

    scan_ingredients = relationship("ScanIngredient", back_populates="ingredient")


class ScanIngredient(Base):
    """5. scan_ingredients: Specific ingredient instances recognized in a scan."""

    __tablename__ = "scan_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=True)
    raw_text = Column(String(255), nullable=False)
    verification_status = Column(String(50), default="UNVERIFIED")  # NORMALIZED, UNVERIFIED, UNCLEAR

    scan = relationship("Scan", back_populates="scan_ingredients")
    ingredient = relationship("Ingredient", back_populates="scan_ingredients")


class HealthRule(Base):
    """6. health_rules: Deterministic rules, conditions, thresholds, and explanations."""

    __tablename__ = "health_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(100), unique=True, index=True, nullable=False)
    concern_type = Column(String(100), nullable=False)
    applicable_conditions = Column(String(255), nullable=True)
    thresholds = Column(Float, nullable=True)
    units = Column(String(50), nullable=True)
    severity = Column(String(50), default="CAUTION")
    plain_english = Column(Text, nullable=False)
    hindi_text = Column(Text, nullable=True)

    findings = relationship("HealthFinding", back_populates="rule")


class EvidenceSource(Base):
    """7. evidence_sources: Verified statutory and clinical authorities (FSSAI, WHO, EFSA, NIDDK)."""

    __tablename__ = "evidence_sources"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String(100), unique=True, index=True, nullable=False)
    source_title = Column(String(255), nullable=False)
    organisation = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False)
    publication_date = Column(String(50), nullable=True)
    version = Column(String(50), nullable=True)


class FSSAIRule(Base):
    """8. fssai_rules: Statutory labelling requirements under FSSAI Regulations 2020."""

    __tablename__ = "fssai_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(100), unique=True, index=True, nullable=False)
    clause = Column(String(100), nullable=False)
    requirement = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    conditions = Column(Text, nullable=True)
    exemptions = Column(Text, nullable=True)
    effective_dates = Column(String(100), default="2020-11-17")

    compliance_results = relationship("ComplianceResult", back_populates="fssai_rule")


class HealthFinding(Base):
    """9. health_findings: Scan-specific health insights, risk evaluation, and evidence."""

    __tablename__ = "health_findings"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False)
    rule_id = Column(String(100), ForeignKey("health_rules.rule_id"), nullable=True)
    finding_category = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)
    matched_item = Column(String(255), nullable=False)
    observed_value = Column(String(100), nullable=True)
    reasons = Column(Text, nullable=False)
    evidence_url = Column(String(500), nullable=True)

    scan = relationship("Scan", back_populates="health_findings")
    rule = relationship("HealthRule", back_populates="findings")


class ComplianceResult(Base):
    """10. compliance_results: Scan-specific FSSAI compliance verification."""

    __tablename__ = "compliance_results"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False)
    fssai_rule_id = Column(String(100), ForeignKey("fssai_rules.rule_code"), nullable=False)
    status = Column(String(50), default="COMPLIANT")  # COMPLIANT, NON_COMPLIANT_MISSING, UNCLEAR_NEEDS_REVIEW
    observed_evidence = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)

    scan = relationship("Scan", back_populates="compliance_results")
    fssai_rule = relationship("FSSAIRule", back_populates="compliance_results")
