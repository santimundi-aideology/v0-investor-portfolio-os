"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const RESEARCH_LINKS = [
  { label: "Property Finder", url: "https://www.propertyfinder.ae", description: "Dubai & UAE property listings" },
  { label: "Bayut", url: "https://www.bayut.com", description: "Dubai real estate" },
  { label: "Dubizzle Property", url: "https://www.dubizzle.com/property-for-sale/", description: "Classifieds & property" },
  { label: "Dubai Land Department", url: "https://dubailand.gov.ae/", description: "Official land & property" },
]

export default function ResearchBrowsePage() {
  return (
    <div className="min-h-screen bg-gray-100/30">
      <header className="border-b border-gray-100 bg-white">
        <div className="w-full py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/opportunities">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Research & browse</h1>
              <p className="text-sm text-muted-foreground">
                Search on Dubai and UAE property portals
              </p>
            </div>
          </div>
        </div>
      </header>
      <div className="w-full py-8">
        <ul className="space-y-4">
          {RESEARCH_LINKS.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="overflow-hidden transition-all hover:shadow-md hover:border-primary/30">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-semibold">{link.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                    <ExternalLink className="size-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
