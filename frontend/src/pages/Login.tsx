import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, AlertCircle, Info, LogIn } from 'lucide-react'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.')
      return
    }

    setLoading(true)

    // Backend auth integration check:
    // Backend currently operates on open public scanning; user account authentication endpoints
    // are pending backend auth service integration.
    setTimeout(() => {
      setLoading(false)
      // Allow proceeding to /scan while informing user of local session state
      navigate('/scan')
    }, 600)
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

        {/* Backend Auth Status Banner (Honest Architecture Notice) */}
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block text-blue-900">Open Public Access Available</strong>
            <span>
              Backend user authentication service is currently pending integration. You can sign in to test the flow or proceed directly to scanning food labels without an account.
            </span>
          </div>
        </div>

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
