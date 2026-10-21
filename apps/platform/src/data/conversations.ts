import { buildings } from "./buildings"
import type {
  Agreement,
  ChatMessage,
  Conversation,
  ConversationOutcome,
} from "./types"

// ---------------------------------------------------------------------------
// Generación de conversaciones simuladas estilo WhatsApp
// ---------------------------------------------------------------------------
// Cada conversación representa un intercambio real entre el agente de IA y un
// propietario. Terminan por uno de tres motivos:
//  - "preacuerdo": se cerró un pre-acuerdo dentro de la política.
//  - "sin_respuesta": el propietario dejó de contestar.
//  - "fuera_de_politica": pidió condiciones fuera de la política.
// Además se mantiene "en_curso" para conversaciones activas.

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n)
}

type Guion = {
  outcome: ConversationOutcome
  lastActivity: string
  summary: string
  /** Si el guion deja un acuerdo propuesto pendiente de aprobación. */
  withAgreement?: boolean
  build: (ctx: {
    firstName: string
    debt: number
    maxInstallments: number
    interestWaiver: number
    buildingName: string
  }) => ChatMessage[]
}

let agreementSeq = 1000

/** Construye un acuerdo propuesto con todos los datos para trazabilidad. */
export function buildAgreement(ctx: {
  debt: number
  maxInstallments: number
  interestWaiver: number
  dueDay: number
}): Agreement {
  const totalToPay = Math.round(ctx.debt * (1 - ctx.interestWaiver / 100))
  const installmentAmount = Math.round(totalToPay / ctx.maxInstallments)
  agreementSeq += 1
  return {
    id: `agr-${agreementSeq}`,
    status: "propuesto",
    originalDebt: ctx.debt,
    interestWaiver: ctx.interestWaiver,
    installments: ctx.maxInstallments,
    installmentAmount,
    totalToPay,
    dueDay: ctx.dueDay,
    proposedAt: new Date().toISOString(),
    reference: `PAC-${agreementSeq}`,
  }
}

