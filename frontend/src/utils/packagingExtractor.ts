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
    } else if (isCleanValue(evidenceFallback?.mrp)) {
      mrp = cleanEvidenceString(evidenceFallback!.mrp)
    }
  }

  // 2. Net Quantity
  let netQuantity = ''
  if (isCleanValue(existingCorrections?.netQuantity)) {
    netQuantity = existingCorrections!.netQuantity!.trim()
  } else {
    const m =
      cleanText.match(/(?:NET\s*(?:WEIGHT|WT|QTY|QUANTITY)|DRAINED\s*WEIGHT)\s*[:\.\-]?\s*([0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|l)\b(?:\s*\+\s*[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|l)\s*(?:FREE)?)?)/i) ||
      cleanText.match(/\b([0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|l)\b(?:\s*\+\s*[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|l)\s*(?:FREE)?)?)/i)
    if (m) {
      netQuantity = m[1].trim()
    } else if (isCleanValue(evidenceFallback?.netQuantity)) {
      netQuantity = cleanEvidenceString(evidenceFallback!.netQuantity)
    }
  }

  // 3. Manufacturing Date (PKD / MFG / MFD)
  let mfgDate = ''
  if (isCleanValue(existingCorrections?.mfgDate)) {
    mfgDate = existingCorrections!.mfgDate!.trim()
  } else {
    const m = cleanText.match(
      /(?:PKD|MFG|MFD|PACKED|PACKAGING|MANUFACTURE(?:D)?)\s*(?:DATE|ON)?\s*[:\.]*\s*([A-Za-z]{3,9}\.?\s*['’\s]?[0-9]{2,4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}[\/\-\.]\d{2,4})/i
    )
    if (m) {
      mfgDate = m[1].trim()
    } else if (isCleanValue(evidenceFallback?.mfgDate)) {
      mfgDate = cleanEvidenceString(evidenceFallback!.mfgDate)
    }
  }

  // 4. Best Before / Expiry Date
  let expiryDate = ''
  if (isCleanValue(existingCorrections?.expiryDate)) {
    expiryDate = existingCorrections!.expiryDate!.trim()
  } else {
    const dateM = cleanText.match(
      /(?:USE\s*BY|EXP(?:IRY)?|EXP\s*DATE)\s*(?:DATE|ON)?\s*[:\.]*\s*([A-Za-z]{3,9}\.?\s*['’\s]?[0-9]{2,4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}[\/\-\.]\d{2,4})/i
    )
    const periodM = !dateM
      ? cleanText.match(/BEST\s*BEFORE\s*[:\.]?\s*([0-9]+\s*(?:MONTHS|DAYS|YEARS)(?:\s*FROM\s*[A-Za-z\s]+)?)/i)
      : null
    const generalM =
      !dateM && !periodM
        ? cleanText.match(
            /BEST\s*BEFORE\s*[:\.]*\s*([A-Za-z]{3,9}\.?\s*['’\s]?[0-9]{2,4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}[\/\-\.]\d{2,4})/i
          )
        : null

    if (dateM) expiryDate = dateM[1].trim()
    else if (periodM) expiryDate = periodM[1].trim()
    else if (generalM) expiryDate = generalM[1].trim()
  }

  // 5. FSSAI License Number (14 digits)
  let fssaiNumber = ''
  if (isCleanValue(existingCorrections?.fssaiNumber)) {
    const pure = existingCorrections!.fssaiNumber!.match(/\b(1\d{13})\b/)
    fssaiNumber = pure ? pure[1] : existingCorrections!.fssaiNumber!.trim()
  } else {
    const m = cleanText.match(/\b(1\d{13})\b/)
    if (m) {
      fssaiNumber = m[1]
    } else if (evidenceFallback?.fssai) {
      const pure = evidenceFallback.fssai.match(/\b(1\d{13})\b/)
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
  } else if (isCleanValue(evidenceFallback?.manufacturer)) {
    manufacturer = cleanEvidenceString(evidenceFallback!.manufacturer)
  } else {
    manufacturer = existingCorrections?.brand || existingCorrections?.productName || 'Packer / Brand Holder'
  }

  // 7. Consumer Care Helpline / Email
  let consumerCare = ''
  const emailM = cleanText.match(/\b([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/i)
  const phoneM = cleanText.match(/(?:\+?\d{2,4}[\s\-]?)?(?:1800[\s\-]?\d{3}[\s\-]?\d{3,4}|\b\d{3,4}[\s\-]?\d{7,8}\b)/)

  if (emailM && phoneM) {
    consumerCare = `${emailM[1]} | Tel: ${phoneM[0]}`
  } else if (emailM) {
    consumerCare = `Email: ${emailM[1]}`
  } else if (phoneM) {
    consumerCare = `Helpline: ${phoneM[0]}`
  } else if (
    isCleanValue(evidenceFallback?.consumerCare) &&
    !evidenceFallback!.consumerCare!.toLowerCase().includes('mrp')
  ) {
    consumerCare = cleanEvidenceString(evidenceFallback!.consumerCare)
  } else {
    consumerCare = 'Refer to package contact details'
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
