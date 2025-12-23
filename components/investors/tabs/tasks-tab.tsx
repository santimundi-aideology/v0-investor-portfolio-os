"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Building2 } from "lucide-react"
import type { Task } from "@/lib/types"

interface TasksTabProps {
  tasks: Task[]
}

export function TasksTab({ tasks: initialTasks }: TasksTabProps) {
  const [tasks, setTasks] = useState(initialTasks)

  const handleToggle = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status: task.status === "done" ? "open" : "done" } : task)),
    )
  }

  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    high: "bg-red-500/10 text-red-600 border-red-500/20",
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">No tasks for this investor</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="flex items-start gap-3 p-4">
            <Checkbox checked={task.status === "done"} onCheckedChange={() => handleToggle(task.id)} className="mt-1" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                <Badge variant="outline" className={priorityColors[task.priority]}>
                  {task.priority}
                </Badge>
              </div>
              {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Due: {task.dueDate}</span>
                  </div>
                )}
                {task.propertyTitle && (
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    <span>{task.propertyTitle}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
