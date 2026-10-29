import { buildAgreement } from "./conversations"
import { defaultSchoolPolicy } from "./policies"
import type {
  Building,
  ChatMessage,
  CollectionPolicy,
  Conversation,
  ConversationOutcome,
} from "./types"

// ---------------------------------------------------------------------------
// Instituciones educativas (rubro "educativo")
// ---------------------------------------------------------------------------
// Misma estructura que `buildings.ts`, pero el dominio es educativo:
//  - Building  -> institución educativa (colegio)
//  - Owner     -> familia responsable de pago (padre/madre/tutor)
//  - unit      -> alumno (grado/curso)
//  - debt      -> cuotas escolares adeudadas
//  - expensas  -> cuotas
//
// Se reutiliza el tipo `Building` para que todo el dashboard, conversaciones,
// acuerdos y políticas funcionen sin cambios.

const MONTHS = ["Abr", "May", "Jun", "Jul", "Ago", "Sep"] as const

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatPhone(area: string, n: number) {
  const base = String(n).padStart(8, "0")
  return `+54 9 ${area} ${base.slice(0, 4)}-${base.slice(4)}`
}

function buildPolicy(overrides: Partial<CollectionPolicy>): CollectionPolicy {
  return { ...defaultSchoolPolicy, ...overrides }
}

// ---------------------------------------------------------------------------
// Guiones de conversación (versión educativa: hablan de cuotas y familias)
// ---------------------------------------------------------------------------

type GuionCtx = {
  firstName: string
  debt: number
  maxInstallments: number
  interestWaiver: number
  schoolName: string
}

type Guion = {
  outcome: ConversationOutcome
  lastActivity: string
  summary: string
  withAgreement?: boolean
  build: (ctx: GuionCtx) => ChatMessage[]
}

