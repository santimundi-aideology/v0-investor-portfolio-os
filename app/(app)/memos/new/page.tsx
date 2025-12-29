import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText } from "lucide-react"

export default async function NewMemoPage({
  searchParams,
}: {
  searchParams?: Promise<{ investorId?: string; propertyId?: string }>
}) {
  const sp = searchParams ? await searchParams : undefined
  const investorId = sp?.investorId
  const propertyId = sp?.propertyId

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate IC memo"
        subtitle="Create an investment committee memo from mock data (no backend yet)."
        badges={
          <div className="text-muted-foreground text-xs">
            {investorId ? `Investor: ${investorId}` : null}
            {investorId && propertyId ? " • " : null}
            {propertyId ? `Property: ${propertyId}` : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Memo inputs
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Investment Committee Memo - Marina Tower Office Suite" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" placeholder="Add any context you want included in the memo…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button">
              Cancel
            </Button>
            <Button type="button">Generate (mock)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


