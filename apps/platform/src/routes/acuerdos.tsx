import { useMemo } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"
import {
  Building02Icon,
  CheckmarkBadge01Icon,
  Download01Icon,
  PrinterIcon,
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
} from "@/components/ui/card"
import { useAppStore } from "@/data/store"
import { formatCurrency, formatDateTime } from "@/data/format"
import type { Agreement, Building } from "@/data/types"

export const Route = createFileRoute("/acuerdos")({
  component: AgreementsPage,
  head: () => ({ meta: [{ title: "Acuerdos del mes | pacta.ia" }] }),
})

/** Fila de acuerdo lista para mostrar. */
type Row = {
  agreement: Agreement
  conversationId: string
  ownerName: string
  ownerPhone: string
  unit: string
}

/** Grupo de acuerdos de un edificio. */
type Group = {
  buildingId: string
  buildingName: string
  rows: Row[]
  total: number
}

const monthLabel = new Date().toLocaleDateString("es-AR", {
  month: "long",
  year: "numeric",
})

/** Construye los grupos de acuerdos (del mes) a partir de un edificio real. */
function groupFromBuilding(building: Building): Group {
  const rows: Row[] = building.conversations
    .filter((c) => c.agreement)
    .map((c) => {
      const owner = building.owners.find((o) => o.id === c.ownerId)!
      return {
        agreement: c.agreement!,
        conversationId: c.id,
        ownerName: `${owner.firstName} ${owner.lastName}`,
        ownerPhone: owner.phone,
        unit: owner.unit,
      }
    })
  const total = rows
    .filter((r) => r.agreement.status !== "rechazado")
    .reduce((s, r) => s + r.agreement.totalToPay, 0)
  return {
    buildingId: building.id,
    buildingName: building.name,
    rows,
    total,
  }
}

function AgreementsPage() {
  const { buildings, isAllBuildings, selectedBuildingId } = useAppStore()

  const groups = useMemo<Group[]>(() => {
    const source = isAllBuildings
      ? buildings
      : buildings.filter((b) => b.id === selectedBuildingId)
    return source
      .map(groupFromBuilding)
      .filter((g) => g.rows.length > 0)
  }, [buildings, isAllBuildings, selectedBuildingId])

  const allRows = groups.flatMap((g) => g.rows)
  const totalMes = groups.reduce((s, g) => s + g.total, 0)
  const confirmados = allRows.filter(
    (r) => r.agreement.status === "aceptado"
  ).length
  const pendientes = allRows.filter(
    (r) => r.agreement.status === "propuesto"
  ).length

  function exportCsv() {
    const header = [
      "Edificio",
      "Referencia",
      "Estado",
      "Propietario",
      "Telefono",
      "Unidad",
      "Deuda original",
      "Quita %",
      "Cuotas",
      "Monto cuota",
      "Total a pagar",
      "Resuelto",
    ]
    const lines = groups.flatMap((g) =>
      g.rows.map((r) =>
        [
          g.buildingName,
          r.agreement.reference,
          r.agreement.status,
          r.ownerName,
          r.ownerPhone,
          r.unit,
          r.agreement.originalDebt,
          r.agreement.interestWaiver,
          r.agreement.installments,
          r.agreement.installmentAmount,
          r.agreement.totalToPay,
          r.agreement.resolvedAt ? formatDateTime(r.agreement.resolvedAt) : "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
    )
    const csv = [header.join(","), ...lines].join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `acuerdos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell
      title="Acuerdos del mes"
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={allRows.length === 0}
          >
            <HugeiconsIcon icon={Download01Icon} data-icon="inline-start" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <Button
            size="sm"
            onClick={() => window.print()}
            disabled={allRows.length === 0}
          >
            <HugeiconsIcon icon={PrinterIcon} data-icon="inline-start" />
            Imprimir
          </Button>
        </>
      }
    >
      {/* Encabezado imprimible */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight capitalize">
            Acuerdos de {monthLabel}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAllBuildings
              ? "Listado de todos los acuerdos realizados este mes, agrupados por edificio."
              : "Acuerdos realizados este mes en el edificio seleccionado."}
          </p>
        </div>
        <p className="hidden text-sm text-muted-foreground print:block">
          Generado el {formatDateTime(new Date().toISOString())}
        </p>
      </div>

      {/* Resumen */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3 print:hidden">
        <Card>
          <CardHeader>
            <CardDescription>Acuerdos del mes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{allRows.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {confirmados} confirmados · {pendientes} pendientes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Monto total acordado</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(totalMes)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Edificios con acuerdos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{groups.length}</p>
          </CardContent>
        </Card>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="px-4 py-12 text-center">
            <p className="text-sm font-medium">No hay acuerdos este mes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando el agente cierre acuerdos aparecerán acá, agrupados por
              edificio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <BuildingGroup key={group.buildingId} group={group} />
          ))}
        </div>
      )}
    </AppShell>
  )
}

function BuildingGroup({ group }: { group: Group }) {
  return (
    <section className="break-inside-avoid">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={Building02Icon} className="size-4" strokeWidth={2} />
        </span>
        <h2 className="text-sm font-semibold">{group.buildingName}</h2>
        <Badge variant="secondary" className="text-[0.65rem]">
          {group.rows.length}{" "}
          {group.rows.length === 1 ? "acuerdo" : "acuerdos"}
        </Badge>
        <span className="ml-auto text-sm font-medium tabular-nums text-muted-foreground">
          {formatCurrency(group.total)}
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Referencia</th>
                <th className="px-4 py-2 font-medium">Propietario</th>
                <th className="px-4 py-2 font-medium">Unidad</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Resuelto por</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {group.rows.map((r) => (
                <AgreementRow key={r.agreement.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}

function StatusBadge({ status }: { status: Agreement["status"] }) {
  if (status === "aceptado") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      >
        <HugeiconsIcon
          icon={CheckmarkBadge01Icon}
          className="mr-1 size-3"
          strokeWidth={2}
        />
        Confirmado
      </Badge>
    )
  }
  if (status === "rechazado") {
    return (
      <Badge
        variant="outline"
        className="border-destructive/20 bg-destructive/10 text-destructive"
      >
        Rechazado
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
    >
      Pendiente
    </Badge>
  )
}

function AgreementRow({ row }: { row: Row }) {
  const a = row.agreement
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-2.5 font-medium">{a.reference}</td>
      <td className="px-4 py-2.5">
        <p className="font-medium">{row.ownerName}</p>
        <p className="text-xs text-muted-foreground">{row.ownerPhone}</p>
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">{row.unit}</td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {a.installments} {a.installments === 1 ? "cuota" : "cuotas"} de{" "}
        {formatCurrency(a.installmentAmount)}
      </td>
      <td className="px-4 py-2.5 text-right font-medium tabular-nums">
        {formatCurrency(a.totalToPay)}
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        {a.resolvedBy ?? "—"}
        {a.status === "rechazado" && a.rejectionReason && (
          <span className="block text-[0.7rem] text-destructive/80">
            {a.rejectionReason}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={a.status} />
      </td>
      <td className="px-4 py-2.5 print:hidden">
        <Link
          to="/conversaciones"
          search={{ open: row.conversationId }}
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver chat
        </Link>
      </td>
    </tr>
  )
}
