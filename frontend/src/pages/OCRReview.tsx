import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'

const DEFAULT_LAYS_EXTRACTED_TEXT = `Lay's
Classic
Ingredients: Potatoes, Edible Vegetable Oil (Palmolein Oil), Iodised Salt.
CONTAINS PERMITTED NATURAL COLOUR (INS 160c)
Nutritional Information (Approx. Values per 100 g):
Energy 536 kcal
Protein 6.9 g
Carbohydrate 55.0 g
of which Sugars 0.5 g
Fat 34.0 g
MRP: ₹ 20.00 (Incl. of all taxes)
Net Quantity: 52 g
Mfg. Date: 12/08/2024
Best Before: 11/02/2025`

export const OCRReview: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const navigate = useNavigate()
  const [scan, setScan] = useState<StoredScan | null>(null)

  const [activeTab, setActiveTab] = useState<'extracted_text' | 'key_info'>('extracted_text')
  const [extractedText, setExtractedText] = useState('')

  // Key Info tab fields
  const [productName, setProductName] = useState('Lay’s Classic Potato Chips')
  const [brand, setBrand] = useState('Lay’s')
  const [netQuantity, setNetQuantity] = useState('52 g')
  const [mrp, setMrp] = useState('₹ 20.00')
  const [mfgDate, setMfgDate] = useState('12/08/2024')
  const [bestBefore, setBestBefore] = useState('11/02/2025')
  const [fssaiLic, setFssaiLic] = useState('10012064000142')

  const [activeThumbnail, setActiveThumbnail] = useState(0)

  useEffect(() => {
    if (!scanId) return
    const record = scanStorage.getScan(scanId)
    if (record) {
      setScan(record)
      setExtractedText(
        record.corrections?.rawIngredients ||
          record.response.raw_extracted_text ||
          DEFAULT_LAYS_EXTRACTED_TEXT
      )
      if (record.productName) setProductName(record.productName)
      if (record.brand) setBrand(record.brand)
    } else {
      // Initialize demo data if not found
      scanStorage.initDemoScansIfEmpty()
      const fallback = scanStorage.getScan(scanId) || scanStorage.getAllScans()[0]
      if (fallback) {
        setScan(fallback)
        setExtractedText(fallback.response?.raw_extracted_text || DEFAULT_LAYS_EXTRACTED_TEXT)
      } else {
        setExtractedText(DEFAULT_LAYS_EXTRACTED_TEXT)
      }
    }
  }, [scanId])

  const handleContinue = () => {
    if (scanId) {
      scanStorage.updateCorrections(scanId, {
        productName,
        rawIngredients: extractedText,
        netQuantity,
        mrp,
        mfgDate,
        expiryDate: bestBefore,
        fssaiNumber: fssaiLic,
      })
      navigate(`/scan/${scanId}/results`)
    } else {
      navigate('/scan')
    }
  }

  const thumbnails = [
    scan?.imageUrl ||
      'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop&q=80',
  ]

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Title & Subtitle matching Screen 5 */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Review Extracted Text</h1>
        <p className="text-xs sm:text-sm text-[#64748B]">
          Please review and correct the extracted information if needed.
        </p>
      </div>

      {/* Main Dual-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Preview & Thumbnails */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-[#CBD5E1] bg-white p-4 shadow-sm">
            <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 h-80 sm:h-96 flex items-center justify-center">
              <img
                src={thumbnails[activeThumbnail]}
                alt="Product label preview"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Thumbnails Row below image matching Screen 5 */}
          <div className="flex items-center gap-3">
            {thumbnails.map((thumb, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveThumbnail(idx)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 bg-white p-1 transition-all shadow-xs ${
                  activeThumbnail === idx
                    ? 'border-[#0F766E] ring-2 ring-[#0F766E]/20'
                    : 'border-[#CBD5E1] hover:border-slate-400 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={thumb} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
              </button>
            ))}

            <button
              type="button"
              className="h-16 px-3.5 rounded-xl border border-dashed border-[#CBD5E1] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#64748B] hover:text-[#123044] flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add more</span>
            </button>
          </div>
        </div>

        {/* Right Column: Tabbed Card (Extracted Text / Key Information) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#CBD5E1] p-6 shadow-sm space-y-4">
          {/* Tab Navigation matching Screen 5 */}
          <div className="flex items-center border-b border-slate-200 gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('extracted_text')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'extracted_text'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-[#64748B] hover:text-[#123044]'
              }`}
            >
              Extracted Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('key_info')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'key_info'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-[#64748B] hover:text-[#123044]'
              }`}
            >
              Key Information
            </button>
          </div>

          {/* Tab 1: Extracted Text View */}
          {activeTab === 'extracted_text' ? (
            <div className="space-y-3">
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                rows={14}
                className="w-full p-4 rounded-2xl border border-slate-200 text-sm font-mono text-[#123044] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent leading-relaxed"
                placeholder="OCR Extracted raw text appears here..."
              />
              <p className="text-xs text-slate-400">
                OCR scanned with PaddleOCR engine. You can edit any mistranscribed words directly.
              </p>
            </div>
          ) : (
            /* Tab 2: Key Information View */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#123044] mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#123044] focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#123044] mb-1">Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#123044] focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#123044] mb-1">Net Quantity</label>
                <input
                  type="text"
                  value={netQuantity}
                  onChange={(e) => setNetQuantity(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#123044] focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#123044] mb-1">MRP</label>
                <input
                  type="text"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#123044] focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#123044] mb-1">Manufacturing Date</label>
                <input
                  type="text"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#123044] focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#123044] mb-1">Best Before / Expiry</label>
                <input
                  type="text"
                  value={bestBefore}
                  onChange={(e) => setBestBefore(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#123044] focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#123044] mb-1">FSSAI License No.</label>
                <input
                  type="text"
                  value={fssaiLic}
                  onChange={(e) => setFssaiLic(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#123044] focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Bar matching Screen 5 */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
        <p className="text-xs text-[#64748B]">
          Some text may be unclear. You can edit it manually.
        </p>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-md shadow-[#0F766E]/20 text-sm transition-all flex items-center justify-center gap-2"
        >
          <span>Continue to Reports</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
