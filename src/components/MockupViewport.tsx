import { Mockup } from '../types/mockup'

interface MockupViewportProps {
  mockup: Mockup | null
  onDownload: (m: Mockup) => void
}

const MockupViewport: React.FC<MockupViewportProps> = ({ mockup, onDownload }) => {
  if (!mockup) {
    return (
      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-app-viewport">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="h-8 w-8 text-zinc-600">
              <rect x="5" y="2" width="14" height="20" rx="3" />
              <circle cx="12" cy="18" r="1" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-sm font-medium text-zinc-500">
              Select a mockup from the library to preview
            </span>
            <span className="text-[11px] text-zinc-600">
              Browse the collection and click to preview
            </span>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-app-viewport">
      {/* Mockup image — full bleed */}
      <img
        src={mockup.thumbnail}
        alt={mockup.name}
        className="absolute inset-0 h-full w-full object-contain"
      />

      {/* Bottom bar: info + download */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/40 to-transparent p-6 pt-20">
        <div>
          <h2 className="text-lg font-semibold text-white">{mockup.name}</h2>
          <p className="mt-0.5 text-sm text-zinc-300">{mockup.description}</p>
        </div>
        <button
          onClick={() => onDownload(mockup)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-[#0066FF] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0055DD]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PSD
        </button>
      </div>
    </main>
  )
}

export default MockupViewport
