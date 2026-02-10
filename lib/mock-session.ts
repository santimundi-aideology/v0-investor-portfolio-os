export type Org = {
  id: string
  name: string
  avatarText: string
  plan: "starter" | "pro" | "enterprise"
}

export type Notification = {
  id: string
  title: string
  body: string
  createdAt: string
  unread?: boolean
  href?: string
}

export const orgs: Org[] = [
  { id: "org-1", name: "Palm & Partners Realty", avatarText: "P&", plan: "pro" },
]

export const defaultOrgId = orgs[0]?.id ?? "org-1"

export const notifications: Notification[] = [
  {
    id: "n-1",
    title: "Task due today",
    body: "Schedule site visit for Marina Tower Office Suite",
    createdAt: "Today • 10:12",
    unread: true,
    href: "/tasks",
  },
  {
    id: "n-2",
    title: "IC memo approved",
    body: "Marina Tower Office Suite memo was approved",
    createdAt: "Yesterday • 18:40",
    href: "/memos",
  },
  {
    id: "n-3",
    title: "Deal room updated",
    body: "JVC Villa moved to due diligence phase",
    createdAt: "2 days ago • 09:05",
    href: "/deal-room",
  },
]
