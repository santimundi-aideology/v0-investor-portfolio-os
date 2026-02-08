"use client"

import { useCallback, useEffect, useMemo, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Building2, Calendar, Plus, User, Users, Loader2 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { RoleRedirect } from "@/components/security/role-redirect"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAPI } from "@/lib/hooks/use-api"
import type { Task } from "@/lib/types"

const priorityColors: Record<Task["priority"], string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
}

const columns = [
  { id: "open", title: "Open", status: "open" as const },
  { id: "in-progress", title: "In Progress", status: "in-progress" as const },
  { id: "done", title: "Done", status: "done" as const },
]

function TasksPage() {
  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/real-estate" />
      <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
        <TasksPageInner />
      </Suspense>
    </>
  )
}

type TaskFromAPI = Task & { investorName?: string; propertyTitle?: string; assigneeName?: string }

function TasksPageInner() {
  const searchParams = useSearchParams()
  const scopedInvestorId = searchParams.get("investorId")

  const apiUrl = scopedInvestorId ? `/api/tasks?investorId=${scopedInvestorId}` : "/api/tasks"
  const { data: apiTasks, isLoading, mutate } = useAPI<TaskFromAPI[]>(apiUrl)

  const [tasks, setTasks] = useState<Task[]>([])

  // Sync API data into local state
  useEffect(() => {
    if (apiTasks && Array.isArray(apiTasks)) {
      setTasks(apiTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status as Task["status"],
        priority: (t.priority ?? "medium") as Task["priority"],
        dueDate: t.dueDate,
        assigneeId: t.assigneeId,
        assigneeName: t.assigneeName,
        investorId: t.investorId,
        investorName: t.investorName,
        propertyId: t.listingId,
        propertyTitle: t.propertyTitle,
        createdAt: t.createdAt,
      })))
    }
  }, [apiTasks])

  const toggleTaskStatus = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const statusOrder: Task["status"][] = ["open", "in-progress", "done"]
    const currentIndex = statusOrder.indexOf(task.status)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, status: nextStatus } : t)
    )

    // Persist to database
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: nextStatus }),
      })
      mutate()
    } catch (err) {
      console.error("Failed to update task status:", err)
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => t.id === taskId ? { ...t, status: task.status } : t)
      )
    }
  }, [tasks, mutate])

  const visibleTasks = useMemo(() => {
    // Filtering is done server-side via query param, but double-check here
    if (!scopedInvestorId) return tasks
    return tasks.filter((task) => task.investorId === scopedInvestorId)
  }, [tasks, scopedInvestorId])

  const getTasksByStatus = (status: Task["status"]) => visibleTasks.filter((task) => task.status === status)

  const openCount = getTasksByStatus("open").length
  const inProgressCount = getTasksByStatus("in-progress").length
  const doneCount = getTasksByStatus("done").length

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading tasks...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle={`${openCount} open, ${inProgressCount} in progress, ${doneCount} completed`}
        primaryAction={<NewTaskDialog onCreate={async (task) => {
          // Persist to database
          try {
            const res = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: task.title,
                priority: task.priority,
                status: task.status,
              }),
            })
            if (res.ok) {
              mutate() // Refresh from DB
            } else {
              // Fallback: add to local state
              setTasks((prev) => [task, ...prev])
            }
          } catch {
            setTasks((prev) => [task, ...prev])
          }
        }} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.status)
          return (
            <Card key={column.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{column.title}</CardTitle>
                  <Badge variant="secondary">{columnTasks.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {columnTasks.length > 0 ? (
                  columnTasks.map((task) => (
                    <div key={task.id} className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={task.status === "done"}
                          onCheckedChange={() => toggleTaskStatus(task.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 space-y-2">
                          <p className={`font-medium leading-snug text-gray-900 ${task.status === "done" ? "line-through text-gray-400" : ""}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <Badge variant="outline" className={priorityColors[task.priority]}>
                              {task.priority}
                            </Badge>
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {task.dueDate}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {task.investorName && (
                              <Link
                                href={`/investors/${task.investorId}`}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                              >
                                <Users className="h-3 w-3" />
                                {task.investorName}
                              </Link>
                            )}
                            {task.propertyTitle && (
                              <Link
                                href={`/properties/${task.propertyId}`}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                              >
                                <Building2 className="h-3 w-3" />
                                {task.propertyTitle}
                              </Link>
                            )}
                          </div>
                          {task.assigneeName && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              {task.assigneeName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-500">
                    No tasks
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function NewTaskDialog({ onCreate }: { onCreate: (task: Task) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<Task["priority"]>("medium")
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Use setTimeout to defer state update to avoid cascading renders
    const timeout = setTimeout(() => setIsHydrated(true), 0)
    return () => clearTimeout(timeout)
  }, [])

  const handleCreate = () => {
    const trimmed = title.trim()
    if (!trimmed) return

    onCreate({
      id: `task-${Math.floor(Math.random() * 100000)}`,
      title: trimmed,
      priority,
      status: "open",
      createdAt: new Date().toISOString().slice(0, 10),
    })

    setTitle("")
    setPriority("medium")
    setOpen(false)
  }

  if (!isHydrated) {
    return (
      <Button type="button" suppressHydrationWarning disabled className="opacity-75">
        <Plus className="mr-2 h-4 w-4" />
        New task
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Follow up…" />
          </div>
          <div className="grid gap-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as Task["priority"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TasksPage
