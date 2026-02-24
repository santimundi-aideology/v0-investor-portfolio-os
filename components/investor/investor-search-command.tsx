"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  searchInvestorContent,
  getAIRecommendations,
  type SearchableItem,
  type AIRecommendation,
} from "@/lib/investor-search"

interface InvestorSearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvestorSearchCommand({ open, onOpenChange }: InvestorSearchCommandProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const filteredContent = useMemo(() => searchInvestorContent(query), [query])
  const aiRecommendations = useMemo(() => getAIRecommendations(query, 5), [query])

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false)
      setQuery("")
      router.push(href)
    },
    [onOpenChange, router]
  )

  const showContent = filteredContent.length > 0
  const showAI = aiRecommendations.length > 0
  const isEmpty = !showContent && !showAI

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command
        shouldFilter={false}
        className="rounded-lg border-0"
      >
        <CommandInput
          placeholder="Buscar páginas, cartera, pagos, oportunidades…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty className={isEmpty ? "py-4" : "hidden"}>
            No hay resultados para &quot;{query}&quot;. Prueba con otras palabras.
          </CommandEmpty>

          {showAI && (
            <CommandGroup heading="Recomendaciones de la IA">
              {aiRecommendations.map((rec) => (
                <CommandItem
                  key={rec.id}
                  value={`${rec.id} ${rec.label} ${rec.description}`}
                  onSelect={() => handleSelect(rec.href)}
                  className="gap-3 py-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    <rec.icon className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-gray-900">{rec.label}</span>
                    <span className="text-xs text-gray-500">{rec.description}</span>
                  </div>
                  <Sparkles className="ml-auto h-3.5 w-3.5 text-green-500 shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {showContent && (
            <CommandGroup heading={query ? "Resultados" : "Páginas y contenido"}>
              {filteredContent.map((item) => (
                <SearchableItemRow
                  key={item.id}
                  item={item}
                  onSelect={() => handleSelect(item.href)}
                />
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

function SearchableItemRow({
  item,
  onSelect,
}: {
  item: SearchableItem
  onSelect: () => void
}) {
  const Icon = item.icon
  const value = [item.id, item.label, ...item.keywords].join(" ")
  return (
    <CommandItem value={value} onSelect={onSelect} className="gap-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
        <Icon className="h-4 w-4" />
      </span>
      <span className="font-medium text-gray-900">{item.label}</span>
    </CommandItem>
  )
}
