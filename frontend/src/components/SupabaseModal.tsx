import React, { useState, useEffect } from 'react'
import {
  Database,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import {
  getSupabaseCredentials,
  isSupabaseConfigured,
  saveRuntimeCredentials,
  clearRuntimeCredentials,
  testSupabaseConnection,
} from '../services/supabaseClient'
import { scanStorage } from '../services/scanStorage'

interface SupabaseModalProps {
  isOpen: boolean
  onClose: () => void
  onStatusChange?: () => void
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [isRuntime, setIsRuntime] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    latencyMs?: number
  } | null>(null)
  const [copiedSchema, setCopiedSchema] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials()
      setUrl(creds.url)
      setAnonKey(creds.key)
      setIsConfigured(isSupabaseConfigured())
      setIsRuntime(creds.isRuntime)
      setTestResult(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleTest = async () => {
    // If user edited inputs, save temporarily to test
    if (url.trim() && anonKey.trim()) {
      saveRuntimeCredentials(url, anonKey)
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testSupabaseConnection()
      setTestResult(res)
      if (res.success) {
        setIsConfigured(true)
        if (onStatusChange) onStatusChange()
      }
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide both Supabase Project URL and Anon Public Key.',
      })
      return
    }

    saveRuntimeCredentials(url, anonKey)
    setIsConfigured(true)
    setIsRuntime(true)

    // Run connection test
    setTesting(true)
    const res = await testSupabaseConnection()
    setTestResult(res)
    setTesting(false)

    if (res.success) {
      // Trigger background sync
      setSyncing(true)
      try {
        await scanStorage.syncWithSupabase()
      } catch (err) {
        console.warn('Sync error:', err)
      } finally {
        setSyncing(false)
      }
    }

    if (onStatusChange) onStatusChange()
  }

  const handleDisconnect = () => {
    clearRuntimeCredentials()
    setUrl('')
    setAnonKey('')
    setIsConfigured(false)
    setIsRuntime(false)
    setTestResult({
      success: true,
      message: 'Supabase credentials cleared. Switched to local offline mode.',
    })
    if (onStatusChange) onStatusChange()
  }

  const handleCopySchemaPath = () => {
    navigator.clipboard.writeText('supabase_schema.sql')
    setCopiedSchema(true)
    setTimeout(() => setCopiedSchema(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#123044] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0F766E]/20 text-[#2dd4bf] rounded-xl border border-[#0F766E]/40">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Supabase Cloud Database Link</h2>
              <p className="text-xs text-slate-300">
                Store and sync all food label scans, OCR reviews, and compliance findings in your Supabase cloud PostgreSQL.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Badge */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isConfigured
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full animate-pulse ${
                  isConfigured ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-amber-500'
                }`}
              />
              <div>
                <p className="font-semibold text-sm">
                  {isConfigured ? 'Supabase Connected & Active' : 'Running in Local Storage Mode'}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isConfigured
                    ? isRuntime
                      ? 'Using runtime credentials stored securely in browser session.'
                      : 'Configured via .env environment variables.'
                    : 'All scan results are stored in local browser memory. Link Supabase to persist them to the cloud.'}
                </p>
              </div>
            </div>

            {isConfigured && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Configuration Form */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                  Supabase Project URL
                </label>
                <a
                  href="https://supabase.com/dashboard/project/_/settings/api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#0F766E] hover:underline flex items-center gap-1 font-medium"
                >
                  Find in Supabase Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase mb-1.5">
                Supabase Anon / Public Key
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Safe to use in the browser. Row Level Security (RLS) protects your users' private scans.
              </p>
            </div>
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{testResult.success ? 'Connection Successful' : 'Connection Failed'}</p>
                <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{testResult.message}</p>
                {testResult.latencyMs && (
                  <span className="inline-block mt-2 text-[11px] font-mono bg-white/70 px-2 py-0.5 rounded-sm border border-emerald-200">
                    Latency: {testResult.latencyMs}ms
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Schema Guide Box */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0F766E]" /> Database Tables & Security Schema
              </span>
              <button
                type="button"
                onClick={handleCopySchemaPath}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white px-2 py-1 rounded-sm border border-slate-300 transition-colors"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSchema ? 'Path Copied!' : 'Copy Script Name'}
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              We generated <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded-sm font-mono text-[11px]">supabase_schema.sql</code> in your project root with tables for <span className="font-medium text-slate-800">scans, scan_results, scan_corrections,</span> and <span className="font-medium text-slate-800">profiles</span>.
            </p>
            <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
              <li>Open your Supabase Dashboard &rarr; <strong>SQL Editor</strong></li>
              <li>Paste the contents of <code className="font-mono text-slate-800 font-semibold">supabase_schema.sql</code></li>
              <li>Click <strong>Run</strong>. Tables and security policies will be created instantly.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || (!url.trim() && !anonKey.trim())}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {testing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-500" /> Testing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-500" /> Test Connection
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={testing || syncing || !url.trim() || !anonKey.trim()}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#0d6860] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-colors"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Syncing Data...
                </>
              ) : (
                'Save & Connect'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
