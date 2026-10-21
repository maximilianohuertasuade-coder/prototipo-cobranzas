// Tipos de dominio para pacta.ia
// Modelo de datos del prototipo: una administradora gestiona varios edificios (consorcios),
// cada uno con sus propietarios, deudas, conversaciones del agente de IA y políticas de cobranza.

export type PlanType = "pagoUnico" | "dosCuotas" | "tresCuotas"

/** Motivo por el cual una conversación del agente finalizó. */
export type ConversationOutcome =
  | "preacuerdo" // Se cerró un pre-acuerdo dentro de la política
  | "sin_respuesta" // El propietario dejó de contestar
  | "fuera_de_politica" // El propietario pide condiciones fuera de la política
  | "en_curso" // Todavía activa

export type MessageSender = "agent" | "owner" | "admin" | "system"

export type ChatMessage = {
  id: string
  from: MessageSender
  text: string
  /** Hora en formato HH:MM (24h) tal como se muestra en el chat. */
  time: string
}

/** Estado de aprobación de un acuerdo propuesto por el agente. */
export type AgreementStatus = "propuesto" | "aceptado" | "rechazado"

/** Detalle del acuerdo negociado por el agente, con datos para trazabilidad. */
export type Agreement = {
  id: string
  status: AgreementStatus
  /** Saldo original de la deuda. */
  originalDebt: number
  /** Quita de intereses aplicada (%). */
  interestWaiver: number
  /** Cantidad de cuotas. */
  installments: number
  /** Monto por cuota. */
  installmentAmount: number
  /** Total a pagar tras la quita. */
  totalToPay: number
  /** Día de vencimiento de cada cuota. */
  dueDay: number
  /** Fecha/hora en que el agente propuso el acuerdo. */
  proposedAt: string
  /** Fecha/hora de la resolución (aceptado/rechazado). */
  resolvedAt?: string
  /** Quién resolvió (nombre del asesor/operador que atendió). */
  resolvedBy?: string
  /** Motivo del rechazo (si fue rechazado). */
  rejectionReason?: string
  /** Código de referencia para trazabilidad. */
  reference: string
}

/** Motivos de rechazo preestablecidos. */
export const REJECTION_REASONS = [
  "El plan excede la política del consorcio",
  "El propietario no acreditó identidad",
  "Deuda en instancia judicial",
  "Supera el máximo de cuotas permitido",
  "Monto de cuota por debajo del mínimo",
  "A pedido de la administración",
] as const

/** Propietario de una unidad funcional dentro de un edificio. */
export type Owner = {
  id: string
  firstName: string
  lastName: string
  /** Celular en formato argentino, p. ej. +54 9 11 5555-1234 */
  phone: string
  /** Unidad funcional, p. ej. "4B". */
  unit: string
  /** Saldo adeudado en pesos. */
  debt: number
  /** Antigüedad de la mora en meses. */
  overdueMonths: number
}

/** Una conversación completa entre el agente de IA y un propietario. */
export type Conversation = {
  id: string
  ownerId: string
  outcome: ConversationOutcome
  /** Fecha legible de la última actividad, p. ej. "Hoy", "Ayer", "12 sep". */
  lastActivity: string
  messages: ChatMessage[]
  /** Nota breve del resultado para mostrar en la lista/resumen. */
  summary: string
  /** Acuerdo propuesto por el agente (si lo hubo). */
  agreement?: Agreement
}

/** Políticas de cobranza que guían al agente. */
export type CollectionPolicy = {
  /** Máximo de cuotas que el agente puede ofrecer. */
  maxInstallments: number
  /** Quita de intereses máxima (%). */
  interestWaiver: number
  /** Monto mínimo por cuota en pesos. */
  minInstallmentAmount: number
  /** Día de vencimiento sugerido para cada cuota. */
  dueDay: number
  /** Si el agente puede cerrar pre-acuerdos sin aprobación humana. */
  autoCloseAgreements: boolean
  /** Horario permitido para contactar (24h). */
  contactHourStart: number
  contactHourEnd: number
}

/** Métricas del dashboard calculadas/simuladas por edificio. */
export type BuildingMetrics = {
  /** Monto recuperado en el mes (pesos). */
  recovered: number
  /** Variación vs. mes anterior (%). */
  recoveredChange: number
  /** Acuerdos cerrados en el mes. */
  agreementsClosed: number
  /** Acuerdos cerrados en la última semana. */
  agreementsThisWeek: number
  /** Conversaciones activas. */
  activeConversations: number
  /** Conversaciones esperando respuesta. */
  awaitingReply: number
  /** Mora de la cartera del edificio (%). */
  delinquencyRate: number
  /** Evolución del recupero por mes (en millones de pesos). */
  recoveryTrend: { month: string; amount: number }[]
  /** Distribución de acuerdos por plan. */
  agreementPlans: { plan: PlanType; count: number }[]
}

/** Registro de un acuerdo confirmado (aceptado o rechazado) para trazabilidad. */
export type ConfirmedAgreement = {
  agreement: Agreement
  ownerName: string
  ownerPhone: string
  unit: string
  buildingId: string
  buildingName: string
}

/** Un edificio administrado por el consorcio. */
export type Building = {
  id: string
  /** Nombre corto, p. ej. "Rivadavia 2840". */
  name: string
  /** Dirección completa. */
  address: string
  /** Cantidad de unidades funcionales. */
  units: number
  metrics: BuildingMetrics
  owners: Owner[]
  conversations: Conversation[]
  /** Política particular del edificio (sobrescribe la global cuando `usesGlobalPolicy` es false). */
  policy: CollectionPolicy
  /** Si usa la política global de la administración o una propia. */
  usesGlobalPolicy: boolean
}
