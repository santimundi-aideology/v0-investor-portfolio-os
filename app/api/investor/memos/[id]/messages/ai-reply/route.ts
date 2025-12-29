import { createHash } from "crypto"
import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { addMessage, getInvestor, getMemo, store } from "@/lib/data/store"
import { AccessError, buildRequestContext } from "@/lib/security/rbac"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = buildRequestContext(req as any)
    if (ctx.role !== "investor") throw new AccessError("Investor access only")
    if (!ctx.investorId) throw new AccessError("Missing investor scope")

    const memo = getMemo(params.id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (memo.investorId !== ctx.investorId) throw new AccessError("Forbidden")
    if (!["sent", "opened", "decided"].includes(memo.state)) throw new AccessError("Memo not shared")

    const version = memo.currentVersion
    const content = memo.versions.find((v) => v.version === version)?.content ?? {}
    const assumptions = (content as any).assumptions ?? []
    const scenarios = (content as any).numbers ?? (content as any).scenarios ?? {}

    const replyText = `Based on memo v${version}: assumptions=${JSON.stringify(
      assumptions,
    )}, scenarios=${JSON.stringify(scenarios)}. Unknown items remain marked as "Unknown".`

    const msg = addMessage({
      memoId: memo.id,
      body: replyText,
      versionContext: version,
      senderId: "ai",
    })

    const hash = createHash("sha256").update(JSON.stringify({ memoId: memo.id, version })).digest("hex")
    const write = createAuditEventWriter()
    await write(
      AuditEvents.aiGenerationRequested({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        feature: "qna.ai_reply",
        inputHash: hash,
      }),
    )
    await write(
      AuditEvents.aiOutputAccepted({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        feature: "qna.ai_reply",
        memoId: memo.id,
      }),
    )

    return NextResponse.json(msg, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status })
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}
import { createHash } from "crypto"
import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { addMessage, getInvestor, getMemo, store } from "@/lib/data/store"
import { AccessError, buildRequestContext } from "@/lib/security/rbac"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = buildRequestContext(req as any)
    if (ctx.role !== "investor") throw new AccessError("Investor access only")
    if (!ctx.investorId) throw new AccessError("Missing investor scope")

    const memo = getMemo(params.id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (memo.investorId !== ctx.investorId) throw new AccessError("Forbidden")
    if (!["sent", "opened", "decided"].includes(memo.state)) throw new AccessError("Memo not shared")

    const version = memo.currentVersion
    const content = memo.versions.find((v) => v.version === version)?.content ?? {}
    const assumptions = (content as any).assumptions ?? []
    const scenarios = (content as any).numbers ?? (content as any).scenarios ?? {}

    const replyText = `Based on memo v${version}: assumptions=${JSON.stringify(assumptions)}, scenarios=${JSON.stringify(scenarios)}. Unknown items remain marked as "Unknown".`

    const msg = addMessage({
      memoId: memo.id,
      body: replyText,
      versionContext: version,
      senderId: "ai",
    })

    const hash = createHash("sha256").update(JSON.stringify({ memoId: memo.id, version })).digest("hex")
    const write = createAuditEventWriter()
    await write(
      AuditEvents.aiGenerationRequested({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        feature: "qna.ai_reply",
        inputHash: hash,
      }),
    )
    await write(
      AuditEvents.aiOutputAccepted({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        feature: "qna.ai_reply",
        memoId: memo.id,
      }),
    )

    return NextResponse.json(msg, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status })
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

