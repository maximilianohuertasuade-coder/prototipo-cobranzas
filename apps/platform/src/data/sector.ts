// ---------------------------------------------------------------------------
// Rubro de la administración (sector)
// ---------------------------------------------------------------------------
// pacta.ia sirve para dos rubros que comparten el mismo flujo de cobranzas:
//  - "consorcios": administradoras de edificios (expensas / unidades / propietarios)
//  - "educativo":  instituciones educativas (cuotas / familias / colegios)
//
// El rubro define únicamente los datos de ejemplo y las etiquetas que se
// muestran en la interfaz. Toda la lógica de negociación, acuerdos y
// políticas es idéntica para ambos.

export type Sector = "consorcios" | "educativo" | "inmobiliarias"

export const SECTOR_STORAGE_KEY = "pacta.sector"

/** Etiquetas de la interfaz que cambian según el rubro. */
export type SectorLabels = {
  /** Nombre del rubro para mostrar. */
  sectorName: string
  /** Entidad administrada (singular), p. ej. "edificio" / "institución". */
  entity: string
  entityPlural: string
  /** Entidad con mayúscula inicial. */
  entityCapital: string
  entityPluralCapital: string
  /** Sub-unidad, p. ej. "unidad" / "alumno". */
  unit: string
  unitPlural: string
  /** Deudor, p. ej. "propietario" / "familia". */
  debtor: string
  debtorPlural: string
  /** Concepto de deuda, p. ej. "expensas" / "cuotas". */
  debtConcept: string
  /** Vista consolidada, p. ej. "Todos los edificios". */
  allEntities: string
  /** Texto corto de la sub-unidad para métricas, p. ej. "unidades" / "alumnos". */
  unitShort: string
}

export const SECTOR_LABELS: Record<Sector, SectorLabels> = {
  consorcios: {
    sectorName: "Consorcios",
    entity: "edificio",
    entityPlural: "edificios",
    entityCapital: "Edificio",
    entityPluralCapital: "Edificios",
    unit: "unidad",
    unitPlural: "unidades",
    debtor: "propietario",
    debtorPlural: "propietarios",
    debtConcept: "expensas",
    allEntities: "Todos los edificios",
    unitShort: "unidades",
  },
  educativo: {
    sectorName: "Instituciones educativas",
    entity: "institución",
    entityPlural: "instituciones",
    entityCapital: "Institución",
    entityPluralCapital: "Instituciones",
    unit: "alumno",
    unitPlural: "alumnos",
    debtor: "familia",
    debtorPlural: "familias",
    debtConcept: "cuotas",
    allEntities: "Todas las instituciones",
    unitShort: "alumnos",
  },
  inmobiliarias: {
    sectorName: "Inmobiliarias",
    entity: "sucursal",
    entityPlural: "sucursales",
    entityCapital: "Sucursal",
    entityPluralCapital: "Sucursales",
    unit: "propiedad",
    unitPlural: "propiedades",
    debtor: "inquilino",
    debtorPlural: "inquilinos",
    debtConcept: "alquileres",
    allEntities: "Toda la cadena",
    unitShort: "propiedades",
  },
}

export function labelsFor(sector: Sector): SectorLabels {
  return SECTOR_LABELS[sector]
}
