import { useState, useMemo, useCallback } from 'react'
import { Mockup, DEVICE_TAGS, STYLE_TAGS, LAYOUT_TAGS, FilterTag } from '../types/mockup'

// ── Skeleton card ────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-white/5 bg-white/[0.02]">
      <div className="aspect-[4/3] rounded-t-xl bg-white/5" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-2/3 rounded bg-white/5" />
        <div className="h-2 w-1/3 rounded bg-white/5" />
      </div>
    </div>
  )
}

// ── Mockup card ─────────────────────────────────────────────────────

function MockupCard({
  mockup,
  onSelect,
  onPreview,
  onDownload: _,
  featured,
}: {
  mockup: Mockup
  onSelect: (m: Mockup) => void
  onPreview: (m: Mockup) => void
  onDownload: (m: Mockup) => void
  featured?: boolean
}) {
  return (
    <div
      onClick={() => onSelect(mockup)}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/20 ${
        featured ? 'col-span-2' : ''
      }`}
    >
      {/* Featured star */}
      {mockup.featured && (
        <div className="absolute right-2.5 top-2.5 z-10 text-sm">
          ⭐
        </div>
      )}

      {/* Thumbnail */}
      <div className={`relative overflow-hidden bg-black/20 ${featured ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
        <img
          src={mockup.thumbnail}
          alt={mockup.name}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            onClick={e => { e.stopPropagation(); onPreview(mockup) }}
            className="rounded-lg bg-white/10 px-3.5 py-2 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            Preview
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3">
        <span className="text-xs font-medium text-white">{mockup.name}</span>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {mockup.tags.map(tag => (
            <span
              key={tag}
              className="rounded bg-white/5 px-1.5 py-px text-[9px] text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          <span>{mockup.fileSize}</span>
          <span className="h-0.5 w-0.5 rounded-full bg-zinc-700" />
          <span>{mockup.screens} {mockup.screens === 1 ? 'screen' : 'screens'}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main sidebar ────────────────────────────────────────────────────

interface MockupSidebarProps {
  mockups: Mockup[]
  loading: boolean
  error: string | null
  onSelect: (m: Mockup) => void
  onPreview: (m: Mockup) => void
  onDownload: (m: Mockup) => void
}

const MockupSidebar: React.FC<MockupSidebarProps> = ({
  mockups,
  loading,
  error,
  onSelect,
  onPreview,
  onDownload,
}) => {
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<Set<FilterTag>>(new Set())
  const hasActiveFilter = activeTags.size > 0

  const toggleTag = useCallback((tag: FilterTag) => {
    setActiveTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setActiveTags(new Set())
    setSearch('')
  }, [])

  const filtered = useMemo(() => {
    let result = mockups

    if (activeTags.size > 0) {
      result = result.filter(m =>
        [...activeTags].every(tag => m.tags.includes(tag)),
      )
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        m =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.tags.some(t => t.toLowerCase().includes(q)),
      )
    }

    return result
  }, [mockups, activeTags, search])

  const featured = useMemo(
    () => (hasActiveFilter ? [] : mockups.filter(m => m.featured).slice(0, 3)),
    [mockups, hasActiveFilter],
  )

  return (
    <div className="flex flex-col gap-4 p-6 pt-2">
      {/* Search */}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search mockups..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#0066FF]/50"
        />
      </div>

      {/* Filter rows */}
      <div className="flex flex-col gap-2">
        {/* Row 1: Device */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={clearFilters}
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${
              !hasActiveFilter
                ? 'bg-[#0066FF]/15 text-[#0066FF]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          {DEVICE_TAGS.map(tag => {
            const active = activeTags.has(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${
                  active
                    ? 'bg-[#0066FF]/15 text-[#0066FF]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tag}
                {active && (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
                    <path d="M3.05 3.05a.5.5 0 01.7 0L6 5.29l2.25-2.24a.5.5 0 01.7.7L6.71 6l2.24 2.25a.5.5 0 01-.7.7L6 6.71 3.75 8.95a.5.5 0 01-.7-.7L5.29 6 3.05 3.75a.5.5 0 010-.7z" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {/* Row 2: Style */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {STYLE_TAGS.map(tag => {
            const active = activeTags.has(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${
                  active
                    ? 'bg-[#0066FF]/15 text-[#0066FF]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tag}
                {active && (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
                    <path d="M3.05 3.05a.5.5 0 01.7 0L6 5.29l2.25-2.24a.5.5 0 01.7.7L6.71 6l2.24 2.25a.5.5 0 01-.7.7L6 6.71 3.75 8.95a.5.5 0 01-.7-.7L5.29 6 3.05 3.75a.5.5 0 010-.7z" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {/* Row 3: Layout */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {LAYOUT_TAGS.map(tag => {
            const active = activeTags.has(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${
                  active
                    ? 'bg-[#0066FF]/15 text-[#0066FF]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tag}
                {active && (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
                    <path d="M3.05 3.05a.5.5 0 01.7 0L6 5.29l2.25-2.24a.5.5 0 01.7.7L6.71 6l2.24 2.25a.5.5 0 01-.7.7L6 6.71 3.75 8.95a.5.5 0 01-.7-.7L5.29 6 3.05 3.75a.5.5 0 010-.7z" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Featured — only in default All view */}
          {featured.length > 0 && (
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Featured
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                {featured.map(m => (
                  <MockupCard
                    key={m.id}
                    mockup={m}
                    featured
                    onSelect={onSelect}
                    onPreview={onPreview}
                    onDownload={onDownload}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All mockups */}
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              All Mockups
            </span>
            {filtered.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-2 text-center">
                <p className="text-xs text-zinc-500">
                  No mockups match these filters
                </p>
                <button
                  onClick={clearFilters}
                  className="text-[11px] text-[#0066FF] hover:text-[#0055DD] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                {filtered.map(m => (
                  <MockupCard
                    key={m.id}
                    mockup={m}
                    onSelect={onSelect}
                    onPreview={onPreview}
                    onDownload={onDownload}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default MockupSidebar
