import React from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  FileText,
  Scale,
  Camera,
  Info,
  ChevronRight,
} from 'lucide-react'

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-20 overflow-hidden">
        {/* Soft decorative background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-teal-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#123044] tracking-tight leading-[1.12]">
                Know What's <br />
                on <span className="text-[#087F5B]">Your Food.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#64748B] leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
                Scan, analyse and understand packaged food labels with AI. Get ingredient insights, health information and check FSSAI labelling and legal metrology compliance.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/scan"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] transition-all shadow-md shadow-[#0F766E]/20 flex items-center justify-center gap-2.5 text-sm sm:text-base group"
                >
                  <Camera className="w-5 h-5 text-emerald-200" />
                  <span>Scan Food Packet</span>
                </Link>
                <Link
                  to="/how-it-works"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-[#0F766E] bg-white hover:bg-emerald-50/50 border border-[#CBD5E1] transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Info className="w-5 h-5 text-[#0F766E]" />
                  <span>How It Works</span>
                </Link>
              </div>
            </div>

            {/* Right Product Mockup with 3 Floating Status Cards */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-md mx-auto">
                {/* Packaged Food Product Mockup Image */}
                <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 bg-gradient-to-b from-emerald-50/40 via-amber-50/30 to-slate-50 p-4">
                  <img
                    src="https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&auto=format&fit=crop&q=80"
                    alt="Sample Packaged Food with Nutrition Label"
                    className="w-full h-80 sm:h-96 object-cover rounded-2xl transform hover:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute bottom-6 left-6 right-6 p-3 rounded-xl bg-black/75 backdrop-blur-md text-white flex items-center justify-between border border-white/10 shadow-lg">
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Packaged Food Label Scan
                      </p>
                      <p className="text-sm font-bold truncate">Potato Chips (Front &amp; Back Panel)</p>
                    </div>
                    <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded-md">
                      FSSAI Verified
                    </span>
                  </div>
                </div>

                {/* Floating Card 1: Health Analysis (Moderate) */}
                <div className="absolute -top-4 -right-4 sm:-right-6 z-20 bg-white rounded-2xl p-3.5 shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce [animation-duration:4s]">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#087F5B] flex items-center justify-center border border-emerald-100">
                    <Heart className="w-5 h-5 fill-[#087F5B]/20" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#123044]">Health Analysis</p>
                    <span className="inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Moderate
                    </span>
                  </div>
                </div>

                {/* Floating Card 2: FSSAI Labelling (2 items missing) */}
                <div className="absolute top-1/2 -right-4 sm:-right-8 -translate-y-1/2 z-20 bg-white rounded-2xl p-3.5 shadow-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E40AF] flex items-center justify-center border border-blue-100">
                    <FileText className="w-5 h-5 text-[#1E40AF]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#123044]">FSSAI Labelling</p>
                    <span className="inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      2 items missing
                    </span>
                  </div>
                </div>

                {/* Floating Card 3: Legal Metrology (Compliant) */}
                <div className="absolute -bottom-4 -left-4 sm:-left-6 z-20 bg-white rounded-2xl p-3.5 shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce [animation-duration:5s]">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#9A6712] flex items-center justify-center border border-amber-100">
                    <Scale className="w-5 h-5 text-[#9A6712]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#123044]">Legal Metrology</p>
                    <span className="inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Compliant
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Core Modules Preview Bar matching Mockup Screen 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16">
            {/* Module 1: Health Analysis */}
            <Link
              to="/scan"
              className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md hover:border-[#087F5B]/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#087F5B] text-white flex items-center justify-center shadow-md shadow-[#087F5B]/20 shrink-0">
                  <Heart className="w-6 h-6 fill-white/20" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#123044] group-hover:text-[#087F5B] transition-colors">
                    Health Analysis
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Ingredients, Nutrition, Allergens & Health Insights
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#94A3B8] group-hover:text-[#087F5B] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </Link>

            {/* Module 2: FSSAI Labelling */}
            <Link
              to="/scan"
              className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md hover:border-[#1E40AF]/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1E40AF] text-white flex items-center justify-center shadow-md shadow-[#1E40AF]/20 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#123044] group-hover:text-[#1E40AF] transition-colors">
                    FSSAI Labelling
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Check mandatory declarations as per FSS (Labelling) Regulations
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#94A3B8] group-hover:text-[#1E40AF] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </Link>

            {/* Module 3: Legal Metrology */}
            <Link
              to="/scan"
              className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md hover:border-[#9A6712]/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#9A6712] text-white flex items-center justify-center shadow-md shadow-[#9A6712]/20 shrink-0">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#123044] group-hover:text-[#9A6712] transition-colors">
                    Legal Metrology
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    MRP, Net Quantity, Manufacturer details and more
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#94A3B8] group-hover:text-[#9A6712] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust & Methodology Section */}
      <section className="py-16 bg-[#F8FAFC] border-t border-[#E2E8F0]">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">
              How Nirikshan AI Evaluates Packaged Food
            </h2>
            <p className="text-sm text-[#64748B]">
              Every assessment is deterministically backed by official statutory gazettes and ICMR clinical evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#087F5B] flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-bold text-[#123044]">OCR & Section Segmentation</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Separates the ingredient panel from nutrition facts, warnings, and commercial manufacturer declarations using layout-aware computer vision.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E40AF] flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-bold text-[#123044]">Statutory Rule Engine</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Applies FSSAI Labelling Regulations 2020 and Legal Metrology Rule 6 checks without LLM hallucinations or guesswork.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#9A6712] flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-bold text-[#123044]">Personalized Health Report</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Matches ingredients and nutritional values against family allergy profiles, diabetic thresholds, and hypertensive sodium guidelines.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
