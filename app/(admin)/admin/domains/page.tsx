"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { useApp } from "@/components/providers/app-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Globe, Plus, Trash2, RefreshCw } from "lucide-react"
import { type DomainRow, formatDate } from "@/lib/admin/types"

export default function AdminDomainsPage() {
  const { platformRole } = useApp()

  if (platformRole !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need super admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return <DomainsInner />
}

function DomainsInner() {
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [domainsLoading, setDomainsLoading] = useState(true)
  const [domainDialogOpen, setDomainDialogOpen] = useState(false)
  const [newDomain, setNewDomain] = useState("")
  const [domainSaving, setDomainSaving] = useState(false)
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null)

  const fetchDomains = useCallback(async () => {
    setDomainsLoading(true)
    try {
      const res = await fetch("/api/admin/domains")
      if (!res.ok) throw new Error("Failed to fetch domains")
      const data = await res.json()
      setDomains(data.domains ?? [])
    } catch {
      toast.error("Failed to load domains")
    } finally {
      setDomainsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])

  const addDomain = useCallback(async () => {
    if (!newDomain.trim()) {
      toast.error("Domain is required")
      return
    }
    setDomainSaving(true)
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to add domain")
      }
      toast.success(`Domain "${newDomain.trim()}" added`)
      setNewDomain("")
      setDomainDialogOpen(false)
      fetchDomains()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add domain")
    } finally {
      setDomainSaving(false)
    }
  }, [newDomain, fetchDomains])

  const deleteDomainFn = useCallback(
    async (domain: string) => {
      setDeletingDomain(domain)
      try {
        const res = await fetch("/api/admin/domains", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to remove domain")
        }
        toast.success(`Domain "${domain}" removed`)
        fetchDomains()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to remove domain")
      } finally {
        setDeletingDomain(null)
      }
    },
    [fetchDomains],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domains"
        subtitle="Manage super admin email domains"
      />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Super Admin Domains</h3>
          <p className="text-sm text-muted-foreground">
            Email domains that automatically grant super admin access.
          </p>
        </div>
        <Button onClick={() => { setNewDomain(""); setDomainDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {domainsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No domains configured
                    </TableCell>
                  </TableRow>
                ) : (
                  domains.map((d) => (
                    <TableRow key={d.domain}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{d.domain}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(d.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingDomain === d.domain}
                          onClick={() => {
                            if (confirm(`Remove domain "${d.domain}"? This cannot be undone.`)) {
                              deleteDomainFn(d.domain)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
            <DialogDescription>
              Users with this email domain will automatically receive super admin access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-domain">Domain</Label>
            <Input
              id="new-domain"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") addDomain()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDomainDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addDomain} disabled={domainSaving}>
              {domainSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Domain"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
