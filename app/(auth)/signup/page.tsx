"use client"

import { useState } from "react"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Building2, Loader2, AlertCircle, CheckCircle, Mail, Briefcase, UserRound, Check } from "lucide-react"
import { signUp } from "@/lib/auth/actions"
import { VantageIcon } from "@/components/brand/logo"

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"realtor" | "investor">("realtor")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    setEmail(formData.get("email") as string)
    
    const result = await signUp(formData)

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error || "Failed to create account")
    }

    setIsLoading(false)
  }

  if (success) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Check your email</h2>
              <p className="text-sm text-gray-500 mt-1">
                We sent a confirmation link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Click the link in your email to verify your account and complete signup.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" asChild>
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <VantageIcon size={36} />
          <div>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Join Vantage</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="role" value={role} />
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              name="name"
              placeholder="John Smith" 
              type="text"
              autoComplete="name"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              name="email"
              placeholder="you@company.com" 
              type="email"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <Label>I am signing up as</Label>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setRole("realtor")}
                aria-pressed={role === "realtor"}
                className={`relative flex items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  role === "realtor"
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ${
                  role === "realtor" ? "bg-primary text-primary-foreground" : "bg-muted text-gray-500"
                }`}>
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Realtor / Agent</div>
                  <div className="text-xs text-gray-500">Manage investors and deal rooms</div>
                </div>
                {role === "realtor" ? (
                  <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setRole("investor")}
                aria-pressed={role === "investor"}
                className={`relative flex items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  role === "investor"
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ${
                  role === "investor" ? "bg-primary text-primary-foreground" : "bg-muted text-gray-500"
                }`}>
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Investor / Buyer</div>
                  <div className="text-xs text-gray-500">Track portfolio and memos</div>
                </div>
                {role === "investor" ? (
                  <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              name="password"
              type="password" 
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Must be at least 8 characters
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input 
                id="phone" 
                name="phone"
                placeholder="+971 50 123 4567" 
                type="tel"
                autoComplete="tel"
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whatsapp">WhatsApp (optional)</Label>
              <Input 
                id="whatsapp" 
                name="whatsapp"
                placeholder="+971 50 123 4567" 
                type="tel"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>

          <Separator />

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-xs text-center text-gray-500">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
