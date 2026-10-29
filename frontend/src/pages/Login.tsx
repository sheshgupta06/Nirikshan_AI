import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, AlertCircle, Info, LogIn, Database } from 'lucide-react'
import { isSupabaseConfigured, supabaseSignIn } from '../services/supabaseClient'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isCloudActive = isSupabaseConfigured()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.')
      return
    }

    setLoading(true)

    if (isSupabaseConfigured()) {
      try {
        await supabaseSignIn(email.trim(), password)
        navigate('/scan')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.'
        setErrorMessage(msg)
      } finally {
        setLoading(false)
      }
    } else {
      // Offline / Demo mode
      setTimeout(() => {
        setLoading(false)
        navigate('/scan')
      }, 500)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F4F8F8]">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-[#DCE5E5] shadow-sm">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#0F766E] text-white flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#123044]">Sign in to Nirikshan AI</h2>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Access your saved product label scans, audit reports, and health preferences.
          </p>
        </div>

        {/* Supabase Cloud Auth Status Banner */}
        {isCloudActive ? (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <Database className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-emerald-950">Supabase Cloud Auth Active</strong>
              <span>
                Enter your registered Supabase credentials to access your cloud scan history and synchronized user profile.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-950">Local Offline Mode Active</strong>
              <span>
                Supabase database is not linked yet. You can sign in to test the interface locally, or click <strong>Link Supabase</strong> in the navigation bar to store your scans in the cloud.
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#123044] mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@inspection.gov.in or user@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5E5] text-sm text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#123044] mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5E5] text-sm text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#123044]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-[#64748B]">
              <input type="checkbox" className="rounded border-[#DCE5E5] text-[#0F766E] focus:ring-[#0F766E]" />
              Remember me
            </label>
            <span className="text-[#0F766E] hover:underline cursor-pointer">Forgot password?</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-white bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-2 text-sm mt-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-[#DCE5E5] text-xs text-[#64748B]">
          Don't have an account yet?{' '}
          <Link to="/signup" className="font-semibold text-[#0F766E] hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  )
}
