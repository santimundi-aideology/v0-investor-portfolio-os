"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Camera, Mail, Phone, Building2, MapPin, Calendar, Shield, Award, MessageCircle } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/components/providers/app-provider"
import { roleDisplayNames, getRoleBadgeColor } from "@/lib/security/rbac"

export default function ProfilePage() {
  const { user, currentOrg, authUser, platformRole, isAuthenticated } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state - use real auth data when available
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: authUser?.phone || "",
    whatsapp: authUser?.whatsapp || "",
    company: currentOrg.name,
    location: "Dubai, UAE",
    bio: "Real estate professional specializing in investment advisory and portfolio management for high-net-worth clients in the UAE market.",
  })

  // Update form data when auth user changes
  useEffect(() => {
    if (authUser) {
      setFormData(prev => ({
        ...prev,
        name: authUser.name || prev.name,
        email: authUser.email || prev.email,
        phone: authUser.phone || prev.phone,
        whatsapp: authUser.whatsapp || prev.whatsapp,
      }))
    }
  }, [authUser])

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    setIsEditing(false)
    toast.success("Profile updated", {
      description: "Your profile changes have been saved.",
    })
  }

  const handlePhotoChange = () => {
    toast.info("Photo upload", {
      description: "Photo upload functionality will be available soon.",
    })
  }

  const stats = [
    { label: "Active Investors", value: "12" },
    { label: "Properties Managed", value: "48" },
    { label: "Deals Closed", value: "23" },
    { label: "Total AUM", value: "AED 125M" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Manage your personal information and preferences"
        primaryAction={
          isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                  <AvatarFallback className="text-2xl">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                    onClick={handlePhotoChange}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge className={getRoleBadgeColor(platformRole)}>
                  {roleDisplayNames[platformRole]}
                </Badge>
                {isAuthenticated && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Authenticated
                  </Badge>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span>{currentOrg.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>Dubai, UAE</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Member since Jan 2024</span>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Certifications</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <Award className="h-3 w-3" />
                  RERA Licensed
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Verified Agent
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-4">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your contact details and personal info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                      <span className="text-sm">{formData.name}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{formData.email}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+971 50 XXX XXXX"
                    />
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{formData.phone || "Not set"}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  {isEditing ? (
                    <Input
                      id="whatsapp"
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="+34 XXX XXX XXX"
                    />
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                      <MessageCircle className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{formData.whatsapp || "Not set"}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  {isEditing ? (
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{formData.company}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  {isEditing ? (
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{formData.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>A brief description about yourself</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-sm text-gray-500">{formData.bio}</p>
              )}
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest actions in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "Created IC Memo", target: "Marina Tower Office Suite", time: "2 hours ago" },
                  { action: "Updated investor", target: "Mohammed Al-Fayed", time: "5 hours ago" },
                  { action: "Added property", target: "Palm Jumeirah Villa", time: "1 day ago" },
                  { action: "Completed task", target: "Quarterly review call", time: "2 days ago" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{activity.action}</span>
                      <span className="text-gray-500"> • {activity.target}</span>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