/** Catálogo de guiones. Se asigna uno por propietario de forma rotativa. */
const guiones: Guion[] = [
  // 0 · Pre-acuerdo cerrado
  {
    outcome: "preacuerdo",
    lastActivity: "Hoy",
    summary: "Pre-acuerdo en cuotas, pendiente de aprobación.",
    withAgreement: true,
    build: ({ firstName, debt, maxInstallments, interestWaiver, buildingName }) => {
      const monthly = Math.round((debt * (1 - interestWaiver / 100)) / maxInstallments)
      return [
        {
          id: "m1",
          from: "agent",
          text: `Hola ${firstName}, soy el asistente de Pacta para ${buildingName}. Figura un saldo de ${money(debt)} en expensas vencidas. ¿Querés que veamos una forma de regularizarlo?`,
          time: "10:02",
        },
        { id: "m2", from: "owner", text: "Hola, sí. La verdad se me complicó este mes.", time: "10:09" },
        {
          id: "m3",
          from: "agent",
          text: `Lo entiendo. Puedo ofrecerte hasta ${maxInstallments} cuotas con una quita del ${interestWaiver}% en intereses. Quedarían ${money(monthly)} por mes.`,
          time: "10:10",
        },
        { id: "m4", from: "owner", text: "¿Y la primera cuota cuándo vencería?", time: "10:14" },
        {
          id: "m5",
          from: "agent",
          text: "La primera vence el 10 del próximo mes, y las siguientes el mismo día de cada mes. ¿Te sirve así?",
          time: "10:15",
        },
        { id: "m6", from: "owner", text: "Dale, me sirve. Avanzamos con eso.", time: "10:21" },
        {
          id: "m7",
          from: "agent",
          text: `Perfecto, ${firstName}. Dejo registrado el pre-acuerdo en ${maxInstallments} cuotas de ${money(monthly)}. Te llega el detalle para firmar por este mismo medio. ¡Gracias!`,
          time: "10:22",
        },
      ]
    },
  },
  // 1 · Dejó de contestar
  {
    outcome: "sin_respuesta",
    lastActivity: "Hace 2 días",
    summary: "Sin respuesta tras el segundo contacto.",
    build: ({ firstName, debt, buildingName }) => [
      {
        id: "m1",
        from: "agent",
        text: `Hola ${firstName}, te escribo de Pacta por ${buildingName}. Tenés ${money(debt)} pendientes de expensas. ¿Podemos coordinar una forma de pago?`,
        time: "09:31",
      },
      { id: "m2", from: "owner", text: "Hola, dejame ver y te confirmo.", time: "11:48" },
      {
        id: "m3",
        from: "agent",
        text: "Perfecto, quedo atento. Puedo armarte un plan en cuotas si lo necesitás.",
        time: "11:49",
      },
      {
        id: "m4",
        from: "agent",
        text: `${firstName}, ¿pudiste verlo? Sigo con la posibilidad de dividirlo en cuotas sin intereses adicionales.`,
        time: "Ayer · 10:03",
      },
      {
        id: "m5",
        from: "agent",
        text: "Te dejo el canal abierto por si querés retomar cuando puedas.",
        time: "Ayer · 18:20",
      },
    ],
  },
  // 2 · Fuera de política
  {
    outcome: "fuera_de_politica",
    lastActivity: "Ayer",
    summary: "Pidió más cuotas de las permitidas. Derivado a la administración.",
    build: ({ firstName, debt, maxInstallments, buildingName }) => [
      {
        id: "m1",
        from: "agent",
        text: `Hola ${firstName}, soy el asistente de Pacta para ${buildingName}. Registramos ${money(debt)} en expensas atrasadas. ¿Vemos cómo regularizarlo?`,
        time: "15:05",
      },
      { id: "m2", from: "owner", text: "Hola. Puedo pagar, pero necesito en 12 cuotas.", time: "15:19" },
      {
        id: "m3",
        from: "agent",
        text: `Puedo ofrecerte hasta ${maxInstallments} cuotas según la política del consorcio. ¿Querés que lo veamos dentro de ese límite?`,
        time: "15:20",
      },
      { id: "m4", from: "owner", text: "No, menos de 12 no me sirve.", time: "15:33" },
      {
        id: "m5",
        from: "agent",
        text: "Entiendo. Un plan de 12 cuotas excede lo que puedo autorizar automáticamente. Voy a derivar tu caso a la administración para que lo evalúen y te contacten.",
        time: "15:34",
      },
      { id: "m6", from: "owner", text: "Ok, espero que me llamen.", time: "15:40" },
    ],
  },
  // 3 · En curso (se reproduce EN VIVO en el chat)
  {
    outcome: "en_curso",
    lastActivity: "En vivo",
    summary: "Negociación en curso, el agente está conversando ahora.",
    build: ({ firstName, debt, maxInstallments, interestWaiver, buildingName }) => {
      const monthly = Math.round((debt * (1 - interestWaiver / 100)) / maxInstallments)
      return [
        {
          id: "m1",
          from: "agent",
          text: `Hola ${firstName}, soy el asistente de Pacta para ${buildingName}. Tenés ${money(debt)} de expensas vencidas. ¿Querés que te arme un plan de pago?`,
          time: "12:40",
        },
        { id: "m2", from: "owner", text: "Hola, sí. La verdad venía demorado.", time: "12:52" },
        {
          id: "m3",
          from: "agent",
          text: "No hay problema, para eso estoy. ¿Preferís abonarlo en un pago o en cuotas?",
          time: "12:52",
        },
        { id: "m4", from: "owner", text: "En cuotas, en un pago no me da.", time: "12:53" },
        {
          id: "m5",
          from: "agent",
          text: `Perfecto. Puedo ofrecerte hasta ${maxInstallments} cuotas con una quita del ${interestWaiver}% en intereses. Quedarían ${money(monthly)} por mes.`,
          time: "12:54",
        },
        { id: "m6", from: "owner", text: "¿Y la primera cuándo la pagaría?", time: "12:55" },
        {
          id: "m7",
          from: "agent",
          text: "La primera vence el 10 del próximo mes y las siguientes el mismo día de cada mes. ¿Te queda cómodo?",
          time: "12:55",
        },
        { id: "m8", from: "owner", text: "Sí, así me sirve.", time: "12:56" },
        {
          id: "m9",
          from: "agent",
          text: `Genial, ${firstName}. Preparo el pre-acuerdo en ${maxInstallments} cuotas de ${money(monthly)} y lo dejo para que la administración lo confirme. ¡Gracias por la buena predisposición!`,
          time: "12:56",
        },
      ]
    },
  },
]

/** Construye todas las conversaciones de cada edificio a partir de sus propietarios. */
function buildConversations() {
  for (const building of buildings) {
    const convs: Conversation[] = building.owners.map((owner, index) => {
      const guion = guiones[index % guiones.length]
      return {
        id: `${building.id}-conv-${owner.id}`,
        ownerId: owner.id,
        outcome: guion.outcome,
        lastActivity: guion.lastActivity,
        summary: guion.summary,
        messages: guion.build({
          firstName: owner.firstName,
          debt: owner.debt,
          maxInstallments: building.policy.maxInstallments,
          interestWaiver: building.policy.interestWaiver,
          buildingName: building.name,
        }),
        agreement: guion.withAgreement
          ? buildAgreement({
              debt: owner.debt,
              maxInstallments: building.policy.maxInstallments,
              interestWaiver: building.policy.interestWaiver,
              dueDay: building.policy.dueDay,
            })
          : undefined,
      }
    })
    building.conversations = convs
  }
}

buildConversations()

export { buildings }
