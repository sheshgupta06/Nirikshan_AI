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

# Unbuffered logging ensures immediate log output in Render dashboard
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app
ENV PORT=10000

# Copy requirements and install
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend ./backend

# Copy required curated datasets and reference seed JSONs
COPY data/curated ./data/curated
COPY data/nutrition_reference ./data/nutrition_reference
COPY data/openfoodfacts/india_products_seed.json ./data/openfoodfacts/india_products_seed.json

EXPOSE 10000

# Run uvicorn using exec so it receives Unix signals and binds immediately to Render's PORT
CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
