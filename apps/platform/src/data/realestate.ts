import { buildAgreement } from "./conversations"
import { defaultRealEstatePolicy } from "./policies"
import type {
  Building,
  ChatMessage,
  CollectionPolicy,
  Conversation,
  ConversationOutcome,
} from "./types"

// ---------------------------------------------------------------------------
// Inmobiliarias (rubro "inmobiliarias")
// ---------------------------------------------------------------------------
// Misma estructura que `buildings.ts` / `schools.ts`, pero el dominio es la
// gestión de alquileres:
//  - Building  -> cartera de propiedades de la inmobiliaria
//  - Owner     -> inquilino (locatario)
//  - unit      -> propiedad alquilada (depto/casa)
//  - debt      -> alquileres vencidos
//  - expensas  -> alquileres
//
// Se reutiliza el tipo `Building` para que todo el dashboard funcione igual.

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
  return { ...defaultRealEstatePolicy, ...overrides }
}

// ---------------------------------------------------------------------------
// Guiones de conversación (versión inmobiliaria: alquileres e inquilinos)
// ---------------------------------------------------------------------------

type GuionCtx = {
  firstName: string
  debt: number
  maxInstallments: number
  interestWaiver: number
  agencyName: string
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
    build: ({ firstName, debt, maxInstallments, interestWaiver, agencyName }) => {
      const monthly = Math.round((debt * (1 - interestWaiver / 100)) / maxInstallments)
      return [
        {
          id: "m1",
          from: "agent",
          text: `Hola ${firstName}, soy el asistente de Pacta en representación de ${agencyName}. Figura un saldo de ${money(debt)} en alquileres vencidos. ¿Querés que veamos una forma de regularizarlo?`,
          time: "10:02",
        },
        { id: "m2", from: "owner", text: "Hola, sí. Este mes se me complicó.", time: "10:09" },
        {
          id: "m3",
          from: "agent",
          text: `Lo entiendo. Puedo ofrecerte hasta ${maxInstallments} cuotas con una quita del ${interestWaiver}% en intereses por mora. Quedarían ${money(monthly)} por mes.`,
          time: "10:10",
        },
        { id: "m4", from: "owner", text: "¿Y la primera cuota cuándo vencería?", time: "10:14" },
        {
          id: "m5",
          from: "agent",
          text: "La primera vence el 5 del próximo mes, y las siguientes el mismo día de cada mes. ¿Te sirve así?",
          time: "10:15",
        },
        { id: "m6", from: "owner", text: "Dale, me sirve. Avancemos.", time: "10:21" },
        {
          id: "m7",
          from: "agent",
          text: `Perfecto, ${firstName}. Dejo registrado el pre-acuerdo en ${maxInstallments} cuotas de ${money(monthly)}. Queda sujeto a la confirmación de la inmobiliaria y te llega el detalle por este mismo medio. ¡Gracias!`,
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
    build: ({ firstName, debt, agencyName }) => [
      {
        id: "m1",
        from: "agent",
        text: `Hola ${firstName}, te escribo de Pacta en representación de ${agencyName}. Figuran ${money(debt)} pendientes en alquileres. ¿Podemos coordinar una forma de pago?`,
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
        text: `${firstName}, ¿pudiste verlo? Sigo con la posibilidad de dividirlo en cuotas.`,
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
    summary: "Pidió más cuotas de las permitidas. Derivado a la inmobiliaria.",
    build: ({ firstName, debt, maxInstallments, agencyName }) => [
      {
        id: "m1",
        from: "agent",
        text: `Hola ${firstName}, soy el asistente de Pacta en representación de ${agencyName}. Registramos ${money(debt)} en alquileres atrasados. ¿Vemos cómo regularizarlo?`,
        time: "15:05",
      },
      { id: "m2", from: "owner", text: "Hola. Puedo pagar, pero necesito en 8 cuotas.", time: "15:19" },
      {
        id: "m3",
        from: "agent",
        text: `Puedo ofrecerte hasta ${maxInstallments} cuotas según la política de la inmobiliaria. ¿Querés que lo veamos dentro de ese límite?`,
        time: "15:20",
      },
      { id: "m4", from: "owner", text: "No, menos de 8 no me sirve.", time: "15:33" },
      {
        id: "m5",
        from: "agent",
        text: "Entiendo. Un plan de 8 cuotas excede lo que puedo autorizar automáticamente. Voy a derivar tu caso a la inmobiliaria para que lo evalúen y te contacten.",
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
    build: ({ firstName, debt, maxInstallments, interestWaiver, agencyName }) => {
      const monthly = Math.round((debt * (1 - interestWaiver / 100)) / maxInstallments)
      return [
        {
          id: "m1",
          from: "agent",
          text: `Hola ${firstName}, soy el asistente de Pacta en representación de ${agencyName}. Figuran ${money(debt)} en alquileres vencidos. ¿Querés que te arme un plan de pago?`,
          time: "12:40",
        },
        { id: "m2", from: "owner", text: "Hola, sí. Venía demorado.", time: "12:52" },
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
          text: "La primera vence el 5 del próximo mes y las siguientes el mismo día de cada mes. ¿Te queda cómodo?",
          time: "12:55",
        },
        { id: "m8", from: "owner", text: "Sí, así me sirve.", time: "12:56" },
        {
          id: "m9",
          from: "agent",
          text: `Genial, ${firstName}. Preparo el pre-acuerdo en ${maxInstallments} cuotas de ${money(monthly)} y lo dejo para que la inmobiliaria lo confirme. ¡Gracias por la buena predisposición!`,
          time: "12:56",
        },
      ]
    },
  },
]

// ---------------------------------------------------------------------------
// Carteras de inmobiliarias
// ---------------------------------------------------------------------------
// En el rubro inmobiliarias: `units` = propiedades, `owners` = inquilinos,
// `unit` de cada inquilino = la propiedad que alquila.

// Modelo: una ÚNICA cadena inmobiliaria ("Grupo del Plata") con varias
// sucursales. El selector muestra las sucursales de esa cadena, no empresas
// independientes. La vista "Todas las carteras" consolida toda la cadena.

export const agencies: Building[] = [
  {
    id: "sucursal-centro",
    name: "Sucursal Centro",
    address: "Av. Santa Fe 1680, CABA",
    units: 72,
    usesGlobalPolicy: true,
    policy: buildPolicy({}),
    metrics: {
      recovered: 7_120_000,
      recoveredChange: 9.8,
      agreementsClosed: 34,
      agreementsThisWeek: 7,
      activeConversations: 15,
      awaitingReply: 5,
      delinquencyRate: 14.8,
      recoveryTrend: [
        { month: "Abr", amount: 3.8 },
        { month: "May", amount: 4.4 },
        { month: "Jun", amount: 5.1 },
        { month: "Jul", amount: 5.7 },
        { month: "Ago", amount: 6.4 },
        { month: "Sep", amount: 7.12 },
      ],
      agreementPlans: [
        { plan: "pagoUnico", count: 15 },
        { plan: "dosCuotas", count: 13 },
        { plan: "tresCuotas", count: 6 },
      ],
    },
    owners: [
      {
        id: "plata-1",
        firstName: "Tomás",
        lastName: "Aguirre",
        phone: formatPhone("11", 55551234),
        unit: "Depto · Güemes 3450 2°B",
        debt: 312_000,
        overdueMonths: 2,
      },
      {
        id: "plata-2",
        firstName: "Belén",
        lastName: "Ferreyra",
        phone: formatPhone("11", 55559876),
        unit: "Depto · Thames 1220 4°A",
        debt: 198_500,
        overdueMonths: 1,
      },
      {
        id: "plata-3",
        firstName: "Ignacio",
        lastName: "Mansilla",
        phone: formatPhone("11", 55554321),
        unit: "Casa · Olazábal 2890",
        debt: 445_300,
        overdueMonths: 3,
      },
      {
        id: "plata-4",
        firstName: "Rocío",
        lastName: "Vargas",
        phone: formatPhone("11", 55556677),
        unit: "Depto · Córdoba 4100 7°C",
        debt: 264_900,
        overdueMonths: 2,
      },
      {
        id: "plata-5",
        firstName: "Martín",
        lastName: "Sosa",
        phone: formatPhone("11", 55551199),
        unit: "Depto · Paraguay 2340 3°A",
        debt: 318_500,
        overdueMonths: 2,
      },
      {
        id: "plata-6",
        firstName: "Valeria",
        lastName: "Ponce",
        phone: formatPhone("11", 55552288),
        unit: "Casa · Arévalo 1870",
        debt: 402_700,
        overdueMonths: 3,
      },
      {
        id: "plata-7",
        firstName: "Nicolás",
        lastName: "Herrera",
        phone: formatPhone("11", 55553377),
        unit: "Depto · Soler 4100 5°B",
        debt: 256_300,
        overdueMonths: 2,
      },
      {
        id: "plata-8",
        firstName: "Carla",
        lastName: "Medina",
        phone: formatPhone("11", 55554466),
        unit: "Depto · Honduras 5200 2°C",
        debt: 289_900,
        overdueMonths: 1,
      },
      {
        id: "plata-9",
        firstName: "Gonzalo",
        lastName: "Ramírez",
        phone: formatPhone("11", 55555577),
        unit: "Depto · Gorriti 4800 4°A",
        debt: 334_200,
        overdueMonths: 2,
      },
      {
        id: "plata-10",
        firstName: "Julieta",
        lastName: "Ávila",
        phone: formatPhone("11", 55556688),
        unit: "Casa · Fitz Roy 2100",
        debt: 421_600,
        overdueMonths: 3,
      },
      {
        id: "plata-11",
        firstName: "Sebastián",
        lastName: "Torres",
        phone: formatPhone("11", 55557799),
        unit: "Depto · Costa Rica 5600 6°B",
        debt: 278_400,
        overdueMonths: 2,
      },
      {
        id: "plata-12",
        firstName: "Florencia",
        lastName: "Cabrera",
        phone: formatPhone("11", 55558811),
        unit: "Depto · El Salvador 4900 3°C",
        debt: 312_800,
        overdueMonths: 1,
      },
    ],
    conversations: [],
  },
  {
    id: "sucursal-norte",
    name: "Sucursal Norte",
    address: "Av. Cabildo 2450, CABA",
    units: 54,
    usesGlobalPolicy: true,
    policy: buildPolicy({}),
    metrics: {
      recovered: 5_460_000,
      recoveredChange: 6.9,
      agreementsClosed: 26,
      agreementsThisWeek: 5,
      activeConversations: 12,
      awaitingReply: 4,
      delinquencyRate: 13.1,
      recoveryTrend: [
        { month: "Abr", amount: 3.0 },
        { month: "May", amount: 3.5 },
        { month: "Jun", amount: 4.0 },
        { month: "Jul", amount: 4.4 },
        { month: "Ago", amount: 4.9 },
        { month: "Sep", amount: 5.46 },
      ],
      agreementPlans: [
        { plan: "pagoUnico", count: 11 },
        { plan: "dosCuotas", count: 10 },
        { plan: "tresCuotas", count: 5 },
      ],
    },
    owners: [
      {
        id: "norte-1",
        firstName: "Javier",
        lastName: "Ocampo",
        phone: formatPhone("11", 44441122),
        unit: "Depto · Mendoza 3200 1°A",
        debt: 228_700,
        overdueMonths: 2,
      },
      {
        id: "norte-2",
        firstName: "Micaela",
        lastName: "Ruiz",
        phone: formatPhone("11", 44443344),
        unit: "Depto · Juramento 2100 5°B",
        debt: 184_500,
        overdueMonths: 1,
      },
      {
        id: "norte-3",
        firstName: "Franco",
        lastName: "Bianchi",
        phone: formatPhone("11", 44445566),
        unit: "Casa · Monroe 4580",
        debt: 372_300,
        overdueMonths: 3,
      },
    ],
    conversations: [],
  },
  {
    id: "sucursal-sur",
    name: "Sucursal Sur",
    address: "Av. Rivadavia 6820, CABA",
    units: 61,
    usesGlobalPolicy: false,
    policy: buildPolicy({ maxInstallments: 3, interestWaiver: 15 }),
    metrics: {
      recovered: 6_040_000,
      recoveredChange: -1.8,
      agreementsClosed: 29,
      agreementsThisWeek: 6,
      activeConversations: 14,
      awaitingReply: 7,
      delinquencyRate: 18.5,
      recoveryTrend: [
        { month: "Abr", amount: 5.0 },
        { month: "May", amount: 5.4 },
        { month: "Jun", amount: 6.0 },
        { month: "Jul", amount: 5.9 },
        { month: "Ago", amount: 6.1 },
        { month: "Sep", amount: 6.04 },
      ],
      agreementPlans: [
        { plan: "pagoUnico", count: 9 },
        { plan: "dosCuotas", count: 13 },
        { plan: "tresCuotas", count: 7 },
      ],
    },
    owners: [
      {
        id: "sur-1",
        firstName: "Gastón",
        lastName: "Medina",
        phone: formatPhone("11", 33332211),
        unit: "Depto · Directorio 2340 3°D",
        debt: 356_400,
        overdueMonths: 4,
      },
      {
        id: "sur-2",
        firstName: "Daniela",
        lastName: "Paredes",
        phone: formatPhone("11", 33334455),
        unit: "Depto · José María Moreno 980 2°A",
        debt: 219_900,
        overdueMonths: 2,
      },
      {
        id: "sur-3",
        firstName: "Emiliano",
        lastName: "Cáceres",
        phone: formatPhone("11", 33336677),
        unit: "PH · Pedernera 450",
        debt: 143_600,
        overdueMonths: 1,
      },
    ],
    conversations: [],
  },
  {
    id: "sucursal-caballito",
    name: "Sucursal Caballito",
    address: "Av. Corrientes 1850, CABA",
    units: 68,
    usesGlobalPolicy: true,
    policy: buildPolicy({}),
    metrics: {
      recovered: 8_240_000,
      recoveredChange: 12.6,
      agreementsClosed: 41,
      agreementsThisWeek: 9,
      activeConversations: 18,
      awaitingReply: 6,
      delinquencyRate: 16.4,
      recoveryTrend: [
        { month: "Abr", amount: 4.9 },
        { month: "May", amount: 5.5 },
        { month: "Jun", amount: 6.3 },
        { month: "Jul", amount: 7.0 },
        { month: "Ago", amount: 7.6 },
        { month: "Sep", amount: 8.24 },
      ],
      agreementPlans: [
        { plan: "pagoUnico", count: 17 },
        { plan: "dosCuotas", count: 16 },
        { plan: "tresCuotas", count: 8 },
      ],
    },
    owners: [
      {
        id: "centro-1",
        firstName: "Lorena",
        lastName: "Sandoval",
        phone: formatPhone("11", 22221133),
        unit: "Depto · Riobamba 320 6°A",
        debt: 298_100,
        overdueMonths: 3,
      },
      {
        id: "centro-2",
        firstName: "Matías",
        lastName: "Godoy",
        phone: formatPhone("11", 22223355),
        unit: "Depto · Paraná 760 4°C",
        debt: 176_700,
        overdueMonths: 2,
      },
      {
        id: "centro-3",
        firstName: "Antonella",
        lastName: "Ibarra",
        phone: formatPhone("11", 22225577),
        unit: "Oficina · Montevideo 540 3°B",
        debt: 241_300,
        overdueMonths: 3,
      },
    ],
    conversations: [],
  },
  {
    id: "sucursal-oeste",
    name: "Sucursal Oeste",
    address: "Av. Rivadavia 11200, Liniers",
    units: 39,
    usesGlobalPolicy: true,
    policy: buildPolicy({}),
    metrics: {
      recovered: 3_420_000,
      recoveredChange: 4.4,
      agreementsClosed: 18,
      agreementsThisWeek: 3,
      activeConversations: 9,
      awaitingReply: 3,
      delinquencyRate: 11.7,
      recoveryTrend: [
        { month: "Abr", amount: 2.1 },
        { month: "May", amount: 2.4 },
        { month: "Jun", amount: 2.7 },
        { month: "Jul", amount: 2.9 },
        { month: "Ago", amount: 3.2 },
        { month: "Sep", amount: 3.42 },
      ],
      agreementPlans: [
        { plan: "pagoUnico", count: 8 },
        { plan: "dosCuotas", count: 7 },
        { plan: "tresCuotas", count: 3 },
      ],
    },
    owners: [
      {
        id: "oeste-1",
        firstName: "Walter",
        lastName: "Figueroa",
        phone: formatPhone("11", 66661144),
        unit: "Depto · Carhué 240 1°B",
        debt: 158_900,
        overdueMonths: 1,
      },
      {
        id: "oeste-2",
        firstName: "Noelia",
        lastName: "Quinteros",
        phone: formatPhone("11", 66663366),
        unit: "Casa · Timoteo Gordillo 1320",
        debt: 287_400,
        overdueMonths: 2,
      },
    ],
    conversations: [],
  },
]

// ---------------------------------------------------------------------------
// Relleno de inquilinos
// ---------------------------------------------------------------------------
// Completa cada sucursal hasta un mínimo de inquilinos para que haya suficientes
// acuerdos cerrados (aceptados) y los montos del dashboard sean representativos.

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

const FILLER_STREETS = [
  "Av. Scalabrini Ortiz",
  "Av. Jujuy",
  "Av. Boedo",
  "Av. Warnes",
  "Av. Álvarez Jonte",
  "Av. Nazca",
]

const MIN_OWNERS = 11

function fillOwners() {
  agencies.forEach((agency, aIdx) => {
    let n = 0
    while (agency.owners.length < MIN_OWNERS) {
      const [firstName, lastName] = FILLER_NAMES[(aIdx * 5 + n) % FILLER_NAMES.length]
      const street = FILLER_STREETS[(aIdx + n) % FILLER_STREETS.length]
      const floor = 1 + ((aIdx + n) % 9)
      const letter = String.fromCharCode(65 + (n % 4)) // A-D
      // Deudas variadas entre ~180k y ~460k.
      const debt = 180_000 + (((aIdx * 7 + n * 53) % 29) * 10_000)
      agency.owners.push({
        id: `${agency.id}-f${n}`,
        firstName,
        lastName,
        phone: formatPhone("11", 20000000 + aIdx * 100000 + n * 1111),
        unit: `Depto · ${street} ${1000 + n * 120} ${floor}°${letter}`,
        debt,
        overdueMonths: 1 + (n % 4),
      })
      n += 1
    }
  })
}

fillOwners()

/** Construye las conversaciones de cada cartera a partir de sus inquilinos. */
function buildConversations() {
  for (const agency of agencies) {
    const convs: Conversation[] = agency.owners.map((owner, index) => {
      const guion = guiones[index % guiones.length]
      // Para que la vista de Acuerdos sea coherente con el dashboard, casi
      // todos los inquilinos tienen un acuerdo: propuesto (preacuerdo),
      // aceptado (sin_respuesta → luego pagó) o rechazado (fuera_de_politica).
      // Estado del acuerdo: el primero de cada sucursal queda pendiente, 1 de
      // cada 4 rechazado, y el resto aceptado (para un monto recuperado realista).
      const status: "propuesto" | "aceptado" | "rechazado" =
        index === 0 ? "propuesto" : index % 4 === 3 ? "rechazado" : "aceptado"
      const agreement =
        guion.outcome === "en_curso" && index !== 0
          ? undefined
          : buildAgreement({
              debt: owner.debt,
              maxInstallments: agency.policy.maxInstallments,
              interestWaiver: agency.policy.interestWaiver,
              dueDay: agency.policy.dueDay,
              status,
              resolvedBy: "Simón Ottati",
              rejectionReason:
                status === "rechazado"
                  ? "El plan excede la política de la inmobiliaria"
                  : undefined,
            })
      return {
        id: `${agency.id}-conv-${owner.id}`,
        ownerId: owner.id,
        outcome: guion.outcome,
        lastActivity: guion.lastActivity,
        summary: guion.summary,
        messages: guion.build({
          firstName: owner.firstName,
          debt: owner.debt,
          maxInstallments: agency.policy.maxInstallments,
          interestWaiver: agency.policy.interestWaiver,
          agencyName: agency.name,
        }),
        agreement,
      }
    })
    agency.conversations = convs
  }
}

buildConversations()

export { MONTHS as AGENCY_MONTHS }
