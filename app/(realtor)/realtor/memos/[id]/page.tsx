import MemoPage from "../../../../(app)/memos/[id]/page"

export default function RealtorMemoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <MemoPage params={params} routePrefix="/realtor" />
}
