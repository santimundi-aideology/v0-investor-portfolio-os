import { AccessError } from "@/lib/security/rbac"

export type MemoState = "draft" | "pending_review" | "ready" | "sent" | "opened" | "decided"

export type MemoVersion = {
  version: number
  content: unknown
  createdAt: string
  createdBy: string
}

export type MemoModel = {
  id: string
  state: MemoState
  currentVersion: number
  versions: MemoVersion[]
}

const ALLOWED: Record<MemoState, MemoState[]> = {
  draft: ["pending_review", "ready"],
  pending_review: ["ready", "draft"],
  ready: ["sent"],
  sent: ["opened"],
  opened: ["decided"],
  decided: [],
}

export function assertTransition(from: MemoState, to: MemoState) {
  if (!ALLOWED[from]?.includes(to)) {
    throw new AccessError(`Invalid memo transition: ${from} -> ${to}`)
  }
}

type MemoLike = {
  state: MemoState
  currentVersion: number
  versions: MemoVersion[]
}

/**
 * Transition helper.
 *
 * NOTE: This is intentionally generic so it can operate on both:
 * - `MemoModel` (domain-only)
 * - `MemoRecord` (store/db record with tenant/investor metadata)
 */
export function transitionMemo<T extends MemoLike>(memo: T, to: MemoState): T {
  assertTransition(memo.state, to)
  return { ...memo, state: to } as T
}

export function editMemoContent<T extends MemoLike>(memo: T, content: unknown, actorId: string): T {
  const now = new Date().toISOString()

  if (memo.state === "draft" || memo.state === "pending_review") {
    const versions = memo.versions.map((v) => (v.version === memo.currentVersion ? { ...v, content, createdAt: now, createdBy: actorId } : v))
    return { ...memo, versions } as T
  }

  // ready/sent/opened/decided -> new version starts in draft
  const newVersionNumber = memo.currentVersion + 1
  const versions = [
    ...memo.versions,
    { version: newVersionNumber, content, createdAt: now, createdBy: actorId },
  ]
  return { ...memo, state: "draft", currentVersion: newVersionNumber, versions } as T
}

export function getCurrentVersion<T extends MemoLike>(memo: T) {
  return memo.versions.find((v) => v.version === memo.currentVersion)
}

