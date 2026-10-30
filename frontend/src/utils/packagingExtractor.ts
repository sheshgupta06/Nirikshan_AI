export interface ExtractedPackagingDetails {
  mrp: string
  netQuantity: string
  mfgDate: string
  expiryDate: string
  fssaiNumber: string
  manufacturer: string
  consumerCare: string
}

export function isCleanValue(val?: string | null): boolean {
  if (!val) return false
  const lower = val.toLowerCase().trim()
  if (
    !lower ||
    lower === 'not specified' ||
    lower === 'not detected' ||
    lower === 'check package' ||
    lower === 'check package stamp' ||
    lower === 'check package crimp' ||
    lower === 'mrp' ||
    lower === 'price' ||
    lower.startsWith('detected') ||
    lower.includes('not recognized') ||
    lower.includes('not found') ||
    lower.includes('consumer feedback') ||
    lower.includes('price line') ||
    lower.includes('see below') ||
    lower.includes('see lot') ||
    lower.includes('see crimp') ||
    lower.includes('see pkg') ||
    lower.includes('metric weight') ||
    lower.includes('facility address') ||
    lower.includes('unambiguously recognized') ||
    lower.includes('graphical logo')
  ) {
    return false
  }
  return true
}

export function cleanEvidenceString(val?: string | null): string {
  if (!val) return ''
  return val
    .replace(/^Detected:\s*/i, '')
    .replace(/\s*\(Consumer feedback \/ Price line\)/i, '')
    .replace(/^(?:Metric weight|Product title|Nutrition table|14-digit|No explicit|Manufacturer \/ Marketing).*$/i, '')
    .trim()
}

