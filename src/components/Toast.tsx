import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  progress?: number | null // 0-100, null = indeterminate, undefined = no bar
  onDone: () => void
}

const Toast: React.FC<ToastProps> = ({ message, progress, onDone }) => {
  const [visible, setVisible] = useState(false)
  const showBar = progress !== undefined

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Auto-dismiss only when download is complete (progress === 100) or no progress bar
  useEffect(() => {
    if (!showBar || progress === 100) {
      const fade = setTimeout(() => setVisible(false), showBar ? 1500 : 2500)
      const remove = setTimeout(onDone, showBar ? 2000 : 3000)
      return () => {
        clearTimeout(fade)
        clearTimeout(remove)
      }
    }
  }, [progress, showBar, onDone])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex min-w-[260px] flex-col gap-2 rounded-lg border border-white/10 bg-app-sidebar px-4 py-3 shadow-2xl transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <span className="text-sm text-white">{message}</span>
      {showBar && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#0066FF] transition-all duration-300 ease-out"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default Toast
