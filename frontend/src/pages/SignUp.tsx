import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, AlertCircle, Info, UserPlus } from 'lucide-react'

export const SignUp: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage('Please fill in all required fields.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setLoading(true)

    // Backend auth integration check:
    // User credentials are NOT stored in browser localStorage or frontend variables per security rules.
    setTimeout(() => {
      setLoading(false)
      navigate('/scan')
    }, 600)
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F4F8F8]">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-[#DCE5E5] shadow-sm">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#0F766E] text-white flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#123044]">Create Nirikshan AI Account</h2>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Set up an account to save custom allergen watchlists and access inspection history.
          </p>
        </div>

        {/* Backend Auth Architecture Notice */}
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block text-blue-900">Security Architecture Notice</strong>
            <span>
              Backend user authentication service is pending integration. For security, passwords are never stored in browser storage. You can register for testing or scan labels directly.
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
            <label className="block text-xs font-semibold text-[#123044] mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shesh Gupta"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5E5] text-sm text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#123044] mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
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
                placeholder="At least 6 characters"
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

          <div>
            <label className="block text-xs font-semibold text-[#123044] mb-1">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5E5] text-sm text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
              required
            />
          </div>

          <div className="text-xs text-[#64748B] pt-1">
            By signing up, you acknowledge that Nirikshan AI is a label screening assistant and not a substitute for statutory certifications.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-white bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-2 text-sm mt-2"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-[#DCE5E5] text-xs text-[#64748B]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#0F766E] hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
