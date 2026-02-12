export default function RealtorLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        <p className="text-sm text-gray-500">Loading realtor cockpit...</p>
      </div>
    </div>
  )
}
