import { createServerFn } from "@tanstack/react-start"
import { GoogleGenAI } from "@google/genai"

// ---------------------------------------------------------------------------
// Agente negociador con IA (Google Gemini)
// ---------------------------------------------------------------------------
// Esta es una "server function" de TanStack Start: corre SOLO en el servidor,
// por lo que la API key nunca llega al navegador. Recibe el estado de la
// conversación y los datos del deudor + la política del edificio, y devuelve
// la próxima respuesta del agente respetando esas reglas.

/** Mensaje tal como lo maneja el chat del cliente. */
export type NegotiationMessage = {
  from: "agent" | "owner" | "admin" | "system"
  text: string
}

/** Contexto del caso que se le pasa al modelo. */
export type NegotiationContext = {
  ownerFirstName: string
  ownerLastName: string
  unit: string
  buildingName: string
  debt: number
  overdueMonths: number
  maxInstallments: number
  interestWaiver: number
  minInstallmentAmount: number
  dueDay: number
}

export type NegotiateInput = {
  context: NegotiationContext
  messages: NegotiationMessage[]
}

export type NegotiateResult = {
  ok: boolean
  reply: string
  /** true si el agente considera que el pedido quedó fuera de política. */
  outOfPolicy: boolean
  /** true si el agente cerró un pre-acuerdo dentro de la política. */
  agreementReached: boolean
  error?: string
}

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n)
}

/** Construye el system prompt con la personalidad y las reglas del agente. */
function buildSystemPrompt(ctx: NegotiationContext) {
  const totalWithWaiver = Math.round(ctx.debt * (1 - ctx.interestWaiver / 100))
  const monthly = Math.round(totalWithWaiver / ctx.maxInstallments)

  return `Sos el agente de cobranzas de "pacta.ia", trabajando para la administración del consorcio "${ctx.buildingName}".
Tu tarea es negociar por chat, en español rioplatense (voseo, tono argentino), el pago de expensas vencidas con un propietario moroso.

DATOS DEL CASO:
- Propietario: ${ctx.ownerFirstName} ${ctx.ownerLastName}, unidad ${ctx.unit}.
- Deuda vencida: ${money(ctx.debt)}.
- Antigüedad de la mora: ${ctx.overdueMonths} meses.

POLÍTICA DE COBRANZA (son límites DUROS, no los podés superar bajo ningún concepto):
- Máximo de cuotas que podés ofrecer: ${ctx.maxInstallments}.
- Quita de intereses máxima que podés aplicar: ${ctx.interestWaiver}%.
- Monto mínimo por cuota: ${money(ctx.minInstallmentAmount)}.
- Día de vencimiento de cada cuota: el ${ctx.dueDay} de cada mes.
- Con la quita máxima, el total a pagar sería ${money(totalWithWaiver)}, y en ${ctx.maxInstallments} cuotas quedarían aprox. ${money(monthly)} por mes.

REGLAS DE COMPORTAMIENTO:
1. Sé amable, empático y profesional, pero firme con la política. Nunca presiones ni amenaces.
2. Nunca ofrezcas más cuotas que ${ctx.maxInstallments} ni más quita que ${ctx.interestWaiver}%. Nunca aceptes cuotas por debajo de ${money(ctx.minInstallmentAmount)}.
3. Si el propietario pide algo que excede la política (ej. más cuotas, quita mayor, condonar todo), explicá con amabilidad que eso excede lo que podés autorizar y que vas a DERIVAR el caso a la administración para que lo evalúen. En ese caso NO cierres acuerdo.
4. Si el propietario acepta un plan DENTRO de la política, confirmá el pre-acuerdo con el detalle (cuotas, monto por cuota, día de vencimiento) y aclarale que queda pendiente de confirmación por la administración.
5. Mantené las respuestas BREVES y naturales, como un chat real (2 a 4 oraciones máximo). No uses listas ni markdown.
6. Respondé SIEMPRE como el agente. No inventes mensajes del propietario.

FORMATO DE RESPUESTA:
Respondé con un objeto JSON válido (sin texto adicional, sin markdown) con esta forma exacta:
{"reply": "<tu mensaje para el propietario>", "outOfPolicy": <true|false>, "agreementReached": <true|false>}
- "outOfPolicy": true solo si derivás el caso a la administración por un pedido fuera de política.
- "agreementReached": true solo si en este mensaje confirmás un pre-acuerdo dentro de la política.`
}

/** Mapea el rol de cada mensaje al formato de Gemini. */
function roleFor(from: NegotiationMessage["from"]): "user" | "model" {
  // El agente es "model"; el propietario, la administración y el sistema son "user".
  return from === "agent" ? "model" : "user"
}

export const negotiate = createServerFn({ method: "POST" })
  .validator((input: NegotiateInput) => input)
  .handler(async ({ data }): Promise<NegotiateResult> => {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return {
        ok: false,
        reply: "",
        outOfPolicy: false,
        agreementReached: false,
        error: "Falta configurar GEMINI_API_KEY en el archivo .env",
      }
    }

    try {
      const ai = new GoogleGenAI({ apiKey })

      const contents = data.messages
        // El "system" interno no se manda como turno de diálogo.
        .filter((m) => m.from !== "system")
        .map((m) => ({
          role: roleFor(m.from),
          parts: [{ text: m.text }],
        }))

      const config = {
        systemInstruction: buildSystemPrompt(data.context),
        responseMimeType: "application/json",
        temperature: 0.7,
      }

      // Lista de modelos a intentar en orden. Si uno está saturado (503) o
      // no disponible, se prueba el siguiente. Así la demo es más robusta.
      const models = [
        "gemini-3.8-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
      ]

      let lastError = "No se pudo obtener respuesta de ningún modelo."

      for (const model of models) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config,
          })
          const parsed = safeParse(response.text ?? "")
          return {
            ok: true,
            reply: parsed.reply,
            outOfPolicy: parsed.outOfPolicy,
            agreementReached: parsed.agreementReached,
          }
        } catch (err) {
          lastError =
            err instanceof Error ? err.message : "Error al contactar a la IA"
          // Reintenta con el próximo modelo ante saturación/indisponibilidad.
          continue
        }
      }

      return {
        ok: false,
        reply: "",
        outOfPolicy: false,
        agreementReached: false,
        error: lastError,
      }
    } catch (err) {
      return {
        ok: false,
        reply: "",
        outOfPolicy: false,
        agreementReached: false,
        error: err instanceof Error ? err.message : "Error desconocido al contactar a la IA",
      }
    }
  })

/** Parsea la respuesta del modelo con tolerancia a formato imperfecto. */
function safeParse(raw: string): {
  reply: string
  outOfPolicy: boolean
  agreementReached: boolean
} {
  const fallback = {
    reply: raw.trim() || "Disculpá, no pude procesar la respuesta. ¿Podés repetirlo?",
    outOfPolicy: false,
    agreementReached: false,
  }

  try {
    // Quita posibles fences ```json ... ```
    const cleaned = raw
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim()
    const obj = JSON.parse(cleaned) as Record<string, unknown>
    return {
      reply: typeof obj.reply === "string" ? obj.reply : fallback.reply,
      outOfPolicy: obj.outOfPolicy === true,
      agreementReached: obj.agreementReached === true,
    }
  } catch {
    return fallback
  }
}
