import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, HeartPulse, ClipboardCheck, Scale, ExternalLink } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#123044] text-white border-t border-[#1A435E] mt-auto">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xl tracking-tight text-white">Nirikshan</span>
                <span className="text-xs font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 border border-white/20">
                  AI
                </span>
              </div>
            </Link>
            <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
              Empowering consumers, food business operators, and regulatory officers with objective packaged-food label intelligence, ingredient safety, and statutory compliance screening.
            </p>
            <div className="flex items-center gap-4 pt-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> FSSAI 2020 Compliant Engine
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Legal Metrology 2011 Verified
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-slate-200">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
              </li>
              <li>
                <Link to="/scan" className="hover:text-white transition-colors">Scan Food Packet</Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-white transition-colors">Scan History</Link>
              </li>
            </ul>
          </div>

          {/* Core Modules */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-slate-200">Core Engines</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
                <span>Health & Nutrition Analysis</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>FSSAI Labelling Verification</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Legal Metrology Rule 6</span>
              </li>
            </ul>
          </div>

          {/* Statutory References */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-slate-200">Statutory Bodies</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <a
                  href="https://www.fssai.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  FSSAI India <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://consumeraffairs.nic.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  Dept. Consumer Affairs <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.who.int"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  WHO Guidelines <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Bar */}
        <div className="mt-12 pt-8 border-t border-slate-700/80 text-xs text-slate-400 space-y-3">
          <p className="leading-relaxed">
            <strong className="text-slate-300">Statutory Screening Notice:</strong> Nirikshan AI is an assistive decision-support platform designed to screen packaged food labels against published regulations (FSSAI 2020 Labelling Regulations and Legal Metrology Packaged Commodities Rules 2011). OCR detection accuracy depends on label orientation, image resolution, and print quality. It does not constitute medical diagnosis, laboratory testing, or formal legal certification.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p>© {new Date().getFullYear()} Nirikshan AI Platform. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400">Zero Fake AI • Deterministic Rules • Evidence-Backed</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
