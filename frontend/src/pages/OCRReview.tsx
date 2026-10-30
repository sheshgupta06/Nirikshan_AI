import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { scanStorage, type StoredScan } from '../services/scanStorage'

export const OCRReview: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const navigate = useNavigate()
  const [scan, setScan] = useState<StoredScan | null>(null)

  const [activeTab, setActiveTab] = useState<'extracted_text' | 'key_info'>('extracted_text')
  const [extractedText, setExtractedText] = useState('')

  // Key Info tab fields initialized dynamically
  const [productName, setProductName] = useState('')
  const [brand, setBrand] = useState('')
  const [netQuantity, setNetQuantity] = useState('')
  const [mrp, setMrp] = useState('')
  const [mfgDate, setMfgDate] = useState('')
  const [bestBefore, setBestBefore] = useState('')
  const [fssaiLic, setFssaiLic] = useState('')

  const [activeThumbnail, setActiveThumbnail] = useState(0)

  useEffect(() => {
    if (!scanId) return
    const record = scanStorage.getScan(scanId)
    if (record) {
      setScan(record)
      const text =
        record.corrections?.rawIngredients ||
        record.response?.raw_extracted_text ||
        ''
      setExtractedText(text)
      if (record.productName) setProductName(record.productName)
      if (record.brand) setBrand(record.brand)

      // Extract dynamic key values from compliance report or regex from text
      const items = record.response?.compliance_report?.items || []
      const netQtyItem = items.find((i) => i.rule_id === 'LM-01-NET_QTY' || i.title.toLowerCase().includes('net quantity'))
      const mrpItem = items.find((i) => i.rule_id === 'LM-02-MRP' || i.title.toLowerCase().includes('mrp') || i.title.toLowerCase().includes('price'))
      const dateItem = items.find((i) => i.rule_id === 'LM-03-MFG_DATE' || i.title.toLowerCase().includes('date'))
      const fssaiItem = items.find((i) => i.rule_id === 'FSSAI-06-LIC' || i.title.toLowerCase().includes('license') || i.title.toLowerCase().includes('fssai'))

      // Net Quantity
      if (record.corrections?.netQuantity) {
        setNetQuantity(record.corrections.netQuantity)
      } else if (netQtyItem?.evidence_text) {
        setNetQuantity(netQtyItem.evidence_text)
      } else {
        const m = text.match(/(?:NET\s*(?:WEIGHT|QTY|QUANTITY)|DRAINED\s*WEIGHT)\s*[:\-]?\s*([0-9]+\s*(?:g|kg|ml|l))/i)
        setNetQuantity(m ? m[1] : 'Not specified')
      }

      // MRP
      if (record.corrections?.mrp) {
        setMrp(record.corrections.mrp)
      } else if (mrpItem?.evidence_text) {
        setMrp(mrpItem.evidence_text)
      } else {
        const m = text.match(/(?:MRP|RS\.?|PRICE)\s*[:\-]?\s*(?:₹|RS\.?)?\s*([0-9]+(?:\.[0-9]{2})?)/i)
        setMrp(m ? `₹ ${m[1]}` : 'Not specified')
      }

      // Mfg Date
      if (record.corrections?.mfgDate) {
        setMfgDate(record.corrections.mfgDate)
      } else if (dateItem?.evidence_text) {
        setMfgDate(dateItem.evidence_text)
      } else {
        const m = text.match(/(?:MFG|DATE\s*OF\s*MFG|PKD)\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i)
        setMfgDate(m ? m[1] : 'Not specified')
      }

      // Best Before / Expiry
      if (record.corrections?.expiryDate) {
        setBestBefore(record.corrections.expiryDate)
      } else {
        const m = text.match(/(?:BEST\s*BEFORE|EXP|EXPIRY|USE\s*BY)\s*[:\-]?\s*([^\n\r]+)/i)
        setBestBefore(m ? m[1].trim().slice(0, 35) : 'Not specified')
      }

      // FSSAI License
      if (record.corrections?.fssaiNumber) {
        setFssaiLic(record.corrections.fssaiNumber)
      } else if (fssaiItem?.evidence_text) {
        setFssaiLic(fssaiItem.evidence_text)
      } else {
        const m = text.match(/\b(1[0-9]{13})\b/)
        setFssaiLic(m ? m[1] : 'Not detected')
      }
    } else {
      setExtractedText('')
      setProductName('')
      setBrand('')
    }
  }, [scanId])

  const handleContinue = () => {
    if (scanId) {
      scanStorage.updateCorrections(scanId, {
        productName: productName || scan?.productName || 'Packaged Food Product',
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

  const rawThumbnails = (
    scan?.imageUrls && scan.imageUrls.length > 0
      ? scan.imageUrls
      : [scan?.imageUrl, scan?.secondaryImageUrl].filter(Boolean)
  ) as string[]

  const thumbnails = rawThumbnails.length > 0 ? rawThumbnails : (scan?.imageUrl ? [scan.imageUrl] : [])

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
              {thumbnails[activeThumbnail] ? (
                <img
                  src={thumbnails[activeThumbnail]}
                  alt={`Product label panel ${activeThumbnail + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <p className="text-sm font-semibold">Packaging Image</p>
                </div>
              )}
            </div>
            {thumbnails.length > 1 && (
              <p className="text-center text-xs text-slate-500 font-medium pt-2">
                Viewing {activeThumbnail === 0 ? 'Front Panel' : 'Back / Nutrition Panel'} ({activeThumbnail + 1} of {thumbnails.length})
              </p>
            )}
          </div>

          {/* Thumbnails Row below image matching Screen 5 */}
          <div className="flex items-center gap-3">
            {thumbnails.map((thumb, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveThumbnail(idx)}
                className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 bg-white p-1 transition-all shadow-xs flex flex-col items-center justify-center ${
                  activeThumbnail === idx
                    ? 'border-[#0F766E] ring-2 ring-[#0F766E]/20'
                    : 'border-[#CBD5E1] hover:border-slate-400 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={thumb} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                <span className="absolute bottom-1 bg-black/70 text-[9px] text-white px-1.5 py-0.2 rounded font-semibold">
                  {idx === 0 ? 'Front' : 'Back'}
                </span>
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
                OCR scanned with Nirikshan Vision Engine. You can edit any mistranscribed words directly.
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
