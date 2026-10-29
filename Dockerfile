FROM python:3.11-slim

# Install system dependencies for OpenCV, Tesseract OCR, and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libzbar0 \
    tesseract-ocr \
    tesseract-ocr-eng \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend ./backend

# Copy required curated datasets and reference seed JSONs
COPY data/curated ./data/curated
COPY data/nutrition_reference ./data/nutrition_reference
COPY data/openfoodfacts/india_products_seed.json ./data/openfoodfacts/india_products_seed.json

ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

