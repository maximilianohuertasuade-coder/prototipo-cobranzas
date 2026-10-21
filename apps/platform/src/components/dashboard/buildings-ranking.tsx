import { useState } from "react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAppStore } from "@/data/store"
import { formatCompactCurrency } from "@/data/format"
import { rankBuildings, type PeriodKey } from "@/data/periods"
import { cn } from "@/lib/utils"

type Metric = "delinquency" | "recovered"

export function BuildingsRanking({
  period,
  className,
}: {
  period: PeriodKey
  className?: string
}) {
  const { buildings, selectedBuildingId, setSelectedBuildingId } = useAppStore()
  const [metric, setMetric] = useState<Metric>("delinquency")

  const ranked = rankBuildings(buildings, metric, period)
  const max = Math.max(...ranked.map((r) => r.value), 1)

  return (
    <Card className={cn(className)}>
      <CardHeader className="border-b">
        <CardTitle>Comparativa de edificios</CardTitle>
        <CardDescription>
          {metric === "delinquency"
            ? "Ranking por tasa de mora."
            : "Ranking por monto recuperado."}
        </CardDescription>
        <CardAction>
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setMetric("delinquency")}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                metric === "delinquency"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mora
            </button>
            <button
              type="button"
              onClick={() => setMetric("recovered")}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                metric === "recovered"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Recupero
            </button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-4">
        {ranked.map(({ building, value }) => {
          const pct = (value / max) * 100
          const isSelected = building.id === selectedBuildingId
          // Color de la barra según severidad de mora.
          const barColor =
            metric === "delinquency"
              ? value >= 20
                ? "bg-destructive"
                : value >= 15
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              : "bg-primary"

          return (
            <button
              key={building.id}
              type="button"
              onClick={() => setSelectedBuildingId(building.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60",
                isSelected && "bg-muted"
              )}
            >
              <span className="w-28 shrink-0 truncate text-xs font-medium sm:w-36">
                {building.name}
              </span>
              <span className="relative h-5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all",
                    barColor
                  )}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </span>
              <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums">
                {metric === "delinquency"
                  ? `${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`
                  : formatCompactCurrency(value)}
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                strokeWidth={2}
              />
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
