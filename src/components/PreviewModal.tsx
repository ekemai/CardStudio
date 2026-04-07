import { useEffect, useState, useCallback } from 'react'
import { Mockup } from '../types/mockup'

interface PreviewModalProps {
  mockup: Mockup
  onClose: () => void
  onDownload: (mockup: Mockup) => void
}

const PreviewModal: React.FC<PreviewModalProps> = ({ mockup, onClose, onDownload }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 200)
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        visible ? 'bg-black/80 opacity-100' : 'bg-black/0 opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-app-sidebar shadow-2xl transition-all duration-200 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-zinc-400 transition-colors hover:bg-black/70 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Thumbnail */}
        <div className="flex items-center justify-center bg-black/30 p-8">
          <img
            src={mockup.thumbnail}
            alt={mockup.name}
            className="max-h-[45vh] w-auto rounded-lg object-contain shadow-2xl"
          />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">{mockup.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">{mockup.description}</p>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>{mockup.fileSize}</span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span>{mockup.screens} {mockup.screens === 1 ? 'screen' : 'screens'}</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {mockup.tags.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Download */}
          <button
            onClick={() => onDownload(mockup)}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#0066FF] py-3 text-sm font-medium text-white transition-colors hover:bg-[#0055DD]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PSD
          </button>
          <p className="text-center text-[11px] text-zinc-500">
            Open in Photoshop and place your screenshot into the smart object layer
          </p>
        </div>
      </div>
    </div>
  )
}

export default PreviewModal
