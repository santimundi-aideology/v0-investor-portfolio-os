"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react"
import { updatePassword, resolveUserRedirect } from "@/lib/auth/actions"
import { VantageIcon } from "@/components/brand/logo"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Detect if this is an invitation flow (first-time password setup)
  const type = searchParams.get("type")
  const isInvite = type === "invite"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const result = await updatePassword(formData)

    if (result.success) {
      setSuccess(true)
      // Resolve role-based redirect
      const redirectPath = await resolveUserRedirect()
      setTimeout(() => {
        router.push(redirectPath)
      }, 2000)
    } else {
      setError(result.error || "Failed to update password")
    }

    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {isInvite ? "Account Activated" : "Password Updated"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isInvite
                    ? "Your account is ready. Redirecting..."
                    : "Your password has been updated successfully. Redirecting..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <VantageIcon size={36} />
            <div>
              <CardTitle>{isInvite ? "Set Your Password" : "Reset Password"}</CardTitle>
              <CardDescription>
                {isInvite
                  ? "Create a password to activate your account"
                  : "Enter your new password"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {isInvite && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-2">
                <p className="text-sm text-blue-800">
                  Welcome to Vantage! Create a password below to get started.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="password">
                {isInvite ? "Password" : "New Password"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  minLength={8}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                minLength={8}
                required
                disabled={isLoading}
              />
            </div>

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isInvite ? "Activating..." : "Updating..."}
                </>
              ) : (
                isInvite ? "Activate Account" : "Update Password"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="hover:text-foreground underline underline-offset-4">
                Back to sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
