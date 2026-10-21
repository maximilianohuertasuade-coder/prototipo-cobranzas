import { useEffect, useReducer, useRef } from "react"
import {
  BotIcon,
  CheckmarkBadge01Icon,
  FlashIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/data/store"
import { formatCurrency } from "@/data/format"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Simulación de acuerdos en vivo
// ---------------------------------------------------------------------------
// Muestra, en tiempo real, al agente de IA negociando simultáneamente con
// varios propietarios de todos los edificios. Cada "hilo" avanza por pasos
// (saludo → propuesta → respuesta → cierre) con montos reales de la cartera.

type ThreadStatus = "typing" | "negotiating" | "accepted" | "rejected"

type Thread = {
  key: string
  building: string
  owner: string
  unit: string
  debt: number
  installments: number
  monthly: number
  step: number
  status: ThreadStatus
  line: string
}

type SeedOwner = {
  building: string
  owner: string
  unit: string
  debt: number
  installments: number
  interestWaiver: number
}

function makeScript(t: SeedOwner) {
  const monthly = Math.round((t.debt * (1 - t.interestWaiver / 100)) / t.installments)
  return {
    monthly,
    steps: [
      {
        status: "typing" as ThreadStatus,
        line: `Contactando a ${t.owner}…`,
      },
      {
        status: "negotiating" as ThreadStatus,
        line: `Agente: hay un saldo de ${formatCurrency(t.debt)}. Propongo ${t.installments} cuotas de ${formatCurrency(monthly)}.`,
      },
      {
        status: "negotiating" as ThreadStatus,
        line: `${t.owner}: lo estoy evaluando…`,
      },
    ],
  }
}

type State = { threads: Thread[]; closed: number; running: boolean }
type Action =
  | { type: "tick" }
  | { type: "toggle" }
  | { type: "seed"; seeds: SeedOwner[] }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "toggle":
      return { ...state, running: !state.running }
    case "seed": {
      const threads = action.seeds.slice(0, 5).map((s, i) => {
        const script = makeScript(s)
        return {
          key: `${s.building}-${s.unit}-${i}`,
          building: s.building,
          owner: s.owner,
          unit: s.unit,
          debt: s.debt,
          installments: s.installments,
          monthly: script.monthly,
          step: 0,
          status: "typing" as ThreadStatus,
          line: script.steps[0].line,
        }
      })
      return { threads, closed: 0, running: true }
    }
    case "tick": {
      if (!state.running) return state
      let closed = state.closed
      const threads = state.threads.map((thread) => {
        // Avanza el hilo. Si llegó al final, lo cierra (aceptado/rechazado) y lo reinicia.
        const seed: SeedOwner = {
          building: thread.building,
          owner: thread.owner,
          unit: thread.unit,
          debt: thread.debt,
          installments: thread.installments,
          interestWaiver: 15,
        }
        const script = makeScript(seed)
        const nextStep = thread.step + 1

        if (nextStep < script.steps.length) {
          const s = script.steps[nextStep]
          return { ...thread, step: nextStep, status: s.status, line: s.line }
        }

        // Resolución pseudo-aleatoria pero estable por hilo.
        const accept = (thread.owner.length + thread.unit.length) % 3 !== 0
        if (thread.status !== "accepted" && thread.status !== "rejected") {
          if (accept) closed += 1
          return {
            ...thread,
            status: accept ? "accepted" : "rejected",
            line: accept
              ? `Acuerdo aceptado · ${thread.installments} cuotas de ${formatCurrency(thread.monthly)}`
              : `${thread.owner} pidió condiciones fuera de política · derivado`,
          }
        }

        // Reinicia el hilo tras mostrar el cierre un momento.
        return {
          ...thread,
          step: 0,
          status: "typing",
          line: script.steps[0].line,
        }
      })
      return { ...state, threads, closed }
    }
    default:
      return state
  }
}

const statusMeta: Record<
  ThreadStatus,
  { label: string; tone: string }
> = {
  typing: { label: "Escribiendo", tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  negotiating: {
    label: "Negociando",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  accepted: {
    label: "Aceptado",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  rejected: { label: "Derivado", tone: "bg-destructive/10 text-destructive" },
}

export function LiveAgreements({ onClose }: { onClose?: () => void }) {
  const { buildings } = useAppStore()
  const [state, dispatch] = useReducer(reducer, {
    threads: [],
    closed: 0,
    running: false,
  })
  const intervalRef = useRef<number | null>(null)

  // Siembra los hilos a partir de propietarios reales de distintos edificios.
  useEffect(() => {
    const seeds: SeedOwner[] = []
    for (const b of buildings) {
      const owner = b.owners[0]
      if (!owner) continue
      seeds.push({
        building: b.name,
        owner: `${owner.firstName} ${owner.lastName}`,
        unit: owner.unit,
        debt: owner.debt,
        installments: b.policy.maxInstallments,
        interestWaiver: b.policy.interestWaiver,
      })
    }
    dispatch({ type: "seed", seeds })
  }, [buildings])

  // Loop de simulación.
  useEffect(() => {
    if (!state.running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = window.setInterval(() => dispatch({ type: "tick" }), 1800)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [state.running])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={FlashIcon} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            Acuerdos en vivo
            <span className="flex items-center gap-1 text-xs font-normal text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              en tiempo real
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            El agente negocia con {state.threads.length} propietarios · {state.closed}{" "}
            acuerdos cerrados en esta sesión
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: "toggle" })}
        >
          {state.running ? "Pausar" : "Reanudar"}
        </Button>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {state.threads.map((thread) => {
          const meta = statusMeta[thread.status]
          const isAgentLine = thread.line.startsWith("Agente")
          return (
            <div
              key={thread.key}
              className="rounded-xl border bg-card p-3 shadow-sm ring-1 ring-foreground/5"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {thread.owner}{" "}
                  <span className="font-normal text-muted-foreground">
                    · Unidad {thread.unit} · {thread.building}
                  </span>
                </span>
                <Badge variant="outline" className={cn("text-[0.65rem]", meta.tone)}>
                  {meta.label}
                </Badge>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    thread.status === "accepted"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  <HugeiconsIcon
                    icon={
                      thread.status === "accepted"
                        ? CheckmarkBadge01Icon
                        : isAgentLine
                          ? BotIcon
                          : UserIcon
                    }
                    className="size-3.5"
                    strokeWidth={2}
                  />
                </span>
                <p
                  className={cn(
                    "text-xs leading-relaxed",
                    thread.status === "accepted"
                      ? "font-medium text-emerald-600 dark:text-emerald-400"
                      : thread.status === "rejected"
                        ? "text-destructive"
                        : "text-foreground"
                  )}
                >
                  {thread.line}
                  {thread.status === "typing" && (
                    <span className="ml-1 inline-flex gap-0.5 align-middle">
                      <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                      <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                      <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                    </span>
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
