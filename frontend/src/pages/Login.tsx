import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import { isSupabaseConfigured, supabaseSignIn } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
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
      // Mock session fallback
      const mockUser = {
        id: 'mock_user_' + Date.now(),
        email: email.trim(),
        user_metadata: { full_name: email.trim().split('@')[0] },
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
      {/* Left Column: Navy Hero Banner with Food Image & Feature Checklist (Screen 2) */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#123044] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Brand Header */}
        <div className="space-y-3 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Leaf className="w-6 h-6 fill-emerald-400/30" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Nirikshan AI</h2>
              <p className="text-xs text-slate-300 font-medium">Food Label Intelligence</p>
            </div>
          </div>
        </div>

        {/* Center Healthy Food Image */}
        <div className="my-auto py-8 z-10 flex flex-col items-center">
          <div className="w-72 h-72 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 relative">
            <img
              src="https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=800&auto=format&fit=crop&q=80"
              alt="Healthy Nutritious Granola Bowl"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Bottom Checklist */}
        <div className="space-y-3.5 z-10">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>Scan food labels</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>Get AI-powered insights</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>Check FSSAI & Legal compliance</span>
          </div>
        </div>
      </div>

      {/* Right Column: Clean White Login Form Card (Screen 2) */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 bg-[#F8FAFC]">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-[#E2E8F0] shadow-xl shadow-slate-200/50 space-y-6">
          {/* Logo & Heading */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0F766E] flex items-center justify-center border border-emerald-100">
                <Leaf className="w-5 h-5 fill-[#0F766E]/20" />
              </div>
              <span className="font-bold text-lg text-[#123044]">Nirikshan AI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123044]">Welcome Back</h1>
            <p className="text-xs sm:text-sm text-[#64748B]">Sign in to continue to your account</p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#123044] mb-1.5">Email address</label>
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
              <label className="block text-xs font-bold text-[#123044] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#123044]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E] border-slate-300"
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="font-semibold text-[#0F766E] hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-md shadow-[#0F766E]/20 text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          {/* Social Login Divider */}
          <div className="relative flex py-2 items-center">
            <div className="grow border-t border-slate-200"></div>
            <span className="shrink mx-4 text-xs text-slate-400">or continue with</span>
            <div className="grow border-t border-slate-200"></div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="w-full py-2.5 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-sm font-semibold text-[#123044] flex items-center justify-center gap-3 transition-colors shadow-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Footer Link */}
          <p className="text-center text-xs text-[#64748B]">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-[#0F766E] hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
