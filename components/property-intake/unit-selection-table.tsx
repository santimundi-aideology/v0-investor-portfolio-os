"use client"

import * as React from "react"
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Filter,
  Search,
  Eye,
  Car,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OffPlanUnit } from "@/lib/types"

interface UnitSelectionTableProps {
  units: OffPlanUnit[]
  selectedUnits: OffPlanUnit[]
  onSelectionChange: (units: OffPlanUnit[]) => void
  maxSelection?: number
}

type SortField = "unitNumber" | "level" | "type" | "sizeSqft" | "pricePerSqft" | "totalPrice"
type SortDirection = "asc" | "desc"

export function UnitSelectionTable({
  units,
  selectedUnits,
  onSelectionChange,
  maxSelection = 1,
}: UnitSelectionTableProps) {
  const [search, setSearch] = React.useState("")
  const [sortField, setSortField] = React.useState<SortField>("level")
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc")
  const [typeFilter, setTypeFilter] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState<string[]>(["available"])

  // Get unique types
  const unitTypes = React.useMemo(() => {
    return Array.from(new Set(units.map((u) => u.type))).sort()
  }, [units])

  // Filter and sort units
  const filteredUnits = React.useMemo(() => {
    let result = [...units]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.unitNumber.toLowerCase().includes(searchLower) ||
          u.type.toLowerCase().includes(searchLower) ||
          u.views?.toLowerCase().includes(searchLower)
      )
    }

    // Type filter
    if (typeFilter.length > 0) {
      result = result.filter((u) => typeFilter.includes(u.type))
    }

    // Status filter
    if (statusFilter.length > 0) {
      result = result.filter((u) => statusFilter.includes(u.status))
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "unitNumber":
          comparison = a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true })
          break
        case "level":
          comparison = a.level - b.level
          break
        case "type":
          comparison = a.type.localeCompare(b.type)
          break
        case "sizeSqft":
          comparison = a.sizeSqft - b.sizeSqft
          break
        case "pricePerSqft":
          comparison = a.pricePerSqft - b.pricePerSqft
          break
        case "totalPrice":
          comparison = a.totalPrice - b.totalPrice
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [units, search, typeFilter, statusFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleSelectUnit = (unit: OffPlanUnit) => {
    if (unit.status !== "available") return

    const isSelected = selectedUnits.some((u) => u.unitNumber === unit.unitNumber)

    if (isSelected) {
      onSelectionChange(selectedUnits.filter((u) => u.unitNumber !== unit.unitNumber))
    } else if (selectedUnits.length < maxSelection) {
      onSelectionChange([...selectedUnits, unit])
    } else if (maxSelection === 1) {
      // Replace selection
      onSelectionChange([unit])
    }
  }

  const isSelected = (unit: OffPlanUnit) =>
    selectedUnits.some((u) => u.unitNumber === unit.unitNumber)

  const formatCurrency = (value: number) =>
    value > 0 ? `AED ${value.toLocaleString()}` : "—"

  const formatSize = (value: number) =>
    value > 0 ? `${value.toLocaleString()} sqft` : "—"

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Available</Badge>
      case "sold":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-500">Sold</Badge>
      case "reserved":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Reserved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === field ? "text-green-600" : "text-gray-400"}`} />
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Select Unit for IC Memo</CardTitle>
            <CardDescription>
              {filteredUnits.length} units • {selectedUnits.length} selected
              {maxSelection > 1 && ` (max ${maxSelection})`}
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 pt-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search units..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <Filter className="mr-2 h-4 w-4" />
                Type
                {typeFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {typeFilter.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {unitTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={typeFilter.includes(type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setTypeFilter([...typeFilter, type])
                    } else {
                      setTypeFilter(typeFilter.filter((t) => t !== type))
                    }
                  }}
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                Status
                {statusFilter.length > 0 && statusFilter.length < 3 && (
                  <Badge variant="secondary" className="ml-2">
                    {statusFilter.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {["available", "reserved", "sold"].map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.includes(status)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setStatusFilter([...statusFilter, status])
                    } else {
                      setStatusFilter(statusFilter.filter((s) => s !== status))
                    }
                  }}
                >
                  <span className="capitalize">{status}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead><SortButton field="unitNumber">Unit</SortButton></TableHead>
                <TableHead><SortButton field="level">Level</SortButton></TableHead>
                <TableHead><SortButton field="type">Type</SortButton></TableHead>
                <TableHead className="text-right"><SortButton field="sizeSqft">Size</SortButton></TableHead>
                <TableHead className="text-right"><SortButton field="pricePerSqft">AED/sqft</SortButton></TableHead>
                <TableHead className="text-right"><SortButton field="totalPrice">Total Price</SortButton></TableHead>
                <TableHead>Views</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-gray-500">
                    No units found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredUnits.map((unit) => {
                  const selected = isSelected(unit)
                  const selectable = unit.status === "available"

                  return (
                    <TableRow
                      key={unit.unitNumber}
                      className={`
                        ${selected ? "bg-green-50" : ""}
                        ${selectable ? "cursor-pointer hover:bg-gray-50" : "opacity-60"}
                      `}
                      onClick={() => handleSelectUnit(unit)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          disabled={!selectable}
                          onCheckedChange={() => handleSelectUnit(unit)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                      <TableCell>{unit.level}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{unit.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatSize(unit.sizeSqft)}
                      </TableCell>
                      <TableCell className="text-right">
                        {unit.pricePerSqft > 0 ? `${unit.pricePerSqft.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(unit.totalPrice)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {unit.views && (
                            <>
                              <Eye className="h-3 w-3" />
                              <span className="truncate max-w-[120px]">{unit.views}</span>
                            </>
                          )}
                          {unit.parking && (
                            <>
                              <Car className="h-3 w-3 ml-2" />
                              <span>{unit.parking}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(unit.status)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Selected Units Summary */}
        {selectedUnits.length > 0 && (
          <div className="mt-4 rounded-lg border-2 border-green-200 bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-800">
                  {selectedUnits.length} Unit{selectedUnits.length > 1 ? "s" : ""} Selected
                </h4>
                <p className="text-sm text-green-600">
                  {selectedUnits.map((u) => u.unitNumber).join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-600">Total Investment</p>
                <p className="text-xl font-bold text-green-800">
                  {formatCurrency(selectedUnits.reduce((sum, u) => sum + u.totalPrice, 0))}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
