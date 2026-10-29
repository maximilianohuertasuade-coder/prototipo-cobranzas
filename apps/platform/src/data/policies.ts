import type { CollectionPolicy } from "./types"

/** Política global por defecto de la administración "Consorcios del Sur". */
export const defaultGlobalPolicy: CollectionPolicy = {
  maxInstallments: 3,
  interestWaiver: 15,
  minInstallmentAmount: 25_000,
  dueDay: 10,
  autoCloseAgreements: true,
  contactHourStart: 9,
  contactHourEnd: 20,
}

/** Política global por defecto para instituciones educativas. */
export const defaultSchoolPolicy: CollectionPolicy = {
  maxInstallments: 3,
  interestWaiver: 20,
  minInstallmentAmount: 20_000,
  dueDay: 10,
  autoCloseAgreements: false,
  contactHourStart: 9,
  contactHourEnd: 19,
}

/** Política global por defecto para inmobiliarias (gestión de alquileres). */
export const defaultRealEstatePolicy: CollectionPolicy = {
  maxInstallments: 2,
  interestWaiver: 10,
  minInstallmentAmount: 30_000,
  dueDay: 5,
  autoCloseAgreements: false,
  contactHourStart: 9,
  contactHourEnd: 20,
}
