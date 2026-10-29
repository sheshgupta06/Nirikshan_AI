import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import { isSupabaseConfigured, supabaseSignUp } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export const SignUp: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/scan', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

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

    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service and Privacy Policy.')
      return
    }

    setLoading(true)

    if (isSupabaseConfigured()) {
      try {
        await supabaseSignUp(email.trim(), password, name.trim())
        setSuccessMessage('Account created successfully! Redirecting...')
        setTimeout(() => {
          navigate('/scan')
        }, 1200)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Registration failed. Please check your details.'
        setErrorMessage(msg)
      } finally {
        setLoading(false)
      }
    } else {
      const mockUser = {
        id: 'mock_user_' + Date.now(),
        email: email.trim(),
        user_metadata: { full_name: name.trim() },
      }
      localStorage.setItem('nirikshan_mock_user', JSON.stringify(mockUser))
      setTimeout(() => {
        setLoading(false)
        navigate('/scan')
      }, 500)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex">
      {/* Left Column: Navy Hero Banner with Veggie Photo & Checklist (Screen 3) */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#123044] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Brand Header */}
        <div className="space-y-6 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Leaf className="w-6 h-6 fill-emerald-400/30" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Nirikshan AI</h2>
              <p className="text-xs text-slate-300 font-medium">Food Label Intelligence</p>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold leading-snug text-white max-w-sm">
            Create your account and start analysing food labels today.
          </h1>

          {/* Checklist */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>Free to get started</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>Accurate AI insights</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>FSSAI & Legal compliance</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>Save your scan history</span>
            </div>
          </div>
        </div>

        {/* Bottom Fresh Vegetables Image */}
        <div className="pt-8 z-10">
          <div className="w-full h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10">
            <img
              src="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80"
              alt="Fresh healthy tomatoes and vegetables"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Right Column: Clean White Sign Up Form Card (Screen 3) */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 bg-[#F8FAFC]">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-[#E2E8F0] shadow-xl shadow-slate-200/50 space-y-6">
          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Create Account</h1>
            <p className="text-xs sm:text-sm text-[#64748B]">Join Nirikshan AI</p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#123044] mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#123044] mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#123044] mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#94A3B8] hover:text-[#123044]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#123044] mb-1">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#64748B]">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#0F766E] focus:ring-[#0F766E] border-slate-300 shrink-0"
                />
                <span>
                  I agree to the{' '}
                  <a href="#" className="font-semibold text-[#0F766E] hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="font-semibold text-[#0F766E] hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-md shadow-[#0F766E]/20 text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          {/* Footer Link */}
          <p className="text-center text-xs text-[#64748B]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#0F766E] hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
