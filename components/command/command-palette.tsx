"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command"
import { useApp } from "@/components/providers/app-provider"
import { getCommandItems } from "@/lib/command-items"

export function CommandPalette() {
  const router = useRouter()
  const { commandOpen, setCommandOpen, role } = useApp()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<{
    investors: Array<{ id: string; name: string; company: string | null; email: string | null }>
    properties: Array<{ id: string; title: string | null; area: string | null; building_name: string | null }>
  }>({ investors: [], properties: [] })

  const items = React.useMemo(() => getCommandItems(role), [role])

  // Search when query changes
  React.useEffect(() => {
    if (!commandOpen) {
      setSearchQuery("")
      setSearchResults({ investors: [], properties: [] })
      return
    }

    if (searchQuery.length < 2) {
      setSearchResults({ investors: [], properties: [] })
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
        }
      } catch (err) {
        console.error("Search error:", err)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, commandOpen])

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

  const showSearchResults = searchQuery.length >= 2 && (searchResults.investors.length > 0 || searchResults.properties.length > 0)

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <Command shouldFilter={!showSearchResults}>
        <CommandInput 
          placeholder="Search investors, properties, pages…" 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {showSearchResults ? (
            <>
              {searchResults.investors.length > 0 && (
                <CommandGroup heading="Investors">
                  {searchResults.investors.map((inv) => (
                    <CommandItem 
                      key={inv.id} 
                      value={`${inv.name} ${inv.company || ""}`}
                      onSelect={() => run(`/investors/${inv.id}`)}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{inv.name}</span>
                        {inv.company && <span className="text-gray-500 truncate text-xs">{inv.company}</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchResults.properties.length > 0 && (
                <CommandGroup heading="Properties">
                  {searchResults.properties.map((prop) => (
                    <CommandItem 
                      key={prop.id} 
                      value={`${prop.title || ""} ${prop.area || ""}`}
                      onSelect={() => run(`/properties/${prop.id}`)}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{prop.title || "Untitled Property"}</span>
                        {(prop.area || prop.building_name) && (
                          <span className="text-gray-500 truncate text-xs">
                            {[prop.area, prop.building_name].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchResults.investors.length === 0 && searchResults.properties.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
            </>
          ) : (
            <>
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
                      {it.meta ? <span className="text-gray-500 truncate text-xs">{it.meta}</span> : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="Recent Properties">
                {items.recentProperties.map((it) => (
                  <CommandItem key={it.href} value={it.label} onSelect={() => run(it.href)}>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{it.label}</span>
                      {it.meta ? <span className="text-gray-500 truncate text-xs">{it.meta}</span> : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
