import { useEffect, useMemo, useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowLeft01Icon,
  BotIcon,
  Call02Icon,
  CheckmarkBadge01Icon,
  FlashIcon,
  InformationCircleIcon,
  SentIcon,
  Search01Icon,
  SparklesIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppShell } from "@/components/app-shell"
import { AgreementCard } from "@/components/agreement-card"
import { LiveAgreements } from "@/components/live-agreements"
import { NegotiationSimulator } from "@/components/negotiation-simulator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/data/store"
import { formatCurrency, outcomeMeta } from "@/data/format"
import { notify } from "@/components/ui/toast"
import { useLivePlayback } from "@/hooks/use-live-playback"
import type { ChatMessage, Conversation, Owner } from "@/data/types"
import { cn } from "@/lib/utils"

type ConvSearch = {
  filter?: "awaiting" | "out_of_policy"
  open?: string
}

type StatusFilter =
  | "todas"
  | "en_curso"
  | "preacuerdo"
  | "sin_respuesta"
  | "fuera_de_politica"

const statusFilterOptions: { key: StatusFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "en_curso", label: "En vivo" },
  { key: "preacuerdo", label: "Pre-acuerdo" },
  { key: "sin_respuesta", label: "Sin respuesta" },
  { key: "fuera_de_politica", label: "Fuera de política" },
]

export const Route = createFileRoute("/conversaciones")({
  validateSearch: (search: Record<string, unknown>): ConvSearch => {
    const out: ConvSearch = {}
    if (search.filter === "awaiting" || search.filter === "out_of_policy") {
      out.filter = search.filter
    }
    if (typeof search.open === "string") out.open = search.open
    return out
  },
  component: ConversationsPage,
  head: () => ({ meta: [{ title: "Conversaciones | pacta.ia" }] }),
})

const toneClasses: Record<string, string> = {
  success:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
}

function initials(owner: Owner) {
  return `${owner.firstName[0] ?? ""}${owner.lastName[0] ?? ""}`.toUpperCase()
}

/** Detecta la frase que dispara la simulación en vivo. */
function isLiveTrigger(text: string) {
  const t = text.trim().toLowerCase()
  return (
    t === "acuerdo en vivo" ||
    t === "acuerdos en vivo" ||
    t.includes("en vivo") ||
    t === "/live"
  )
}

