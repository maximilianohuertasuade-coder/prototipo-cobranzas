import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft01Icon,
  BotIcon,
  RefreshIcon,
  SentIcon,
  SparklesIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/data/store"
import { formatCurrency } from "@/data/format"
import { negotiate } from "@/server/negotiate"
import { notify } from "@/components/ui/toast"
import type { Owner } from "@/data/types"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Simulador de negociación con IA
// ---------------------------------------------------------------------------
// Vista de DEMOSTRACIÓN, separada del panel operativo. Permite tomar el rol de
// un propietario y conversar en vivo con el agente de IA (Google Gemini), que
// negocia respetando la política de cobranza del edificio. Deja claro, con
// cartelería, que es una simulación para mostrar cómo trabaja el agente.

type SimMessage = {
  id: string
  from: "agent" | "owner"
  text: string
}

type SimOwner = Owner & { buildingName: string; buildingId: string }

const quickReplies = [
  "Hola, no puedo pagar todo junto este mes.",
  "¿En cuántas cuotas puedo pagarlo?",
  "Necesito pagarlo en 12 cuotas.",
  "Dale, me sirve ese plan. Avancemos.",
]

export function NegotiationSimulator({ onClose }: { onClose?: () => void }) {
  const { buildings, effectivePolicy } = useAppStore()

  // Lista de propietarios disponibles para simular (de todos los edificios).
  const owners = useMemo<SimOwner[]>(() => {
    const list: SimOwner[] = []
    for (const b of buildings) {
      for (const o of b.owners) {
        list.push({ ...o, buildingName: b.name, buildingId: b.id })
      }
    }
    return list
  }, [buildings])

  const [selectedId, setSelectedId] = useState<string>(owners[0]?.id ?? "")
  const selected = owners.find((o) => o.id === selectedId) ?? owners[0]

  const [messages, setMessages] = useState<SimMessage[]>([])
  const [draft, setDraft] = useState("")
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Política vigente del edificio del propietario seleccionado.
  const policy = useMemo(() => {
    const b = buildings.find((x) => x.id === selected?.buildingId)
    if (!b) return effectivePolicy
    return b.usesGlobalPolicy ? effectivePolicy : b.policy
  }, [buildings, selected, effectivePolicy])

  // Al cambiar de propietario, reinicia la conversación.
  useEffect(() => {
    setMessages([])
    setDraft("")
    setThinking(false)
  }, [selectedId])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages.length, thinking])

  async function sendAsOwner(text: string) {
    const trimmed = text.trim()
    if (!trimmed || thinking || !selected) return

    const history = [
      ...messages.map((m) => ({ from: m.from, text: m.text })),
      { from: "owner" as const, text: trimmed },
    ]

    setMessages((prev) => [
      ...prev,
      { id: `owner-${Date.now()}`, from: "owner", text: trimmed },
    ])
    setDraft("")
    setThinking(true)

    try {
      const result = await negotiate({
        data: {
          context: {
            ownerFirstName: selected.firstName,
            ownerLastName: selected.lastName,
            unit: selected.unit,
            buildingName: selected.buildingName,
            debt: selected.debt,
            overdueMonths: selected.overdueMonths,
            maxInstallments: policy.maxInstallments,
            interestWaiver: policy.interestWaiver,
            minInstallmentAmount: policy.minInstallmentAmount,
            dueDay: policy.dueDay,
          },
          messages: history,
        },
      })

      if (!result.ok) {
        notify.error("Agente de IA no disponible", result.error ?? "")
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            from: "agent",
            text: "Disculpá, no pude responder en este momento. Probá de nuevo en unos segundos.",
          },
        ])
        return
      }

      setMessages((prev) => [
        ...prev,
        { id: `agent-${Date.now()}`, from: "agent", text: result.reply },
      ])
    } catch (err) {
      notify.error(
        "Error de conexión",
        err instanceof Error ? err.message : "Intentá de nuevo."
      )
    } finally {
      setThinking(false)
    }
  }

  function reset() {
    setMessages([])
    setDraft("")
    setThinking(false)
  }

  if (!selected) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        No hay propietarios para simular.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Encabezado con cartel de simulación */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
            aria-label="Volver"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </button>
        )}
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            Simulación de negociación
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-[0.6rem] text-amber-600 dark:text-amber-400"
            >
              Demostración · IA en vivo
            </Badge>
          </p>
          <p className="text-xs text-muted-foreground">
            Tomá el rol del propietario y conversá con el agente. Negocia dentro
            de la política del edificio.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" />
          Reiniciar
        </Button>
      </div>

      {/* Selector de propietario + datos del caso */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background px-4 py-2.5">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Propietario
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground"
          >
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.firstName} {o.lastName} · {o.unit} · {o.buildingName}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-muted-foreground">
          Deuda{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatCurrency(selected.debt)}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          Política:{" "}
          <span className="font-medium text-foreground">
            hasta {policy.maxInstallments} cuotas · {policy.interestWaiver}% quita
          </span>
        </span>
      </div>

      {/* Hilo de la conversación */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 px-3 py-4 md:px-6"
      >
        <p className="mx-auto w-fit rounded-full bg-background px-3 py-1 text-center text-[0.65rem] text-muted-foreground ring-1 ring-border">
          Simulación: vos escribís como {selected.firstName}; el agente de IA
          responde en tiempo real.
        </p>

        {messages.length === 0 && !thinking && (
          <div className="mx-auto mt-6 max-w-sm text-center text-sm text-muted-foreground">
            Escribí un mensaje como si fueras el propietario para que el agente
            empiece a negociar. Podés usar las sugerencias de abajo.
          </div>
        )}

        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}

        {thinking && <TypingBubble />}
      </div>

      {/* Composición: siempre como propietario */}
      <div className="shrink-0 space-y-2 border-t bg-background p-3">
        <div className="flex flex-wrap gap-1.5">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => sendAsOwner(reply)}
              disabled={thinking}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-[0.7rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {reply}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            sendAsOwner(draft)
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              thinking
                ? "El agente está respondiendo…"
                : `Escribí como ${selected.firstName} (el propietario)…`
            }
            disabled={thinking}
            className="h-9 min-w-0 flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || thinking}
            aria-label="Enviar mensaje"
          >
            <HugeiconsIcon icon={SentIcon} strokeWidth={2} />
          </Button>
        </form>
      </div>
    </div>
  )
}

function Bubble({ message }: { message: SimMessage }) {
  const isAgent = message.from === "agent"
  return (
    <div className={cn("flex gap-2", isAgent ? "justify-start" : "justify-end")}>
      {isAgent && (
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
          <HugeiconsIcon icon={BotIcon} className="size-3.5" strokeWidth={2} />
        </div>
      )}
      <div className="max-w-[78%] space-y-1">
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isAgent
              ? "rounded-tl-sm bg-muted text-foreground"
              : "rounded-tr-sm bg-primary text-primary-foreground"
          )}
        >
          {message.text}
        </div>
      </div>
      {!isAgent && (
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <HugeiconsIcon icon={UserIcon} className="size-3.5" strokeWidth={2} />
        </div>
      )}
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex justify-start gap-2">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
        <HugeiconsIcon icon={BotIcon} className="size-3.5" strokeWidth={2} />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2.5">
        <span className="inline-flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  )
}
