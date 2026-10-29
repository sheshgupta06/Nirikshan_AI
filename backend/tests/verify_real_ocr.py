"""Manual Real-Image OCR Verification Procedure for Nirikshan AI.

Executes real PaddleOCR inference on a generated high-contrast test image
to verify that PaddleOCR, OpenCV, normalizer, and rule engine function
end-to-end on this Windows environment.

Usage:
    python -m backend.tests.verify_real_ocr
"""

import sys
import cv2
import numpy as np

from backend.app.services.normalizer import normalizer
from backend.app.services.ocr_service import RealPaddleOCREngine
from backend.app.services.rule_engine import UserProfile, rule_engine


def generate_synthetic_label_image() -> np.ndarray:
    """Creates a synthetic label image with clear packaging typography."""
    width, height = 700, 220
    img = np.ones((height, width, 3), dtype=np.uint8) * 255

    # Draw border
    cv2.rectangle(img, (10, 10), (width - 10, height - 10), (40, 40, 40), 2)

    # Render packaging lines
    cv2.putText(
        img,
        "INGREDIENTS: REFINED WHEAT FLOUR (MAIDA),",
        (25, 60),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 0, 0),
        2,
        cv2.LINE_AA,
    )
    cv2.putText(
        img,
        "EDIBLE VEGETABLE OIL (PALM OIL), SUGAR,",
        (25, 110),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 0, 0),
        2,
        cv2.LINE_AA,
    )
    cv2.putText(
        img,
        "GROUNDNUT, FLAVOUR ENHANCER (INS 621)",
        (25, 160),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 0, 0),
        2,
        cv2.LINE_AA,
    )

    return img


def main() -> int:
    print("=" * 70)
    print("Nirikshan AI — Real PaddleOCR Image Verification Procedure")
    print("=" * 70)

    # Step 1: Create image
    print("\n[1/4] Generating synthetic label image in-memory...")
    img = generate_synthetic_label_image()
    h, w, c = img.shape
    print(f"      Image created: {w}x{h} ({c} channels)")

    # Step 2: Initialize and run RealPaddleOCREngine
    print("\n[2/4] Running real PaddleOCR inference (DBNet + SVTR/CRNN)...")
    engine = RealPaddleOCREngine(lang="en")
    boxes = engine.run_ocr(img)

    print(f"      OCR completed. Detected {len(boxes)} text regions:")
    for idx, box in enumerate(boxes, start=1):
        print(f"      [{idx}] Text: \"{box.text}\" (Confidence: {box.confidence})")
        print(f"          Polygon Box: {box.bounding_box}")

    if not boxes:
        print("\n[FAIL] No text detected by PaddleOCR.")
        return 1

    # Step 3: Run normalization on detected text
    print("\n[3/4] Normalizing extracted tokens...")
    all_text = " ".join([b.text for b in boxes])
    candidate_tokens = normalizer.split_ingredients(all_text)
    print(f"      Extracted candidate tokens: {candidate_tokens}")

    # Step 4: Evaluate with Rule Engine
    print("\n[4/4] Evaluating with deterministic Rule Engine...")
    profile = UserProfile(
        profile_name="Verification Profile",
        allergies=["peanut", "gluten"],
        watchlist=["avoid_palm_oil"],
    )
    evaluation = rule_engine.evaluate(candidate_tokens, profile)

    print(f"      Total items detected: {evaluation.summary.total_detected}")
    print(f"      Allergens flagged:    {evaluation.summary.allergens_flagged}")
    print(f"      Dietary violations:   {evaluation.summary.dietary_violations}")
    print(f"      Unverified count:     {evaluation.summary.unverified_count}")
    print(f"      Unclear count:        {evaluation.summary.unclear_count}")

    print("\nItem Breakdown:")
    for item in evaluation.items:
        print(f"  - [{item.status_code}] '{item.ingredient.raw_text}' -> '{item.ingredient.canonical_name}'")
        for alert in item.alerts:
            print(f"      * Alert ({alert.severity}): {alert.rule_name} - {alert.message}")

    print("\n" + "=" * 70)
    print("VERIFICATION RESULT: SUCCESS! Real PaddleOCR pipeline operational.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
