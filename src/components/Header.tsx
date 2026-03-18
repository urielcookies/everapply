import { SignedOut, SignInButton } from '@clerk/clerk-react'
import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-14 max-w-7xl items-center px-4">

        {/* Wordmark */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5 no-underline">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-[0_0_12px_oklch(0.668_0.158_145/0.4)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2 10 L7 3 L12 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary-foreground"
              />
              <path
                d="M4.5 7.5 H9.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-primary-foreground"
              />
            </svg>
          </span>
          <span className="text-[15px] font-bold tracking-tight text-foreground">
            Ever<span className="text-primary">Apply</span>
          </span>
        </Link>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:opacity-80"
              >
                Sign In
              </button>
            </SignInButton>
          </SignedOut>

        </div>

      </nav>
    </header>
  )
}
