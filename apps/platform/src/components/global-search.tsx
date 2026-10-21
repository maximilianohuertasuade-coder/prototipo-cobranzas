import { useMemo, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { useNavigate } from "@tanstack/react-router"
import {
  Building02Icon,
  Call02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { useAppStore } from "@/data/store"
import { formatCurrency } from "@/data/format"
import { cn } from "@/lib/utils"

type Hit = {
  ownerId: string
  conversationId?: string
  name: string
  phone: string
  unit: string
  debt: number
  buildingId: string
  buildingName: string
}

export function GlobalSearch() {
  const { buildings, setSelectedBuildingId } = useAppStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: Hit[] = []
    for (const b of buildings) {
      for (const owner of b.owners) {
        const full = `${owner.firstName} ${owner.lastName}`.toLowerCase()
        if (
          full.includes(q) ||
          owner.unit.toLowerCase().includes(q) ||
          owner.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
        ) {
          const conv = b.conversations.find((c) => c.ownerId === owner.id)
          out.push({
            ownerId: owner.id,
            conversationId: conv?.id,
            name: `${owner.firstName} ${owner.lastName}`,
            phone: owner.phone,
            unit: owner.unit,
            debt: owner.debt,
            buildingId: b.id,
            buildingName: b.name,
          })
        }
      }
    }
    return out.slice(0, 12)
  }, [buildings, query])

  function openOwner(hit: Hit) {
    setSelectedBuildingId(hit.buildingId)
    setOpen(false)
    setQuery("")
    if (hit.conversationId) {
      navigate({ to: "/conversaciones", search: { open: hit.conversationId } })
    } else {
      navigate({ to: "/deudores" })
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button variant="outline" size="icon-sm" aria-label="Buscar propietario" />
        }
      >
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed top-24 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none",
            "transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
          )}
        >
          <Dialog.Title className="sr-only">Buscar propietario</Dialog.Title>
          <div className="flex items-center gap-2 border-b px-3">
            <HugeiconsIcon
              icon={Search01Icon}
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={2}
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar propietario por nombre, unidad o teléfono…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {query.trim() === "" ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Escribí para buscar en los {buildings.length} edificios.
              </p>
            ) : hits.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Sin resultados para “{query}”.
              </p>
            ) : (
              hits.map((hit) => (
                <button
                  key={`${hit.buildingId}-${hit.ownerId}`}
                  type="button"
                  onClick={() => openOwner(hit)}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {hit.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {hit.name}
                    </span>
                    <span className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon
                          icon={Building02Icon}
                          className="size-3"
                          strokeWidth={2}
                        />
                        {hit.buildingName} · {hit.unit}
                      </span>
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon
                          icon={Call02Icon}
                          className="size-3"
                          strokeWidth={2}
                        />
                        {hit.phone}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {formatCurrency(hit.debt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
