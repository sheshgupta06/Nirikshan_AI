# Nirikshan AI (निरीक्षण AI)

> India-first food label analysis web application. Scans packaged food labels in real-time, extracts ingredients and additive codes (INS numbers), checks against family dietary and allergy profiles, and provides evidence-backed regulatory information under FSSAI standards with explicit uncertainty handling.

---

## Current Status: Full Multi-Module Implementation

Nirikshan AI is an evidence-based, deterministic food label intelligence platform:
- **Module 1: Image & Live Camera OCR** — Zero-click package scanning powered by PaddleOCR (DBNet + SVTR/CRNN) with coordinate bounding boxes, confidence gating, and section parsing (Ingredients vs. Contains vs. May Contain).
- **Module 2: Ingredient Health Impact & Global Additives Matrix** — Clinical dietary and allergen evaluation across 5 conditions (Allergies, Coeliac, Diabetes, Hypertension, CKD) and multi-jurisdiction additive safety across **FSSAI (India) 🇮🇳**, **EU EFSA 🇪🇺**, and **US FDA 🇺🇸**.
- **Module 3: FSSAI Label Mandatory Compliance Checker** — Automated compliance assessment of all 11 mandatory statutory declarations specified under the *Food Safety and Standards (Labelling and Display) Regulations, 2020*.
- **Module 4: Open Food Facts Product Intelligence** — Barcode lookup with instant local Indian seed database (`india_products_seed.json`) and live fallback to Open Food Facts REST API v2.
- **Relational Database Layer** — 10-table SQLAlchemy ORM schema (`products`, `scans`, `ocr_results`, `ingredients`, `scan_ingredients`, `health_rules`, `evidence_sources`, `fssai_rules`, `health_findings`, `compliance_results`).
- **Frontend** — React 18, TypeScript, and Vite with dark-mode aesthetic, live camera feed with real-time video streaming, and detailed compliance breakdown.

---

## Datasets & Curated Knowledge

All datasets are structured under [`data/`](file:///d:/Nirikshan_AI/data):
- **`data/curated/`**:
  - `fssai_compliance_rules.json`: 11 statutory requirements under FSSAI Labelling Regulations 2020.
  - `global_regulatory_knowledge.json`: FSSAI 🇮🇳, EU EFSA 🇪🇺, and US FDA 🇺🇸 regulatory status and international bans for food additives.
  - `health_knowledge.json`: Deterministic clinical rules for allergens and chronic health conditions.
  - `ingredient_aliases.json`: INS/E-numbers and Indian vernacular terms (Maida, Suji, Palmolein, etc.).
- **`data/fssai_regulations/`**: 5 official Government of India Gazette Notifications.
- **`data/nutrition_reference/`**: ICMR-NIN Indian Food Composition Tables (IFCT 2017) and staple benchmarks.
- **`data/openfoodfacts/`**: Curated Indian product seed dataset + live API integration.

---

## Prerequisites

- **Python:** 3.10 to 3.12 (`python 3.12` recommended for PaddleOCR stability)
- **Node.js:** 18 or higher & npm
- **Shell:** Windows PowerShell / Bash

---

## Backend Setup & Execution (Windows PowerShell)

Open PowerShell in the project root (`d:\Nirikshan_AI`):

### 1. Create and Activate Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```powershell
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

### 3. Run Backend Test Suite
```powershell
.\venv\Scripts\python.exe -m pytest backend/tests/ -v
```

### 4. Start the FastAPI Backend Server
```powershell
.\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive API documentation (Swagger UI) is available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## Frontend Setup & Execution (Windows PowerShell)

In a separate PowerShell terminal window:

```powershell
Set-Location -Path "frontend"
npm install
npm run dev
```

Open your browser at: [http://localhost:5173](http://localhost:5173).

---

## Repository Structure

```
Nirikshan_AI/
├── .gitignore               # Git exclusions (venv, node_modules, 1GB TSV, local DB)
├── ARCHITECTURE.md          # Complete architectural blueprint & data flow specification
├── PRD.md                   # Product Requirements Document
├── README.md                # Comprehensive setup and system overview
├── data/                    # Datasets (Curated rules, FSSAI gazettes, IFCT, OFF seed)
│   ├── curated/
│   ├── fssai_regulations/
│   ├── nutrition_reference/
│   └── openfoodfacts/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints (scan image, barcode lookup, health)
│   │   ├── db/              # SQLAlchemy session and 10 relational models
│   │   ├── services/        # OCR, Normalizer, Rule Engine, FSSAI Compliance, OFF
│   │   └── main.py          # FastAPI application entrypoint
│   └── tests/               # 101 pytest unit tests across all engines
└── frontend/
    ├── src/
    │   ├── components/      # LiveCameraScanner component
    │   ├── hooks/           # useLiveCameraScanner hook
    │   ├── services/        # Backend API client
    │   ├── types/           # TypeScript interfaces (Scan, Compliance, OFF, Profile)
    │   └── App.tsx          # Main dashboard & interactive scanning interface
    └── package.json
```

---

## Safety & Governance Principles

- **Deterministic Rule Engine**: Never uses generative AI or LLM hallucinations for legal compliance or medical allergen verification.
- **Transparent Evidence**: Every flagged additive, allergen, or statutory clause links directly to official gazette citations, clinical guidelines (WHO, ICMR-NIN), or authority records.
- **Privacy by Design**: User profile sensitivities are kept in browser session memory and are never persisted to disk or external analytics.
