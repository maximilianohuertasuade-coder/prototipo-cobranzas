import * as React from "react"

import { buildings as seedBuildings } from "./conversations"
import { defaultGlobalPolicy } from "./policies"
import type {
  AgreementStatus,
  Building,
  BuildingMetrics,
  ChatMessage,
  CollectionPolicy,
  ConfirmedAgreement,
  Conversation,
  ConversationOutcome,
  Owner,
  PlanType,
} from "./types"

// ---------------------------------------------------------------------------
// Store de la aplicación (React Context)
// ---------------------------------------------------------------------------
// Mantiene el edificio seleccionado (o la vista consolidada "Todos"), la
// política global, las políticas por edificio, el registro de acuerdos
// confirmados y las mutaciones de conversaciones.

export const ALL_BUILDINGS = "all"

/** Asesores/operadores que pueden atender y resolver acuerdos. */
export const ADVISORS = [
  "Simón Ottati",
  "Santiago Garbini",
  "Juan Cruz Elliff",
  "Maximiliano Huertas",
] as const

function nowTime() {
  const d = new Date()
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
}

/** Construye un "edificio virtual" que consolida todos los edificios. */
function buildAggregate(buildings: Building[]): Building {
  const sum = (fn: (b: Building) => number) =>
    buildings.reduce((acc, b) => acc + fn(b), 0)

  const units = sum((b) => b.units)
  const recovered = sum((b) => b.metrics.recovered)

  // Mora promedio ponderada por unidades.
  const weightedDelinquency =
    units > 0
      ? buildings.reduce(
          (acc, b) => acc + b.metrics.delinquencyRate * b.units,
          0
        ) / units
      : 0

  // Tendencia de recupero: suma por mes.
  const months = buildings[0]?.metrics.recoveryTrend.map((t) => t.month) ?? []
  const recoveryTrend = months.map((month, i) => ({
    month,
    amount: Number(
      buildings
        .reduce((acc, b) => acc + (b.metrics.recoveryTrend[i]?.amount ?? 0), 0)
        .toFixed(1)
    ),
  }))

  // Acuerdos por plan: suma por tipo.
  const planTypes: PlanType[] = ["pagoUnico", "dosCuotas", "tresCuotas"]
  const agreementPlans = planTypes.map((plan) => ({
    plan,
    count: buildings.reduce(
      (acc, b) =>
        acc + (b.metrics.agreementPlans.find((p) => p.plan === plan)?.count ?? 0),
      0
    ),
  }))

  const metrics: BuildingMetrics = {
    recovered,
    recoveredChange: Number(
      (
        buildings.reduce((acc, b) => acc + b.metrics.recoveredChange, 0) /
        (buildings.length || 1)
      ).toFixed(1)
    ),
    agreementsClosed: sum((b) => b.metrics.agreementsClosed),
    agreementsThisWeek: sum((b) => b.metrics.agreementsThisWeek),
    activeConversations: sum((b) => b.metrics.activeConversations),
    awaitingReply: sum((b) => b.metrics.awaitingReply),
    delinquencyRate: Number(weightedDelinquency.toFixed(1)),
    recoveryTrend,
    agreementPlans,
  }

  // Consolida propietarios y conversaciones (prefijando con el edificio).
  const owners: Owner[] = buildings.flatMap((b) => b.owners)
  const conversations: Conversation[] = buildings.flatMap((b) => b.conversations)

  return {
    id: ALL_BUILDINGS,
    name: "Todos los edificios",
    address: `${buildings.length} edificios · ${units} unidades`,
    units,
    usesGlobalPolicy: true,
    policy: defaultGlobalPolicy,
    metrics,
    owners,
    conversations,
  }
}

type AppStore = {
  buildings: Building[]
  selectedBuildingId: string
  selectedBuilding: Building
  isAllBuildings: boolean
  setSelectedBuildingId: (id: string) => void

  /** Mapa buildingId -> nombre, para la vista consolidada. */
  buildingNameOf: (buildingId: string) => string
  /** Edificio al que pertenece una conversación (por id de conversación). */
  buildingIdOfConversation: (conversationId: string) => string

  confirmedAgreements: ConfirmedAgreement[]

  /** Asesor/operador que está atendiendo (resuelve los acuerdos). */
  currentAdvisor: string
  setCurrentAdvisor: (name: string) => void

  globalPolicy: CollectionPolicy
  setGlobalPolicy: (policy: CollectionPolicy) => void

  effectivePolicy: CollectionPolicy
  setBuildingPolicy: (buildingId: string, policy: CollectionPolicy) => void
  setBuildingUsesGlobal: (buildingId: string, usesGlobal: boolean) => void

  addMessage: (
    buildingId: string,
    conversationId: string,
    message: Pick<ChatMessage, "from" | "text">
  ) => void
  resolveAgreement: (
    buildingId: string,
    conversationId: string,
    status: Exclude<AgreementStatus, "propuesto">,
    options?: { rejectionReason?: string }
  ) => void
  setConversationOutcome: (
    buildingId: string,
    conversationId: string,
    outcome: ConversationOutcome,
    summary?: string
  ) => void
}

