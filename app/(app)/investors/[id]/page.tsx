import { notFound } from "next/navigation"
import {
  getDealRoomsByInvestorId,
  getInvestorById,
  getMemosByInvestorId,
  getShortlistByInvestorId,
  getTasksByInvestorId,
} from "@/lib/mock-data"
import { InvestorDetail } from "@/components/investors/investor-detail"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InvestorDetailPage({ params }: PageProps) {
  const { id } = await params
  const investor = getInvestorById(id)

  if (!investor) {
    notFound()
  }

  const shortlist = getShortlistByInvestorId(id)
  const memos = getMemosByInvestorId(id)
  const tasks = getTasksByInvestorId(id)
  const dealRooms = getDealRoomsByInvestorId(id)

  return (
    <InvestorDetail 
      investor={investor} 
      shortlist={shortlist} 
      memos={memos} 
      dealRooms={dealRooms}
      tasks={tasks} 
    />
  )
}
