"""Nirikshan AI - OCR Service using PaddleOCR and OpenCV.

Handles image validation, in-memory decoding with OpenCV, text region extraction
with PaddleOCR (bounding polygons, text, confidence), and interfaces with the
normalizer and rule engine. Never persists uploaded frames or images to disk.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ImageValidationError(ValueError):
    """Raised when an uploaded image fails validation (size, format, corruption)."""
    pass


class OCREngineError(RuntimeError):
    """Raised when the OCR inference engine fails during execution."""
    pass


class OCRTextBox(BaseModel):
    """Represents a single detected text region from OCR."""

    text: str
    confidence: Optional[float] = Field(
        default=None,
        description="Detection and recognition confidence score between 0.0 and 1.0",
    )
    bounding_box: List[List[int]] = Field(
        default_factory=list,
        description="4-point polygon coordinates [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]",
    )


class BaseOCREngine(ABC):
    """Abstract interface for OCR engine implementations."""

    @abstractmethod
    def run_ocr(self, image: np.ndarray) -> List[OCRTextBox]:
        """Runs OCR on an in-memory BGR numpy image."""
        pass


class RealPaddleOCREngine(BaseOCREngine):
    """Production OCR engine backed by PaddleOCR (DBNet + SVTR/CRNN)."""

    def __init__(self, lang: str = "en") -> None:
        self.lang = lang
        self._ocr: Any = None

    def _get_ocr(self) -> Any:
        """Lazy initialization of the PaddleOCR model."""
        if self._ocr is None:
            logger.info("Initializing PaddleOCR model (lang=%s)...", self.lang)
            try:
                from paddleocr import PaddleOCR
                self._ocr = PaddleOCR(use_angle_cls=True, lang=self.lang)
            except Exception as e:
                logger.error("Failed to initialize PaddleOCR: %s", e)
                raise OCREngineError(f"PaddleOCR initialization failed: {e}") from e
        return self._ocr

    def run_ocr(self, image: np.ndarray) -> List[OCRTextBox]:
        """Executes PaddleOCR detection & recognition on the provided image."""
        if image is None or image.size == 0:
            return []

        ocr_instance = self._get_ocr()
        try:
            # PaddleOCR accepts numpy BGR arrays directly
            # cls=True enables the angle classifier to handle rotated food packets
            raw_results = ocr_instance.ocr(image, cls=True)
        except Exception as e:
            logger.error("PaddleOCR inference error: %s", e)
            raise OCREngineError(f"PaddleOCR inference failed: {e}") from e

        boxes: List[OCRTextBox] = []
        if not raw_results or raw_results[0] is None:
            return boxes

        # Parse PaddleOCR format: [[[ [x1,y1], [x2,y2], [x3,y3], [x4,y4] ], (text, confidence)], ...]
        for entry in raw_results[0]:
            try:
                poly = entry[0]
                text_info = entry[1]
                text = str(text_info[0]).strip()
                conf = float(text_info[1]) if len(text_info) > 1 else None

                # Format polygon points as integer coordinates
                formatted_poly = [
                    [int(round(pt[0])), int(round(pt[1]))]
                    for pt in poly
                ]

                if text:
                    boxes.append(
                        OCRTextBox(
                            text=text,
                            confidence=round(conf, 4) if conf is not None else None,
                            bounding_box=formatted_poly,
                        )
                    )
            except Exception as err:
                logger.warning("Failed to parse OCR entry %s: %s", entry, err)
                continue

        return boxes


class MockOCREngine(BaseOCREngine):
    """Deterministic mock OCR engine for testing without loading model weights."""

    def __init__(
        self,
        mock_boxes: Optional[List[OCRTextBox]] = None,
        should_fail: bool = False,
        failure_message: str = "Simulated OCR Engine Failure",
    ) -> None:
        self.mock_boxes = mock_boxes or []
        self.should_fail = should_fail
        self.failure_message = failure_message

    def run_ocr(self, image: np.ndarray) -> List[OCRTextBox]:
        if self.should_fail:
            raise OCREngineError(self.failure_message)
        return self.mock_boxes


class OCRService:
    """Service orchestrating image validation, OpenCV preprocessing, and OCR."""

    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
    ALLOWED_CONTENT_TYPES = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/octet-stream",  # Fallback for some clients
    }

    def __init__(self, engine: Optional[BaseOCREngine] = None) -> None:
        self.engine = engine or RealPaddleOCREngine()

    def validate_and_decode(
        self,
        image_bytes: bytes,
        content_type: Optional[str] = None,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Validates file constraints and decodes into OpenCV BGR numpy array in-memory.

        Does NOT write or persist any bytes to disk.
        """
        # 1. Size Validation
        if not image_bytes or len(image_bytes) == 0:
            raise ImageValidationError("Uploaded image file is empty (0 bytes).")

        if len(image_bytes) > self.MAX_FILE_SIZE_BYTES:
            raise ImageValidationError(
                f"Image size exceeds maximum limit of {self.MAX_FILE_SIZE_BYTES // (1024*1024)} MB."
            )

        # 2. Content-Type Check (if provided)
        if content_type and content_type.lower() not in self.ALLOWED_CONTENT_TYPES:
            if not content_type.startswith("image/"):
                raise ImageValidationError(
                    f"Unsupported content-type: '{content_type}'. Must be JPEG, PNG, or WebP."
                )

        # 3. In-memory OpenCV Decoding
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None or img.size == 0:
            raise ImageValidationError(
                "Image decoding failed. File is not a valid or readable image."
            )

        h, w, c = img.shape
        if h < 10 or w < 10:
            raise ImageValidationError(
                f"Image dimensions ({w}x{h}) are too small for OCR processing."
            )

        # 4. Blur / Quality Check via Laplacian Variance
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        metadata = {
            "width": w,
            "height": h,
            "channels": c,
            "blur_score": round(blur_score, 2),
            "is_blurry": blur_score < 30.0,
        }

        return img, metadata

    def extract_text_from_bytes(
        self,
        image_bytes: bytes,
        content_type: Optional[str] = None,
    ) -> Tuple[List[OCRTextBox], Dict[str, Any]]:
        """Decodes image in memory and extracts text regions via the configured OCR engine."""
        img, metadata = self.validate_and_decode(image_bytes, content_type)
        boxes = self.engine.run_ocr(img)
        return boxes, metadata


# Global singleton instance with real engine (initialized lazily)
ocr_service = OCRService()
