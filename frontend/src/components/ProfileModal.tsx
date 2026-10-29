import React, { useState, useEffect } from 'react'
import {
  X,
  User,
  ShieldCheck,
  HeartPulse,
  Activity,
  AlertTriangle,
  Check,
  Save,
  Mail,
  Tag,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import type { UserProfileConfig } from '../types/scan'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

const HEALTH_CONDITIONS_LIST = [
  {
    id: 'Diabetes',
    name: 'Type 2 Diabetes / Prediabetes',
    hindi: 'डायबिटीज़ / शुगर',
    desc: 'Flags High GI sugars (Dextrose, Glucose syrup, Maltodextrin, Invert sugar).',
    color: 'emerald',
  },
  {
    id: 'Hypertension',
    name: 'Hypertension (High BP)',
    hindi: 'हाई ब्लड प्रेशर',
    desc: 'Flags excessive Sodium (>400mg/100g) and hidden sodium salts.',
    color: 'amber',
  },
  {
    id: 'Kidney Disease',
    name: 'Kidney Disease (CKD)',
    hindi: 'किडनी की बीमारी',
    desc: 'Strictly flags Potassium Chloride (salt substitute) & phosphate additives.',
    color: 'rose',
  },
  {
    id: 'Heart Disease',
    name: 'Cardiovascular / Heart Disease',
    hindi: 'हृदय रोग / कोलेस्ट्रॉल',
    desc: 'Flags Palm Oil, Hydrogenated Oils, Trans Fats, and Saturated Fats > 4g.',
    color: 'red',
  },
  {
    id: 'Celiac Disease',
    name: 'Celiac / Gluten Sensitivity',
    hindi: 'ग्लूटेन एलर्जी / सीलिएक',
    desc: 'Flags Wheat, Barley, Malt, Rye, and hidden gluten sources.',
    color: 'indigo',
  },
  {
    id: 'Hyperuricemia',
    name: 'High Uric Acid / Gout',
    hindi: 'यूरिक एसिड / गाउट',
    desc: 'Flags High-Fructose Corn Syrup and high purine extracts.',
    color: 'purple',
  },
]

const ALLERGEN_OPTIONS = [
  'Milk / Dairy',
  'Peanuts',
  'Soy',
  'Wheat / Gluten',
  'Tree Nuts (Almond, Cashew, Walnut)',
  'Eggs',
  'Fish & Crustaceans',
  'Sesame',
  'Mustard',
  'Sulphites',
]

const DIET_OPTIONS = [
  { id: 'VEGETARIAN', label: 'Vegetarian', hindi: 'शाकाहारी (Green Dot)' },
  { id: 'VEGAN', label: '100% Vegan', hindi: 'शुद्ध वीगन' },
  { id: 'NON_VEGETARIAN', label: 'Non-Vegetarian', hindi: 'मांसाहारी' },
  { id: 'EGGETARIAN', label: 'Eggetarian', hindi: 'अंडे युक्त शाकाहारी' },
  { id: 'JAIN', label: 'Jain Diet', hindi: 'जैन (No Onion/Garlic/Roots)' },
]

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile } = useAuth()

  const [name, setName] = useState('')
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [selectedDiet, setSelectedDiet] = useState('VEGETARIAN')
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [watchlist, setWatchlist] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Populate from active profile on open
  useEffect(() => {
    if (isOpen) {
      setName(profile?.profile_name || user?.user_metadata?.full_name || '')
      setSelectedConditions(profile?.health_conditions || [])
      setSelectedDiet(profile?.dietary_preference || 'VEGETARIAN')

      const rawAllergies = profile?.allergies || ''
      const parsedAllergies = rawAllergies
        ? rawAllergies.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      setSelectedAllergens(parsedAllergies)

      setWatchlist(profile?.watchlist || '')
      setSavedSuccess(false)
    }
  }, [isOpen, profile, user])

  if (!isOpen) return null

  const toggleCondition = (condId: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condId) ? prev.filter((c) => c !== condId) : [...prev, condId]
    )
  }

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSavedSuccess(false)

    const updatedData: Partial<UserProfileConfig> = {
      profile_name: name.trim() || 'Nirikshan User',
      health_conditions: selectedConditions,
      dietary_preference: selectedDiet,
      allergies: selectedAllergens.join(', '),
      watchlist: watchlist.trim(),
    }

    const success = await updateProfile(updatedData)
    setSaving(false)

    if (success) {
      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
        onClose()
      }, 1200)
    }
  }

  const displayEmail = user?.email || 'Guest Account'
  const initial = (name || displayEmail).charAt(0).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#123044] via-[#163B54] to-[#0F766E] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center font-extrabold text-2xl shadow-inner">
              {initial}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  {name || 'My Health Profile'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1 font-mono">
                <Mail className="w-3.5 h-3.5" />
                {displayEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {savedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Health Profile Updated Successfully!</p>
                <p className="text-xs text-emerald-700">
                  Your clinical conditions and dietary rules are synced with Nirikshan AI.
                </p>
              </div>
            </div>
          )}

          {/* 1. Account Name */}
          <div>
            <label className="block text-xs font-bold text-[#123044] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#0F766E]" />
              Your Name / Display Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shesh Gupta or Food Inspector"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all"
            />
          </div>

          {/* 2. Clinical Risk Conditions (Highlight feature) */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold text-[#123044] uppercase tracking-wider">
                  Clinical Risk Conditions (स्वास्थ्य संवेदनशीलता)
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                Auto-Evaluated in Scans
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              Select any conditions that apply. Nirikshan AI will flag dangerous ingredients specifically for you (e.g. Potassium Chloride for CKD, Dextrose for Diabetes).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {HEALTH_CONDITIONS_LIST.map((cond) => {
                const isSelected = selectedConditions.includes(cond.id)
                return (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => toggleCondition(cond.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-[#0F766E] ring-2 ring-[#0F766E]/20 shadow-sm'
                        : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="text-xs font-bold text-[#123044] block">
                          {cond.name}
                        </span>
                        <span className="text-[11px] font-medium text-[#0F766E]">
                          {cond.hindi}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-[#0F766E] text-white border-[#0F766E]'
                            : 'bg-slate-100 border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                      {cond.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Dietary Preferences */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[#123044] uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
              Dietary Preference (आहार प्राथमिकता)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DIET_OPTIONS.map((diet) => {
                const isSelected = selectedDiet === diet.id
                return (
                  <button
                    key={diet.id}
                    type="button"
                    onClick={() => setSelectedDiet(diet.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 font-semibold ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{diet.label}</div>
                    <div className="text-[10px] text-slate-500">{diet.hindi}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. Common Allergens */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#123044] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Allergen Safeguards (एलर्जी चेतावनी)
              </label>
              <span className="text-[11px] text-slate-500">Tap to toggle</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((allergen) => {
                const isSelected = selectedAllergens.includes(allergen)
                return (
                  <button
                    key={allergen}
                    type="button"
                    onClick={() => toggleAllergen(allergen)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-rose-50 border-rose-400 text-rose-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-rose-600" />}
                    {allergen}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 5. Custom Watchlist */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#123044] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#0F766E]" />
              Custom Watchlist Ingredients (निजी निगरानी सूची)
            </label>
            <input
              type="text"
              value={watchlist}
              onChange={(e) => setWatchlist(e.target.value)}
              placeholder="e.g. Palm oil, MSG, Aspartame, High Fructose Corn Syrup"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-[#123044] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all"
            />
            <p className="text-[11px] text-slate-500">
              Comma-separated list of ingredients you personally want flagged in any scanned food label.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-sm font-bold shadow-md shadow-[#0F766E]/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Profile...' : 'Save Health Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
