import { useState, useEffect } from 'react'
import { Mockup, MockupsData } from '../types/mockup'

interface UseMockupsResult {
  mockups: Mockup[]
  loading: boolean
  error: string | null
}

export function useMockups(): UseMockupsResult {
  const [mockups, setMockups] = useState<Mockup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/mockups/mockups.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load mockups (${res.status})`)
        return res.json() as Promise<MockupsData>
      })
      .then(data => {
        setMockups(data.mockups)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { mockups, loading, error }
}
