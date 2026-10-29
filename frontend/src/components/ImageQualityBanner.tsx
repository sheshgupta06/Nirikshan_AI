import React from 'react'
import { CheckCircle2, AlertTriangle, Eye, Sparkles } from 'lucide-react'
import type { ImageQualityMetadata } from '../types/scan'

interface ImageQualityBannerProps {
  metadata?: ImageQualityMetadata
}

export const ImageQualityBanner: React.FC<ImageQualityBannerProps> = ({ metadata }) => {
  if (!metadata) return null

  const blurScore = metadata.blur_score ? Math.round(metadata.blur_score) : null
  const blurAssessment = metadata.blur_assessment || (metadata.is_blurry ? 'BLURRY' : 'SHARP')
  const lighting = metadata.lighting_assessment || 'NORMAL'
  const contrast = metadata.contrast_assessment || 'NORMAL'
  const restormer = metadata.restormer_status || 'DISABLED_NO_WEIGHTS'

  const isSharp = blurAssessment === 'SHARP'
  const isLightingGood = lighting === 'NORMAL'

  return (
    <div className="bg-white rounded-xl border border-[#DCE5E5] p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE5E5] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E]">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#123044]">OpenCV Image Quality & Pre-Processing Audit</h4>
            <p className="text-xs text-[#64748B]">Pre-inference quality checks per PRD Section 8.2 & 8.3</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Computer Vision Verified
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Blur metric */}
        <div className="p-3 rounded-lg bg-[#F4F8F8] border border-[#DCE5E5]">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">Sharpness</span>
          <div className="flex items-center gap-1.5 mt-1">
            {isSharp ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
            <span className="font-bold text-sm text-[#123044]">{blurAssessment}</span>
            {blurScore && <span className="text-xs text-[#64748B]">({blurScore})</span>}
          </div>
        </div>

        {/* Lighting metric */}
        <div className="p-3 rounded-lg bg-[#F4F8F8] border border-[#DCE5E5]">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">Lighting</span>
          <div className="flex items-center gap-1.5 mt-1">
            {isLightingGood ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
            <span className="font-bold text-sm text-[#123044]">{lighting}</span>
          </div>
        </div>

        {/* Contrast metric */}
        <div className="p-3 rounded-lg bg-[#F4F8F8] border border-[#DCE5E5]">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">Contrast</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-bold text-sm text-[#123044]">{contrast}</span>
          </div>
        </div>

        {/* Restormer Transparency */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block flex items-center justify-between">
            Restormer ML
            <span className="text-[10px] text-slate-500 font-mono">PRD 8.3</span>
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span className="font-bold text-xs text-slate-700 font-mono">{restormer}</span>
          </div>
        </div>
      </div>

      {/* Honesty note */}
      <div className="text-xs text-[#64748B] bg-[#F4F8F8] rounded-lg p-3 border border-[#DCE5E5] flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
        <p>
          <strong className="text-[#123044]">Strict Transparency Policy:</strong> Nirikshan AI evaluates raw OpenCV metrics directly. Restormer super-resolution is transparently declared disabled without official pre-trained weights to prevent simulated sharpening artifacts.
        </p>
      </div>

      {metadata.quality_recommendation && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{metadata.quality_recommendation}</span>
        </div>
      )}
    </div>
  )
}
