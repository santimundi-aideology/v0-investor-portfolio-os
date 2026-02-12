"use client"

import { useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Loader2, AlertCircle, Eye, EyeOff, Building2, User, Shield, ChevronDown, ChevronUp } from "lucide-react"
import { signIn } from "@/lib/auth/actions"

const DEMO_ACCOUNTS = [
  {
    email: "demo-realtor@aideology.ai",
    password: "demo1234!",
    name: "Sarah Al-Rashid",
    role: "Realtor",
    description: "Full CRM: investors, properties, memos",
    icon: Building2,
    redirect: "/realtor",
  },
  {
    email: "demo-investor@aideology.ai",
    password: "demo1234!",
    name: "Mohammed Al-Fayed",
    role: "Investor",
    description: "Portfolio, memos, deal rooms",
    icon: User,
    redirect: "/investor/dashboard",
  },
  {
    email: "demo-admin@aideology.ai",
    password: "demo1234!",
    name: "Omar Al-Nahyan",
    role: "Manager",
    description: "Team management, settings, audit",
    icon: Shield,
    redirect: "/dashboard",
  },
] as const

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)

  const redirect = searchParams.get("redirect") || "/dashboard"
  const callbackError = searchParams.get("error")

  const handleDemoLogin = useCallback(async (account: typeof DEMO_ACCOUNTS[number]) => {
    setDemoLoading(account.email)
    setError(null)
    const formData = new FormData()
    formData.set("email", account.email)
    formData.set("password", account.password)
    const result = await signIn(formData)
    if (result.success) {
      router.push(account.redirect)
      router.refresh()
    } else {
      setError(result.error || "Demo login failed")
      setDemoLoading(null)
    }
  }, [router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const result = await signIn(formData)

    if (result.success) {
      router.push(redirect)
      router.refresh()
    } else {
      setError(result.error || "Failed to sign in")
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-gray-500">
          Sign in to your account to continue
        </p>
      </div>

      {/* Error Alert */}
      {(error || callbackError) && (
        <div className="flex items-start gap-3 p-3 text-sm bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            {error || "Authentication failed. Please try again."}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
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

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-gray-500 hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
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
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-2">
          <Checkbox id="remember" name="remember" />
          <Label htmlFor="remember" className="text-sm font-normal text-gray-500 cursor-pointer">
            Keep me signed in
          </Label>
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Demo Accounts */}
      <div className="space-y-3">
        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-400">
            or
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowDemoAccounts(!showDemoAccounts)}
          className="flex w-full items-center justify-center gap-2 text-sm text-gray-500 hover:text-foreground transition-colors py-1"
        >
          <span>Demo Accounts</span>
          {showDemoAccounts ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showDemoAccounts && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon
              const isThisLoading = demoLoading === account.email
              return (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 text-left"
                  disabled={!!demoLoading || isLoading}
                  onClick={() => handleDemoLogin(account)}
                >
                  {isThisLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{account.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {account.role}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{account.description}</span>
                  </div>
                </Button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Links */}
      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Sign up
        </Link>
      </p>

      <p className="text-center text-xs text-gray-500">
        By signing in, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-gray-500">Terms</Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline hover:text-gray-500">Privacy Policy</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