function ConversationsPage() {
  const { filter, open } = Route.useSearch()
  const {
    selectedBuilding,
    isAllBuildings,
    buildingIdOfConversation,
    buildingNameOf,
  } = useAppStore()
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(open ?? null)
  const [liveMode, setLiveMode] = useState(false)
  const [simMode, setSimMode] = useState(false)

  // Filtro por estado. Se inicializa desde la URL (tarjetas del dashboard).
  const initialStatus: StatusFilter =
    filter === "awaiting"
      ? "sin_respuesta"
      : filter === "out_of_policy"
        ? "fuera_de_politica"
        : "todas"
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)

  const ownerById = useMemo(() => {
    const map = new Map<string, Owner>()
    for (const o of selectedBuilding.owners) map.set(o.id, o)
    return map
  }, [selectedBuilding])

  // Conteo por estado para mostrar en cada chip de filtro.
  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      todas: selectedBuilding.conversations.length,
      en_curso: 0,
      preacuerdo: 0,
      sin_respuesta: 0,
      fuera_de_politica: 0,
    }
    for (const c of selectedBuilding.conversations) {
      base[c.outcome as StatusFilter] += 1
    }
    return base
  }, [selectedBuilding])

  const conversations = useMemo(() => {
    const q = query.trim().toLowerCase()
    return selectedBuilding.conversations.filter((c) => {
      if (statusFilter !== "todas" && c.outcome !== statusFilter) return false
      if (!q) return true
      const owner = ownerById.get(c.ownerId)
      if (!owner) return false
      return (
        `${owner.firstName} ${owner.lastName}`.toLowerCase().includes(q) ||
        owner.unit.toLowerCase().includes(q) ||
        owner.phone.includes(q)
      )
    })
  }, [selectedBuilding, query, ownerById, statusFilter])

  // Si viene un `open` por URL y existe, lo respeta; si no, selecciona el primero.
  useEffect(() => {
    const exists = open
      ? selectedBuilding.conversations.some((c) => c.id === open)
      : false
    setSelectedId(
      exists ? open! : (selectedBuilding.conversations[0]?.id ?? null)
    )
  }, [selectedBuilding, open])

  const active =
    conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null
  const activeOwner = active ? ownerById.get(active.ownerId) ?? null : null

  return (
    <AppShell
      title="Conversaciones"
      fullHeight
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant={simMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setSimMode((v) => !v)
              setLiveMode(false)
            }}
          >
            <HugeiconsIcon icon={SparklesIcon} data-icon="inline-start" />
            Simular negociación
          </Button>
          <Button
            variant={liveMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setLiveMode((v) => !v)
              setSimMode(false)
            }}
          >
            <HugeiconsIcon icon={FlashIcon} data-icon="inline-start" />
            Acuerdos en vivo
          </Button>
        </div>
      }
    >
      {simMode ? (
        <NegotiationSimulator onClose={() => setSimMode(false)} />
      ) : liveMode ? (
        <LiveAgreements onClose={() => setLiveMode(false)} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[20rem_1fr]">
          <aside
            className={cn(
              "flex min-h-0 flex-col border-r bg-sidebar/40",
              active && "hidden md:flex"
            )}
          >
            <div className="shrink-0 space-y-2 border-b p-3">
              <div className="relative">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={2}
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, unidad o teléfono"
                  className="h-9 pl-8"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {statusFilterOptions.map((opt) => {
                  const n = counts[opt.key]
                  const activeChip = statusFilter === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setStatusFilter(opt.key)}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium transition-colors",
                        activeChip
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                      <span
                        className={cn(
                          "rounded-full px-1 text-[0.6rem] tabular-nums",
                          activeChip
                            ? "bg-primary/15"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {n}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {conversations.map((c) => {
                const owner = ownerById.get(c.ownerId)
                if (!owner) return null
                const meta = outcomeMeta[c.outcome]
                const last = c.messages[c.messages.length - 1]
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-accent/60",
                      active?.id === c.id && "bg-accent"
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(owner)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {owner.firstName} {owner.lastName}
                        </span>
                        <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                          {c.lastActivity}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {last ? last.text : "Sin mensajes"}
                      </span>
                      <span className="mt-1.5 flex items-center gap-1.5">
                        {c.outcome === "en_curso" ? (
                          <Badge
                            variant="outline"
                            className="border-red-500/30 bg-red-500/10 text-[0.6rem] text-red-600 dark:text-red-400"
                          >
                            <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-current align-middle" />
                            EN VIVO
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn("text-[0.6rem]", toneClasses[meta.tone])}
                          >
                            {meta.label}
                          </Badge>
                        )}
                        {c.agreement?.status === "propuesto" && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/20 bg-amber-500/10 text-[0.6rem] text-amber-600 dark:text-amber-400"
                          >
                            Acuerdo pendiente
                          </Badge>
                        )}
                      </span>
                    </span>
                  </button>
                )
              })}
              {conversations.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay conversaciones que coincidan.
                </p>
              )}
            </div>
          </aside>

          {active && activeOwner ? (
            <ChatWindow
              key={active.id}
              conversation={active}
              owner={activeOwner}
              buildingId={
                isAllBuildings
                  ? buildingIdOfConversation(active.id)
                  : selectedBuilding.id
              }
              buildingName={
                isAllBuildings
                  ? buildingNameOf(buildingIdOfConversation(active.id))
                  : selectedBuilding.name
              }
              onBack={() => setSelectedId(null)}
              onLiveTrigger={() => setLiveMode(true)}
            />
          ) : (
            <div className="hidden items-center justify-center text-sm text-muted-foreground md:flex">
              Seleccioná una conversación para verla.
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAgent = message.from === "agent"
  const isAdmin = message.from === "admin"
  const isSystem = message.from === "system"

  if (isSystem) {
    return (
      <p className="mx-auto w-fit rounded-full bg-background px-3 py-1 text-center text-[0.65rem] text-muted-foreground ring-1 ring-border">
        {message.text}
      </p>
    )
  }

  const alignLeft = isAgent
  return (
    <div className={cn("flex gap-2", alignLeft ? "justify-start" : "justify-end")}>
      {isAgent && (
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
          <HugeiconsIcon icon={BotIcon} className="size-3.5" strokeWidth={2} />
        </div>
      )}
      <div className="max-w-[78%] space-y-1">
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isAgent && "rounded-tl-sm bg-muted text-foreground",
            isAdmin &&
              "rounded-tr-sm border border-primary/30 bg-primary/10 text-foreground",
            !isAgent && !isAdmin && "rounded-tr-sm bg-primary text-primary-foreground"
          )}
        >
          {isAdmin && (
            <span className="mb-0.5 block text-[0.6rem] font-medium text-primary">
              Administración
            </span>
          )}
          {message.text}
        </div>
        <p
          className={cn(
            "px-1 text-[0.65rem] text-muted-foreground",
            alignLeft ? "text-left" : "text-right"
          )}
        >
          {message.time}
        </p>
      </div>
      {isAdmin && (
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <HugeiconsIcon icon={UserIcon} className="size-3.5" strokeWidth={2} />
        </div>
      )}
    </div>
  )
}

function TypingBubble({ from }: { from: ChatMessage["from"] }) {
  const isAgent = from === "agent"
  return (
    <div className={cn("flex gap-2", isAgent ? "justify-start" : "justify-end")}>
      {isAgent && (
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
          <HugeiconsIcon icon={BotIcon} className="size-3.5" strokeWidth={2} />
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl px-3 py-2.5",
          isAgent ? "rounded-tl-sm bg-muted" : "rounded-tr-sm bg-primary/80"
        )}
      >
        <span className="inline-flex gap-1">
          <span
            className={cn(
              "size-1.5 animate-bounce rounded-full [animation-delay:0ms]",
              isAgent ? "bg-muted-foreground/50" : "bg-primary-foreground/70"
            )}
          />
          <span
            className={cn(
              "size-1.5 animate-bounce rounded-full [animation-delay:150ms]",
              isAgent ? "bg-muted-foreground/50" : "bg-primary-foreground/70"
            )}
          />
          <span
            className={cn(
              "size-1.5 animate-bounce rounded-full [animation-delay:300ms]",
              isAgent ? "bg-muted-foreground/50" : "bg-primary-foreground/70"
            )}
          />
        </span>
      </div>
      {!isAgent && (
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <HugeiconsIcon icon={UserIcon} className="size-3.5" strokeWidth={2} />
        </div>
      )}
    </div>
  )
}

function ChatWindow({
  conversation,
  owner,
  buildingId,
  buildingName,
  onBack,
  onLiveTrigger,
}: {
  conversation: Conversation
  owner: Owner
  buildingId: string
  buildingName: string
  onBack: () => void
  onLiveTrigger: () => void
}) {
  const { addMessage, resolveAgreement, setConversationOutcome } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState("")
  const meta = outcomeMeta[conversation.outcome]

  // Reproducción EN VIVO para conversaciones en curso: los mensajes aparecen
  // de a uno con el indicador "escribiendo…", simulando que ocurre ahora.
  const isLive = conversation.outcome === "en_curso"
  const playback = useLivePlayback(
    conversation.messages,
    isLive,
    conversation.id
  )
  const shownMessages = isLive ? playback.visible : conversation.messages

  // Al abrir/cambiar de conversación, saltar al final al instante (sin animar).
  // Se usa un doble rAF para esperar a que el contenido termine de renderizar.
  useEffect(() => {
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [conversation.id])

  // Ante un mensaje nuevo o el indicador "escribiendo", acompañar con scroll suave.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [shownMessages.length, playback.typing])

  function send() {
    const text = draft.trim()
    if (!text) return
    if (isLiveTrigger(text)) {
      setDraft("")
      onLiveTrigger()
      return
    }
    addMessage(buildingId, conversation.id, { from: "admin", text })
    setDraft("")
  }

  function markNoDeal() {
    addMessage(buildingId, conversation.id, {
      from: "system",
      text: "La administración marcó esta conversación como «No trato».",
    })
    setConversationOutcome(
      buildingId,
      conversation.id,
      "fuera_de_politica",
      "Cerrada como «No trato» por la administración."
    )
  }

  function accept() {
    const ref = conversation.agreement?.reference
    resolveAgreement(buildingId, conversation.id, "aceptado")
    addMessage(buildingId, conversation.id, {
      from: "system",
      text: `Acuerdo ${ref} aceptado y registrado.`,
    })
    notify.success(
      `Acuerdo ${ref} confirmado`,
      `${owner.firstName} ${owner.lastName} · ${buildingName}`
    )
  }

  function reject(reason: string) {
    const ref = conversation.agreement?.reference
    resolveAgreement(buildingId, conversation.id, "rechazado", {
      rejectionReason: reason,
    })
    addMessage(buildingId, conversation.id, {
      from: "system",
      text: `Acuerdo ${ref} rechazado. Motivo: ${reason}`,
    })
    notify.error(`Acuerdo ${ref} rechazado`, reason)
  }

  return (
    <div className="flex min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent md:hidden"
          aria-label="Volver a la lista"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </button>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials(owner)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {owner.firstName} {owner.lastName}
          </p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            {isLive && !playback.finished ? (
              <>
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                {playback.typing && playback.typingFrom === "agent"
                  ? "El agente está escribiendo…"
                  : playback.typing
                    ? `${owner.firstName} está escribiendo…`
                    : "en línea · negociando"}
              </>
            ) : (
              <>
                <HugeiconsIcon
                  icon={Call02Icon}
                  className="size-3"
                  strokeWidth={2}
                />
                {owner.phone}
              </>
            )}
          </p>
        </div>
        {isLive && !playback.finished ? (
          <Badge
            variant="outline"
            className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          >
            <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-current align-middle" />
            EN VIVO
          </Badge>
        ) : (
          <Badge variant="outline" className={cn(toneClasses[meta.tone])}>
            {meta.label}
          </Badge>
        )}
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/40 px-4 py-2 text-xs">
        <span className="text-muted-foreground">
          Unidad <span className="font-medium text-foreground">{owner.unit}</span>
        </span>
        <span className="text-muted-foreground">
          Saldo{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatCurrency(owner.debt)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Mora{" "}
          <span className="font-medium text-foreground">
            {owner.overdueMonths} {owner.overdueMonths === 1 ? "mes" : "meses"}
          </span>
        </span>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 px-3 py-4 md:px-6"
      >
        <p className="mx-auto w-fit rounded-full bg-background px-3 py-1 text-[0.65rem] text-muted-foreground ring-1 ring-border">
          {isLive && !playback.finished
            ? "Mostrando en vivo cómo el agente negocia con el propietario"
            : "Conversación gestionada por el agente de IA"}
        </p>

        {shownMessages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {/* Indicador "escribiendo" durante la reproducción en vivo */}
        {isLive && playback.typing && playback.typingFrom && (
          <TypingBubble from={playback.typingFrom} />
        )}

        {/* Al terminar la reproducción en vivo, ofrece volver a verla */}
        {isLive && playback.finished && (
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-background px-3 py-1.5 text-[0.7rem] text-muted-foreground ring-1 ring-border">
            <HugeiconsIcon
              icon={CheckmarkBadge01Icon}
              className="size-3.5 text-emerald-500"
              strokeWidth={2}
            />
            El agente completó la negociación
            <button
              type="button"
              onClick={playback.restart}
              className="ml-1 font-medium text-primary hover:underline"
            >
              Ver de nuevo
            </button>
          </div>
        )}

        {/* Tarjeta de acuerdo (no durante la reproducción en vivo) */}
        {conversation.agreement && (!isLive || playback.finished) && (
          <AgreementCard
            agreement={conversation.agreement}
            owner={owner}
            buildingName={buildingName}
            onAccept={accept}
            onReject={reject}
          />
        )}

        {!conversation.agreement && !isLive && (
          <ClosingNote conversation={conversation} />
        )}
      </div>

      {/* Barra de acciones del administrador */}
      <div className="shrink-0 space-y-2 border-t bg-background p-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={markNoDeal}
            className="rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-[0.7rem] font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            Marcar «No trato»
          </button>
          <button
            type="button"
            onClick={onLiveTrigger}
            className="rounded-full border border-border px-2.5 py-1 text-[0.7rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Acuerdos en vivo
          </button>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribí como administración… (probá «acuerdo en vivo»)"
            className="h-9 min-w-0 flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim()}
            aria-label="Enviar mensaje"
          >
            <HugeiconsIcon icon={SentIcon} strokeWidth={2} />
          </Button>
        </form>
      </div>
    </div>
  )
}

function ClosingNote({ conversation }: { conversation: Conversation }) {
  if (conversation.outcome === "en_curso") {
    return (
      <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1.5 text-xs text-sky-600 dark:text-sky-400">
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
        Negociación en curso
      </div>
    )
  }

  const icon =
    conversation.outcome === "preacuerdo"
      ? CheckmarkBadge01Icon
      : InformationCircleIcon
  const meta = outcomeMeta[conversation.outcome]

  return (
    <div
      className={cn(
        "mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-xl border px-3 py-2 text-xs",
        toneClasses[meta.tone]
      )}
    >
      <HugeiconsIcon icon={icon} className="size-4 shrink-0" strokeWidth={2} />
      <span>
        <span className="font-medium">Conversación finalizada · {meta.label}.</span>{" "}
        {conversation.summary}
      </span>
    </div>
  )
}
