/**
 * Simple verification script for audit writer.
 * Run with: npx tsx scripts/verify-audit.ts
 */
import { AuditEvents, createAuditEventWriter } from "@/lib/audit"

async function main() {
  const write = createAuditEventWriter()

  await write(
    AuditEvents.investorCreated({
      tenantId: "tenant-123",
      actorId: "user-1",
      role: "manager",
      investorId: "inv-999",
    }),
  )

  await write(
    AuditEvents.investorAssigned({
      tenantId: "tenant-123",
      actorId: "user-2",
      role: "manager",
      investorId: "inv-999",
      fromAgentId: null,
      toAgentId: "agent-123",
    }),
  )

  await write(
    AuditEvents.listingCreated({
      tenantId: "tenant-123",
      actorId: "agent-123",
      role: "agent",
      listingId: "listing-abc",
    }),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