const guiones: Guion[] = [
  // 0 · Pre-acuerdo cerrado
  {
    outcome: "preacuerdo",
    lastActivity: "Hoy",
    summary: "Pre-acuerdo en cuotas, pendiente de aprobación.",
    withAgreement: true,
    build: ({ firstName, debt, maxInstallments, interestWaiver, schoolName }) => {
      const monthly = Math.round((debt * (1 - interestWaiver / 100)) / maxInstallments)
      return [
        {
          id: "m1",
          from: "agent",
          text: `Hola ${firstName}, soy el asistente de Pacta en representación de ${schoolName}. Figura un saldo de ${money(debt)} en cuotas vencidas. ¿Querés que veamos una forma de regularizarlo?`,
          time: "10:02",
        },
        { id: "m2", from: "owner", text: "Hola, sí. La verdad se nos complicó este mes.", time: "10:09" },
        {
          id: "m3",
          from: "agent",
          text: `Lo entiendo, no hay problema. Puedo ofrecerte hasta ${maxInstallments} cuotas con una quita del ${interestWaiver}% en recargos. Quedarían ${money(monthly)} por mes.`,
          time: "10:10",
        },
        { id: "m4", from: "owner", text: "¿Y la primera cuota cuándo vencería?", time: "10:14" },
        {
          id: "m5",
          from: "agent",
          text: "La primera vence el 10 del próximo mes, y las siguientes el mismo día de cada mes. ¿Te sirve así?",
          time: "10:15",
        },
        { id: "m6", from: "owner", text: "Dale, me sirve. Avancemos con eso.", time: "10:21" },
        {
          id: "m7",
          from: "agent",
          text: `Perfecto, ${firstName}. Dejo registrado el pre-acuerdo en ${maxInstallments} cuotas de ${money(monthly)}. Queda sujeto a la confirmación de la administración y te llega el detalle por este mismo medio. ¡Gracias!`,
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
    build: ({ firstName, debt, schoolName }) => [
      {
        id: "m1",
        from: "agent",
        text: `Hola ${firstName}, te escribo de Pacta en representación de ${schoolName}. Figuran ${money(debt)} pendientes en cuotas. ¿Podemos coordinar una forma de pago?`,
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
        text: `${firstName}, ¿pudiste verlo? Sigo con la posibilidad de dividirlo en cuotas sin recargos adicionales.`,
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
    build: ({ firstName, debt, maxInstallments, schoolName }) => [
      {
        id: "m1",
        from: "agent",
        text: `Hola ${firstName}, soy el asistente de Pacta en representación de ${schoolName}. Registramos ${money(debt)} en cuotas atrasadas. ¿Vemos cómo regularizarlo?`,
        time: "15:05",
      },
      { id: "m2", from: "owner", text: "Hola. Puedo pagar, pero necesito en 12 cuotas.", time: "15:19" },
      {
        id: "m3",
        from: "agent",
        text: `Puedo ofrecerte hasta ${maxInstallments} cuotas según la política del colegio. ¿Querés que lo veamos dentro de ese límite?`,
        time: "15:20",
      },
      { id: "m4", from: "owner", text: "No, menos de 12 no me sirve.", time: "15:33" },
      {
        id: "m5",
        from: "agent",
        text: "Entiendo. Un plan de 12 cuotas excede lo que puedo autorizar automáticamente. Voy a derivar tu caso a la administración para que lo evalúen y te contacten.",
        time: "15:34",
      },
      { id: "m6", from: "owner", text: "Ok, espero que me contacten.", time: "15:40" },
    ],
  },
  // 3 · En curso (se reproduce EN VIVO en el chat)
  {
    outcome: "en_curso",
    lastActivity: "En vivo",
    summary: "Negociación en curso, el agente está conversando ahora.",
    build: ({ firstName, debt, maxInstallments, interestWaiver, schoolName }) => {
      const monthly = Math.round((debt * (1 - interestWaiver / 100)) / maxInstallments)
      return [
        {
          id: "m1",
          from: "agent",
          text: `Hola ${firstName}, soy el asistente de Pacta en representación de ${schoolName}. Figuran ${money(debt)} en cuotas vencidas. ¿Querés que te arme un plan de pago?`,
          time: "12:40",
        },
        { id: "m2", from: "owner", text: "Hola, sí. La verdad veníamos demorados.", time: "12:52" },
        {
          id: "m3",
          from: "agent",
          text: "No hay problema, para eso estoy. ¿Preferís abonarlo en un pago o en cuotas?",
          time: "12:52",
        },
        { id: "m4", from: "owner", text: "En cuotas, en un pago no nos da.", time: "12:53" },
        {
          id: "m5",
          from: "agent",
          text: `Perfecto. Puedo ofrecerte hasta ${maxInstallments} cuotas con una quita del ${interestWaiver}% en recargos. Quedarían ${money(monthly)} por mes.`,
          time: "12:54",
        },
        { id: "m6", from: "owner", text: "¿Y la primera cuándo la pagaría?", time: "12:55" },
        {
          id: "m7",
          from: "agent",
          text: "La primera vence el 10 del próximo mes y las siguientes el mismo día de cada mes. ¿Te queda cómodo?",
          time: "12:55",
        },
        { id: "m8", from: "owner", text: "Sí, así nos sirve.", time: "12:56" },
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

// ---------------------------------------------------------------------------
// Instituciones educativas
// ---------------------------------------------------------------------------
// En el rubro educativo: `units` = alumnos, `owners` = familias responsables de
// pago, `unit` de cada familia = grado/curso del alumno.

export const schools: Building[] = [
  {
    id: "san-martin",
    name: "Colegio San Martín",
    address: "Av. Rivadavia 4820, CABA",
    units: 540,
    usesGlobalPolicy: true,
    policy: buildPolicy({}),
    metrics: {
      recovered: 6_480_000,
      recoveredChange: 10.2,
      agreementsClosed: 38,
      agreementsThisWeek: 8,
      activeConversations: 16,
      awaitingReply: 5,
      delinquencyRate: 15.6,
      recoveryTrend: [
        { month: "Abr", amount: 3.4 },
        { month: "May", amount: 4.0 },
        { month: "Jun", amount: 4.7 },
        { month: "Jul", amount: 5.3 },
        { month: "Ago", amount: 5.9 },
        { month: "Sep", amount: 6.48 },
      ],
      agreementPlans: [
        { plan: "pagoUnico", count: 12 },
        { plan: "dosCuotas", count: 16 },
        { plan: "tresCuotas", count: 10 },
      ],
    },
    owners: [
      {
        id: "sanm-1",
        firstName: "Laura",
        lastName: "Giménez",
        phone: formatPhone("11", 55551234),
        unit: "3° B",
        debt: 148_000,
        overdueMonths: 2,
      },
      {
        id: "sanm-2",
        firstName: "Marcelo",
        lastName: "Paz",
        phone: formatPhone("11", 55559876),
        unit: "5° A",
        debt: 96_500,
        overdueMonths: 1,
      },
      {
        id: "sanm-3",
        firstName: "Cecilia",
        lastName: "Núñez",
        phone: formatPhone("11", 55554321),
        unit: "1° C",
        debt: 212_300,
        overdueMonths: 3,
      },
      {
        id: "sanm-4",
        firstName: "Gustavo",
        lastName: "Ferrari",
        phone: formatPhone("11", 55556677),
        unit: "6° A",
        debt: 132_900,
        overdueMonths: 2,
      },
    ],
    conversations: [],
  },
  {
    id: "del-sol",
    name: "Instituto del Sol",
    address: "Charcas 2950, CABA",
    units: 320,
    usesGlobalPolicy: true,
    policy: buildPolicy({}),
    metrics: {
      recovered: 4_120_000,
      recoveredChange: 7.4,
      agreementsClosed: 24,
      agreementsThisWeek: 4,
      activeConversations: 11,
      awaitingReply: 4,
      delinquencyRate: 12.9,
      recoveryTrend: [
        { month: "Abr", amount: 2.2 },
        { month: "May", amount: 2.6 },
        { month: "Jun", amount: 3.1 },
        { month: "Jul", amount: 3.4 },
        { month: "Ago", amount: 3.8 },
        { month: "Sep", amount: 4.12 },
      ],
      agreementPlans: [
        { plan: "pagoUnico", count: 9 },
        { plan: "dosCuotas", count: 9 },
        { plan: "tresCuotas", count: 6 },
      ],
    },
    owners: [
      {
        id: "sol-1",
        firstName: "Romina",
        lastName: "Vera",
        phone: formatPhone("11", 44441122),
        unit: "2° A",
        debt: 108_700,
        overdueMonths: 2,
      },
      {
        id: "sol-2",
        firstName: "Damián",
        lastName: "Correa",
        phone: formatPhone("11", 44443344),
        unit: "4° B",
        debt: 184_500,
        overdueMonths: 3,
      },
      {
        id: "sol-3",
        firstName: "Patricia",
        lastName: "Ledesma",
        phone: formatPhone("11", 44445566),
        unit: "7° A",
        debt: 72_300,
        overdueMonths: 1,
      },
    ],
    conversations: [],
  },
  {
    id: "santa-ana",
    name: "Colegio Santa Ana",
    address: "Av. Nazca 1240, CABA",
    units: 410,
    usesGlobalPolicy: false,
    policy: buildPolicy({ maxInstallments: 4, interestWaiver: 20 }),
    metrics: {
      recovered: 5_340_000,
      recoveredChange: -2.1,
      agreementsClosed: 29,
      agreementsThisWeek: 6,
      activeConversations: 13,
      awaitingReply: 7,
      delinquencyRate: 19.2,
      recoveryTrend: [
        { month: "Abr", amount: 4.6 },
        { month: "May", amount: 4.9 },
        { month: "Jun", amount: 5.5 },
        { month: "Jul", amount: 5.4 },
        { month: "Ago", amount: 5.5 },
        { month: "Sep", amount: 5.34 },
      ],
      agreementPlans: [
        { plan: "pagoUnico", count: 7 },
        { plan: "dosCuotas", count: 12 },
        { plan: "tresCuotas", count: 10 },
      ],
    },
    owners: [
      {
        id: "ana-1",
        firstName: "Sergio",
        lastName: "Maidana",
        phone: formatPhone("11", 33332211),
        unit: "5° C",
        debt: 268_400,
        overdueMonths: 4,
      },
      {
        id: "ana-2",
        firstName: "Andrea",
        lastName: "Ponce",
        phone: formatPhone("11", 33334455),
        unit: "3° A",
        debt: 151_900,
        overdueMonths: 2,
      },
      {
        id: "ana-3",
        firstName: "Lucas",
        lastName: "Rivas",
        phone: formatPhone("11", 33336677),
        unit: "1° B",
        debt: 83_600,
        overdueMonths: 1,
      },
    ],
    conversations: [],
  },
  {
    id: "newton",
    name: "Colegio Newton",
    address: "Av. Cabildo 2360, CABA",
    units: 480,
    usesGlobalPolicy: true,
    policy: buildPolicy({}),
    metrics: {
      recovered: 7_260_000,
      recoveredChange: 13.3,
      agreementsClosed: 44,
      agreementsThisWeek: 10,
      activeConversations: 19,
      awaitingReply: 6,
      delinquencyRate: 16.1,
      recoveryTrend: [
        { month: "Abr", amount: 4.3 },
        { month: "May", amount: 4.9 },
        { month: "Jun", amount: 5.6 },
        { month: "Jul", amount: 6.2 },
        { month: "Ago", amount: 6.8 },
        { month: "Sep", amount: 7.26 },
      ],
      agreementPlans: [
        { plan: "pagoUnico", count: 16 },
        { plan: "dosCuotas", count: 17 },
        { plan: "tresCuotas", count: 11 },
      ],
    },
    owners: [
      {
        id: "new-1",
        firstName: "Marina",
        lastName: "Acuña",
        phone: formatPhone("11", 22221133),
        unit: "6° B",
        debt: 234_100,
        overdueMonths: 3,
      },
      {
        id: "new-2",
        firstName: "Hernán",
        lastName: "Cabrera",
        phone: formatPhone("11", 22223355),
        unit: "4° A",
        debt: 121_700,
        overdueMonths: 2,
      },
      {
        id: "new-3",
        firstName: "Silvina",
        lastName: "Ramos",
        phone: formatPhone("11", 22225577),
        unit: "2° C",
        debt: 176_300,
        overdueMonths: 3,
      },
    ],
    conversations: [],
  },
  {
    id: "los-robles",
    name: "Instituto Los Robles",
    address: "Av. Directorio 1820, CABA",
    units: 280,
    usesGlobalPolicy: true,
    policy: buildPolicy({}),
    metrics: {
      recovered: 3_180_000,
      recoveredChange: 5.0,
      agreementsClosed: 17,
      agreementsThisWeek: 3,
      activeConversations: 8,
      awaitingReply: 3,
      delinquencyRate: 11.1,
      recoveryTrend: [
        { month: "Abr", amount: 2.0 },
        { month: "May", amount: 2.3 },
        { month: "Jun", amount: 2.6 },
        { month: "Jul", amount: 2.8 },
        { month: "Ago", amount: 3.0 },
        { month: "Sep", amount: 3.18 },
      ],
      agreementPlans: [
        { plan: "pagoUnico", count: 8 },
        { plan: "dosCuotas", count: 6 },
        { plan: "tresCuotas", count: 3 },
      ],
    },
    owners: [
      {
        id: "rob-1",
        firstName: "Diego",
        lastName: "Ortega",
        phone: formatPhone("11", 66661144),
        unit: "1° A",
        debt: 64_900,
        overdueMonths: 1,
      },
      {
        id: "rob-2",
        firstName: "Carolina",
        lastName: "Suárez",
        phone: formatPhone("11", 66663366),
        unit: "5° B",
        debt: 118_400,
        overdueMonths: 2,
      },
    ],
    conversations: [],
  },
]

// Relleno de familias para que cada institución tenga suficientes acuerdos.
const FILLER_NAMES: [string, string][] = [
  ["Agustina", "Rendón"],
  ["Lucas", "Brizuela"],
  ["Mariana", "Ferraro"],
  ["Pablo", "Ledesma"],
  ["Carolina", "Nieto"],
  ["Diego", "Arce"],
  ["Sofía", "Villalba"],
  ["Hernán", "Peralta"],
  ["Natalia", "Coria"],
  ["Esteban", "Luengo"],
  ["Paula", "Mercado"],
  ["Facundo", "Ávalos"],
]

const MIN_OWNERS = 11

function fillOwners() {
  schools.forEach((school, sIdx) => {
    let n = 0
    while (school.owners.length < MIN_OWNERS) {
      const [firstName, lastName] = FILLER_NAMES[(sIdx * 5 + n) % FILLER_NAMES.length]
      const grade = 1 + ((sIdx + n) % 7)
      const div = String.fromCharCode(65 + (n % 3)) // A-C
      const debt = 90_000 + (((sIdx * 7 + n * 53) % 24) * 8_000)
      school.owners.push({
        id: `${school.id}-f${n}`,
        firstName,
        lastName,
        phone: formatPhone("11", 20000000 + sIdx * 100000 + n * 1111),
        unit: `${grade}° ${div}`,
        debt,
        overdueMonths: 1 + (n % 4),
      })
      n += 1
    }
  })
}

fillOwners()

/** Construye las conversaciones de cada institución a partir de sus familias. */
function buildConversations() {
  for (const school of schools) {
    const convs: Conversation[] = school.owners.map((owner, index) => {
      const guion = guiones[index % guiones.length]
      // Casi todas las familias tienen un acuerdo para que la vista de
      // Acuerdos sea coherente con el dashboard.
      const status: "propuesto" | "aceptado" | "rechazado" =
        index === 0 ? "propuesto" : index % 4 === 3 ? "rechazado" : "aceptado"
      const agreement =
        guion.outcome === "en_curso" && index !== 0
          ? undefined
          : buildAgreement({
              debt: owner.debt,
              maxInstallments: school.policy.maxInstallments,
              interestWaiver: school.policy.interestWaiver,
              dueDay: school.policy.dueDay,
              status,
              resolvedBy: "Simón Ottati",
              rejectionReason:
                status === "rechazado"
                  ? "El plan excede la política del colegio"
                  : undefined,
            })
      return {
        id: `${school.id}-conv-${owner.id}`,
        ownerId: owner.id,
        outcome: guion.outcome,
        lastActivity: guion.lastActivity,
        summary: guion.summary,
        messages: guion.build({
          firstName: owner.firstName,
          debt: owner.debt,
          maxInstallments: school.policy.maxInstallments,
          interestWaiver: school.policy.interestWaiver,
          schoolName: school.name,
        }),
        agreement,
      }
    })
    school.conversations = convs
  }
}

buildConversations()

export { MONTHS as SCHOOL_MONTHS }
