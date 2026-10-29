"""Nirikshan AI - Relational Database Scans CRUD API.

Provides persistent database access for scans stored in Supabase PostgreSQL or local SQLite.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.db.models import (
    ComplianceResult,
    HealthFinding,
    OCRResult,
    Product,
    Scan,
)
from backend.app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/db/scans", tags=["Database Scans"])


class ScanListItem(BaseModel):
    id: int
    scan_uuid: str
    timestamp: datetime
    product_name: str
    brand: Optional[str] = None
    processing_status: str
    profile_name: str


class ScanCreateRequest(BaseModel):
    scan_uuid: str
    product_name: str = "Unknown Packaged Food"
    brand: Optional[str] = None
    processing_status: str = "SUCCESS"
    profile_name: str = "Default Profile"
    raw_ocr_text: str = ""
    boxes_json: Optional[str] = None
    health_findings: List[Dict[str, Any]] = Field(default_factory=list)
    compliance_results: List[Dict[str, Any]] = Field(default_factory=list)


@router.get("", response_model=List[ScanListItem], summary="List Scans from Database")
def list_scans(db: Session = Depends(get_db)):
    """Retrieves the list of scans persisted in the relational database."""
    try:
        scans = db.query(Scan).order_by(Scan.timestamp.desc()).limit(100).all()
        result = []
        for s in scans:
            p_name = s.product.product_name if s.product else "Unknown Packaged Food"
            p_brand = s.product.brand if s.product else None
            result.append(
                ScanListItem(
                    id=s.id,
                    scan_uuid=s.scan_uuid,
                    timestamp=s.timestamp,
                    product_name=p_name,
                    brand=p_brand,
                    processing_status=s.processing_status,
                    profile_name=s.profile_name,
                )
            )
        return result
    except Exception as exc:
        logger.error("Error querying scans from database: %s", exc)
        return []


@router.get("/{scan_uuid}", summary="Get Full Scan by UUID")
def get_scan(scan_uuid: str, db: Session = Depends(get_db)):
    """Retrieves full scan details including OCR results and findings."""
    scan = db.query(Scan).filter(Scan.scan_uuid == scan_uuid).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    return {
        "id": scan.id,
        "scan_uuid": scan.scan_uuid,
        "timestamp": scan.timestamp.isoformat(),
        "product_name": scan.product.product_name if scan.product else "Unknown Packaged Food",
        "brand": scan.product.brand if scan.product else None,
        "processing_status": scan.processing_status,
        "profile_name": scan.profile_name,
        "ocr_result": {
            "raw_text": scan.ocr_result.raw_text if scan.ocr_result else "",
            "is_blurry": scan.ocr_result.is_blurry if scan.ocr_result else False,
            "average_confidence": scan.ocr_result.average_confidence if scan.ocr_result else 0.0,
        }
        if scan.ocr_result
        else None,
        "health_findings": [
            {
                "category": hf.finding_category,
                "severity": hf.severity,
                "matched_item": hf.matched_item,
                "reasons": hf.reasons,
                "evidence_url": hf.evidence_url,
            }
            for hf in scan.health_findings
        ],
        "compliance_results": [
            {
                "fssai_rule_id": cr.fssai_rule_id,
                "status": cr.status,
                "observed_evidence": cr.observed_evidence,
                "explanation": cr.explanation,
            }
            for cr in scan.compliance_results
        ],
    }


@router.post("", status_code=status.HTTP_201_CREATED, summary="Save Scan into Database")
def save_scan(payload: ScanCreateRequest, db: Session = Depends(get_db)):
    """Persists a new scan record and its findings into the database."""
    try:
        # 1. Product record
        product = Product(
            product_name=payload.product_name,
            brand=payload.brand,
            source="OCR_SCAN",
            raw_ingredients_text=payload.raw_ocr_text,
        )
        db.add(product)
        db.flush()

        # 2. Scan record
        scan = Scan(
            scan_uuid=payload.scan_uuid,
            product_id=product.id,
            processing_status=payload.processing_status,
            profile_name=payload.profile_name,
        )
        db.add(scan)
        db.flush()

        # 3. OCR result
        ocr_row = OCRResult(
            scan_id=scan.id,
            raw_text=payload.raw_ocr_text,
            boxes_json=payload.boxes_json,
        )
        db.add(ocr_row)

        # 4. Health findings
        for hf in payload.health_findings:
            db.add(
                HealthFinding(
                    scan_id=scan.id,
                    finding_category=hf.get("category", "GENERAL"),
                    severity=hf.get("severity", "CAUTION"),
                    matched_item=hf.get("matched_item", ""),
                    reasons=hf.get("explanation", ""),
                    evidence_url=hf.get("evidence_url", ""),
                )
            )

        # 5. Compliance findings
        for cr in payload.compliance_results:
            db.add(
                ComplianceResult(
                    scan_id=scan.id,
                    fssai_rule_id=cr.get("rule_id", "FSSAI-RULE"),
                    status=cr.get("status", "COMPLIANT"),
                    observed_evidence=cr.get("evidence_text", ""),
                    explanation=cr.get("explanation", ""),
                )
            )

        db.commit()
        return {"success": True, "scan_uuid": scan.scan_uuid, "id": scan.id}
    except Exception as exc:
        db.rollback()
        logger.error("Failed to save scan to database: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/{scan_uuid}", summary="Delete Scan from Database")
def delete_scan(scan_uuid: str, db: Session = Depends(get_db)):
    """Deletes a scan record by UUID."""
    scan = db.query(Scan).filter(Scan.scan_uuid == scan_uuid).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    try:
        # Delete related child rows
        if scan.ocr_result:
            db.delete(scan.ocr_result)
        for hf in scan.health_findings:
            db.delete(hf)
        for cr in scan.compliance_results:
            db.delete(cr)
        db.delete(scan)
        db.commit()
        return {"success": True, "message": f"Scan {scan_uuid} deleted successfully"}
    except Exception as exc:
        db.rollback()
        logger.error("Failed to delete scan: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