export function extractPackagingDetails(
  text: string,
  existingCorrections?: {
    mrp?: string
    netQuantity?: string
    mfgDate?: string
    expiryDate?: string
    fssaiNumber?: string
    productName?: string
    brand?: string
  },
  evidenceFallback?: {
    mrp?: string
    netQuantity?: string
    mfgDate?: string
    fssai?: string
    manufacturer?: string
    consumerCare?: string
  }
): ExtractedPackagingDetails {
  const cleanText = text || ''

  // 1. MRP (Maximum Retail Price)
  let mrp = ''
  if (isCleanValue(existingCorrections?.mrp)) {
    const raw = existingCorrections!.mrp!.trim()
    mrp = raw.startsWith('₹') || raw.toLowerCase().startsWith('rs') ? raw : `₹ ${raw}`
  } else {
    const m =
      cleanText.match(/(?:MRP|PRICE|MAX\.?\s*RETAIL\s*PRICE|Rs\.?|₹)\s*[:\.\-]?\s*(?:₹|Rs\.?|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
      cleanText.match(/(?:₹|Rs\.?)\s*([0-9]+(?:\.[0-9]{1,2})?)/i)
    if (m) {
      mrp = `₹ ${m[1]}`
    } else {
      const cleanEv = cleanEvidenceString(evidenceFallback?.mrp)
      if (isCleanValue(cleanEv)) {
        const evM = cleanEv.match(/([0-9]+(?:\.[0-9]{1,2})?)/)
        mrp = evM ? `₹ ${evM[1]}` : cleanEv
      }
    }
  }

  // 2. Net Quantity / Weight (supports g, gm, gms, grams, kg, ml, l, pcs, + free)
  let netQuantity = ''
  if (isCleanValue(existingCorrections?.netQuantity)) {
    netQuantity = existingCorrections!.netQuantity!.trim()
  } else {
    const qtyUnitRegex = '(?:g(?:ms?|rams?)?|kg(?:s)?|ml|l(?:tr|itre?s?)?|pcs|units?|n)\\.?'
    const freePromoRegex = `(?:\\s*[\\+\\&]\\s*[0-9]+(?:\\.[0-9]+)?\\s*${qtyUnitRegex}\\s*(?:FREE)?)?`
    
    // Explicit label match (e.g. NET WEIGHT: 23 G + 5 G FREE or Net Wt: 50 gms)
    const m1 = cleanText.match(
      new RegExp(`(?:NET\\s*(?:WEIGHT|WT|QTY|QUANTITY|CONTENTS?|CONT\\.?|VOLUME)?|DRAINED\\s*WEIGHT)\\s*[:\\.\\-]?\\s*([0-9]+(?:\\.[0-9]+)?\\s*${qtyUnitRegex}\\b${freePromoRegex})`, 'i')
    )
    // Promotional + FREE match anywhere (e.g. 23 g + 5 g FREE)
    const m2 = !m1 ? cleanText.match(
      new RegExp(`([0-9]+(?:\\.[0-9]+)?\\s*${qtyUnitRegex}\\s*[\\+\\&]\\s*[0-9]+(?:\\.[0-9]+)?\\s*${qtyUnitRegex}\\s*FREE)`, 'i')
    ) : null
    // Standalone weight pattern (excluding nutrition table lines if possible)
    const m3 = !m1 && !m2 ? cleanText.match(
      new RegExp(`\\b([0-9]+(?:\\.[0-9]+)?\\s*${qtyUnitRegex}\\b${freePromoRegex})`, 'i')
    ) : null

    const matchedQty = m1 ? m1[1] : (m2 ? m2[1] : (m3 ? m3[1] : null))

    if (matchedQty) {
      netQuantity = matchedQty.trim().replace(/\.$/, '')
    } else {
      const cleanEv = cleanEvidenceString(evidenceFallback?.netQuantity)
      if (isCleanValue(cleanEv)) {
        netQuantity = cleanEv
      }
    }
  }

  // 3. Manufacturing Date (PKD / MFG / MFD)
  let mfgDate = ''
  if (isCleanValue(existingCorrections?.mfgDate)) {
    mfgDate = existingCorrections!.mfgDate!.trim()
  } else {
    const dateVal = '(?:\\d{1,2}[\\/\\-\\.\\s](?:[A-Za-z]{3,9}|\\d{1,2})[\\/\\-\\.\\s]\\d{2,4}|\\d{1,2}[\\/\\-\\.]\\d{2,4}|[A-Za-z]{3,9}\\.?[\\\'\\’\\s\\.\\-]?\\d{2,4})'
    const mfgRegex = new RegExp(
      `(?:DATE\\s*OF\\s*(?:MFG|PACK(?:ING|AGING)?)|(?:PKD|MFG|MFD|PACKED|PACKAGING|MANUFACTURE(?:D)?)\\.?\\s*(?:DATE|ON)?)\\s*[:\\.\\-]*\\s*(${dateVal})`,
      'i'
    )
    const m = cleanText.match(mfgRegex)
    if (m) {
      mfgDate = m[1].trim()
    } else {
      const cleanEv = cleanEvidenceString(evidenceFallback?.mfgDate)
      if (isCleanValue(cleanEv)) {
        const evM = cleanEv.match(new RegExp(dateVal, 'i'))
        mfgDate = evM ? evM[0].trim() : cleanEv
      }
    }
  }

  // 4. Best Before / Expiry Date
  let expiryDate = ''
  if (isCleanValue(existingCorrections?.expiryDate)) {
    expiryDate = existingCorrections!.expiryDate!.trim()
  } else {
    const dateVal = '(?:\\d{1,2}[\\/\\-\\.\\s](?:[A-Za-z]{3,9}|\\d{1,2})[\\/\\-\\.\\s]\\d{2,4}|\\d{1,2}[\\/\\-\\.]\\d{2,4}|[A-Za-z]{3,9}\\.?[\\\'\\’\\s\\.\\-]?\\d{2,4})'
    const expDateRegex = new RegExp(
      `(?:USE\\s*BY|EXP(?:IRY)?|EXP\\.?\\s*DATE|BEST\\s*BEFORE)\\.?\\s*(?:DATE|ON)?\\s*[:\\.\\-]*\\s*(${dateVal})`,
      'i'
    )
    const periodRegex = /(?:BEST\s*BEFORE|USE\s*BY|USE\s*WITHIN|SHELF\s*LIFE)\.?\s*[:\.\-]*\s*([0-9]+\s*(?:MONTHS?|DAYS?|WEEKS?|YEARS?)(?:\s*(?:FROM|OF)\s*(?:THE\s*DATE\s*OF\s*)?[A-Za-z\s]+)?)/i

    const dateM = cleanText.match(expDateRegex)
    const periodM = !dateM ? cleanText.match(periodRegex) : null

    if (dateM) {
      expiryDate = dateM[1].trim()
    } else if (periodM) {
      expiryDate = periodM[1].trim()
    } else {
      const cleanEv = cleanEvidenceString(evidenceFallback?.consumerCare) // or date fallback
      if (cleanEv && cleanEv.toLowerCase().includes('exp:')) {
        const evM = cleanEv.match(/EXP:\s*([^\s,]+)/i)
        if (evM) expiryDate = evM[1].trim()
      }
    }
  }

  // 5. FSSAI License Number (14 digits)
  let fssaiNumber = ''
  if (isCleanValue(existingCorrections?.fssaiNumber)) {
    const pure = existingCorrections!.fssaiNumber!.match(/\b([12]\d{13})\b/)
    fssaiNumber = pure ? pure[1] : existingCorrections!.fssaiNumber!.trim()
  } else {
    const m = cleanText.match(/\b([12]\d{13})\b/)
    if (m) {
      fssaiNumber = m[1]
    } else {
      const cleanEv = cleanEvidenceString(evidenceFallback?.fssai)
      const pure = cleanEv ? cleanEv.match(/\b([12]\d{13})\b/) : null
      if (pure) fssaiNumber = pure[1]
    }
  }

  // 6. Manufacturer Name / Address
  let manufacturer = ''
  const mfrMatch = cleanText.match(
    /(?:Manufactured\s*(?:&|AND)?\s*Packed\s*by|Manufacturer|Marketed\s*by|Packed\s*by|Mfg\s*by)\s*[:\-]?\s*([^\n\r,]+(?:(?:Pvt|Ltd|Limited|LLP|Inc)\.?)?)/i
  )
  if (mfrMatch) {
    manufacturer = mfrMatch[1].trim()
  } else {
    const cleanEv = cleanEvidenceString(evidenceFallback?.manufacturer)
    if (isCleanValue(cleanEv)) {
      manufacturer = cleanEv
    } else {
      manufacturer = existingCorrections?.brand || existingCorrections?.productName || 'Packer / Brand Holder'
    }
  }

  // 7. Consumer Care Helpline / Email (strictly excludes FSSAI license numbers starting with 1001)
  let consumerCare = ''
  const emailM = cleanText.match(/\b([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/i)
  // Real Indian phone: 1800 toll free, mobile (+91 6-9xxxxxxxx), or STD landline (0xx-xxxxxxx)
  const phoneM = cleanText.match(/(?:\+91[\s\-]?)?[6-9]\d{9}\b|\b1800[\s\-]?\d{3}[\s\-]?\d{3,4}\b|\b0[1-9]\d{1,3}[\s\-]?\d{6,8}\b/)
  // Explicit consumer care sentence
  const careLineM = cleanText.match(/(?:Consumer\s*Care|Customer\s*Care|Customer\s*Support|Help(?:line)?|Feedback)\s*[:\-]?\s*([^\n\r]+)/i)

  if (emailM && phoneM) {
    consumerCare = `${emailM[1]} | Tel: ${phoneM[0]}`
  } else if (emailM) {
    consumerCare = `Email: ${emailM[1]}`
  } else if (phoneM) {
    consumerCare = `Helpline: ${phoneM[0]}`
  } else if (careLineM && !careLineM[1].toLowerCase().includes('mrp') && !careLineM[1].toLowerCase().includes('price line')) {
    consumerCare = careLineM[1].trim()
  } else {
    const cleanEv = cleanEvidenceString(evidenceFallback?.consumerCare)
    if (
      isCleanValue(cleanEv) &&
      !cleanEv.toLowerCase().includes('mrp') &&
      !cleanEv.toLowerCase().includes('1001')
    ) {
      consumerCare = cleanEv
    } else {
      consumerCare = 'Refer to package contact details'
    }
  }

  return {
    mrp: mrp || 'Check package',
    netQuantity: netQuantity || 'Check package',
    mfgDate: mfgDate || 'Check package',
    expiryDate: expiryDate || 'Check package',
    fssaiNumber: fssaiNumber || 'Check package',
    manufacturer: manufacturer || 'Packer / Brand Holder',
    consumerCare: consumerCare || 'Refer to package contact details',
  }
}
