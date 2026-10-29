import React from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  FileText,
  Scale,
  Camera,
  Info,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  AlertTriangle,
  ArrowRight,
  Activity,
  HeartPulse,
} from 'lucide-react'

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20 overflow-hidden">
        {/* Soft decorative background glow */}
        <div className="absolute top-0 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/4 w-64 sm:w-80 h-64 sm:h-80 bg-teal-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#0F766E] text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>AI-Powered Food Label &amp; Patient Safety Intelligence</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#123044] tracking-tight leading-[1.15]">
                Know What's <br className="hidden sm:block" />
                on <span className="text-[#087F5B]">Your Food.</span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-[#64748B] leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
                पैकेट पर लिखी हर सामग्री की सच्चाई जानें। Scan packaged food labels instantly to decode ingredients, uncover hidden additives, and get clinical safety warnings for <strong>Diabetes, Kidney Disease &amp; High BP</strong>.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/scan"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] transition-all shadow-md shadow-[#0F766E]/20 flex items-center justify-center gap-2.5 text-sm sm:text-base group"
                >
                  <Camera className="w-5 h-5 text-emerald-200" />
                  <span>Scan Food Packet</span>
                  <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition-transform" />
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

            {/* Right Product Mockup with Safe Responsive Floating Cards */}
            <div className="lg:col-span-5 relative flex items-center justify-center pt-2 lg:pt-0">
              <div className="relative w-full max-w-xs sm:max-w-md mx-auto">
                {/* Packaged Food Product Mockup Image */}
                <div className="relative z-10 rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-gradient-to-b from-emerald-50/40 via-amber-50/30 to-slate-50 p-3 sm:p-4">
                  <img
                    src="https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&auto=format&fit=crop&q=80"
                    alt="Sample Packaged Food with Nutrition Label"
                    className="w-full h-56 sm:h-80 object-cover rounded-2xl"
                  />
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 p-2 sm:p-3 rounded-xl bg-black/80 backdrop-blur-md text-white flex items-center justify-between border border-white/10 shadow-lg">
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Packaged Food Scan
                      </p>
                      <p className="text-xs sm:text-sm font-bold truncate">Potato Chips Label</p>
                    </div>
                    <span className="text-[9px] sm:text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-md">
                      FSSAI Verified
                    </span>
                  </div>
                </div>

                {/* Floating Card 1: Health Analysis */}
                <div className="absolute top-2 right-2 sm:-top-3 sm:-right-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl p-2 sm:p-3 shadow-lg border border-slate-200 flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-[#087F5B] flex items-center justify-center border border-emerald-100 shrink-0">
                    <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#087F5B]/20" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-bold text-[#123044]">Health Analysis</p>
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      High Sodium
                    </span>
                  </div>
                </div>

                {/* Floating Card 2: Patient Alert */}
                <div className="absolute top-1/2 right-2 sm:-right-4 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm rounded-xl p-2 sm:p-3 shadow-lg border border-slate-200 flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 shrink-0">
                    <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-bold text-[#123044]">Patient Warning</p>
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      Kidney Alert
                    </span>
                  </div>
                </div>

                {/* Floating Card 3: Legal Metrology */}
                <div className="absolute bottom-2 left-2 sm:-bottom-3 sm:-left-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl p-2 sm:p-3 shadow-lg border border-slate-200 flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-[#9A6712] flex items-center justify-center border border-amber-100 shrink-0">
                    <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-bold text-[#123044]">Legal Metrology</p>
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Compliant
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Quick Stat Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#123044]">Patient Alerts</p>
                <p className="text-[10px] sm:text-[11px] text-slate-500">Kidney &amp; Diabetes</p>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#087F5B] flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#123044]">Additives</p>
                <p className="text-[10px] sm:text-[11px] text-slate-500">INS Codes Decoded</p>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E40AF] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#123044]">FSSAI Checks</p>
                <p className="text-[10px] sm:text-[11px] text-slate-500">Statutory Rules</p>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#9A6712] flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#123044]">Metrology</p>
                <p className="text-[10px] sm:text-[11px] text-slate-500">MRP &amp; Net Quantity</p>
              </div>
            </div>
          </div>

          {/* 3 Core Evaluation Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-6">
            {/* Module 1: Health Analysis */}
            <Link
              to="/scan"
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-[#087F5B]/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#087F5B] text-white flex items-center justify-center shadow-md shadow-[#087F5B]/20 shrink-0">
                  <Heart className="w-5 h-5 fill-white/20" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#123044] group-hover:text-[#087F5B] transition-colors">
                    Health &amp; Nutrition Analysis
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Ingredients, Allergens, Sodium &amp; Additives
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#94A3B8] group-hover:text-[#087F5B] group-hover:translate-x-1 transition-all shrink-0 ml-1" />
            </Link>

            {/* Module 2: FSSAI Labelling */}
            <Link
              to="/scan"
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-[#1E40AF]/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#1E40AF] text-white flex items-center justify-center shadow-md shadow-[#1E40AF]/20 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#123044] group-hover:text-[#1E40AF] transition-colors">
                    FSSAI Labelling Rules
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Mandatory Veg emblem, Expiry &amp; Lic. checks
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#94A3B8] group-hover:text-[#1E40AF] group-hover:translate-x-1 transition-all shrink-0 ml-1" />
            </Link>

            {/* Module 3: Legal Metrology */}
            <Link
              to="/scan"
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-[#9A6712]/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#9A6712] text-white flex items-center justify-center shadow-md shadow-[#9A6712]/20 shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#123044] group-hover:text-[#9A6712] transition-colors">
                    Legal Metrology Rule 6
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    MRP, Net Quantity, Manufacturer details
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#94A3B8] group-hover:text-[#9A6712] group-hover:translate-x-1 transition-all shrink-0 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Patient Health Risk Intelligence Feature Section */}
      <section className="py-12 sm:py-16 bg-[#F8FAFC] border-t border-slate-200">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Clinical Intelligence
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">
              Personalized Patient Risk Protection
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Nirikshan AI flags ingredients that pose medical risks for vulnerable clinical conditions:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Condition 1: Kidney / CKD */}
            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-2.5 hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#123044]">Kidney Disease (CKD)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Flags <strong>Potassium Chloride</strong> and high potassium salts that impaired kidneys cannot excrete, preventing Hyperkalemia.
              </p>
            </div>

            {/* Condition 2: Diabetes */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2.5 hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#123044]">Diabetic Patients</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Identifies <strong>Dextrose (GI 100)</strong>, Glucose, Maltodextrin, and added syrups that cause rapid blood sugar spikes.
              </p>
            </div>

            {/* Condition 3: Hypertension / High BP */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2.5 hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#123044]">High BP &amp; Heart</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluates <strong>Sodium Chloride</strong>, Sodium Citrate, and hidden salt loads against ICMR-NIN 2000mg/day limits.
              </p>
            </div>

            {/* Condition 4: Celiac & Allergies */}
            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-2.5 hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#123044]">Celiac &amp; Allergies</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Flags <strong>Gluten, Wheat, Soy, Milk, Peanuts</strong>, and incomplete precautionary cross-contamination advisories.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step "How It Works" Section */}
      <section className="py-12 sm:py-16 bg-white border-t border-slate-200">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">
              How Nirikshan AI Evaluates Packaged Food
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Every assessment is deterministically backed by official statutory gazettes and ICMR clinical evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#087F5B] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                1
              </div>
              <h3 className="font-bold text-[#123044] text-base">Capture &amp; Smart OCR</h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Separates the ingredient panel from nutrition facts, packaging instructions, and manufacturer declarations using layout-aware computer vision.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#1E40AF] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                2
              </div>
              <h3 className="font-bold text-[#123044] text-base">Clinical &amp; Statutory Engine</h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Applies FSSAI Labelling Regulations 2020, Legal Metrology Rule 6, and Google AI Studio clinical rules without guesswork.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#9A6712] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                3
              </div>
              <h3 className="font-bold text-[#123044] text-base">Actionable Safety Report</h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Presents clear patient advisories in English &amp; Hindi, allergen warnings, additive safety statuses, and doctor's guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-12 bg-white">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#0F766E] to-[#123044] rounded-3xl p-8 sm:p-12 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Ready to check your food packet?
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Take a quick photo of any grocery or snack packet to receive an instant FSSAI compliance and patient health report.
              </p>
            </div>
            <Link
              to="/scan"
              className="px-8 py-4 rounded-xl font-bold text-[#0F766E] bg-white hover:bg-emerald-50 transition-all shadow-md flex items-center gap-2 text-sm sm:text-base shrink-0 group"
            >
              <Camera className="w-5 h-5 text-[#0F766E]" />
              <span>Scan Food Packet Now</span>
              <ArrowRight className="w-4 h-4 text-[#0F766E] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}