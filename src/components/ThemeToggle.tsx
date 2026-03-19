import { includes, isEqual } from 'lodash'
import { useEffect, useState } from 'react'

import { MoonIcon } from '@/components/icons/MoonIcon'
import { SunIcon } from '@/components/icons/SunIcon'

type ThemeMode = 'light' | 'dark'

const VALID_MODES: ThemeMode[] = ['light', 'dark']

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const stored = window.localStorage.getItem('theme')
  return includes(VALID_MODES, stored) ? (stored as ThemeMode) : 'dark'
}

function applyThemeMode(mode: ThemeMode) {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(mode)
  document.documentElement.style.colorScheme = mode
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    const initialMode = getInitialMode()
    setMode(initialMode)
    applyThemeMode(initialMode)
  }, [])

  function toggleMode() {
    const nextMode: ThemeMode = isEqual(mode, 'dark') ? 'light' : 'dark'
    setMode(nextMode)
    applyThemeMode(nextMode)
    window.localStorage.setItem('theme', nextMode)
  }

  const label = `Theme: ${mode}. Click to switch to ${isEqual(mode, 'dark') ? 'light' : 'dark'} mode.`

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      className="rounded-full border border-border bg-card p-2 text-foreground shadow-sm transition hover:-translate-y-0.5"
    >
      {isEqual(mode, 'dark') ? <MoonIcon size={18} /> : <SunIcon size={18} />}
    </button>
  )
}
