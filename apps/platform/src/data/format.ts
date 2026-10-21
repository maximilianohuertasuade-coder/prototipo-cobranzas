import type { ConversationOutcome, PlanType } from "./types"

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

/** Formatea montos grandes de forma compacta, p. ej. "$ 8,4 M". */
export function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) {
    return `$ ${(value / 1_000_000).toLocaleString("es-AR", {
      maximumFractionDigits: 1,
    })} M`
  }
  if (value >= 1_000) {
    return `$ ${(value / 1_000).toLocaleString("es-AR", {
      maximumFractionDigits: 0,
    })} K`
  }
  return formatCurrency(value)
}

export const planLabels: Record<PlanType, string> = {
  pagoUnico: "Pago único",
  dosCuotas: "2 cuotas",
  tresCuotas: "3 cuotas",
}

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const outcomeMeta: Record<
  ConversationOutcome,
  { label: string; tone: "success" | "warning" | "danger" | "info" }
> = {
  preacuerdo: { label: "Pre-acuerdo", tone: "success" },
  sin_respuesta: { label: "Sin respuesta", tone: "warning" },
  fuera_de_politica: { label: "Fuera de política", tone: "danger" },
  en_curso: { label: "En curso", tone: "info" },
}
