'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service.
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Something went wrong
          </h1>
          <p className="mt-6 max-w-lg text-lg text-slate-600">
            We&apos;re sorry, but an unexpected error occurred. Please try again.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={reset}
              className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
