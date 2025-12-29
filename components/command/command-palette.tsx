"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command"
import { useApp } from "@/components/providers/app-provider"
import { getCommandItems } from "@/lib/command-items"

export function CommandPalette() {
  const router = useRouter()
  const { commandOpen, setCommandOpen, role } = useApp()

  const items = React.useMemo(() => getCommandItems(role), [role])

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k"
      const isMeta = e.metaKey || e.ctrlKey
      if (isMeta && isK) {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      }
      if (e.key === "Escape") {
        setCommandOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [commandOpen, setCommandOpen])

  const run = React.useCallback(
    (href: string) => {
      setCommandOpen(false)
      router.push(href)
    },
    [router, setCommandOpen],
  )

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <Command>
        <CommandInput placeholder="Search investors, properties, pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Actions">
            {items.actions.map((it) => (
              <CommandItem key={it.label} value={it.label} onSelect={() => run(it.href)}>
                {it.label}
                {it.shortcut ? <CommandShortcut>{it.shortcut}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigation">
            {items.navItems.map((it) => (
              <CommandItem key={it.href} value={it.label} onSelect={() => run(it.href)}>
                {it.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Recent Investors">
            {items.recentInvestors.map((it) => (
              <CommandItem key={it.href} value={it.label} onSelect={() => run(it.href)}>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{it.label}</span>
                  {it.meta ? <span className="text-muted-foreground truncate text-xs">{it.meta}</span> : null}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Recent Properties">
            {items.recentProperties.map((it) => (
              <CommandItem key={it.href} value={it.label} onSelect={() => run(it.href)}>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{it.label}</span>
                  {it.meta ? <span className="text-muted-foreground truncate text-xs">{it.meta}</span> : null}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}


