"use client"

import * as React from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Log error to monitoring service in production
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="size-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error. Please try again or return to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-md bg-red-50 p-3 text-sm">
              <p className="font-medium text-red-800">Error details:</p>
              <p className="mt-1 font-mono text-xs text-red-700 break-all">{error.message}</p>
              {error.digest && (
                <p className="mt-1 text-xs text-red-600">Digest: {error.digest}</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={reset} className="flex-1" variant="default">
              <RefreshCw className="mr-2 size-4" />
              Try again
            </Button>
            <Button onClick={() => window.location.href = "/dashboard"} variant="outline" className="flex-1">
              <Home className="mr-2 size-4" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
