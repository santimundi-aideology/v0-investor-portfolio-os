import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText } from "lucide-react"

export function DocumentsTab() {
  return (
    <Card>
      <CardContent className="flex h-60 flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium">No documents uploaded</p>
          <p className="text-sm text-muted-foreground">Upload investor documents here</p>
        </div>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </CardContent>
    </Card>
  )
}