const AppStoreContext = React.createContext<AppStore | null>(null)

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [buildings, setBuildings] = React.useState<Building[]>(seedBuildings)
  const [selectedBuildingId, setSelectedBuildingId] =
    React.useState<string>(ALL_BUILDINGS)
  const [globalPolicy, setGlobalPolicy] =
    React.useState<CollectionPolicy>(defaultGlobalPolicy)
  const [confirmedAgreements, setConfirmedAgreements] = React.useState<
    ConfirmedAgreement[]
  >([])
  const [currentAdvisor, setCurrentAdvisor] = React.useState<string>(
    ADVISORS[0]
  )

  const isAllBuildings = selectedBuildingId === ALL_BUILDINGS

  const aggregate = React.useMemo(() => buildAggregate(buildings), [buildings])

  const selectedBuilding = React.useMemo(
    () =>
      isAllBuildings
        ? aggregate
        : (buildings.find((b) => b.id === selectedBuildingId) ?? buildings[0]),
    [isAllBuildings, aggregate, buildings, selectedBuildingId]
  )

  const effectivePolicy = React.useMemo(
    () =>
      selectedBuilding.usesGlobalPolicy ? globalPolicy : selectedBuilding.policy,
    [selectedBuilding, globalPolicy]
  )

  const buildingNameOf = React.useCallback(
    (buildingId: string) =>
      buildings.find((b) => b.id === buildingId)?.name ?? buildingId,
    [buildings]
  )

  const buildingIdOfConversation = React.useCallback(
    (conversationId: string) =>
      buildings.find((b) =>
        b.conversations.some((c) => c.id === conversationId)
      )?.id ?? "",
    [buildings]
  )

  const setBuildingPolicy = React.useCallback(
    (buildingId: string, policy: CollectionPolicy) => {
      setBuildings((current) =>
        current.map((b) =>
          b.id === buildingId ? { ...b, policy, usesGlobalPolicy: false } : b
        )
      )
    },
    []
  )

  const setBuildingUsesGlobal = React.useCallback(
    (buildingId: string, usesGlobal: boolean) => {
      setBuildings((current) =>
        current.map((b) =>
          b.id === buildingId ? { ...b, usesGlobalPolicy: usesGlobal } : b
        )
      )
    },
    []
  )

  const addMessage = React.useCallback(
    (
      buildingId: string,
      conversationId: string,
      message: Pick<ChatMessage, "from" | "text">
    ) => {
      setBuildings((current) =>
        current.map((b) => {
          if (b.id !== buildingId) return b
          return {
            ...b,
            conversations: b.conversations.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    lastActivity: "Ahora",
                    messages: [
                      ...c.messages,
                      {
                        id: `${message.from}-${Date.now()}`,
                        from: message.from,
                        text: message.text,
                        time: nowTime(),
                      },
                    ],
                  }
                : c
            ),
          }
        })
      )
    },
    []
  )

  const resolveAgreement = React.useCallback(
    (
      buildingId: string,
      conversationId: string,
      status: Exclude<AgreementStatus, "propuesto">,
      options?: { rejectionReason?: string }
    ) => {
      const resolvedAt = new Date().toISOString()
      setBuildings((current) =>
        current.map((b) => {
          if (b.id !== buildingId) return b
          return {
            ...b,
            conversations: b.conversations.map((c) => {
              if (c.id !== conversationId || !c.agreement) return c
              const updatedAgreement = {
                ...c.agreement,
                status,
                resolvedAt,
                resolvedBy: currentAdvisor,
                rejectionReason:
                  status === "rechazado" ? options?.rejectionReason : undefined,
              }
              // Registrar en la bitácora de acuerdos confirmados.
              const owner = b.owners.find((o) => o.id === c.ownerId)
              if (owner) {
                setConfirmedAgreements((prev) => [
                  {
                    agreement: updatedAgreement,
                    ownerName: `${owner.firstName} ${owner.lastName}`,
                    ownerPhone: owner.phone,
                    unit: owner.unit,
                    buildingId: b.id,
                    buildingName: b.name,
                  },
                  ...prev.filter((r) => r.agreement.id !== updatedAgreement.id),
                ])
              }
              return {
                ...c,
                outcome:
                  status === "aceptado" ? "preacuerdo" : "fuera_de_politica",
                summary:
                  status === "aceptado"
                    ? "Acuerdo aceptado y registrado."
                    : `Acuerdo rechazado${options?.rejectionReason ? `: ${options.rejectionReason}` : "."}`,
                agreement: updatedAgreement,
              }
            }),
          }
        })
      )
    },
    [currentAdvisor]
  )

  const setConversationOutcome = React.useCallback(
    (
      buildingId: string,
      conversationId: string,
      outcome: ConversationOutcome,
      summary?: string
    ) => {
      setBuildings((current) =>
        current.map((b) => {
          if (b.id !== buildingId) return b
          return {
            ...b,
            conversations: b.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, outcome, summary: summary ?? c.summary }
                : c
            ),
          }
        })
      )
    },
    []
  )

  const value = React.useMemo<AppStore>(
    () => ({
      buildings,
      selectedBuildingId,
      selectedBuilding,
      isAllBuildings,
      setSelectedBuildingId,
      buildingNameOf,
      buildingIdOfConversation,
      confirmedAgreements,
      currentAdvisor,
      setCurrentAdvisor,
      globalPolicy,
      setGlobalPolicy,
      effectivePolicy,
      setBuildingPolicy,
      setBuildingUsesGlobal,
      addMessage,
      resolveAgreement,
      setConversationOutcome,
    }),
    [
      buildings,
      selectedBuildingId,
      selectedBuilding,
      isAllBuildings,
      buildingNameOf,
      buildingIdOfConversation,
      confirmedAgreements,
      currentAdvisor,
      globalPolicy,
      effectivePolicy,
      setBuildingPolicy,
      setBuildingUsesGlobal,
      addMessage,
      resolveAgreement,
      setConversationOutcome,
    ]
  )

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  )
}

export function useAppStore() {
  const ctx = React.useContext(AppStoreContext)
  if (!ctx) {
    throw new Error("useAppStore debe usarse dentro de <AppStoreProvider>")
  }
  return ctx
}
