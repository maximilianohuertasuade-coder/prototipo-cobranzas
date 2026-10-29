import { Link } from "@tanstack/react-router"
import {
  Alert02Icon,
  ArrowDownRight01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  Clock03Icon,
  MessageMultiple02Icon,
  MoneyReceiveCircleIcon,
  PercentCircleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AgreementPlansChart } from "@/components/dashboard/agreement-plans-chart"
import { BuildingsRanking } from "@/components/dashboard/buildings-ranking"
import { RecoveryTrendChart } from "@/components/dashboard/recovery-trend-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAppStore } from "@/data/store"
import { formatCompactCurrency, formatCurrency, outcomeMeta } from "@/data/format"
import {
  compareLabel,
  metricsForPeriod,
  type PeriodKey,
} from "@/data/periods"
import type { Building } from "@/data/types"
import { cn } from "@/lib/utils"

type DashboardOverviewProps = {
  compact?: boolean
  className?: string
  period?: PeriodKey
}

export function DashboardOverview({
  compact = false,
  className,
  period = "month",
}: DashboardOverviewProps) {
  const { selectedBuilding, isAllBuildings } = useAppStore()
  const b = selectedBuilding
  const m = metricsForPeriod(b.metrics, period)

  // Monto recuperado y acuerdos cerrados se calculan de los acuerdos REALES
  // aceptados, para que el dashboard coincida con la pantalla de Acuerdos.
  const acceptedAgreements = b.conversations
    .map((c) => c.agreement)
    .filter((a) => a && a.status === "aceptado")
  const recoveredReal = acceptedAgreements.reduce(
    (s, a) => s + (a?.totalToPay ?? 0),
    0
  )
  const agreementsClosedReal = acceptedAgreements.length

  const metrics = [
    {
      label: "Monto recuperado",
      value: formatCompactCurrency(recoveredReal),
      detail: `${m.recoveredChange >= 0 ? "+" : ""}${m.recoveredChange.toLocaleString("es-AR", { maximumFractionDigits: 1 })}% ${compareLabel[period]}`,
      positive: m.recoveredChange >= 0,
      icon: MoneyReceiveCircleIcon,
    },
    {
      label: "Acuerdos cerrados",
      value: String(agreementsClosedReal),
      detail: `${m.agreementsThisWeek} esta semana`,
      positive: true,
      icon: CheckmarkCircle02Icon,
    },
    {
      label: "Conversaciones activas",
      value: String(m.activeConversations),
      detail: `${m.awaitingReply} esperan respuesta`,
      positive: true,
      icon: MessageMultiple02Icon,
    },
    {
      label: "Mora de la cartera",
      value: `${m.delinquencyRate.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`,
      detail: `${b.units} unidades en ${b.name}`,
      positive: m.delinquencyRate < 15,
      icon: PercentCircleIcon,
    },
  ]

  return (
    <section
      aria-label="Contenido del dashboard"
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4",
        compact && "gap-3",
        className
      )}
    >
      {metrics.map((metric) => (
        <Card key={metric.label} size={compact ? "sm" : "default"}>
          <CardHeader>
            <CardDescription>{metric.label}</CardDescription>
            <CardAction className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon icon={metric.icon} strokeWidth={2} />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "font-semibold tracking-tight",
                compact ? "text-xl" : "text-2xl"
              )}
            >
              {metric.value}
            </p>
            <p
              className={cn(
                "mt-1 flex items-center gap-0.5 text-xs",
                metric.positive ? "text-muted-foreground" : "text-destructive"
              )}
            >
              {!metric.positive && (
                <HugeiconsIcon
                  icon={ArrowDownRight01Icon}
                  className="size-3.5"
                  strokeWidth={2}
                />
              )}
              {metric.detail}
            </p>
          </CardContent>
        </Card>
      ))}

      <RecoveryTrendChart
        compact={compact}
        data={m.recoveryTrend}
        className="md:col-span-2 lg:col-span-2"
      />
      <AgreementPlansChart
        compact={compact}
        data={m.agreementPlans}
        className="md:col-span-2 lg:col-span-2"
      />

      {/* Ranking de edificios: solo en la vista consolidada */}
      {isAllBuildings && !compact && (
        <BuildingsRanking period={period} className="md:col-span-2 lg:col-span-4" />
      )}

      <RecentAgreements building={b} compact={compact} />
      <NeedsAttention building={b} compact={compact} />
    </section>
  )
}

function RecentAgreements({
  building,
  compact,
}: {
  building: Building
  compact: boolean
}) {
  // Toma los propietarios con conversación de pre-acuerdo o en curso como "acuerdos recientes".
  const rows = building.conversations
    .filter((c) => c.outcome === "preacuerdo" || c.outcome === "en_curso")
    .map((c) => {
      const owner = building.owners.find((o) => o.id === c.ownerId)!
      return { conversation: c, owner }
    })
    .slice(0, 4)

  return (
    <Card
      size={compact ? "sm" : "default"}
      className="md:col-span-2 lg:col-span-2"
    >
      <CardHeader className="border-b">
        <CardTitle>Acuerdos recientes</CardTitle>
        <CardDescription>
          Últimas negociaciones registradas por el agente en {building.name}.
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/conversaciones" />}
          >
            Ver todos
            <HugeiconsIcon icon={ArrowUpRight01Icon} data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y">
          {rows.map(({ conversation, owner }) => (
            <Link
              key={conversation.id}
              to="/conversaciones"
              search={{ open: conversation.id }}
              className="group grid gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  Unidad {owner.unit} · {owner.firstName} {owner.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {owner.overdueMonths} meses de mora
                </p>
              </div>
              <div className="sm:text-right">
                <p className="font-medium tabular-nums">
                  {formatCurrency(owner.debt)}
                </p>
              </div>
              <Badge
                variant={
                  conversation.outcome === "preacuerdo"
                    ? "secondary"
                    : "outline"
                }
              >
                {outcomeMeta[conversation.outcome].label}
              </Badge>
            </Link>
          ))}
          {rows.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin acuerdos recientes en este edificio.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function NeedsAttention({
  building,
  compact,
}: {
  building: Building
  compact: boolean
}) {
  const awaiting = building.metrics.awaitingReply
  const outOfPolicy = building.conversations.filter(
    (c) => c.outcome === "fuera_de_politica"
  ).length

  return (
    <Card
      size={compact ? "sm" : "default"}
      className="md:col-span-2 lg:col-span-2"
    >
      <CardHeader>
        <CardTitle>Requieren atención</CardTitle>
        <CardDescription>
          Conversaciones que necesitan una decisión.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link
          to="/conversaciones"
          search={{ filter: "awaiting" }}
          className="group flex items-start gap-3 rounded-lg bg-muted/60 p-3 text-left transition-colors hover:bg-muted"
        >
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary ring-1 ring-border">
            <HugeiconsIcon icon={Clock03Icon} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{awaiting} respuestas pendientes</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              El agente espera que el propietario conteste.
            </p>
          </div>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </Link>
        <Link
          to="/conversaciones"
          search={{ filter: "out_of_policy" }}
          className="group flex items-start gap-3 rounded-lg bg-muted/60 p-3 text-left transition-colors hover:bg-muted"
        >
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-destructive ring-1 ring-border">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {outOfPolicy} {outOfPolicy === 1 ? "caso" : "casos"} fuera de
              política
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Solicitaron condiciones que superan la política vigente.
            </p>
          </div>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </Link>
      </CardContent>
    </Card>
  )
}
