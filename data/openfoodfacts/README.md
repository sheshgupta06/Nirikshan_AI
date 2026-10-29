# Open Food Facts Data for Nirikshan AI

This directory contains Open Food Facts reference datasets:

1. **`india_products_seed.json`**:
   - Curated reference dataset of top Indian packaged food products (Chokhi Dhani Pani Puri Kit, Maggi, Haldiram's, Parle-G, Amul, Britannia, Lays, Kurkure, Tata Salt, Kissan Ketchup).
   - Used for sub-millisecond offline lookup without hitting external APIs.

2. **Full TSV Dump (`en.openfoodfacts.org.products.tsv`)**:
   - Downloaded from [Open Food Facts Data](https://world.openfoodfacts.org/data).
   - Excluded from Git tracking because it exceeds GitHub's 100MB file limit (~1.01 GB uncompressed).
   - Nirikshan AI automatically falls back to the live Open Food Facts REST API v2 (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json`) for any barcode not in the local seed.
