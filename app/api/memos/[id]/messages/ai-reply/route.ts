import { NextResponse } from "next/server"

import { getInvestor, getMemo } from "@/lib/data/store"
import { AccessError, assertMemoAccess, buildRequestContext } from "@/lib/security/rbac"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = buildRequestContext(req as any)
    const memo = getMemo(params.id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = getInvestor(memo.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertMemoAccess({ tenantId: memo.tenantId, investorId: memo.investorId }, ctx, investor)

    const version = memo.currentVersion
    const content = memo.versions.find((v) => v.version === version)?.content ?? {}

    // Stub AI reply: echoes back fields to ensure grounding
    const reply = {
      id: crypto.randomUUID(),
      memoId: memo.id,
      body: `Based on memo v${version}: assumptions=${JSON.stringify(
        (content as any).assumptions ?? [],
      )}, scenarios=${JSON.stringify((content as any).scenarios ?? {})}`,
      versionContext: version,
      senderId: "ai",
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(reply, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

