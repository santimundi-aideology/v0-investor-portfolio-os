"use client"

import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Building2 } from "lucide-react"

export default function LoginPage() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Investor Portfolio OS</CardTitle>
            <CardDescription>Sign in to continue</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" placeholder="you@brokerage.ae" type="email" />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot?
            </Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" />
        </div>
        <Button className="w-full" asChild>
          <Link href="/dashboard">Sign in (mock)</Link>
        </Button>
        <Separator />
        <Button variant="outline" className="w-full" type="button">
          Continue with SSO (placeholder)
        </Button>
        <p className="text-xs text-muted-foreground">
          By continuing you agree to the terms and acknowledge this is a mock auth flow (no backend yet).
        </p>
      </CardContent>
    </Card>
  )
}


