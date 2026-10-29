"""Unit tests for the Scan Image API endpoint (POST /api/v1/scan/image).

Mocks the OCR engine for fast, deterministic testing of:
- Valid image processing with allergen matching and coordinate return
- Empty files and file size limits
- Invalid content types (e.g. text/plain)
- Corrupt image byte decoding failures
- OCR engine error handling
- Zero readable text detection
"""

import sys

import cv2
import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.api.v1.scan import get_ocr_service
from backend.app.main import app
from backend.app.services.ocr_service import (
    MockOCREngine,
    OCRService,
    OCRTextBox,
    RealPaddleOCREngine,
)


def create_test_image_bytes(
    text: str = "Test Food Label", width: int = 400, height: int = 150
) -> bytes:
    """Generates an in-memory PNG image with rendered text for testing."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 255
    cv2.putText(
        img,
        text,
        (20, height // 2),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (0, 0, 0),
        2,
    )
    success, buffer = cv2.imencode(".png", img)
    assert success, "Failed to encode synthetic test image"
    return buffer.tobytes()


@pytest.fixture
def mock_ocr_service():
    """Provides an OCRService with mock detected text boxes."""
    mock_boxes = [
        OCRTextBox(
            text="Ingredients: Refined Wheat Flour (Maida), Palm Oil, Sugar",
            confidence=0.9625,
            bounding_box=[[15, 20], [380, 20], [380, 60], [15, 60]],
        ),
        OCRTextBox(
            text="INS 621, Groundnut, Iodized Salt",
            confidence=0.9310,
            bounding_box=[[15, 70], [350, 70], [350, 110], [15, 110]],
        ),
    ]
    engine = MockOCREngine(mock_boxes=mock_boxes)
    return OCRService(engine=engine)


@pytest.mark.asyncio
async def test_scan_image_success(mock_ocr_service):
    """Verify that a valid image is processed, text extracted, and allergens flagged."""
    app.dependency_overrides[get_ocr_service] = lambda: mock_ocr_service

    image_bytes = create_test_image_bytes("Food Label Text")
    files = {"file": ("packet.png", image_bytes, "image/png")}
    data = {
        "profile_name": "Aarav",
        "allergies": "peanut,gluten",
        "watchlist": "avoid_palm_oil",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files, data=data)

    app.dependency_overrides.clear()

    assert response.status_code == 200
    res = response.json()

    assert res["status"] == "SUCCESS"
    assert res["filename"] == "packet.png"
    assert res["image_metadata"]["width"] == 400
    assert res["image_metadata"]["height"] == 150

    # Verify OCR text region extraction & confidence
    boxes = res["ocr_detected_boxes"]
    assert len(boxes) == 2
    assert boxes[0]["confidence"] == 0.9625
    assert len(boxes[0]["bounding_box"]) == 4

    # Verify rule engine evaluation
    eval_result = res["evaluation"]
    summary = eval_result["summary"]
    # Maida (gluten) and Groundnut (peanut)
    assert summary["allergens_flagged"] == 2
    # Palm Oil (watchlist)
    assert summary["dietary_violations"] == 1
    # Check educational disclaimer
    assert "Nirikshan AI" in res["disclaimer"]


@pytest.mark.asyncio
async def test_scan_image_unsupported_content_type():
    """Verify HTTP 400 when an invalid file type (e.g. text/plain) is uploaded."""
    files = {"file": ("notes.txt", b"This is a text file", "text/plain")}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files)

    assert response.status_code == 400
    assert "Unsupported content-type" in response.json()["detail"]


@pytest.mark.asyncio
async def test_scan_image_empty_file():
    """Verify HTTP 400 when an empty (0 byte) file is uploaded."""
    files = {"file": ("empty.jpg", b"", "image/jpeg")}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files)

    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_scan_image_corrupt_bytes():
    """Verify HTTP 400 when corrupted non-image bytes are uploaded."""
    files = {"file": ("corrupt.png", b"CORRUPTED_NON_IMAGE_DATA_12345", "image/png")}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files)

    assert response.status_code == 400
    assert "decoding failed" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_scan_image_tiny_dimensions():
    """Verify HTTP 400 when image dimensions are too small for OCR."""
    tiny_img = np.zeros((4, 4, 3), dtype=np.uint8)
    _, buffer = cv2.imencode(".png", tiny_img)

    files = {"file": ("tiny.png", buffer.tobytes(), "image/png")}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files)

    assert response.status_code == 400
    assert "too small" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_scan_image_no_text_detected():
    """Verify that an image with no detected text returns EMPTY status gracefully."""
    empty_engine = MockOCREngine(mock_boxes=[])
    service = OCRService(engine=empty_engine)
    app.dependency_overrides[get_ocr_service] = lambda: service

    image_bytes = create_test_image_bytes("Blank Image")
    files = {"file": ("blank.png", image_bytes, "image/png")}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files)

    app.dependency_overrides.clear()

    assert response.status_code == 200
    res = response.json()
    assert res["status"] in ("EMPTY", "UNCLEAR")
    assert res["ocr_detected_boxes"] == []
    assert res["evaluation"]["summary"]["total_detected"] == 0


@pytest.mark.asyncio
async def test_scan_image_ocr_engine_failure():
    """Verify HTTP 500 when OCR engine encounters an internal failure."""
    failing_engine = MockOCREngine(should_fail=True, failure_message="Inference crashed")
    service = OCRService(engine=failing_engine)
    app.dependency_overrides[get_ocr_service] = lambda: service

    image_bytes = create_test_image_bytes("Sample")
    files = {"file": ("sample.png", image_bytes, "image/png")}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files)

    app.dependency_overrides.clear()

    assert response.status_code == 500
    assert "OCR processing failed" in response.json()["detail"]


@pytest.mark.asyncio
async def test_scan_image_falls_back_when_paddleocr_is_unavailable(monkeypatch):
    """Verify a missing PaddleOCR installation uses the configured fallback engine."""
    fallback_boxes = [
        OCRTextBox(
            text="Ingredients: Potatoes, salt",
            confidence=0.9,
            bounding_box=[[15, 20], [380, 20], [380, 60], [15, 60]],
        )
    ]
    engine = RealPaddleOCREngine()
    engine._fallback_engine = MockOCREngine(mock_boxes=fallback_boxes)
    app.dependency_overrides[get_ocr_service] = lambda: OCRService(engine=engine)
    monkeypatch.setitem(sys.modules, "paddleocr", None)

    image_bytes = create_test_image_bytes("Food Label")
    files = {"file": ("packet.png", image_bytes, "image/png")}

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/scan/image", files=files)
    finally:
        app.dependency_overrides.pop(get_ocr_service, None)

    assert response.status_code == 200
    assert response.json()["ocr_detected_boxes"][0]["text"] == "Ingredients: Potatoes, salt"


@pytest.mark.asyncio
async def test_scan_image_multibox_allergen_pipeline():
    """Integration test verifying the real API request path for POST /api/v1/scan/image:

    OCR boxes:
    - 6 ingredients (including 'lodized Salt' typo)
    - Box 1: 'ALLERGEN ADVICE:CONTAINS'
    - Box 2: 'WHEAT & SOY.MAY CONTAIN'
    - Box 3: 'NUTS,MUSTARD &MILK.'
    - Manufacturing metadata: 'DATE OF MFG: 24/10/2026 BATCH NO: 104 USE BY: 24/04/2027'

    Verifies:
    - contains_clause_found == True
    - may_contain_clause_found == True
    - contains_allergens == ["Wheat", "Soy"]
    - may_contain_allergens == ["Nuts", "Mustard", "Milk"]
    - lodized Salt normalized to Iodized Salt
    - No manufacturing metadata classified as allergens
    """
    mock_boxes = [
        OCRTextBox(
            text="Ingredients: Soy Flour (60%), Whole WheatFlour, Sugar,",
            confidence=0.96,
            bounding_box=[[10, 10], [500, 10], [500, 30], [10, 30]],
        ),
        OCRTextBox(
            text="Water & Acidity Regulator INS 330, lodized Salt.",
            confidence=0.95,
            bounding_box=[[10, 35], [500, 35], [500, 55], [10, 55]],
        ),
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
            confidence=0.94,
            bounding_box=[[10, 135], [500, 135], [500, 155], [10, 155]],
        ),
    ]

    service = OCRService(engine=MockOCREngine(mock_boxes=mock_boxes))
    app.dependency_overrides[get_ocr_service] = lambda: service

    image_bytes = create_test_image_bytes("Real Food Label Packet")
    files = {"file": ("packet_real.png", image_bytes, "image/png")}
    data = {
        "profile_name": "Family",
        "allergies": "wheat,soy",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files, data=data)

    app.dependency_overrides.clear()

    assert response.status_code == 200
    res = response.json()

    assert res["status"] == "SUCCESS"

    # 1. Verify sections summary flags
    summary = res["sections_summary"]
    assert summary["contains_clause_found"] is True
    assert summary["may_contain_clause_found"] is True

    # 2. Verify allergen report clauses
    report = res["allergen_report"]
    assert report["contains_allergens"] == ["Wheat", "Soy"]
    assert report["may_contain_allergens"] == ["Nuts", "Mustard", "Milk"]

    # 3. Verify separation of declared vs precautionary allergens
    assert not any(a in report["may_contain_allergens"] for a in report["contains_allergens"])
    assert not any(a in report["contains_allergens"] for a in report["may_contain_allergens"])

    # 4. Verify profile matches
    assert "Wheat" in report["profile_matches_contains"]
    assert "Soy" in report["profile_matches_contains"]
    assert report["profile_matches_may_contain"] == []

    # 5. Verify no metadata in allergens
    all_allergens = report["contains_allergens"] + report["may_contain_allergens"]
    for forbidden in ["Date", "Mfg", "Batch", "Use By", "24/10/2026", "24/04/2027", "104"]:
        assert not any(forbidden.lower() in a.lower() for a in all_allergens)

    # 6. Verify ingredients normalized (lodized Salt -> Iodized Salt)
    eval_items = res["evaluation"]["items"]
    canonical_names = [it["ingredient"]["canonical_name"] for it in eval_items]
    assert "Iodized Salt" in canonical_names
    assert "lodized Salt" not in canonical_names


@pytest.mark.asyncio
async def test_scan_image_exact_case_compound_string():
    """Verify POST /api/v1/scan/image with 'WHEAT & SOY.MAY CONTAIN NUTS,MUSTARD &MILK.'."""
    mock_boxes = [
        OCRTextBox(
            text="Ingredients: Soy Flour (60%), Whole Wheat Flour, Sugar, Water, Acidity Regulator INS 330, Iodized Salt.",
            confidence=0.96,
            bounding_box=[[10, 10], [500, 10], [500, 30], [10, 30]],
        ),
        OCRTextBox(
            text="WHEAT & SOY.MAY CONTAIN NUTS,MUSTARD &MILK.",
            confidence=0.97,
            bounding_box=[[10, 40], [500, 40], [500, 60], [10, 60]],
        ),
    ]

    service = OCRService(engine=MockOCREngine(mock_boxes=mock_boxes))
    app.dependency_overrides[get_ocr_service] = lambda: service

    image_bytes = create_test_image_bytes("Compound Allergen Test")
    files = {"file": ("packet.png", image_bytes, "image/png")}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files)

    app.dependency_overrides.clear()

    assert response.status_code == 200
    res = response.json()

    assert res["status"] == "SUCCESS"
    assert res["sections_summary"]["ingredients_detected_count"] == 6
    assert res["sections_summary"]["contains_clause_found"] is True
    assert res["sections_summary"]["may_contain_clause_found"] is True
    assert res["sections_summary"]["may_contain_incomplete"] is False

    report = res["allergen_report"]
    assert report["contains_allergens"] == ["Wheat", "Soy"]
    assert report["may_contain_allergens"] == ["Nuts", "Mustard", "Milk"]
    assert report["incomplete_precautionary_advisory"] is False


@pytest.mark.asyncio
async def test_scan_image_incomplete_precautionary_advisory_alert():
    """Verify POST /api/v1/scan/image when OCR recognizes 'MAY CONTAIN' but allergen list is unreadable/omitted.

    Requirements:
    1. Preserves contains_allergens = ["Wheat", "Soy"].
    2. Does NOT invent or hallucinate allergens (may_contain_allergens == []).
    3. Sets may_contain_clause_found = True based on the parsed declaration.
    4. Sets may_contain_incomplete = True and reports a WARNING alert for incomplete detection.
    """
    mock_boxes = [
        OCRTextBox(
            text="Ingredients: Soy Flour (60%), Whole Wheat Flour, Sugar, Water, Acidity Regulator INS 330, Iodized Salt.",
            confidence=0.96,
            bounding_box=[[10, 10], [500, 10], [500, 30], [10, 30]],
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

    service = OCRService(engine=MockOCREngine(mock_boxes=mock_boxes))
    app.dependency_overrides[get_ocr_service] = lambda: service

    image_bytes = create_test_image_bytes("Incomplete Precautionary Test")
    files = {"file": ("packet.png", image_bytes, "image/png")}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files)

    app.dependency_overrides.clear()

    assert response.status_code == 200
    res = response.json()

    assert res["status"] == "SUCCESS"

    # 1. Preserves contains allergens
    report = res["allergen_report"]
    assert report["contains_allergens"] == ["Wheat", "Soy"]

    # 2. Does NOT invent allergens
    assert report["may_contain_allergens"] == []

    # 3. Sets clause found based on parsed declaration
    assert res["sections_summary"]["contains_clause_found"] is True
    assert res["sections_summary"]["may_contain_clause_found"] is True
    assert res["sections_summary"]["may_contain_incomplete"] is True
    assert report["incomplete_precautionary_advisory"] is True

    # 4. Reports WARNING alert for INCOMPLETE_DETECTION in evaluation
    eval_items = res["evaluation"]["items"]
    all_alerts = [alert for it in eval_items for alert in it.get("alerts", [])]
    incomplete_alerts = [a for a in all_alerts if a["alert_type"] == "INCOMPLETE_DETECTION"]
    assert len(incomplete_alerts) >= 1
    assert incomplete_alerts[0]["severity"] == "WARNING"
    assert "MAY CONTAIN" in incomplete_alerts[0]["message"]

    # 5. unclear_count incremented
    assert res["evaluation"]["summary"]["unclear_count"] >= 1
    assert "Precautionary allergen advisory" in res["message"]


@pytest.mark.asyncio
async def test_scan_image_exact_real_testo_soya_chaap_pipeline():
    """Verify POST /api/v1/scan/image with the exact real Testo Soya Chaap OCR scan:
    Boxes:
    1. 'Ingredients: Soy Flour (60%), Whole Wheat Flour, Sugar,' (0.96)
    2. 'Water & Acidity Regulator INS 330, lodized Salt.' (0.95)
    3. 'ALLERGEN ADVICE:CONTAINS' (0.974)
    4. 'WHEAT & SOY.MAY CONTAIN' (0.9328)
    5. 'DATE OF MFG' (0.9171) in nearby right-hand column
    6. 'NUTS,MUSTARD &MILK.' (0.9569)

    Expected:
    - ingredients_detected_count: 6
    - contains_clause_found: True
    - may_contain_clause_found: True
    - may_contain_incomplete: False
    - contains_allergens: ["Wheat", "Soy"]
    - may_contain_allergens: ["Nuts", "Mustard", "Milk"]
    - lodized Salt normalized to Iodized Salt
    - No manufacturing metadata in allergen lists
    """
    mock_boxes = [
        OCRTextBox(
            text="Ingredients: Soy Flour (60%), Whole Wheat Flour, Sugar,",
            confidence=0.96,
            bounding_box=[[50, 10], [500, 10], [500, 30], [50, 30]],
        ),
        OCRTextBox(
            text="Water & Acidity Regulator INS 330, lodized Salt.",
            confidence=0.95,
            bounding_box=[[50, 35], [500, 35], [500, 55], [50, 55]],
        ),
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

    service = OCRService(engine=MockOCREngine(mock_boxes=mock_boxes))
    app.dependency_overrides[get_ocr_service] = lambda: service

    image_bytes = create_test_image_bytes("Testo Soya Chaap Real Packet")
    files = {"file": ("testo_soya_chaap.png", image_bytes, "image/png")}
    data = {
        "profile_name": "Testo Family",
        "allergies": "wheat,soy",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/image", files=files, data=data)

    app.dependency_overrides.clear()

    assert response.status_code == 200
    res = response.json()

    assert res["status"] == "SUCCESS"

    # 1. Ingredients count and normalization
    summary = res["sections_summary"]
    assert summary["ingredients_detected_count"] == 6
    eval_items = res["evaluation"]["items"]
    canonical_names = [it["ingredient"]["canonical_name"] for it in eval_items]
    assert "Iodized Salt" in canonical_names
    assert "lodized Salt" not in canonical_names

    # 2. Clause status flags
    assert summary["contains_clause_found"] is True
    assert summary["may_contain_clause_found"] is True
    assert summary["may_contain_incomplete"] is False

    # 3. Allergen report
    report = res["allergen_report"]
    assert report["contains_allergens"] == ["Wheat", "Soy"]
    assert report["may_contain_allergens"] == ["Nuts", "Mustard", "Milk"]
    assert report["incomplete_precautionary_advisory"] is False

    # 4. Profile matches
    assert "Wheat" in report["profile_matches_contains"]
    assert "Soy" in report["profile_matches_contains"]
    assert report["profile_matches_may_contain"] == []

    # 5. Metadata exclusion
    all_allergens = report["contains_allergens"] + report["may_contain_allergens"]
    for forbidden in ["Date", "Mfg"]:
        assert not any(forbidden.lower() in a.lower() for a in all_allergens)


@pytest.mark.asyncio
async def test_scan_multiple_images_front_and_back(mock_ocr_service):
    """Verify that multiple food packaging images (e.g. Front & Back) are processed together."""
    app.dependency_overrides[get_ocr_service] = lambda: mock_ocr_service

    front_img = create_test_image_bytes("Front Panel: Testo Soya Chaap 500g")
    back_img = create_test_image_bytes("Back Panel: Ingredients & Nutrition Facts")

    files = [
        ("files", ("front.png", front_img, "image/png")),
        ("files", ("back.png", back_img, "image/png")),
    ]
    data = {"modules": "both", "jurisdiction": "IN"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/scan/analyze", files=files, data=data)

    app.dependency_overrides.clear()

    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "SUCCESS"
    assert "front.png" in res["filename"]
    assert "back.png" in res["filename"]
    assert res["image_metadata"]["total_images_processed"] == 2



