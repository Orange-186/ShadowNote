import { useEffect } from 'react'

interface ToastProps {
  message: string | null
  duration?: number
  onDismiss: () => void
}

export function Toast({ message, duration = 3200, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timer)
  }, [message, duration, onDismiss])

  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
