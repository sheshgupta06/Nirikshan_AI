import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Leaf, Menu, X, History, Database, Sparkles } from 'lucide-react'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { SupabaseModal } from './SupabaseModal'

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false)
  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSupabaseConnected(isSupabaseConfigured())
  }, [])

  const refreshSupabaseStatus = () => {
    setSupabaseConnected(isSupabaseConfigured())
  }

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Scan Product', path: '/scan' },
    { label: 'History', path: '/history' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] transition-all">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo with Leaf Icon matching mockup */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0F766E] flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
            <Leaf className="w-5 h-5 text-[#0F766E] fill-[#0F766E]/20" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-[#123044]">Nirikshan AI</span>
            </div>
            <p className="text-[10px] text-[#64748B] font-medium tracking-wide">Food Label Intelligence</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const active = isActive(link.path)
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'text-[#0F766E] bg-[#0F766E]/10 font-semibold'
                    : 'text-[#123044] hover:text-[#0F766E] hover:bg-[#F4F8F8]'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Supabase Cloud Database Link Button */}
          <button
            type="button"
            onClick={() => setSupabaseModalOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
              supabaseConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title="Configure Supabase Database"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {supabaseConnected ? 'Supabase Live' : 'Link Supabase'}
            </span>
          </button>

          <Link
            to="/login"
            className="px-3.5 py-2 rounded-lg text-sm font-semibold text-[#123044] hover:text-[#0F766E] transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F766E] hover:bg-[#0D655E] transition-all shadow-sm hover:shadow-md"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setSupabaseModalOpen(true)}
            className={`p-2 rounded-lg text-xs border ${
              supabaseConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'
            }`}
            title="Supabase Database Status"
          >
            <Database className="w-4 h-4" />
          </button>
          <Link
            to="/history"
            aria-label="Scan History"
            className="p-2 text-[#123044] hover:text-[#0F766E] rounded-lg"
          >
            <History className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#123044] hover:bg-[#F4F8F8] focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#DCE5E5] bg-white px-4 pt-3 pb-6 space-y-2 shadow-xl animate-fade-in">
          {navLinks.map((link) => {
            const active = isActive(link.path)
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                  active
                    ? 'text-[#0F766E] bg-[#0F766E]/10 font-semibold'
                    : 'text-[#123044] hover:bg-[#F4F8F8]'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
          <div className="pt-4 border-t border-[#DCE5E5] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                setSupabaseModalOpen(true)
              }}
              className={`w-full text-center px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border ${
                supabaseConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              <Database className="w-4 h-4" />
              {supabaseConnected ? 'Supabase Database Connected' : 'Connect Supabase Cloud Database'}
            </button>

            <Link
              to="/scan"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-sm flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Scan Food Packet
            </Link>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center px-3 py-2 rounded-lg text-sm font-medium border border-[#DCE5E5] text-[#123044] hover:bg-[#F4F8F8]"
              >
                Login
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center px-3 py-2 rounded-lg text-sm font-medium border border-[#DCE5E5] text-[#123044] hover:bg-[#F4F8F8]"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Configuration Modal */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onStatusChange={refreshSupabaseStatus}
      />
    </header>
  )
}
