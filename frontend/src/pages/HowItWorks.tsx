import React from 'react'
import { Link } from 'react-router-dom'
import {
  UploadCloud,
  FileSearch,
  Edit3,
  HeartPulse,
  ClipboardCheck,
  Scale,
  Sparkles,
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Upload a Clear Food-Package Label',
      icon: <UploadCloud className="w-6 h-6 text-[#0F766E]" />,
      desc: 'Take a focused photo or upload a sharp image of the ingredient panel, nutrition facts, and legal declaration panel on your packaged food.',
      badge: 'OpenCV Quality Validation'
    },
    {
      num: '02',
      title: 'Computer Vision & OCR Text Extraction',
      icon: <FileSearch className="w-6 h-6 text-[#0F766E]" />,
      desc: 'Our optical character recognition pipeline identifies text boxes, line breaks, numeric metrics, and statutory stamps across the packaging.',
      badge: 'Zero Fake AI'
    },
    {
      num: '03',
      title: 'Review & Correct Uncertain Text',
      icon: <Edit3 className="w-6 h-6 text-[#0F766E]" />,
      desc: 'Inspect detected text side-by-side with your packaging photo. Correct any blurred numbers, obscure fonts, or OCR typos before running compliance checks.',
      badge: 'Human-in-the-Loop'
    },
    {
      num: '04',
      title: 'Health & Ingredient Safety Engine',
      icon: <HeartPulse className="w-6 h-6 text-[#087F5B]" />,
      desc: 'Deciphers canonical ingredient names, flags allergens (separating recipe ingredients from cross-contamination warnings), and checks additives across India, EU, and US.',
      badge: 'ICMR & WHO Benchmarks'
    },
    {
      num: '05',
      title: 'Statutory Labelling & Metrology Screening',
      icon: <ClipboardCheck className="w-6 h-6 text-[#315DB5]" />,
      desc: 'Audits 11 mandatory declarations under FSSAI Regulations 2020 and Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011.',
      badge: 'Deterministic Rule Base'
    },
    {
      num: '06',
      title: 'Review Independent, Evidence-Backed Reports',
      icon: <Scale className="w-6 h-6 text-[#9A6712]" />,
      desc: 'Examine three strictly separated reports. Health insights are never confused with legal packaging standards, and every finding links to statutory references.',
      badge: 'Audit-Ready Reports'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#0F766E]/10 px-3 py-1 rounded-full">
          Architecture &amp; Methodology
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#123044] tracking-tight">
          How Nirikshan AI Evaluates Food Labels
        </h1>
        <p className="text-[#64748B] text-base sm:text-lg leading-relaxed">
          A deterministic, evidence-backed pipeline engineered specifically for the Indian packaged-food ecosystem.
        </p>
      </div>

      {/* Six Step Progression Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-[#DCE5E5] p-6 shadow-sm hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-300 font-mono">{step.num}</span>
                <div className="w-12 h-12 rounded-xl bg-[#F4F8F8] border border-[#DCE5E5] flex items-center justify-center shadow-inner">
                  {step.icon}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F4F8F8] text-[#123044] border border-[#DCE5E5]">
                  {step.badge}
                </span>
                <h3 className="text-lg font-bold text-[#123044] mt-2">{step.title}</h3>
              </div>

              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Accuracy, Boundaries, and Limitations Notice (PRD Section 18) */}
      <div className="bg-white rounded-2xl border border-[#DCE5E5] p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-[#DCE5E5] pb-4">
          <ShieldAlert className="w-6 h-6 text-amber-600" />
          <div>
            <h2 className="text-xl font-bold text-[#123044]">
              System Limitations &amp; Operational Boundaries
            </h2>
            <p className="text-xs text-[#64748B]">What Nirikshan AI is, and what it is not</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm">
          <div className="space-y-2">
            <h4 className="font-bold text-[#123044] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              What Nirikshan AI Does
            </h4>
            <ul className="space-y-1.5 text-[#64748B] list-disc list-inside">
              <li>Deciphers complex food additive and INS codes.</li>
              <li>Separates declared recipe allergens from advisory warnings.</li>
              <li>Screens mandatory declarations under Legal Metrology Rule 6.</li>
              <li>Evaluates nutritional density against WHO thresholds.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[#123044] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Image Quality Dependence
            </h4>
            <ul className="space-y-1.5 text-[#64748B] list-disc list-inside">
              <li>Results rely directly on label clarity and lighting.</li>
              <li>Folds and curved bottle surfaces can hide text.</li>
              <li>Items not detected in one photo are NOT confirmed violations.</li>
              <li>Users should review and verify extracted text.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[#123044] flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              Not a Legal or Medical Certificate
            </h4>
            <ul className="space-y-1.5 text-[#64748B] list-disc list-inside">
              <li>Does not diagnose medical conditions.</li>
              <li>Does not replace FSSAI laboratory testing.</li>
              <li>Designed for assistive decision support and screening.</li>
              <li>Deterministic rules prevent AI hallucinations.</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 text-center">
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-sm transition-all"
          >
            <Sparkles className="w-5 h-5 text-emerald-200" />
            <span>Try Scanning a Food Label Now</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
