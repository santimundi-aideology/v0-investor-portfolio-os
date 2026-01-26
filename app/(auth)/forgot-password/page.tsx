"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react"
import { resetPassword } from "@/lib/auth/actions"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    setEmail(formData.get("email") as string)
    
    const result = await resetPassword(formData)

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error || "Failed to send reset email")
    }

    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="space-y-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-sm text-gray-500">
            We sent a password reset link to
          </p>
          <p className="font-medium">{email}</p>
        </div>

        {/* Info */}
        <div className="p-4 rounded-lg bg-muted/50 border text-center">
          <p className="text-sm text-gray-500">
            Click the link in your email to create a new password. The link expires in 24 hours.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => { setSuccess(false); setEmail(""); }}>
            Try a different email
          </Button>
          <Button asChild className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Link>
          </Button>
        </div>

        <p className="text-center text-xs text-gray-500">
          Didn&apos;t receive the email? Check your spam folder.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
        <p className="text-sm text-gray-500">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 p-3 text-sm bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@brokerage.ae"
            autoComplete="email"
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>

      {/* Back Link */}
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
