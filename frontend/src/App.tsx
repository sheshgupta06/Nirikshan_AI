import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { SignUp } from './pages/SignUp'
import { ScanUpload } from './pages/ScanUpload'
import { OCRReview } from './pages/OCRReview'
import { AnalysisDashboard } from './pages/AnalysisDashboard'
import { HealthReport } from './pages/HealthReport'
import { FSSAIReport } from './pages/FSSAIReport'
import { LegalMetrologyReport } from './pages/LegalMetrologyReport'
import { ScanHistory } from './pages/ScanHistory'
import { HowItWorks } from './pages/HowItWorks'
import { scanStorage } from './services/scanStorage'

export default function App() {
  useEffect(() => {
    // Ensure demo scans are available for immediate showcase
    scanStorage.initDemoScansIfEmpty()
  }, [])

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-[#F4F8F8] text-[#123044] selection:bg-[#0F766E]/20 selection:text-[#0F766E]">
        <Navbar />

        <main className="flex-1">
          <Routes>
            {/* Page 1: Home / Landing */}
            <Route path="/" element={<Home />} />

            {/* Page 2: Login */}
            <Route path="/login" element={<Login />} />

            {/* Page 3: Sign Up */}
            <Route path="/signup" element={<SignUp />} />

            {/* Page 4: Scan / Upload Workspace */}
            <Route path="/scan" element={<ScanUpload />} />

            {/* Page 5: OCR Text Review */}
            <Route path="/scan/:scanId/review" element={<OCRReview />} />

            {/* Page 6: Analysis Overview Dashboard */}
            <Route path="/scan/:scanId/results" element={<AnalysisDashboard />} />

            {/* Page 7: Health Report (Green Theme) */}
            <Route path="/scan/:scanId/health" element={<HealthReport />} />

            {/* Page 8: FSSAI Labelling Report (Blue Theme) */}
            <Route path="/scan/:scanId/fssai" element={<FSSAIReport />} />

            {/* Page 9: Legal Metrology Report (Golden Theme) */}
            <Route path="/scan/:scanId/legal" element={<LegalMetrologyReport />} />

            {/* Page 10: Scan History */}
            <Route path="/history" element={<ScanHistory />} />

            {/* Page 11: How It Works */}
            <Route path="/how-it-works" element={<HowItWorks />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  )
}
