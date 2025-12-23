import { PageHeader } from "@/components/ui/page-header"
import { InvestorCard } from "@/components/investors/investor-card"
import { NewInvestorDialog } from "@/components/investors/new-investor-dialog"
import { mockInvestors } from "@/lib/mock-data"

export default function InvestorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Investors"
        subtitle={`${mockInvestors.length} investors in your portfolio`}
        actions={<NewInvestorDialog />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockInvestors.map((investor) => (
          <InvestorCard key={investor.id} investor={investor} />
        ))}
      </div>
    </div>
  )
}
