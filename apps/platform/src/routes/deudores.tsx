import { useMemo, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import {
  ArrowRight01Icon,
  Call02Icon,
  CheckmarkBadge01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useAppStore } from "@/data/store"
import { formatCurrency, formatDateTime, outcomeMeta } from "@/data/format"
import type { Conversation, Owner } from "@/data/types"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/deudores")({
  component: DeudoresPage,
  head: () => ({ meta: [{ title: "Deudores | pacta.ia" }] }),
})

const toneClasses: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
}

type Row = { owner: Owner; conv: Conversation | undefined }

function DeudoresPage() {
  const { selectedBuilding, isAllBuildings, buildingIdOfConversation } =
    useAppStore()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Row | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return selectedBuilding.owners
      .map((owner) => {
        const conv = selectedBuilding.conversations.find(
          (c) => c.ownerId === owner.id
        )
        return { owner, conv }
      })
      .filter(({ owner }) => {
        if (!q) return true
        return (
          `${owner.firstName} ${owner.lastName}`.toLowerCase().includes(q) ||
          owner.unit.toLowerCase().includes(q) ||
          owner.phone.includes(q)
        )
      })
  }, [selectedBuilding, query])

  const totalDebt = selectedBuilding.owners.reduce((s, o) => s + o.debt, 0)

  return (
    <AppShell title="Deudores">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Propietarios con deuda · {selectedBuilding.name}</CardTitle>
          <CardDescription>
            {selectedBuilding.owners.length} propietarios · deuda total{" "}
            {formatCurrency(totalDebt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="relative max-w-sm">
            <HugeiconsIcon
              icon={Search01Icon}
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar propietario, unidad o teléfono"
              className="h-9 pl-8"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Propietario</th>
                  <th className="py-2 pr-3 font-medium">Unidad</th>
                  <th className="py-2 pr-3 font-medium">Teléfono</th>
                  <th className="py-2 pr-3 text-right font-medium">Deuda</th>
                  <th className="py-2 pr-3 font-medium">Mora</th>
                  <th className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const { owner, conv } = row
                  const meta = conv ? outcomeMeta[conv.outcome] : null
                  return (
                    <tr
                      key={owner.id}
                      onClick={() => setSelected(row)}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                    >
                      <td className="py-2.5 pr-3 font-medium">
                        {owner.firstName} {owner.lastName}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {owner.unit}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <HugeiconsIcon
                            icon={Call02Icon}
                            className="size-3"
                            strokeWidth={2}
                          />
                          {owner.phone}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium tabular-nums">
                        {formatCurrency(owner.debt)}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {owner.overdueMonths}{" "}
                        {owner.overdueMonths === 1 ? "mes" : "meses"}
                      </td>
                      <td className="py-2.5">
                        {meta && (
                          <Badge
                            variant="outline"
                            className={cn("text-[0.65rem]", toneClasses[meta.tone])}
                          >
                            {meta.label}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron propietarios.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          {selected && (
            <OwnerDetail
              owner={selected.owner}
              conv={selected.conv}
              buildingName={selectedBuilding.name}
              buildingId={
                isAllBuildings && selected.conv
                  ? buildingIdOfConversation(selected.conv.id)
                  : selectedBuilding.id
              }
            />
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  )
}

function OwnerDetail({
  owner,
  conv,
  buildingName,
  buildingId,
}: {
  owner: Owner
  conv: Conversation | undefined
  buildingName: string
  buildingId: string
}) {
  const meta = conv ? outcomeMeta[conv.outcome] : null
  const agreement = conv?.agreement
  void buildingId

  return (
    <>
      <SheetHeader className="border-b">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {`${owner.firstName[0] ?? ""}${owner.lastName[0] ?? ""}`.toUpperCase()}
          </span>
          <div className="min-w-0">
            <SheetTitle>
              {owner.firstName} {owner.lastName}
            </SheetTitle>
            <SheetDescription>
              Unidad {owner.unit} · {buildingName}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="space-y-5 p-4">
        {/* Contacto */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon icon={Call02Icon} className="size-4" strokeWidth={2} />
          {owner.phone}
        </div>

        {/* Deuda y mora destacadas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Saldo adeudado</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatCurrency(owner.debt)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Antigüedad de mora</p>
            <p className="mt-1 text-lg font-semibold">
              {owner.overdueMonths}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {owner.overdueMonths === 1 ? "mes" : "meses"}
              </span>
            </p>
          </div>
        </div>

        {/* Estado de la conversación */}
        {conv && meta && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Estado de la gestión
            </p>
            <Badge
              variant="outline"
              className={cn("text-[0.7rem]", toneClasses[meta.tone])}
            >
              {meta.label}
            </Badge>
            <p className="text-sm text-muted-foreground">{conv.summary}</p>
          </div>
        )}

        {/* Detalle del acuerdo si existe */}
        {agreement && (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={CheckmarkBadge01Icon}
                className="size-4 text-primary"
                strokeWidth={2}
              />
              <p className="text-sm font-medium">Acuerdo {agreement.reference}</p>
            </div>
            <dl className="space-y-1.5 text-sm">
              <DetailRow
                label="Deuda original"
                value={formatCurrency(agreement.originalDebt)}
              />
              <DetailRow
                label="Quita de intereses"
                value={`${agreement.interestWaiver}%`}
              />
              <DetailRow
                label="Plan"
                value={`${agreement.installments} ${
                  agreement.installments === 1 ? "cuota" : "cuotas"
                } de ${formatCurrency(agreement.installmentAmount)}`}
              />
              <DetailRow
                label="Total a pagar"
                value={formatCurrency(agreement.totalToPay)}
                strong
              />
              <DetailRow
                label="Vencimiento"
                value={`Día ${agreement.dueDay} de cada mes`}
              />
              {agreement.resolvedBy && (
                <DetailRow label="Resuelto por" value={agreement.resolvedBy} />
              )}
              {agreement.resolvedAt && (
                <DetailRow
                  label="Fecha de resolución"
                  value={formatDateTime(agreement.resolvedAt)}
                />
              )}
            </dl>
          </div>
        )}

        {/* Ir a la conversación */}
        {conv && (
          <Button
            nativeButton={false}
            className="w-full"
            render={
              <Link
                to="/conversaciones"
                search={{ open: conv.id }}
              />
            }
          >
            Ver conversación del agente
            <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
          </Button>
        )}
      </div>
    </>
  )
}

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right tabular-nums",
          strong ? "font-semibold text-foreground" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  )
}
