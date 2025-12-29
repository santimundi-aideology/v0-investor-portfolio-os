import { LoadingSkeleton } from "@/components/layout/loading-skeleton"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">
      <LoadingSkeleton />
    </div>
  )
}
