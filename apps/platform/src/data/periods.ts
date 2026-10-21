import type { Building, BuildingMetrics } from "./types"

// ---------------------------------------------------------------------------
// Rangos temporales del dashboard
// ---------------------------------------------------------------------------
// Las métricas base de cada edificio representan el mes en curso. Para los
// otros rangos aplicamos un factor proporcional, de forma determinística, para
// simular datos coherentes sin backend.

export type PeriodKey = "today" | "7d" | "month" | "quarter"

export const periods: { key: PeriodKey; label: string; short: string }[] = [
  { key: "today", label: "Hoy", short: "Hoy" },
  { key: "7d", label: "Últimos 7 días", short: "7 días" },
  { key: "month", label: "Este mes", short: "Mes" },
  { key: "quarter", label: "Trimestre", short: "Trim." },
]

/** Factor aplicado a los montos/volúmenes acumulados según el rango. */
const factor: Record<PeriodKey, number> = {
  today: 0.06,
  "7d": 0.3,
  month: 1,
  quarter: 2.7,
}

/** Etiqueta de comparación mostrada bajo cada métrica. */
export const compareLabel: Record<PeriodKey, string> = {
  today: "vs. ayer",
  "7d": "vs. semana previa",
  month: "vs. mes anterior",
  quarter: "vs. trimestre previo",
}

function scaleTrend(
  trend: BuildingMetrics["recoveryTrend"],
  period: PeriodKey
): BuildingMetrics["recoveryTrend"] {
  if (period === "month" || period === "quarter") return trend
  // Para rangos cortos mostramos los últimos puntos escalados.
  const f = factor[period]
  const slice = period === "today" ? trend.slice(-3) : trend.slice(-4)
  return slice.map((p) => ({
    month: p.month,
    amount: Number((p.amount * f * 3).toFixed(1)),
  }))
}

/** Devuelve las métricas de un edificio ajustadas al rango temporal. */
export function metricsForPeriod(
  base: BuildingMetrics,
  period: PeriodKey
): BuildingMetrics {
  const f = factor[period]
  return {
    ...base,
    recovered: Math.round(base.recovered * f),
    agreementsClosed: Math.max(0, Math.round(base.agreementsClosed * f)),
    agreementsThisWeek:
      period === "today"
        ? Math.max(0, Math.round(base.agreementsThisWeek * 0.3))
        : base.agreementsThisWeek,
    // La mora y las conversaciones activas son "estado actual": no escalan.
    recoveryTrend: scaleTrend(base.recoveryTrend, period),
    agreementPlans: base.agreementPlans.map((p) => ({
      plan: p.plan,
      count: Math.max(0, Math.round(p.count * f)),
    })),
  }
}

/** Ordena edificios por una métrica, de mayor a menor. */
export function rankBuildings(
  buildings: Building[],
  by: "delinquency" | "recovered",
  period: PeriodKey
) {
  return [...buildings]
    .map((b) => ({
      building: b,
      value:
        by === "delinquency"
          ? b.metrics.delinquencyRate
          : Math.round(b.metrics.recovered * factor[period]),
    }))
    .sort((a, b) => b.value - a.value)
}
