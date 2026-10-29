import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Leaf,
  Menu,
  X,
  History,
  Database,
  Sparkles,
  ChevronDown,
  HeartPulse,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { SupabaseModal } from './SupabaseModal'
import { ProfileModal } from './ProfileModal'
import { useAuth } from '../contexts/AuthContext'

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const location = useLocation()
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const { user, profile, signOut } = useAuth()

  useEffect(() => {
    setSupabaseConnected(isSupabaseConfigured())
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown and mobile menu on route change
  useEffect(() => {
    setProfileDropdownOpen(false)
    setMobileMenuOpen(false)
  }, [location.pathname])

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

  const displayName =
    profile?.profile_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User'
  const displayEmail = user?.email || ''
  const initial = displayName.charAt(0).toUpperCase()

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

          {user ? (
            /* Logged In User Profile Menu */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
                aria-expanded={profileDropdownOpen}
              >
                <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {initial}
                </div>
                <div className="text-left hidden xl:block">
                  <div className="text-xs font-bold text-[#123044] leading-tight truncate max-w-[130px]">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Profile Active
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    profileDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Card */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2.5 z-50 animate-fade-in divide-y divide-slate-100">
                  {/* Account Header */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F766E] border border-emerald-200 flex items-center justify-center font-extrabold text-sm">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#123044] truncate">
                          {displayName}
                        </div>
                        <div className="text-xs text-slate-500 truncate font-mono">
                          {displayEmail}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified Account
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="py-2 px-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        setProfileModalOpen(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#123044] hover:bg-emerald-50/70 hover:text-[#0F766E] rounded-xl transition-colors text-left"
                    >
                      <HeartPulse className="w-4 h-4 text-[#0F766E]" />
                      <span>Health Profile & Dietary Settings</span>
                    </button>

                    <Link
                      to="/history"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#123044] hover:bg-slate-50 hover:text-[#0F766E] rounded-xl transition-colors"
                    >
                      <History className="w-4 h-4 text-slate-500" />
                      <span>My Scan History</span>
                    </Link>

                    <Link
                      to="/scan"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#123044] hover:bg-slate-50 hover:text-[#0F766E] rounded-xl transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Scan Food Packet</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="pt-2 px-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setProfileDropdownOpen(false)
                        await signOut()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Logged Out: Login & Sign Up */
            <>
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
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          {user && (
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs shadow-xs"
              title="Open Health Profile"
            >
              {initial}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSupabaseModalOpen(true)}
            className={`p-2 rounded-lg text-xs border ${
              supabaseConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-300'
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

            {user ? (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#123044] truncate">{displayName}</div>
                    <div className="text-[10px] text-slate-500 truncate font-mono">{displayEmail}</div>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setProfileModalOpen(true)
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0F766E] text-xs font-bold flex items-center justify-center gap-2 border border-emerald-200 transition-colors"
                >
                  <HeartPulse className="w-4 h-4" />
                  Health Profile & Dietary Settings
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false)
                    await signOut()
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 border border-rose-200 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  Sign Out
                </button>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}

      {/* Supabase Configuration Modal */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onStatusChange={refreshSupabaseStatus}
      />

      {/* Health Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  )
}
