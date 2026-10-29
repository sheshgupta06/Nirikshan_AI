import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShieldCheck, Menu, X, History, Sparkles, LogIn, UserPlus } from 'lucide-react'

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Scan Product', path: '/scan' },
    { label: 'Scan History', path: '/history' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#DCE5E5] transition-all">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-md shadow-[#0F766E]/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xl tracking-tight text-[#123044]">Nirikshan</span>
              <span className="text-xs font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                AI
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] font-medium tracking-wide">Food Label Intelligence Platform</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
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
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-[#123044] hover:text-[#0F766E] hover:bg-[#F4F8F8] transition-colors flex items-center gap-1.5"
          >
            <LogIn className="w-4 h-4 text-[#64748B]" />
            Login
          </Link>
          <Link
            to="/signup"
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-[#123044] border border-[#DCE5E5] hover:border-[#0F766E] hover:text-[#0F766E] transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4 text-[#64748B]" />
            Sign Up
          </Link>
          <Link
            to="/scan"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F766E] hover:bg-[#0D655E] transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            Scan Label
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
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
        <div className="md:hidden border-t border-[#DCE5E5] bg-white px-4 pt-3 pb-6 space-y-2 shadow-xl animate-fade-in">
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
    </header>
  )
}
