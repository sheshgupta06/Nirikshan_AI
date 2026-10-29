import React from 'react'
import { Link } from 'react-router-dom'
import {
  HeartPulse,
  ClipboardCheck,
  Scale,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  ChevronRight
} from 'lucide-react'

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section with Dark Navy Background */}
      <section className="bg-[#123044] text-white pt-16 pb-20 lg:pt-24 lg:pb-28 relative overflow-hidden">
        {/* Subtle geometric pattern background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-emerald-300 text-xs sm:text-sm font-medium border border-white/15 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>India-First Smart Food Label Intelligence</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
                Know What's on <br />
                <span className="text-emerald-400">Your Food.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Analyse packaged-food labels with computer vision. Understand complex ingredient terms, identify hidden allergens and additives, and audit mandatory declarations under FSSAI Regulations and Legal Metrology Rule 6.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  to="/scan"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] transition-all shadow-lg shadow-[#0F766E]/30 flex items-center justify-center gap-2.5 text-base"
                >
                  <Sparkles className="w-5 h-5 text-emerald-200" />
                  <span>Scan Food Packet</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/how-it-works"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 transition-all flex items-center justify-center gap-2 text-base"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>How It Works</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-700/60 max-w-lg mx-auto lg:mx-0 text-left">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-white">100%</div>
                  <div className="text-xs text-slate-400">Statutory Rule Base</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-400">0% Fake AI</div>
                  <div className="text-xs text-slate-400">No Simulated Hallucinations</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-white">3 Engines</div>
                  <div className="text-xs text-slate-400">Health, FSSAI & Metrology</div>
                </div>
              </div>
            </div>

            {/* Right Product Illustration / Preview Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
                  </div>
                  <span className="text-xs font-mono text-slate-300">Label Analysis Engine</span>
                </div>

                {/* Simulated Label Preview */}
                <div className="space-y-3 bg-[#F4F8F8] rounded-xl p-4 text-[#123044]">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wide">Sample Packaged Snack</span>
                      <h3 className="font-bold text-base text-[#123044]">Haldiram's Bhujia Sev</h3>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Vegetarian
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-[#DCE5E5] text-xs space-y-1">
                    <span className="font-semibold text-slate-600 block">Extracted Ingredients:</span>
                    <p className="text-slate-800 line-clamp-2">
                      Moth Dal Flour, Gram Flour, Edible Vegetable Oil (Palmolein), Salt, Red Chilli, Citric Acid (INS 330)...
                    </p>
                  </div>

                  {/* 3 Quick Status Indicators */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#EBFBEE] border border-[#C3FAE8] text-xs">
                      <div className="flex items-center gap-1.5 text-[#087F5B] font-semibold">
                        <HeartPulse className="w-4 h-4" />
                        <span>Health Analysis</span>
                      </div>
                      <span className="text-[#087F5B] font-bold">2 Allergens • 1 Additive</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#EBF3FF] border border-[#D0EBFF] text-xs">
                      <div className="flex items-center gap-1.5 text-[#315DB5] font-semibold">
                        <ClipboardCheck className="w-4 h-4" />
                        <span>FSSAI Labelling</span>
                      </div>
                      <span className="text-[#315DB5] font-bold">100% Compliant</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFF9DB] border border-[#FFE066] text-xs">
                      <div className="flex items-center gap-1.5 text-[#9A6712] font-semibold">
                        <Scale className="w-4 h-4" />
                        <span>Legal Metrology</span>
                      </div>
                      <span className="text-[#9A6712] font-bold">Rule 6 Verified</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <Link
                    to="/scan"
                    className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1"
                  >
                    Try live scanning with your product label <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section (The 3 Core Modules) */}
      <section className="py-16 sm:py-24 bg-[#F4F8F8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#123044] tracking-tight">
              Three Specialized Screening Engines
            </h2>
            <p className="text-[#64748B] text-base sm:text-lg">
              Never mixed, never confused. Nirikshan AI strictly separates nutritional health impact from statutory labelling compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Health Analysis (Green) */}
            <div className="bg-white rounded-2xl border-2 border-[#C3FAE8] p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#EBFBEE] text-[#087F5B] flex items-center justify-center shadow-inner">
                  <HeartPulse className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#087F5B]">Module 1</span>
                  <h3 className="text-2xl font-bold text-[#123044] mt-1">Health & Ingredient Safety</h3>
                </div>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Deciphers complex chemical names, aliases (Maida, Palmolein), INS additives, and distinguishes declared recipe allergens (CONTAINS) from cross-contamination warnings (MAY CONTAIN).
                </p>
                <ul className="space-y-2 text-xs text-[#123044] pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#087F5B]" />
                    <span>WHO & ICMR evidence-backed benchmarks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#087F5B]" />
                    <span>Multi-jurisdiction additive status (India, EU, US)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#087F5B]" />
                    <span>Serving size & daily sugar/sodium thresholds</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-[#DCE5E5]">
                <Link
                  to="/scan"
                  className="text-sm font-bold text-[#087F5B] hover:text-[#065A40] inline-flex items-center gap-1.5"
                >
                  Explore Health Analysis <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 2: FSSAI Labelling (Blue) */}
            <div className="bg-white rounded-2xl border-2 border-[#D0EBFF] p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#EBF3FF] text-[#315DB5] flex items-center justify-center shadow-inner">
                  <ClipboardCheck className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#315DB5]">Module 2</span>
                  <h3 className="text-2xl font-bold text-[#123044] mt-1">FSSAI Labelling Compliance</h3>
                </div>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Audits packaged foods against the Food Safety and Standards (Labelling and Display) Regulations, 2020. Evaluates mandatory declarations without jumping to false conclusions.
                </p>
                <ul className="space-y-2 text-xs text-[#123044] pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#315DB5]" />
                    <span>FSSAI 14-digit license number and logo check</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#315DB5]" />
                    <span>Veg / Non-Veg statutory symbol placement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#315DB5]" />
                    <span>Descending order ingredient listing audit</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-[#DCE5E5]">
                <Link
                  to="/scan"
                  className="text-sm font-bold text-[#315DB5] hover:text-[#214389] inline-flex items-center gap-1.5"
                >
                  Explore FSSAI Labelling <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 3: Legal Metrology (Golden) */}
            <div className="bg-white rounded-2xl border-2 border-[#FFE066] p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FFF9DB] text-[#9A6712] flex items-center justify-center shadow-inner">
                  <Scale className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9A6712]">Module 3</span>
                  <h3 className="text-2xl font-bold text-[#123044] mt-1">Legal Metrology Compliance</h3>
                </div>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Verifies package declarations under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. Checks MRP format, metric net quantity, and manufacturer address.
                </p>
                <ul className="space-y-2 text-xs text-[#123044] pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#9A6712]" />
                    <span>Rule 6(1)(a)-(e) mandatory declarations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#9A6712]" />
                    <span>Standard metric unit formats (g, kg, ml, l)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#9A6712]" />
                    <span>Consumer grievance contact & manufacturing dates</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-[#DCE5E5]">
                <Link
                  to="/scan"
                  className="text-sm font-bold text-[#9A6712] hover:text-[#6D490B] inline-flex items-center gap-1.5"
                >
                  Explore Legal Metrology <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Workflow Section */}
      <section className="py-16 sm:py-20 bg-white border-y border-[#DCE5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">Simple & Transparent</span>
            <h2 className="text-3xl font-extrabold text-[#123044]">How Nirikshan AI Works</h2>
            <p className="text-[#64748B] text-base">
              From camera snap to comprehensive statutory screening in three straightforward steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-[#F4F8F8] border border-[#DCE5E5] space-y-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-lg shadow-md mx-auto sm:mx-0">
                1
              </div>
              <h3 className="text-xl font-bold text-[#123044]">Upload Food Label</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Take a photo or upload an image of the ingredient list and nutritional table. OpenCV immediately validates sharpness and lighting.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-[#F4F8F8] border border-[#DCE5E5] space-y-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-lg shadow-md mx-auto sm:mx-0">
                2
              </div>
              <h3 className="text-xl font-bold text-[#123044]">Extract & Review Text</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                OCR extracts text with bounding boxes. You can inspect and correct any blurred or uncertain lines before final report generation.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-[#F4F8F8] border border-[#DCE5E5] space-y-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-lg shadow-md mx-auto sm:mx-0">
                3
              </div>
              <h3 className="text-xl font-bold text-[#123044]">Review Divided Reports</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Explore separate, evidence-backed reports for Health, FSSAI Labelling, and Legal Metrology Rule 6 with cited legal sections.
              </p>
            </div>
          </div>

          <div className="text-center pt-4">
            <Link
              to="/scan"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-sm transition-all"
            >
              <Sparkles className="w-5 h-5 text-emerald-200" />
              <span>Start Your First Scan</span>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 sm:py-20 bg-[#F4F8F8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-[#DCE5E5] p-8 sm:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">About Nirikshan AI</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">
                Built for Food Transparency in India
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                Packaged food in India is governed by rigorous legal frameworks, yet consumers and small businesses often struggle to interpret chemical additives, allergen statements, and mandatory declaration rules. Nirikshan AI bridges this gap with deterministic rule engines, open nutrition databases (Open Food Facts), and statutory references from FSSAI and the Department of Consumer Affairs.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="p-4 rounded-xl bg-[#F4F8F8] border border-[#DCE5E5] text-xs space-y-1">
                <span className="font-bold text-[#123044] block">Deterministic Compliance</span>
                <span className="text-[#64748B]">Legal rulings are based on statutory rules, never hallucinated by large language models.</span>
              </div>
              <div className="p-4 rounded-xl bg-[#F4F8F8] border border-[#DCE5E5] text-xs space-y-1">
                <span className="font-bold text-[#123044] block">Evidence-Backed Health</span>
                <span className="text-[#64748B]">Health insights link directly to official WHO and ICMR published literature.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
