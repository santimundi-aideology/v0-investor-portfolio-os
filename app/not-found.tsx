import Link from "next/link"
import { FileQuestion, Home, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100">
            <FileQuestion className="size-8 text-gray-400" />
          </div>
          <CardTitle className="text-2xl">Page not found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="default">
              <Link href="/dashboard">
                <Home className="mr-2 size-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" onClick={() => window.history.back()}>
              <span>
                <ArrowLeft className="mr-2 size-4" />
                Go back
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
