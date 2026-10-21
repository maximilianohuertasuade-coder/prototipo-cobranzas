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
