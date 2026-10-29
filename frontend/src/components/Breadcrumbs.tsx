import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home, ArrowLeft } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  returnToOverviewUrl?: string
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, returnToOverviewUrl }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-[#DCE5E5] mb-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm text-[#64748B]">
        <Link to="/" className="hover:text-[#0F766E] flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            {item.path ? (
              <Link to={item.path} className="hover:text-[#0F766E] transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-[#123044]">{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {returnToOverviewUrl && (
        <Link
          to={returnToOverviewUrl}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#0F766E] hover:text-[#0D655E] bg-[#0F766E]/10 hover:bg-[#0F766E]/15 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Analysis Dashboard</span>
        </Link>
      )}
    </div>
  )
}
