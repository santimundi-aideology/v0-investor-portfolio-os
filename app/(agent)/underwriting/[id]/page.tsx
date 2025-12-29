"use client"

import * as React from "react"
import { useParams } from "next/navigation"

import { evidenceWarnings, computeConfidence } from "@/lib/domain/underwriting"

type Underwriting = {
  id: string
  investorId: string
  listingId?: string
  inputs: any
  scenarios: any
  confidence?: string
  createdAt: string
  updatedAt: string
}

type Comp = {
  id: string
  description: string
  price?: number
  pricePerSqft?: number
  rentPerYear?: number
  source: string
  sourceDetail?: string
  observedDate?: string
}

export default function UnderwritingEditorPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  const [uw, setUw] = React.useState<Underwriting | null>(null)
  const [comps, setComps] = React.useState<Comp[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [newComp, setNewComp] = React.useState<Partial<Comp>>({ source: "Agent estimate" })
  const [generating, setGenerating] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/underwritings/${id}`, { headers: { "x-role": "agent" } })
        if (!res.ok) throw new Error("Failed to load underwriting")
        const data = await res.json()
        setUw(data)

        const compsRes = await fetch(`/api/underwritings/${id}/comps`, { method: "GET", headers: { "x-role": "agent" } })
        if (compsRes.ok) setComps(await compsRes.json())
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const warnings = evidenceWarnings(comps)
  const confidence = computeConfidence(
    comps.map((c) => ({ observedDate: c.observedDate })),
    uw?.inputs,
  )

  async function saveInputs() {
    if (!uw) return
    setSaving(true)
    try {
      const res = await fetch(`/api/underwritings/${uw.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-role": "agent" },
        body: JSON.stringify({ inputs: uw.inputs }),
      })
      if (!res.ok) throw new Error("Save failed")
      const updated = await res.json()
      setUw(updated)
    } finally {
      setSaving(false)
    }
  }

  async function addComp() {
    if (!newComp.description || !newComp.source) return
    const res = await fetch(`/api/underwritings/${id}/comps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-role": "agent" },
      body: JSON.stringify(newComp),
    })
    if (res.ok) {
      const created = await res.json()
      setComps((c) => [...c, created])
      setNewComp({ source: "Agent estimate" })
    }
  }

  async function deleteComp(compId: string) {
    const res = await fetch(`/api/underwriting-comps/${compId}`, {
      method: "DELETE",
      headers: { "x-role": "agent" },
    })
    if (res.ok) setComps((c) => c.filter((x) => x.id !== compId))
  }

  async function generateMemo() {
    if (!uw?.listingId) return
    setGenerating(true)
    try {
      const res = await fetch("/api/memos/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "agent" },
        body: JSON.stringify({
          investorId: uw.investorId,
          listingId: uw.listingId,
          underwritingId: uw.id,
        }),
      })
      if (!res.ok) throw new Error("Failed to generate memo")
      const memo = await res.json()
      window.location.href = `/memos/${memo.id}`
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (error || !uw) return <div className="p-6 text-sm text-destructive">Error: {error ?? "Not found"}</div>

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Underwriting</h1>
          <p className="text-sm text-muted-foreground">
            Investor {uw.investorId} {uw.listingId ? `• Listing ${uw.listingId}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge level={confidence} />
          <button
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            onClick={generateMemo}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Memo Draft"}
          </button>
        </div>
      </header>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Inputs</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Purchase price" value={uw.inputs?.price ?? ""} onChange={(v) => setUw({ ...uw, inputs: { ...uw.inputs, price: Number(v) || undefined } })} />
          <InputField label="Size (sqft)" value={uw.inputs?.size ?? ""} onChange={(v) => setUw({ ...uw, inputs: { ...uw.inputs, size: Number(v) || undefined } })} />
          <InputField label="Fees / service charges" value={uw.inputs?.fees ?? ""} onChange={(v) => setUw({ ...uw, inputs: { ...uw.inputs, fees: Number(v) || undefined } })} />
          <InputField label="Rent (annual)" value={uw.inputs?.rent ?? ""} onChange={(v) => setUw({ ...uw, inputs: { ...uw.inputs, rent: Number(v) || undefined } })} />
          <InputField label="Vacancy (months)" value={uw.inputs?.vacancy ?? ""} onChange={(v) => setUw({ ...uw, inputs: { ...uw.inputs, vacancy: Number(v) || undefined } })} />
          <InputField label="Exit price" value={uw.inputs?.exit ?? ""} onChange={(v) => setUw({ ...uw, inputs: { ...uw.inputs, exit: Number(v) || undefined } })} />
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          onClick={saveInputs}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save inputs"}
        </button>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Scenarios (Base / Downside / Upside)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-1">Scenario</th>
                <th className="px-2 py-1">Yield %</th>
              </tr>
            </thead>
            <tbody>
              {["base", "downside", "upside"].map((key) => (
                <tr key={key} className="border-t">
                  <td className="px-2 py-1 capitalize">{key}</td>
                  <td className="px-2 py-1">{uw.scenarios?.[key]?.yield ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Comps (evidence)</h2>
          {warnings.length > 0 && <p className="text-xs text-amber-700">Warnings: {warnings.join("; ")}</p>}
        </div>
        <div className="space-y-2">
          {comps.map((c) => (
            <div key={c.id} className="flex flex-col gap-1 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.description}</span>
                <button className="text-xs text-destructive hover:underline" onClick={() => deleteComp(c.id)}>
                  Delete
                </button>
              </div>
              <div className="text-xs text-muted-foreground">
                Source: {c.source} {c.sourceDetail ? `• ${c.sourceDetail}` : ""} {c.observedDate ? `• ${c.observedDate}` : ""}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {c.price ? <span>Price: {c.price}</span> : null}
                {c.pricePerSqft ? <span>Price/sqft: {c.pricePerSqft}</span> : null}
                {c.rentPerYear ? <span>Rent/yr: {c.rentPerYear}</span> : null}
              </div>
            </div>
          ))}
          {comps.length === 0 && <p className="text-sm text-muted-foreground">No comps yet.</p>}
        </div>

        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Add comp</h3>
          <InputField label="Description" value={newComp.description ?? ""} onChange={(v) => setNewComp({ ...newComp, description: v })} />
          <div className="grid gap-2 md:grid-cols-2">
            <InputField label="Source" value={newComp.source ?? ""} onChange={(v) => setNewComp({ ...newComp, source: v })} />
            <InputField label="Source detail" value={newComp.sourceDetail ?? ""} onChange={(v) => setNewComp({ ...newComp, sourceDetail: v })} />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <InputField label="Price" value={newComp.price ? String(newComp.price) : ""} onChange={(v) => setNewComp({ ...newComp, price: Number(v) || undefined })} />
            <InputField label="Price/sqft" value={newComp.pricePerSqft ? String(newComp.pricePerSqft) : ""} onChange={(v) => setNewComp({ ...newComp, pricePerSqft: Number(v) || undefined })} />
            <InputField label="Rent/year" value={newComp.rentPerYear ? String(newComp.rentPerYear) : ""} onChange={(v) => setNewComp({ ...newComp, rentPerYear: Number(v) || undefined })} />
          </div>
          <InputField
            label="Observed date"
            value={newComp.observedDate ?? ""}
            onChange={(v) => setNewComp({ ...newComp, observedDate: v })}
            placeholder="YYYY-MM-DD"
          />
          <button
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            onClick={addComp}
            disabled={!newComp.description || !newComp.source}
          >
            Add comp
          </button>
        </div>
      </section>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function ConfidenceBadge({ level }: { level: "Low" | "Medium" | "High" }) {
  const color =
    level === "High" ? "bg-emerald-100 text-emerald-700" : level === "Medium" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      Confidence: {level}
    </span>
  )
}

