import { useEffect, useRef, useState } from "react"

import type { ChatMessage } from "@/data/types"

type Phase = "idle" | "typing" | "done"

type LivePlayback = {
  /** Mensajes visibles hasta el momento. */
  visible: ChatMessage[]
  /** Si el emisor del próximo mensaje está "escribiendo". */
  typing: boolean
  /** Quién está escribiendo ("agent" | "owner"). */
  typingFrom: ChatMessage["from"] | null
  /** Si terminó de reproducirse toda la conversación. */
  finished: boolean
  /** Reinicia la reproducción desde el principio. */
  restart: () => void
}

/**
 * Reproduce una conversación mensaje por mensaje, simulando que ocurre en vivo:
 * muestra el indicador "escribiendo…" antes de cada mensaje y luego lo revela.
 *
 * @param messages  Guion completo de la conversación.
 * @param enabled   Si debe reproducirse en vivo (false => muestra todo de una).
 */
export function useLivePlayback(
  messages: ChatMessage[],
  enabled: boolean,
  /** Identidad estable (p. ej. id de conversación) para reiniciar solo al cambiar. */
  resetKey?: string
): LivePlayback {
  const [count, setCount] = useState(enabled ? 0 : messages.length)
  const [phase, setPhase] = useState<Phase>(enabled ? "typing" : "done")
  const timers = useRef<number[]>([])
  const total = messages.length

  function clearTimers() {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  function restart() {
    clearTimers()
    setCount(0)
    setPhase("typing")
  }

  useEffect(() => {
    clearTimers()
    if (!enabled) {
      setCount(total)
      setPhase("done")
      return
    }
    setCount(0)
    setPhase("typing")
    // Reinicia solo cuando cambia la conversación (resetKey) o el modo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, enabled])

  useEffect(() => {
    if (!enabled) return
    if (count >= messages.length) {
      setPhase("done")
      return
    }

    const next = messages[count]
    // Duración del "escribiendo": la IA responde casi al instante; el
    // propietario tarda un poco más para que se note que es una persona.
    const isAgent = next.from === "agent"
    const perChar = isAgent ? 6 : 28
    const minMs = isAgent ? 250 : 800
    const maxMs = isAgent ? 700 : 2600
    const typingMs = Math.min(
      maxMs,
      Math.max(minMs, Math.round(next.text.length * perChar))
    )

    setPhase("typing")
    const typingTimer = window.setTimeout(() => {
      // Revela el mensaje.
      setCount((c) => c + 1)
      // Pausa antes del próximo "escribiendo": corta si responde la IA.
      const nextIsAgent = messages[count + 1]?.from === "agent"
      const gapTimer = window.setTimeout(
        () => {
          setPhase("typing")
        },
        nextIsAgent ? 250 : 650
      )
      timers.current.push(gapTimer)
    }, typingMs)

    timers.current.push(typingTimer)
    return () => {
      window.clearTimeout(typingTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, enabled, messages])

  useEffect(() => () => clearTimers(), [])

  const finished = count >= messages.length
  const typing = enabled && phase === "typing" && !finished
  const typingFrom = typing ? (messages[count]?.from ?? null) : null

  return {
    visible: messages.slice(0, count),
    typing,
    typingFrom,
    finished,
    restart,
  }
}
